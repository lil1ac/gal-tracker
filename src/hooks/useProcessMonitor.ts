import { useEffect, useState, useCallback, useRef } from 'react'
import {
  getRunningProcesses,
  isProcessMonitoringAvailable,
  onProcessStart,
  onProcessExit,
  updateTrayTooltip,
  ProcessEventPayload,
} from '../services/processService'
import { useGameStore } from '../store/gameStore'
import { query, execute } from '../services/database'
import { Game, GameProcess, RunningProcess } from '../types'

interface GameProcessWithGame extends GameProcess {
  game_id: string
  name: string
  name_cn: string | null
  status: GameStatus
  current_running: number
  auto_status_prompted: number
  auto_status_update_enabled: number
}

type GameStatus = 'wish' | 'playing' | 'completed' | 'paused'

const MIN_SESSION_SECONDS = 60
const EXIT_RECONCILE_INTERVAL_MS = 3000

function samePath(left: string | null | undefined, right: string | null | undefined): boolean {
  return !!left && !!right && left.toLowerCase() === right.toLowerCase()
}

function processMatchesConfig(config: GameProcess, processes: RunningProcess[]): boolean {
  switch (config.match_type) {
    case 'process_name':
      return processes.some(process => process.name.toLowerCase() === config.process_name.toLowerCase())
    case 'exe_path':
      return processes.some(process => samePath(process.exe_path, config.exe_path))
    case 'name_and_path':
      return processes.some(process =>
        process.name.toLowerCase() === config.process_name.toLowerCase() &&
        samePath(process.exe_path, config.exe_path)
      )
    default:
      return false
  }
}

export function useProcessMonitor() {
  const [runningGames, setRunningGames] = useState<string[]>([])
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const { updateGame, load } = useGameStore()
  const runningGamesRef = useRef<string[]>([])
  runningGamesRef.current = runningGames
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gamesRef = useRef(useGameStore.getState().games)
  gamesRef.current = useGameStore.getState().games
  const activeGameIdRef = useRef<string | null>(null)
  activeGameIdRef.current = activeGameId

  const handleProcessStart = useCallback(async (payload: ProcessEventPayload) => {
    const { game_id, process_name } = payload

    // 从数据库查找对应的游戏（使用 event 中的 game_id）
    const processes = await query<GameProcessWithGame>(
      `SELECT gp.*, g.name, g.name_cn, g.status, g.current_running,
              g.auto_status_prompted, g.auto_status_update_enabled
       FROM game_processes gp
       JOIN games g ON gp.game_id = g.id
       WHERE gp.game_id = ? AND gp.enabled = 1`,
      [game_id]
    )

    if (processes.length === 0) return

    const config = processes[0]
    const game = gamesRef.current.find(g => g.id === game_id) || {
      id: game_id,
      name: config.name,
      name_cn: config.name_cn,
      status: config.status,
      current_running: config.current_running === 1,
      auto_status_prompted: config.auto_status_prompted === 1,
      auto_status_update_enabled: config.auto_status_update_enabled === 1,
    } as Game

    // 更新数据库 current_running
    await execute(`UPDATE games SET current_running = 1 WHERE id = ?`, [game.id])

    // 创建 play_session (如果还没有进行中的)
    const activeSessions = await query<{ id: string }>(
      `SELECT id FROM play_sessions WHERE game_id = ? AND ended_at IS NULL`,
      [game.id]
    )
    if (activeSessions.length === 0) {
      const sessionId = String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8)
      await execute(
        `INSERT INTO play_sessions (id, game_id, process_name, exe_path, started_at) VALUES (?, ?, ?, ?, ?)`,
        [sessionId, game.id, process_name, config.exe_path, Date.now()]
      )
    }

    // 首次检测到进程时自动进入“在玩”。这里避免使用 window.confirm，
    // 原生确认框会阻塞桌面端渲染，让其他按钮看起来没有及时响应。
    if (!game.auto_status_prompted) {
      const shouldUpdate = ['wish', 'paused', null].includes(game.status)
      const newStatus = shouldUpdate
        ? 'playing'
        : game.status

      await execute(
        `UPDATE games SET auto_status_prompted = 1, auto_status_update_enabled = ?, status = ? WHERE id = ?`,
        [shouldUpdate ? 1 : 0, newStatus, game.id]
      )

      updateGame(game.id, {
        auto_status_prompted: true,
        auto_status_update_enabled: shouldUpdate,
        status: newStatus,
        current_running: true,
      })
    } else if (game.auto_status_update_enabled && game.status !== 'completed') {
      await execute(`UPDATE games SET status = 'playing' WHERE id = ?`, [game.id])
      updateGame(game.id, { status: 'playing', current_running: true })
    } else {
      updateGame(game.id, { current_running: true })
    }

    // 启动计时器
    const sessions = await query<{ id: string; started_at: number }>(
      `SELECT id, started_at FROM play_sessions WHERE game_id = ? AND ended_at IS NULL LIMIT 1`,
      [game.id]
    )
    if (sessions.length > 0) {
      const session = sessions[0]
      setActiveGameId(game.id)
      setElapsed(0)
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - session.started_at) / 1000))
      }, 1000)
    }

    // 更新托盘提示
    const alreadyRunning = runningGamesRef.current.includes(process_name)
    const runningCount = alreadyRunning
      ? runningGamesRef.current.length
      : runningGamesRef.current.length + 1
    const tooltip = runningCount === 1
      ? `${game.name_cn || game.name} - 运行中`
      : `${runningCount} 个游戏运行中`
    await updateTrayTooltip(tooltip)

    setRunningGames(prev => {
      if (prev.includes(process_name)) return prev
      return [...prev, process_name]
    })

    load()
  }, [updateGame, load])

  const handleProcessExit = useCallback(async (payload: ProcessEventPayload) => {
    const { game_id, process_name } = payload
    console.log('[useProcessMonitor] handleProcessExit called:', { game_id, process_name, activeGameId: activeGameIdRef.current })

    let remaining = 0
    let tooltip = 'GAL Tracker'
    setRunningGames(prev => {
      const newRunning = prev.filter(p => p !== process_name)
      remaining = newRunning.length
      tooltip = remaining === 0 ? 'GAL Tracker' : `${remaining} 个游戏运行中`
      return newRunning
    })

    // 查找进行中的 session
    const sessions = await query<{ id: string; started_at: number }>(
      `SELECT id, started_at FROM play_sessions WHERE game_id = ? AND ended_at IS NULL LIMIT 1`,
      [game_id]
    )
    console.log('[useProcessMonitor] open sessions found:', sessions.length)

    if (sessions.length > 0) {
      const session = sessions[0]
      const now = Date.now()
      const durationSeconds = Math.floor((now - session.started_at) / 1000)
      const endReason = durationSeconds < MIN_SESSION_SECONDS ? 'too_short' : 'process_exit'

      await execute(
        `UPDATE play_sessions SET ended_at = ?, duration_seconds = ?, end_reason = ? WHERE id = ?`,
        [now, durationSeconds, endReason, session.id]
      )
      console.log('[useProcessMonitor] session closed:', { sessionId: session.id, durationSeconds, endReason })
    }

    // 停止计时器
    if (activeGameIdRef.current === game_id || activeGameIdRef.current === null) {
      console.log('[useProcessMonitor] stopping timer, condition matched')
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setActiveGameId(null)
      setElapsed(0)
    } else {
      console.log('[useProcessMonitor] NOT stopping timer, activeGameIdRef:', activeGameIdRef.current, 'game_id:', game_id)
    }

    // 更新 current_running
    await execute(`UPDATE games SET current_running = 0 WHERE id = ?`, [game_id])
    updateGame(game_id, { current_running: false })

    await updateTrayTooltip(tooltip)

    load()
  }, [updateGame, load])

  useEffect(() => {
    let unlistenStart: (() => void) | undefined
    let unlistenExit: (() => void) | undefined

    onProcessStart(handleProcessStart).then(fn => { unlistenStart = fn })
    onProcessExit(handleProcessExit).then(fn => { unlistenExit = fn })

    return () => {
      unlistenStart?.()
      unlistenExit?.()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [handleProcessStart, handleProcessExit])

  useEffect(() => {
    if (!isProcessMonitoringAvailable()) return

    let disposed = false
    let reconciling = false

    const reconcileExitedProcesses = async () => {
      if (disposed || reconciling) return
      reconciling = true
      try {
        const activeSessions = await query<{ game_id: string }>(
          `SELECT DISTINCT game_id FROM play_sessions WHERE ended_at IS NULL`
        )
        if (activeSessions.length === 0) return

        const runningProcesses = await getRunningProcesses()
        for (const session of activeSessions) {
          const configs = await query<GameProcess>(
            `SELECT * FROM game_processes WHERE game_id = ? AND enabled = 1`,
            [session.game_id]
          )
          const matchingConfig = configs.find(config => processMatchesConfig(config, runningProcesses))
          if (!matchingConfig && configs.length > 0) {
            const config = configs[0]
            await handleProcessExit({
              config_id: config.id,
              game_id: config.game_id,
              process_name: config.process_name,
            })
          }
        }
      } catch (error) {
        console.error('[useProcessMonitor] failed to reconcile exited processes:', error)
      } finally {
        reconciling = false
      }
    }

    const reconcileInterval = setInterval(reconcileExitedProcesses, EXIT_RECONCILE_INTERVAL_MS)

    return () => {
      disposed = true
      clearInterval(reconcileInterval)
    }
  }, [handleProcessExit])

  return { runningGames, activeGameId, elapsed }
}

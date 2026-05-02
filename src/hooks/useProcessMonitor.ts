import { useEffect, useState, useCallback, useRef } from 'react'
import { onProcessStart, onProcessExit, updateTrayTooltip } from '../services/processService'
import { useGameStore } from '../store/gameStore'
import { query, execute } from '../services/database'
import { Game, GameProcess } from '../types'

// JOIN result type for game_processes + games
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

export function useProcessMonitor() {
  const [runningGames, setRunningGames] = useState<string[]>([])
  const { games, updateGame, load } = useGameStore()
  // Use ref to avoid stale closure in async callbacks
  const runningGamesRef = useRef<string[]>([])
  runningGamesRef.current = runningGames

  const handleProcessStart = useCallback(async (processName: string) => {
    // 从数据库查找对应的游戏
    const processes = await query<GameProcessWithGame>(
      `SELECT gp.*, g.id as game_id, g.name, g.name_cn, g.status, g.current_running,
              g.auto_status_prompted, g.auto_status_update_enabled
       FROM game_processes gp
       JOIN games g ON gp.game_id = g.id
       WHERE gp.process_name = ? AND gp.enabled = 1`,
      [processName]
    )

    if (processes.length === 0) return

    const config = processes[0]
    const game = games.find(g => g.id === config.game_id) || {
      id: config.game_id,
      name: config.name,
      name_cn: config.name_cn,
      status: config.status,
      current_running: config.current_running === 1,
      auto_status_prompted: config.auto_status_prompted === 1,
      auto_status_update_enabled: config.auto_status_update_enabled === 1,
    } as Game

    // 更新数据库 current_running
    await execute(
      `UPDATE games SET current_running = 1 WHERE id = ?`,
      [game.id]
    )

    // 创建 play_session
    const sessionId = String(Date.now())
    await execute(
      `INSERT INTO play_sessions (id, game_id, process_name, exe_path, started_at, ended_at, duration_seconds, end_reason)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)`,
      [sessionId, game.id, processName, config.exe_path, Date.now()]
    )

    // 首次询问逻辑
    if (!game.auto_status_prompted) {
      const shouldUpdate = window.confirm(
        `检测到 ${game.name_cn || game.name} 正在运行，是否将状态改为"在玩"？`
      )
      const newStatus = shouldUpdate && ['wish', 'paused', null].includes(game.status)
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

    // 更新托盘提示 (在 setRunningGames 之前调用以避免 stale closure)
    const alreadyRunning = runningGamesRef.current.includes(processName)
    const runningCount = alreadyRunning
      ? runningGamesRef.current.length
      : runningGamesRef.current.length + 1
    const tooltip = runningCount === 1
      ? `${game.name_cn || game.name} - 运行中`
      : `${runningCount} 个游戏运行中`
    await updateTrayTooltip(tooltip)

    setRunningGames(prev => {
      if (prev.includes(processName)) return prev
      return [...prev, processName]
    })

    load()
  }, [games, updateGame, load])

  const handleProcessExit = useCallback(async (processName: string) => {
    // Compute remaining from new state to avoid stale closure
    let remaining = 0
    let tooltip = 'GAL Tracker'
    setRunningGames(prev => {
      const newRunning = prev.filter(p => p !== processName)
      remaining = newRunning.length
      tooltip = remaining === 0
        ? 'GAL Tracker'
        : `${remaining} 个游戏运行中`
      return newRunning
    })

    // 查找对应的游戏和进行中的 session
    const processes = await query<GameProcess>(
      `SELECT gp.*, g.id as game_id FROM game_processes gp
       JOIN games g ON gp.game_id = g.id
       WHERE gp.process_name = ? AND gp.enabled = 1`,
      [processName]
    )

    if (processes.length === 0) return

    const config = processes[0]

    // 查找进行中的 session
    const sessions = await query<{ id: string; started_at: number }>(
      `SELECT id, started_at FROM play_sessions WHERE game_id = ? AND ended_at IS NULL`,
      [config.game_id]
    )

    if (sessions.length > 0) {
      const session = sessions[0]
      const now = Date.now()
      const durationSeconds = Math.floor((now - session.started_at) / 1000)
      const endReason = durationSeconds < MIN_SESSION_SECONDS ? 'too_short' : 'process_exit'

      await execute(
        `UPDATE play_sessions SET ended_at = ?, duration_seconds = ?, end_reason = ? WHERE id = ?`,
        [now, durationSeconds, endReason, session.id]
      )
    }

    // 更新 current_running
    await execute(
      `UPDATE games SET current_running = 0 WHERE id = ?`,
      [config.game_id]
    )

    updateGame(config.game_id, { current_running: false })

    // 更新托盘提示 (remaining 和 tooltip 已在 setRunningGames 中计算)
    await updateTrayTooltip(tooltip)

    load()
  }, [])

  useEffect(() => {
    let unlistenStart: (() => void) | undefined
    let unlistenExit: (() => void) | undefined

    onProcessStart(handleProcessStart).then(fn => { unlistenStart = fn })
    onProcessExit(handleProcessExit).then(fn => { unlistenExit = fn })

    return () => {
      unlistenStart?.()
      unlistenExit?.()
    }
  }, [handleProcessStart, handleProcessExit])

  return { runningGames }
}
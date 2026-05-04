import { useState, useEffect, useCallback } from 'react'
import { Game, GameProcess, RunningProcess } from '../types'
import { query, execute } from '../services/database'
import { saveProcessConfig, deleteProcessConfig } from '../services/processService'
import { ProcessSelector } from './ProcessSelector'
import { Modal } from './Modal'

interface ProcessConfigProps {
  game: Game
  onProcessesChanged?: () => void
}

export function ProcessConfig({ game, onProcessesChanged }: ProcessConfigProps) {
  const [showModal, setShowModal] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [processes, setProcesses] = useState<GameProcess[]>([])

  const loadProcesses = useCallback(async () => {
    const procs = await query<GameProcess>(
      'SELECT * FROM game_processes WHERE game_id = ? ORDER BY created_at DESC',
      [game.id]
    )
    setProcesses(procs)
  }, [game.id])

  useEffect(() => { loadProcesses() }, [loadProcesses])

  const handleAddProcess = async (proc: RunningProcess) => {
    const existing = processes[0]
    const id = existing?.id || String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8)
    const now = Date.now()
    const exePath = proc.exe_path || null
    const matchType: 'process_name' | 'exe_path' | 'name_and_path' = exePath ? 'exe_path' : 'process_name'
    const newProcess: GameProcess = {
      id,
      game_id: game.id,
      process_name: proc.name,
      exe_path: exePath,
      match_type: matchType,
      enabled: true,
      created_at: now,
      updated_at: now,
    }

    const previous = processes
    setProcesses([newProcess])
    setShowModal(false)
    setBusyId(id)
    setError('')
    try {
      if (existing) {
        await execute(
          `UPDATE game_processes
           SET process_name = ?, exe_path = ?, match_type = ?, enabled = 1, updated_at = ?
           WHERE id = ?`,
          [proc.name, exePath, matchType, now, id]
        )
        await deleteProcessConfig(existing.id)
      } else {
        await execute(
          `INSERT INTO game_processes (id, game_id, process_name, exe_path, match_type, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          [id, game.id, proc.name, exePath, matchType, now, now]
        )
      }
      await saveProcessConfig(id, game.id, proc.name, exePath, matchType)
      onProcessesChanged?.()
    } catch (err) {
      setProcesses(previous)
      setError(err instanceof Error ? err.message : '绑定进程失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (process: GameProcess) => {
    const previous = processes
    setProcesses(prev => prev.filter(item => item.id !== process.id))
    setBusyId(process.id)
    setError('')
    try {
      await execute('DELETE FROM game_processes WHERE id = ?', [process.id])
      await deleteProcessConfig(process.id)
      onProcessesChanged?.()
    } catch (err) {
      setProcesses(previous)
      setError(err instanceof Error ? err.message : '删除进程监控失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleEnabled = async (process: GameProcess) => {
    const previous = processes
    const nextEnabled = !process.enabled
    setProcesses(prev => prev.map(item => item.id === process.id ? { ...item, enabled: nextEnabled, updated_at: Date.now() } : item))
    setBusyId(process.id)
    setError('')
    try {
      await execute('UPDATE game_processes SET enabled = ?, updated_at = ? WHERE id = ?', [nextEnabled ? 1 : 0, Date.now(), process.id])
      if (nextEnabled) {
        await saveProcessConfig(process.id, process.game_id, process.process_name, process.exe_path, process.match_type)
      } else {
        await deleteProcessConfig(process.id)
      }
      onProcessesChanged?.()
    } catch (err) {
      setProcesses(previous)
      setError(err instanceof Error ? err.message : '更新进程监控失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-md bg-[var(--surface-subtle)] border border-[var(--border)]">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-sm">进程监控</h3>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-sm"
          >
            {processes.length > 0 ? '更换绑定' : '添加监控'}
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)] mt-1">每个游戏只绑定一个 exe。选择新进程会替换当前绑定，运行时自动记录游玩时长。</p>
        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {processes.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-6">
            暂无配置的进程
          </p>
        ) : (
          <div className="space-y-1.5 mt-3">
            {processes.map((proc) => (
              <div
                key={proc.id}
                className="p-3 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] flex justify-between items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{proc.process_name}</div>
                  {proc.exe_path && (
                    <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                      {proc.exe_path}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                    <span>{proc.match_type === 'process_name' ? '按进程名' : proc.match_type === 'exe_path' ? '按路径' : '名称+路径'}</span>
                    <span>|</span>
                    <span className={proc.enabled ? 'text-emerald-600' : 'text-red-500'}>
                      {proc.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === proc.id}
                    onClick={() => handleToggleEnabled(proc)}
                    className="btn btn-secondary btn-sm"
                  >
                    {proc.enabled ? '停用' : '启用'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === proc.id}
                    onClick={() => handleDelete(proc)}
                    className="btn btn-danger btn-sm"
                  >
                    {busyId === proc.id ? '处理中' : '删除'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="添加进程监控">
        <ProcessSelector
          onSelect={handleAddProcess}
          gameName={game.name_cn || game.name}
        />
      </Modal>
    </div>
  )
}

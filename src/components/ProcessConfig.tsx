import { useState, useEffect } from 'react'
import { Game, GameProcess, RunningProcess } from '../types'
import { useGameStore } from '../store/gameStore'
import { saveProcessConfig, deleteProcessConfig, getConfiguredProcesses } from '../services/processService'
import { ProcessSelector } from './ProcessSelector'

interface ProcessConfigProps {
  game: Game
}

export function ProcessConfig({ game }: ProcessConfigProps) {
  const [showSelector, setShowSelector] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [processes, setProcesses] = useState<GameProcess[]>([])
  const { load } = useGameStore()

  useEffect(() => {
    loadProcesses()
  }, [game.id])

  const loadProcesses = async () => {
    const procs = await getConfiguredProcesses()
    setProcesses(procs.filter(p => p.game_id === game.id))
  }

  const handleAddProcess = async (proc: RunningProcess) => {
    setShowSelector(false)

    // 检查 match_type 是否有 exe_path 要求
    const matchType: 'process_name' | 'exe_path' | 'name_and_path' = proc.exe_path ? 'process_name' : 'process_name'

    await saveProcessConfig(
      game.id,
      proc.name,
      proc.exe_path,
      matchType
    )
    loadProcesses()
    load()
  }

  const handleDelete = async (processId: string) => {
    if (confirmDelete === processId) {
      await deleteProcessConfig(processId)
      setConfirmDelete(null)
      loadProcesses()
      load()
    } else {
      setConfirmDelete(processId)
    }
  }

  
  return (
    <div className="space-y-4 transition-all duration-300">
      <div className="glass p-4 rounded-lg transition-all duration-300">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[var(--text-primary)]">进程监控</h3>
          <button
            type="button"
            onClick={() => setShowSelector(true)}
            className="neon-button px-3 py-1 text-sm"
          >
            添加监控
          </button>
        </div>

        {showSelector && (
          <div className="mt-4 border border-[var(--border)] rounded p-3 bg-[var(--bg-secondary)]/50">
            <ProcessSelector
              onSelect={handleAddProcess}
              onClose={() => setShowSelector(false)}
              gameName={game.name}
            />
          </div>
        )}

        {processes.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            暂无配置的进程
          </p>
        ) : (
          <div className="space-y-2 mt-4">
            {processes.map((proc) => (
              <div
                key={proc.id}
                className="glass p-3 rounded-lg flex justify-between items-center transition-all duration-300"
              >
                <div>
                  <div className="font-medium text-[var(--text-primary)]">{proc.process_name}</div>
                  {proc.exe_path && (
                    <div className="text-xs text-[var(--text-muted)] truncate max-w-xs">
                      {proc.exe_path}
                    </div>
                  )}
                  <div className="text-xs mt-1">
                    <span className="text-[var(--text-muted)]">匹配方式: </span>
                    <span className="text-[var(--accent)]">{proc.match_type}</span>
                    <span className="text-[var(--text-muted)]"> | </span>
                    <span className={proc.enabled ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                      {proc.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(proc.id)}
                    className={`neon-button px-2 py-1 rounded text-sm ${
                      confirmDelete === proc.id
                        ? 'bg-[var(--error)] hover:bg-[var(--error)]/80'
                        : ''
                    } transition-all duration-300`}
                  >
                    {confirmDelete === proc.id ? '确认' : '删除'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
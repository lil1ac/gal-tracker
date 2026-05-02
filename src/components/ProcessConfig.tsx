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
    const matchType: 'process_name' | 'exe_path' | 'name_and_path' = proc.exe_path ? 'process_name' : 'process_name'
    await saveProcessConfig(game.id, proc.name, proc.exe_path, matchType)
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
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-[var(--bg-primary)]">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-sm">进程监控</h3>
          <button
            type="button"
            onClick={() => setShowSelector(true)}
            className="px-3 py-1 text-xs rounded-md bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            添加监控
          </button>
        </div>

        {showSelector && (
          <div className="mt-3 p-3 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]">
            <ProcessSelector
              onSelect={handleAddProcess}
              onClose={() => setShowSelector(false)}
              gameName={game.name}
            />
          </div>
        )}

        {processes.length === 0 && !showSelector ? (
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
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{proc.process_name}</div>
                  {proc.exe_path && (
                    <div className="text-xs text-[var(--text-secondary)] truncate max-w-xs mt-0.5">
                      {proc.exe_path}
                    </div>
                  )}
                  <div className="text-xs mt-1 text-[var(--text-secondary)]">
                    <span className="text-[var(--accent)]">{proc.match_type}</span>
                    <span className="mx-1.5">|</span>
                    <span className={proc.enabled ? 'text-emerald-600' : 'text-red-500'}>
                      {proc.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDelete(proc.id)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      confirmDelete === proc.id
                        ? 'bg-red-600 text-white'
                        : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
                    }`}
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

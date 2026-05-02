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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">进程监控</h3>
        <button
          type="button"
          onClick={() => setShowSelector(true)}
          className="px-3 py-1 bg-[var(--accent)] text-white rounded text-sm"
        >
          添加监控
        </button>
      </div>

      {showSelector && (
        <div className="border rounded">
          <ProcessSelector
              onSelect={handleAddProcess}
              onClose={() => setShowSelector(false)}
              gameName={game.name}
            />
        </div>
      )}

      {processes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          暂无配置的进程
        </p>
      ) : (
        <div className="space-y-2">
          {processes.map((proc) => (
            <div
              key={proc.id}
              className="p-3 bg-[var(--bg-secondary)] rounded flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{proc.process_name}</div>
                {proc.exe_path && (
                  <div className="text-xs text-gray-500 truncate max-w-xs">
                    {proc.exe_path}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  匹配方式: {proc.match_type} | {proc.enabled ? '已启用' : '已禁用'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(proc.id)}
                  className={`px-2 py-1 rounded text-sm ${
                    confirmDelete === proc.id
                      ? 'bg-red-500 text-white'
                      : 'text-red-500 hover:bg-red-100'
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
  )
}
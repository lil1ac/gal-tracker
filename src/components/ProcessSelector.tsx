import { useState, useEffect, useMemo } from 'react'
import { getRunningProcesses } from '../services/processService'
import { RunningProcess } from '../types'

interface ProcessSelectorProps {
  onSelect: (process: RunningProcess) => void
  onClose?: () => void
  gameName?: string  // 用于自动匹配
}

export function ProcessSelector({ onSelect, onClose, gameName }: ProcessSelectorProps) {
  const [processes, setProcesses] = useState<RunningProcess[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProcesses()
  }, [])

  const loadProcesses = async () => {
    setLoading(true)
    try {
      const procs = await getRunningProcesses()
      const gameProcs = procs.filter(
        (p) => p.name.endsWith('.exe') && !isSystemProcess(p.name)
      )
      setProcesses(gameProcs)
    } catch (e) {
      console.error('Failed to load processes', e)
    } finally {
      setLoading(false)
    }
  }

  const isSystemProcess = (name: string) => {
    const systemProcs = ['System', 'svchost.exe', 'csrss.exe', 'winlogon.exe',
                          'services.exe', 'lsass.exe', 'smss.exe', 'wininit.exe',
                          'explorer.exe', 'dwm.exe', 'conhost.exe', 'taskhostw.exe']
    return systemProcs.some(s => name.toLowerCase() === s.toLowerCase())
  }

  // 自动匹配：进程名包含游戏名，或游戏名包含进程名（去掉.exe后缀）
  const matchScore = (proc: RunningProcess): number => {
    if (!gameName) return 0
    const procName = proc.name.replace(/\.exe$/i, '').toLowerCase()
    const game = gameName.toLowerCase()
    if (procName === game) return 3  // 完全匹配
    if (procName.includes(game)) return 2  // 进程名包含游戏名
    if (game.includes(procName) && procName.length > 2) return 1  // 游戏名包含进程名
    return 0
  }

  const sortedAndHighlighted = useMemo(() => {
    if (!gameName) return processes.map(p => ({ ...p, score: 0 }))
    return processes
      .map(p => ({ ...p, score: matchScore(p) }))
      .sort((a, b) => b.score - a.score)
  }, [processes, gameName])

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">选择进程</h3>
        <button
          type="button"
          onClick={loadProcesses}
          className="text-sm text-blue-500 hover:underline"
        >
          刷新
        </button>
      </div>
      {gameName && (
        <p className="text-sm text-gray-500 mb-2">游戏: {gameName}</p>
      )}
      {loading ? (
        <p className="text-center py-8 text-gray-500">加载中...</p>
      ) : processes.length === 0 ? (
        <p className="text-center py-8 text-gray-500">暂未发现游戏进程</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sortedAndHighlighted.map((proc) => (
            <div
              key={proc.pid}
              onClick={() => onSelect(proc)}
              className={`p-3 rounded cursor-pointer transition-colors ${
                proc.score > 0
                  ? 'bg-green-100 hover:bg-green-200 border-2 border-green-400'
                  : 'bg-[var(--bg-secondary)] hover:bg-gray-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="font-medium">{proc.name}</div>
                {proc.score > 0 && (
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                    推荐
                  </span>
                )}
              </div>
              {proc.exe_path && (
                <div className="text-xs text-gray-500 truncate">
                  {proc.exe_path}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {onClose && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  )
}
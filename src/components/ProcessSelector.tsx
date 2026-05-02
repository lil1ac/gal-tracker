import { useState, useEffect } from 'react'
import { getRunningProcesses } from '../services/processService'
import { RunningProcess } from '../types'

interface ProcessSelectorProps {
  onSelect: (process: RunningProcess) => void
  onClose?: () => void
}

export function ProcessSelector({ onSelect, onClose }: ProcessSelectorProps) {
  const [processes, setProcesses] = useState<RunningProcess[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProcesses()
  }, [])

  const loadProcesses = async () => {
    setLoading(true)
    try {
      const procs = await getRunningProcesses()
      // 过滤掉系统进程，只保留 .exe
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
      {loading ? (
        <p className="text-center py-8 text-gray-500">加载中...</p>
      ) : processes.length === 0 ? (
        <p className="text-center py-8 text-gray-500">暂未发现游戏进程</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {processes.map((proc) => (
            <div
              key={proc.pid}
              onClick={() => onSelect(proc)}
              className="p-3 bg-[var(--bg-secondary)] rounded cursor-pointer hover:bg-gray-300"
            >
              <div className="font-medium">{proc.name}</div>
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
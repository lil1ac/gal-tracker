import { useState, useEffect, useMemo } from 'react'
import { getRunningProcesses } from '../services/processService'
import { RunningProcess } from '../types'

interface ProcessSelectorProps {
  onSelect: (process: RunningProcess) => void
  gameName: string
}

const SYSTEM_PROCS = new Set([
  'system', 'svchost.exe', 'csrss.exe', 'winlogon.exe',
  'services.exe', 'lsass.exe', 'smss.exe', 'wininit.exe',
  'explorer.exe', 'dwm.exe', 'conhost.exe', 'taskhostw.exe',
  'runtimebroker.exe', 'shellexperiencehost.exe', 'startmenuexperiencehost.exe',
  'searchindexer.exe', 'spoolsv.exe', 'fontdrvhost.exe', 'ctfmon.exe',
  'textinputhost.exe', 'applicationframehost.exe', 'sihost.exe',
  'taskmgr.exe', 'procexp.exe', 'procexp64.exe',
])

export function ProcessSelector({ onSelect, gameName }: ProcessSelectorProps) {
  const [processes, setProcesses] = useState<RunningProcess[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadProcesses() }, [])

  const loadProcesses = async () => {
    setLoading(true)
    try {
      const all = await getRunningProcesses()
      setProcesses(all.filter(p => p.name.endsWith('.exe') && !SYSTEM_PROCS.has(p.name.toLowerCase())))
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const matchScore = (proc: RunningProcess): number => {
    const procName = proc.name.replace(/\.exe$/i, '').toLowerCase()
    const game = gameName.toLowerCase()
    if (procName === game) return 3
    if (procName.includes(game)) return 2
    if (game.includes(procName) && procName.length > 2) return 1
    return 0
  }

  const results = useMemo(() => {
    let list = processes.map(p => ({ ...p, score: matchScore(p) }))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.exe_path && p.exe_path.toLowerCase().includes(q)))
    }
    return list.sort((a, b) => b.score - a.score)
  }, [processes, search])

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)] space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索进程名或路径..."
              className="field pl-9"
            />
          </div>
          <button
            type="button"
            onClick={loadProcesses}
            className="btn btn-secondary"
          >
            刷新
          </button>
        </div>
        <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
          <span>匹配游戏: <span className="text-[var(--accent)] font-medium">{gameName}</span></span>
          <span>共 {results.length} 个进程</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-12 text-sm text-[var(--text-secondary)]">正在扫描进程...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--text-secondary)]">
            {search ? '无匹配结果' : '未发现非系统进程，请确保游戏正在运行后点击刷新'}
          </div>
        ) : (
          <div className="space-y-1.5">
            {results.map(proc => (
              <button
                key={proc.pid}
                type="button"
                onClick={() => onSelect(proc)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  proc.score > 0
                    ? 'bg-[var(--accent-soft)] border border-[var(--accent)] hover:bg-[var(--surface-subtle)]'
                    : 'bg-[var(--surface-subtle)] border border-transparent hover:border-[var(--border)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{proc.name}</div>
                  <div className="flex items-center gap-2">
                    {proc.score > 0 && (
                      <span className="text-xs bg-[var(--accent)] text-white px-2 py-0.5 rounded-md font-medium">
                        推荐
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-secondary)]">PID {proc.pid}</span>
                  </div>
                </div>
                {proc.exe_path && (
                  <div className="text-xs text-[var(--text-secondary)] truncate mt-1">
                    {proc.exe_path}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

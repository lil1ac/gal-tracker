import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { setApiKey } from '../services/bangumiApi'
import { exportData, importData } from '../services/database'
import { useGameStore } from '../store/gameStore'

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const { theme, setTheme } = useTheme()
  const { load } = useGameStore()
  const [apiKey, setApiKeyState] = useState(localStorage.getItem('bgm_api_key') || '')
  const [saved, setSaved] = useState(false)

  const handleApiKeySave = () => {
    setApiKey(apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleApiKeyClear = () => {
    setApiKeyState('')
    setApiKey('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = async () => {
    const data = await exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gal-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const games = await importData(text)
      load()
      alert(`导入了 ${games.length} 个游戏`)
    } catch (err) {
      alert('导入失败：文件格式错误')
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)]">
      <div className="h-14 px-5 flex items-center border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 className="ml-4 font-semibold">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
        {/* API Key */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-1">Bangumi API Key</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            用于提高 Bangumi API 请求频率限制，可在 bgm.tv 设置页面获取
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="输入你的 API Key"
              className="flex-1 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] text-sm focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={handleApiKeySave}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-md text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              {saved ? '已保存' : '保存'}
            </button>
            <button
              type="button"
              onClick={handleApiKeyClear}
              className="px-3 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-red-500 transition-colors"
            >
              清除
            </button>
          </div>
        </section>

        {/* Theme */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3">主题</h2>
          <div className="flex gap-2">
            {([
              { key: 'light' as const, label: '浅色' },
              { key: 'dark' as const, label: '深色' },
              { key: 'system' as const, label: '跟随系统' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  theme === key
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--border)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Data */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-1">数据管理</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            导出为 JSON 文件备份，或从 JSON 文件恢复数据
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-md text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              导出数据
            </button>
            <label className="px-4 py-2 border border-[var(--border)] rounded-md text-sm cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors">
              导入数据
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold mb-1">关于</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            GAL Tracker v0.1.0 · 视觉小说游戏游玩记录工具
          </p>
        </section>
      </div>
    </div>
  )
}

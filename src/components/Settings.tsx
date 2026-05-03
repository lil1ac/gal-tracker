import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { setApiKey } from '../services/bangumiApi'
import { exportData, importData, getSetting, setSetting, deleteSetting } from '../services/database'
import { useGameStore } from '../store/gameStore'

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const { theme, setTheme } = useTheme()
  const { load } = useGameStore()
  const [apiKey, setApiKeyState] = useState('')
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    getSetting('bgm_api_key').then(k => { if (k) setApiKeyState(k) })
  }, [])

  const handleApiKeySave = async () => {
    setBusy('api')
    try {
      if (apiKey) {
        await setSetting('bgm_api_key', apiKey)
      } else {
        await deleteSetting('bgm_api_key')
      }
      setApiKey(apiKey)
      setSaved(true)
      setMessage('API Key 已保存')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setMessage('API Key 保存失败')
    } finally {
      setBusy('')
    }
  }

  const handleApiKeyClear = async () => {
    setBusy('api')
    try {
      setApiKeyState('')
      setApiKey('')
      await deleteSetting('bgm_api_key')
      setSaved(true)
      setMessage('API Key 已清除')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setMessage('API Key 清除失败')
    } finally {
      setBusy('')
    }
  }

  const handleExport = async () => {
    setBusy('export')
    try {
      const data = await exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gal-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('备份文件已生成')
    } catch {
      setMessage('导出失败')
    } finally {
      setBusy('')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy('import')
    try {
      const text = await file.text()
      const result = await importData(text)
      await load()
      setMessage(`导入完成：${result.games.length} 个游戏，${result.play_sessions.length} 条游玩记录，${result.game_processes.length} 个进程配置`)
    } catch (err) {
      setMessage('导入失败：文件格式错误')
    } finally {
      setBusy('')
      e.target.value = ''
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
        {message && (
          <div className="mb-6 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-primary)]">
            {message}
          </div>
        )}
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
              className="field flex-1"
            />
            <button
              type="button"
              disabled={busy === 'api'}
              onClick={handleApiKeySave}
              className="btn btn-primary"
            >
              {busy === 'api' ? '保存中' : saved ? '已保存' : '保存'}
            </button>
            <button
              type="button"
              disabled={busy === 'api'}
              onClick={handleApiKeyClear}
              className="btn btn-secondary"
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
                className={`btn ${
                  theme === key
                    ? 'btn-primary'
                    : 'btn-secondary'
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
              disabled={busy === 'export'}
              onClick={handleExport}
              className="btn btn-primary"
            >
              {busy === 'export' ? '导出中' : '导出数据'}
            </button>
            <label className={`btn btn-secondary ${busy === 'import' ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
              {busy === 'import' ? '导入中' : '导入数据'}
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

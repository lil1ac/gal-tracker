import { useState, useEffect } from 'react'
import { useTheme, ACCENT_PALETTES, type AccentId } from '../context/ThemeContext'
import { setApiKey } from '../services/bangumiApi'
import { exportData, importData, getSetting, setSetting, deleteSetting } from '../services/database'
import { useGameStore } from '../store/gameStore'
import { getMyBangumiUser, getUserGameCollections } from '../services/bangumiMeta'
import { collectionToGame, getCollectionSubjectId, mergeCollectionIntoGame } from '../services/bangumiSync'

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const { theme, setTheme, accentId, setAccentId } = useTheme()
  const { load, games, addGame, updateGame } = useGameStore()
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

  const handleBangumiImport = async () => {
    setBusy('bangumi-import')
    setMessage('')
    try {
      const user = await getMyBangumiUser()
      const collections = await getUserGameCollections(user.username)
      let added = 0
      let updated = 0
      for (const collection of collections) {
        const subjectId = getCollectionSubjectId(collection)
        if (!subjectId) continue
        const existing = games.find(game => game.id === String(subjectId))
        if (existing) {
          await updateGame(existing.id, mergeCollectionIntoGame(existing, collection))
          updated += 1
        } else {
          const game = collectionToGame(collection)
          if (!game) continue
          await addGame(game)
          added += 1
        }
      }
      await load()
      setMessage(`Bangumi 收藏导入完成：新增 ${added} 个，更新 ${updated} 个`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Bangumi 收藏导入失败，请检查 Access Token')
    } finally {
      setBusy('')
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

        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-1">Bangumi 收藏同步</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            使用已保存的 Access Token 从 Bangumi 导入游戏收藏；详情页可把本地状态、评分、短评和标签同步回 Bangumi。
          </p>
          <button
            type="button"
            disabled={busy === 'bangumi-import'}
            onClick={handleBangumiImport}
            className="btn btn-primary"
          >
            {busy === 'bangumi-import' ? '导入中...' : '从 Bangumi 导入收藏'}
          </button>
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

        {/* Accent Color */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-1">主题色</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            为应用界面选择配色方案
          </p>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(ACCENT_PALETTES) as [AccentId, typeof ACCENT_PALETTES[AccentId]][]).map(([id, palette]) => {
              const selected = accentId === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAccentId(id)}
                  className="flex flex-col items-center gap-1.5 group"
                  title={palette.label}
                >
                  <span
                    className={`block w-9 h-9 rounded-full transition-all duration-200 ${
                      selected
                        ? 'ring-2 ring-offset-2 ring-[var(--accent)] ring-offset-[var(--bg-primary)] scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ background: palette.light.accent }}
                  >
                    {selected && (
                      <svg className="w-full h-full p-2 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-[11px] transition-colors ${selected ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                    {palette.label}
                  </span>
                </button>
              )
            })}
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

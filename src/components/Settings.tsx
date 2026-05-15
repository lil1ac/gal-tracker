import { useEffect, useState } from 'react'
import { useTheme, ACCENT_PALETTES, type AccentId } from '../context/ThemeContext'
import { setApiKey } from '../services/bangumiApi'
import { exportData, importData, getSetting, setSetting, deleteSetting } from '../services/database'
import { useGameStore } from '../store/gameStore'
import { getMyBangumiUser, getUserGameCollections, patchMyCollection } from '../services/bangumiMeta'
import {
  buildCollectionPayload,
  collectionToGame,
  getBangumiSyncTargets,
  getCollectionSubjectId,
  mergeCollectionIntoGame,
} from '../services/bangumiSync'

export function Settings() {
  const { theme, setTheme, accentId, setAccentId } = useTheme()
  const { load, games, addGame, updateGame } = useGameStore()
  const [apiKey, setApiKeyState] = useState('')
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [syncPrivate, setSyncPrivate] = useState(false)

  useEffect(() => {
    getSetting('bgm_api_key').then(key => {
      if (key) setApiKeyState(key)
    })
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

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy('import')
    try {
      const text = await file.text()
      const result = await importData(text)
      await load()
      setMessage(`导入完成：${result.games.length} 个游戏，${result.play_sessions.length} 条游玩记录，${result.game_processes.length} 个进程配置`)
    } catch {
      setMessage('导入失败：文件格式错误')
    } finally {
      setBusy('')
      event.target.value = ''
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

  const handleBangumiPush = async () => {
    setBusy('bangumi-push')
    setMessage('')
    const { syncable, skipped } = getBangumiSyncTargets(games)
    let synced = 0
    let failed = 0
    try {
      for (const target of syncable) {
        try {
          await patchMyCollection(target.subjectId, buildCollectionPayload(target.game, syncPrivate))
          synced += 1
        } catch {
          failed += 1
        }
      }
      setMessage(`同步完成：成功 ${synced} 个，失败 ${failed} 个，跳过 ${skipped.length} 个非 Bangumi 条目`)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="settings-shell">
      <div className="settings-workbench">
        {message && (
          <div className="settings-message">
            {message}
          </div>
        )}

        <section className="settings-section">
          <div className="settings-section-head">
            <h2>Bangumi Access Token</h2>
            <p>用于访问私有收藏、吐槽分页和收藏同步能力。Token 只保存在本地数据库中。</p>
          </div>
          <div className="settings-inline-form">
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKeyState(event.target.value)}
              placeholder="输入你的 Bangumi Access Token"
              className="field flex-1"
            />
            <button
              type="button"
              disabled={busy === 'api'}
              onClick={handleApiKeySave}
              className="btn btn-primary"
            >
              {busy === 'api' ? '保存中...' : saved ? '已保存' : '保存'}
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

        <section className="settings-section">
          <div className="settings-section-head">
            <h2>Bangumi 收藏同步</h2>
            <p>从 Bangumi 拉取收藏，或把本地库的状态、评分、短评和标签批量同步回 Bangumi。</p>
          </div>
          <div className="settings-action-row">
            <button
              type="button"
              disabled={busy === 'bangumi-import'}
              onClick={handleBangumiImport}
              className="btn btn-primary"
            >
              {busy === 'bangumi-import' ? '导入中...' : '从 Bangumi 导入收藏'}
            </button>
            <label className="bangumi-sync-private">
              <input
                type="checkbox"
                checked={syncPrivate}
                onChange={event => setSyncPrivate(event.target.checked)}
              />
              同步为私密收藏
            </label>
            <button
              type="button"
              disabled={busy === 'bangumi-push' || games.length === 0}
              onClick={handleBangumiPush}
              className="btn btn-secondary"
            >
              {busy === 'bangumi-push' ? '同步中...' : '同步本地库到 Bangumi'}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <h2>主题</h2>
          </div>
          <div className="settings-action-row">
            {([
              { key: 'light' as const, label: '浅色' },
              { key: 'dark' as const, label: '深色' },
              { key: 'system' as const, label: '跟随系统' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={`btn ${theme === key ? 'btn-primary' : 'btn-secondary'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <h2>主题色</h2>
            <p>为应用界面选择配色方案。</p>
          </div>
          <div className="settings-accent-grid">
            {(Object.entries(ACCENT_PALETTES) as [AccentId, typeof ACCENT_PALETTES[AccentId]][]).map(([id, palette]) => {
              const selected = accentId === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAccentId(id)}
                  className="settings-accent"
                  title={palette.label}
                >
                  <span
                    className={selected ? 'is-selected' : ''}
                    style={{ background: palette.light.accent }}
                  >
                    {selected && (
                      <svg className="h-full w-full p-2 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <small>{palette.label}</small>
                </button>
              )
            })}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <h2>数据管理</h2>
            <p>导出 JSON 文件备份，或从 JSON 文件恢复数据。</p>
          </div>
          <div className="settings-action-row">
            <button
              type="button"
              disabled={busy === 'export'}
              onClick={handleExport}
              className="btn btn-primary"
            >
              {busy === 'export' ? '导出中...' : '导出数据'}
            </button>
            <label className={`btn btn-secondary ${busy === 'import' ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
              {busy === 'import' ? '导入中...' : '导入数据'}
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <h2>关于</h2>
            <p>GAL Tracker v0.1.0，视觉小说游戏游玩记录工具。</p>
          </div>
        </section>
      </div>
    </div>
  )
}

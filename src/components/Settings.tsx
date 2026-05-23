import { useEffect, useMemo, useState } from 'react'
import { useTheme, ACCENT_PALETTES, type AccentId } from '../context/ThemeContext'
import { setApiKey } from '../services/bangumiApi'
import { exportData, importData, getSetting, setSetting, deleteSetting } from '../services/database'
import { useGameStore } from '../store/gameStore'
import { getMyBangumiUser, getUserGameCollections, patchMyCollection } from '../services/bangumiMeta'
import {
  buildCollectionDiffPreview,
  buildCollectionPayload,
  collectionToGame,
  getBangumiSyncTargets,
  getCollectionSubjectId,
  mergeCollectionIntoGame,
  type BangumiCollectionDiffPreview,
} from '../services/bangumiSync'
import type { BangumiCollectionItem } from '../types'

function formatDiffSummary(preview: BangumiCollectionDiffPreview | null): string {
  if (!preview) return '尚未生成差异预览'
  return `仅本地 ${preview.localOnly.length}，仅 Bangumi ${preview.remoteOnly.length}，状态/评分不同 ${preview.conflicts.length}，一致 ${preview.same.length}`
}

export function Settings() {
  const { theme, setTheme, accentId, setAccentId } = useTheme()
  const { load, games, addGame, updateGame } = useGameStore()
  const [apiKey, setApiKeyState] = useState('')
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [syncPrivate, setSyncPrivate] = useState(false)
  const [bangumiUser, setBangumiUser] = useState<{ username: string; nickname?: string; avatar?: Record<string, string> } | null>(null)
  const [preview, setPreview] = useState<BangumiCollectionDiffPreview | null>(null)
  const [remoteCollections, setRemoteCollections] = useState<BangumiCollectionItem[]>([])
  const [targetUsername, setTargetUsername] = useState('')

  const previewSamples = useMemo(() => {
    if (!preview) return []
    return [
      ...preview.conflicts.slice(0, 4).map(item => `${item.title}：本地 ${item.local?.status}/${item.local?.rating ?? '-'}，Bangumi ${item.remote?.status}/${item.remote?.rating ?? '-'}`),
      ...preview.localOnly.slice(0, 3).map(game => `${game.name_cn || game.name}：仅本地`),
      ...preview.remoteOnly.slice(0, 3).map(item => `${item.title}：仅 Bangumi`),
    ].slice(0, 8)
  }, [preview])

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
      setMessage('Access Token 已保存')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setMessage('Access Token 保存失败')
    } finally {
      setBusy('')
    }
  }

  const handleApiKeyClear = async () => {
    setBusy('api')
    try {
      setApiKeyState('')
      setApiKey('')
      setBangumiUser(null)
      await deleteSetting('bgm_api_key')
      setSaved(true)
      setMessage('Access Token 已清除')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setMessage('Access Token 清除失败')
    } finally {
      setBusy('')
    }
  }

  const handleTokenTest = async () => {
    setBusy('token-test')
    setMessage('')
    try {
      setApiKey(apiKey)
      const user = await getMyBangumiUser()
      setBangumiUser(user)
      setTargetUsername(user.username)
      setMessage(`Token 可用：${user.nickname || user.username}`)
    } catch (error) {
      setBangumiUser(null)
      setMessage(error instanceof Error ? error.message : 'Token 测试失败，请检查 Access Token')
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

  const importCollections = async (collections: BangumiCollectionItem[]) => {
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
    return { added, updated }
  }

  const handleBangumiImport = async () => {
    setBusy('bangumi-import')
    setMessage('')
    try {
      const user = bangumiUser || await getMyBangumiUser()
      setBangumiUser(user)
      setTargetUsername(user.username)
      const collections = await getUserGameCollections(user.username)
      setRemoteCollections(collections)
      setPreview(buildCollectionDiffPreview(games, collections))
      const result = await importCollections(collections)
      setMessage(`Bangumi 收藏导入完成：新增 ${result.added} 个，更新 ${result.updated} 个`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Bangumi 收藏导入失败，请检查 Access Token')
    } finally {
      setBusy('')
    }
  }

  const handlePreview = async () => {
    setBusy('bangumi-preview')
    setMessage('')
    try {
      const username = targetUsername.trim() || bangumiUser?.username || (await getMyBangumiUser()).username
      setTargetUsername(username)
      const collections = await getUserGameCollections(username)
      setRemoteCollections(collections)
      setPreview(buildCollectionDiffPreview(games, collections))
      setMessage(`已生成 ${username} 的收藏差异预览`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '生成差异预览失败')
    } finally {
      setBusy('')
    }
  }

  const handleImportPreview = async () => {
    if (remoteCollections.length === 0) return
    setBusy('bangumi-import-selected')
    try {
      const result = await importCollections(remoteCollections)
      setMessage(`已导入预览中的收藏：新增 ${result.added} 个，更新 ${result.updated} 个`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入预览收藏失败')
    } finally {
      setBusy('')
    }
  }

  const handleBangumiPush = async () => {
    setBusy('bangumi-push')
    setMessage('')
    const { syncable, skipped } = getBangumiSyncTargets(games)
    let synced = 0
    const errors: string[] = []
    try {
      for (const target of syncable) {
        try {
          await patchMyCollection(target.subjectId, buildCollectionPayload(target.game, syncPrivate))
          synced += 1
        } catch (error) {
          errors.push(`${target.game.name_cn || target.game.name}: ${error instanceof Error ? error.message : '同步失败'}`)
        }
      }
      setMessage(`同步完成：成功 ${synced} 个，失败 ${errors.length} 个，跳过 ${skipped.length} 个非 Bangumi 条目${errors[0] ? `。首个错误：${errors[0]}` : ''}`)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="settings-shell">
      <div className="settings-workbench">
        {message && <div className="settings-message">{message}</div>}

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
            <button type="button" disabled={busy === 'api'} onClick={handleApiKeySave} className="btn btn-primary">
              {busy === 'api' ? '保存中...' : saved ? '已保存' : '保存'}
            </button>
            <button type="button" disabled={busy === 'api'} onClick={handleApiKeyClear} className="btn btn-secondary">清除</button>
            <button type="button" disabled={busy === 'token-test'} onClick={handleTokenTest} className="btn btn-secondary">
              {busy === 'token-test' ? '测试中...' : '测试 Token'}
            </button>
          </div>
          {bangumiUser && (
            <div className="settings-user-card">
              {bangumiUser.avatar?.large || bangumiUser.avatar?.medium ? <img src={bangumiUser.avatar.large || bangumiUser.avatar.medium} alt="" /> : <span>{(bangumiUser.nickname || bangumiUser.username).slice(0, 1)}</span>}
              <div>
                <strong>{bangumiUser.nickname || bangumiUser.username}</strong>
                <small>@{bangumiUser.username}</small>
              </div>
            </div>
          )}
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <h2>Bangumi 收藏同步</h2>
            <p>先预览差异，再从 Bangumi 拉取收藏，或把本地状态、评分、短评和标签批量同步回 Bangumi。</p>
          </div>
          <div className="settings-inline-form">
            <input className="field flex-1" value={targetUsername} onChange={event => setTargetUsername(event.target.value)} placeholder="Bangumi 用户名，留空使用当前 Token 用户" />
            <button type="button" disabled={busy === 'bangumi-preview'} onClick={handlePreview} className="btn btn-secondary">
              {busy === 'bangumi-preview' ? '预览中...' : '生成差异预览'}
            </button>
            <button type="button" disabled={busy === 'bangumi-import-selected' || remoteCollections.length === 0} onClick={handleImportPreview} className="btn btn-secondary">
              导入预览收藏
            </button>
          </div>
          <div className="settings-diff-panel">
            <strong>{formatDiffSummary(preview)}</strong>
            {previewSamples.length > 0 && (
              <ul>
                {previewSamples.map(item => <li key={item}>{item}</li>)}
              </ul>
            )}
          </div>
          <div className="settings-action-row">
            <button type="button" disabled={busy === 'bangumi-import'} onClick={handleBangumiImport} className="btn btn-primary">
              {busy === 'bangumi-import' ? '导入中...' : '从当前账号导入收藏'}
            </button>
            <label className="bangumi-sync-private">
              <input type="checkbox" checked={syncPrivate} onChange={event => setSyncPrivate(event.target.checked)} />
              同步为私密收藏
            </label>
            <button type="button" disabled={busy === 'bangumi-push' || games.length === 0} onClick={handleBangumiPush} className="btn btn-secondary">
              {busy === 'bangumi-push' ? '同步中...' : '同步本地库到 Bangumi'}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head"><h2>主题</h2></div>
          <div className="settings-action-row">
            {([
              { key: 'light' as const, label: '浅色' },
              { key: 'dark' as const, label: '深色' },
              { key: 'system' as const, label: '跟随系统' },
            ]).map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setTheme(key)} className={`btn ${theme === key ? 'btn-primary' : 'btn-secondary'}`}>
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
                <button key={id} type="button" onClick={() => setAccentId(id)} className="settings-accent" title={palette.label}>
                  <span className={selected ? 'is-selected' : ''} style={{ background: palette.light.accent }}>
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
            <button type="button" disabled={busy === 'export'} onClick={handleExport} className="btn btn-primary">
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

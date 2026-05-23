import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { searchBangumiCharacters, searchBangumiPersons, searchBangumiSubjectsWithTotal, type BangumiEntitySearchItem } from '../services/bangumiMeta'
import { fetchBangumiSnapshot } from '../services/bangumiLibrary'
import { useGameStore } from '../store/gameStore'
import { BangumiEntityDetailPanel, type BangumiEntityTarget } from './BangumiEntityDetailPanel'
import { GameDetailPage } from './GameDetailPage'
import { BrowseFilterBar } from './BrowseFilterBar'
import { BrowseGameCard } from './BrowseGameCard'
import {
  browseBack,
  browseClose,
  browseOpenEntity,
  browseOpenSubject,
  getActiveBrowseRoute,
  type BrowseRoute,
} from './browseNavigation'
import { usePageHeaderOverride } from './PageHeaderContext'
import type { BangumiSubject, BrowseCategory, BrowseFilterState } from '../types'

const PAGE_SIZE = 42

export function createDefaultBrowseFilters(category: BrowseCategory = 'top_ranked'): BrowseFilterState {
  switch (category) {
    case 'top_ranked':
      return { category, searchKind: 'subject', keyword: '', sort: 'rank', year: '', minScore: '', minRank: '1', maxRank: '', tags: [], nsfw: true }
    case 'popular':
      return { category, searchKind: 'subject', keyword: '', sort: 'heat', year: '', minScore: '', minRank: '', maxRank: '', tags: [], nsfw: true }
    case 'latest':
      return { category, searchKind: 'subject', keyword: '', sort: 'heat', year: '2026', minScore: '', minRank: '', maxRank: '', tags: [], nsfw: true }
  }
}

export function BrowseView() {
  const { games } = useGameStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const searchSeq = useRef(0)
  const detailSeq = useRef(0)

  const [filters, setFilters] = useState<BrowseFilterState>(() => createDefaultBrowseFilters())
  const [results, setResults] = useState<BangumiSubject[]>([])
  const [entityResults, setEntityResults] = useState<BangumiEntitySearchItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [routeStack, setRouteStack] = useState<BrowseRoute[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const activeRoute = getActiveBrowseRoute(routeStack)
  const libraryIds = useMemo(() => new Set(games.map(game => game.id)), [games])
  const visibleCount = filters.searchKind === 'subject' ? results.length : entityResults.length

  const hasMorePages = total > 0
    ? offset + visibleCount < total
    : visibleCount > 0 && visibleCount % PAGE_SIZE === 0

  const runSearch = useCallback(async (nextFilters: BrowseFilterState, nextOffset: number, append = false) => {
    const requestId = searchSeq.current + 1
    searchSeq.current = requestId

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const { items, total: nextTotal } = nextFilters.searchKind === 'character'
        ? await searchBangumiCharacters(nextFilters.keyword, PAGE_SIZE, nextOffset)
        : nextFilters.searchKind === 'person'
          ? await searchBangumiPersons(nextFilters.keyword, PAGE_SIZE, nextOffset)
          : await searchBangumiSubjectsWithTotal({
              keyword: nextFilters.keyword,
              sort: nextFilters.sort,
              year: nextFilters.year ? Number(nextFilters.year) : null,
              minScore: nextFilters.minScore ? Number(nextFilters.minScore) : null,
              minRank: nextFilters.minRank ? Number(nextFilters.minRank) : null,
              maxRank: nextFilters.maxRank ? Number(nextFilters.maxRank) : null,
              tags: nextFilters.tags.length > 0 ? nextFilters.tags : undefined,
              nsfw: nextFilters.nsfw,
              limit: PAGE_SIZE,
              offset: nextOffset,
            })

      if (requestId !== searchSeq.current) return

      const filtered = nextFilters.searchKind === 'subject' && nextFilters.sort === 'rank'
        ? (items as BangumiSubject[]).filter(subject => subject.rank !== null)
        : items

      if (append) {
        if (nextFilters.searchKind === 'subject') {
          setResults(prev => [...prev, ...(filtered as BangumiSubject[])])
        } else {
          setEntityResults(prev => [...prev, ...(filtered as BangumiEntitySearchItem[])])
        }
      } else {
        setResults(nextFilters.searchKind === 'subject' ? filtered as BangumiSubject[] : [])
        setEntityResults(nextFilters.searchKind === 'subject' ? [] : filtered as BangumiEntitySearchItem[])
      }
      setTotal(nextTotal)
      setOffset(nextOffset)
      setLastUpdatedAt(Date.now())
    } catch (searchError) {
      if (requestId !== searchSeq.current) return
      console.error(searchError)
      setError('搜索失败，请检查网络连接或 Bangumi Access Token')
    } finally {
      if (requestId === searchSeq.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [])

  useEffect(() => {
    runSearch(filters, 0)
  }, [runSearch])

  // IntersectionObserver for infinite scroll
  const loadMoreRef = useRef<() => void>()
  loadMoreRef.current = () => {
    if (loading || loadingMore || !hasMorePages) return
    runSearch(filters, offset + visibleCount, true)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollRef.current
    if (!sentinel || !root) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreRef.current?.()
        }
      },
      { root, rootMargin: '300px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount > 0]) // re-attach when results become non-empty

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFiltersChange = (nextFilters: BrowseFilterState) => {
    setFilters(nextFilters)
    setRouteStack(browseClose)
    runSearch(nextFilters, 0)
    scrollToTop()
  }

  const handleKeywordChange = (nextFilters: BrowseFilterState) => {
    setFilters(nextFilters)
    setRouteStack(browseClose)
  }

  const handleCategoryChange = (nextFilters: BrowseFilterState) => {
    setFilters(nextFilters)
    setRouteStack(browseClose)
    runSearch(nextFilters, 0)
    scrollToTop()
  }

  const handleSearch = () => {
    setRouteStack(browseClose)
    runSearch(filters, 0)
    scrollToTop()
  }

  const handleReset = () => {
    const nextFilters = createDefaultBrowseFilters()
    setFilters(nextFilters)
    setRouteStack(browseClose)
    runSearch(nextFilters, 0)
    scrollToTop()
  }

  const handlePrevPage = () => {
    const nextOffset = Math.max(0, offset - PAGE_SIZE)
    setRouteStack(browseClose)
    runSearch(filters, nextOffset)
    scrollToTop()
  }

  const handleNextPage = () => {
    const nextOffset = offset + visibleCount
    setRouteStack(browseClose)
    runSearch(filters, nextOffset)
    scrollToTop()
  }

  const handleViewDetail = async (subjectId: number) => {
    const requestId = detailSeq.current + 1
    detailSeq.current = requestId
    setDetailLoading(true)
    setError('')

    try {
      const snapshot = await fetchBangumiSnapshot(subjectId)
      if (requestId !== detailSeq.current) return
      setRouteStack(browseOpenSubject([], snapshot))
    } catch (detailError) {
      if (requestId !== detailSeq.current) return
      console.error(detailError)
      setError('加载详情失败，请稍后重试')
    } finally {
      if (requestId === detailSeq.current) {
        setDetailLoading(false)
      }
    }
  }

  const handleOpenRelatedSubject = async (subjectId: number) => {
    const requestId = detailSeq.current + 1
    detailSeq.current = requestId
    setDetailLoading(true)
    setError('')

    try {
      const snapshot = await fetchBangumiSnapshot(subjectId)
      if (requestId !== detailSeq.current) return
      setRouteStack(prev => browseOpenSubject(prev, snapshot))
    } catch (detailError) {
      if (requestId !== detailSeq.current) return
      console.error(detailError)
      setError('加载详情失败，请稍后重试')
    } finally {
      if (requestId === detailSeq.current) {
        setDetailLoading(false)
      }
    }
  }

  const handleOpenEntity = useCallback((target: BangumiEntityTarget) => {
    setRouteStack(prev => browseOpenEntity(prev, target))
  }, [])

  const handleBack = useCallback(() => {
    setRouteStack(browseBack)
  }, [])

  // Register header override for drilldown routes
  const pageHeaderState = useMemo((): Parameters<typeof usePageHeaderOverride>[0] => {
    if (!activeRoute) return null
    if (activeRoute.kind === 'subject') {
      const title = activeRoute.snapshot.meta?.title_cn || activeRoute.snapshot.meta?.title || '游戏详情'
      return { title, onBack: handleBack }
    }
    return { title: activeRoute.target.title, onBack: handleBack }
  }, [activeRoute, handleBack])
  usePageHeaderOverride(pageHeaderState, [pageHeaderState])

  const pageNum = offset > 0 ? Math.floor(offset / PAGE_SIZE) + 1 : 1
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : (visibleCount >= PAGE_SIZE ? pageNum + 1 : pageNum)
  const hasNextPage = total > 0 ? offset + visibleCount < total : visibleCount >= PAGE_SIZE
  const hasPrevPage = offset > 0
  const showingFrom = visibleCount > 0 ? offset + 1 : 0
  const showingTo = offset + visibleCount

  return (
    <div className="browse-shell">
      {activeRoute === null ? (
        <>
          <BrowseFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onKeywordChange={handleKeywordChange}
            onCategoryChange={handleCategoryChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          <div className="browse-summary">
            <div className="min-w-0">
              <h1>发现 Bangumi 游戏</h1>
              <p>
                {total > 0 ? `显示 ${showingFrom}-${showingTo} / ${total} 个结果` : `${visibleCount} 个结果`}
                {lastUpdatedAt ? ` · ${new Date(lastUpdatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 更新` : ''}
              </p>
            </div>
            {error && visibleCount > 0 && (
              <button type="button" onClick={handleSearch} className="browse-inline-error">
                {error}，点击重试
              </button>
            )}
          </div>

          <div className="browse-content" ref={scrollRef}>
            {loading && visibleCount === 0 && (
              <div className="browse-grid">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="browse-skeleton rounded-lg overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border)]" style={{ animationDelay: `${index * 60}ms` }}>
                    <div className="aspect-[3/4] bg-[var(--surface-subtle)] animate-pulse" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-[var(--surface-subtle)] animate-pulse rounded" />
                      <div className="h-3 w-2/3 bg-[var(--surface-subtle)] animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error && visibleCount === 0 && (
              <div className="py-20 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button type="button" onClick={handleSearch} className="btn btn-secondary btn-sm mt-3">
                  重试
                </button>
              </div>
            )}

            {!loading && !error && visibleCount === 0 && (
              <div className="py-20 text-center text-sm text-[var(--text-secondary)]">
                没有找到符合条件的结果，试试调整关键词或筛选条件。
              </div>
            )}

            {visibleCount > 0 && (
              <>
                {loading && (
                  <div className="browse-loading-bar">
                    <div className="browse-loading-bar-inner" />
                  </div>
                )}
                {filters.searchKind === 'subject' ? (
                  <div className="browse-grid">
                    {results.map((subject, index) => (
                      <div key={`${subject.id}-${index}`} className="browse-card-enter" style={{ animationDelay: `${Math.min(index % PAGE_SIZE, 20) * 30}ms` }}>
                        <BrowseGameCard
                          subject={subject}
                          isInLibrary={libraryIds.has(String(subject.id))}
                          onViewDetail={handleViewDetail}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="browse-entity-grid">
                    {entityResults.map((item, index) => (
                      <button
                        key={`${item.kind}-${item.id}-${index}`}
                        type="button"
                        onClick={() => handleOpenEntity({ kind: item.kind, id: item.id, title: item.name })}
                        className="browse-entity-card browse-card-enter"
                        style={{ animationDelay: `${Math.min(index % PAGE_SIZE, 20) * 30}ms` }}
                      >
                        {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span>{item.name.slice(0, 1)}</span>}
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.kind === 'character' ? '角色' : '人物'}</small>
                          {item.summary && <p>{item.summary}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Sentinel for infinite scroll */}
                <div ref={sentinelRef} className="h-px" />

                {/* Loading-more indicator */}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* End-of-results marker */}
                {!hasMorePages && visibleCount > PAGE_SIZE && (
                  <div className="py-4 text-center text-xs text-[var(--text-secondary)]">
                    已加载全部结果
                  </div>
                )}
              </>
            )}
          </div>

          {visibleCount > 0 && (
            <div className="browse-pagination">
              <button type="button" onClick={handlePrevPage} disabled={!hasPrevPage || loading} className="btn btn-secondary btn-sm">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="ml-0.5">上一页</span>
              </button>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--text-primary)] font-medium tabular-nums">{pageNum}</span>
                <span className="text-[var(--text-secondary)]">/</span>
                <span className="text-[var(--text-secondary)] tabular-nums">{totalPages}</span>
                {total > 0 && <span className="text-xs text-[var(--text-secondary)] ml-1">({total} 个结果)</span>}
              </div>

              <button type="button" onClick={handleNextPage} disabled={!hasNextPage || loading} className="btn btn-secondary btn-sm">
                <span className="mr-0.5">下一页</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      ) : activeRoute.kind === 'subject' ? (
        <GameDetailPage
          game={activeRoute.snapshot.meta ? games.find(g => g.id === String(activeRoute.snapshot.meta?.subject_id)) || null : null}
          snapshot={activeRoute.snapshot}
          onBack={handleBack}
          onOpenSubject={handleOpenRelatedSubject}
          onOpenEntity={handleOpenEntity}
        />
      ) : (
        <BangumiEntityDetailPanel
          target={activeRoute.target}
          onBack={handleBack}
          onOpenSubject={handleOpenRelatedSubject}
          onOpenPerson={(id, title) => handleOpenEntity({ kind: 'person', id, title })}
          onOpenCharacter={(id, title) => handleOpenEntity({ kind: 'character', id, title })}
        />
      )}

      {detailLoading && (
        <div className="browse-detail-loading">
          <div className="flex items-center gap-3 px-6 py-4 rounded-lg bg-[var(--bg-secondary)] shadow-lg">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[var(--text-secondary)]">加载详情...</span>
          </div>
        </div>
      )}
    </div>
  )
}

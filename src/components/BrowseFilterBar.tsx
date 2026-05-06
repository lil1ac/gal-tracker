import type { BrowseCategory, BrowseFilterState } from '../types'

interface BrowseFilterBarProps {
  filters: BrowseFilterState
  onFiltersChange: (filters: BrowseFilterState) => void
  onKeywordChange: (filters: BrowseFilterState) => void
  onCategoryChange: (filters: BrowseFilterState) => void
  onSearch: () => void
  onReset: () => void
}

const categoryLabels: Record<BrowseCategory, string> = {
  top_ranked: '排行榜',
  popular: '热门',
  latest: '新作',
}

const availableTags = ['galgame', '视觉小说', '恋爱', '校园', '泣きゲー', '悬疑', '科幻', '战斗', '日常', '催泪', '哲学', '电波', '郁系', '推理', '同人']

function presetFilters(category: BrowseCategory): BrowseFilterState {
  switch (category) {
    case 'top_ranked':
      return { category, keyword: '', sort: 'rank', year: '', minScore: '', minRank: '1', maxRank: '', tags: [], nsfw: true }
    case 'popular':
      return { category, keyword: '', sort: 'heat', year: '', minScore: '', minRank: '', maxRank: '', tags: [], nsfw: true }
    case 'latest':
      return { category, keyword: '', sort: 'heat', year: '2026', minScore: '', minRank: '', maxRank: '', tags: [], nsfw: true }
  }
}

export function BrowseFilterBar({ filters, onFiltersChange, onKeywordChange, onCategoryChange, onSearch, onReset }: BrowseFilterBarProps) {
  const update = (patch: Partial<BrowseFilterState>) => {
    onFiltersChange({ ...filters, ...patch })
  }

  const setCategory = (category: BrowseCategory) => {
    onCategoryChange(presetFilters(category))
  }

  const toggleTag = (tag: string) => {
    update({
      tags: filters.tags.includes(tag)
        ? filters.tags.filter(item => item !== tag)
        : [...filters.tags, tag],
    })
  }

  return (
    <div className="browse-filter">
      <div className="browse-filter-primary">
        <div className="browse-category-tabs">
          {(Object.keys(categoryLabels) as BrowseCategory[]).map(category => (
            <button
              key={category}
              type="button"
              onClick={() => setCategory(category)}
              className={filters.category === category ? 'is-active' : ''}
            >
              {categoryLabels[category]}
            </button>
          ))}
        </div>

        <div className="browse-keyword">
          <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filters.keyword}
            onChange={event => onKeywordChange({ ...filters, keyword: event.target.value })}
            onKeyDown={event => {
              if (event.key === 'Enter') onSearch()
            }}
            placeholder="搜索游戏、会社、系列或关键词"
          />
        </div>

        <button type="button" onClick={onSearch} className="btn btn-primary btn-sm">
          搜索
        </button>
        <button type="button" onClick={onReset} className="btn btn-secondary btn-sm">
          重置
        </button>
      </div>

      <div className="browse-filter-controls">
        <select title="排序" value={filters.sort} onChange={event => update({ sort: event.target.value as BrowseFilterState['sort'] })} className="field">
          <option value="heat">热度</option>
          <option value="rank">排名</option>
          <option value="score">评分</option>
          <option value="match">相关度</option>
        </select>

        <select title="年份" value={filters.year} onChange={event => update({ year: event.target.value })} className="field">
          <option value="">全部年份</option>
          {Array.from({ length: 47 }, (_, index) => 2026 - index).map(year => (
            <option key={year} value={String(year)}>{year}</option>
          ))}
        </select>

        <select title="评分下限" value={filters.minScore} onChange={event => update({ minScore: event.target.value })} className="field">
          <option value="">评分下限</option>
          <option value="6">≥ 6.0</option>
          <option value="6.5">≥ 6.5</option>
          <option value="7">≥ 7.0</option>
          <option value="7.5">≥ 7.5</option>
          <option value="8">≥ 8.0</option>
          <option value="8.5">≥ 8.5</option>
          <option value="9">≥ 9.0</option>
        </select>

        <select title="排名下限" value={filters.minRank} onChange={event => update({ minRank: event.target.value })} className="field">
          <option value="">排名下限</option>
          <option value="1">有排名</option>
          <option value="100">Top 100 起</option>
          <option value="500">Top 500 起</option>
          <option value="1000">Top 1000 起</option>
        </select>

        <select title="排名上限" value={filters.maxRank} onChange={event => update({ maxRank: event.target.value })} className="field">
          <option value="">排名上限</option>
          <option value="100">Top 100</option>
          <option value="500">Top 500</option>
          <option value="1000">Top 1000</option>
          <option value="2000">Top 2000</option>
          <option value="5000">Top 5000</option>
        </select>

        <label className="browse-nsfw-toggle">
          <input type="checkbox" checked={filters.nsfw} onChange={event => update({ nsfw: event.target.checked })} />
          NSFW
        </label>
      </div>

      <div className="browse-tag-row">
        {availableTags.map(tag => {
          const active = filters.tags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={active ? 'is-active' : ''}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}

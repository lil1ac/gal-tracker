import { useMemo, useState } from 'react'
import { buildMemoryStats, type MemoryDay } from '../services/memoryStats'
import { type LibraryGame } from '../services/libraryStats'
import type { PlaySession } from '../types'

interface MemoryViewProps {
  games: LibraryGame[]
  sessions: PlaySession[]
  onOpenGame: (game: LibraryGame) => void
}

type ViewMode = 'calendar' | 'timeline'

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']

function formatDuration(seconds: number) {
  if (seconds <= 0) return '-'
  const minutes = Math.max(1, Math.floor(seconds / 60))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours > 0 && rest > 0) return `${hours}小时${rest}分钟`
  if (hours > 0) return `${hours}小时`
  return `${minutes}分钟`
}

function formatShortDuration(seconds: number) {
  if (seconds <= 0) return ''
  const minutes = Math.max(1, Math.floor(seconds / 60))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours > 0 && rest > 0) return `${hours}h${rest}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

function formatClock(timestamp: number | null) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatDayTitle(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function formatMonthLabel(month: number) {
  return `${month + 1}月`
}

function titleOf(game: LibraryGame) {
  return game.name_cn || game.name
}

export function MemoryView({ games, sessions, onOpenGame }: MemoryViewProps) {
  const currentYear = new Date().getFullYear()
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const stats = useMemo(() => buildMemoryStats(games, sessions, selectedYear), [games, sessions, selectedYear])

  const selectedDay: MemoryDay | null = selectedDate
    ? stats.daysByDate[selectedDate] || null
    : null

  // Timeline entries: all sessions in selected year, grouped by date, most recent first
  const timelineDays = useMemo(() => {
    const days: MemoryDay[] = []
    for (let month = 0; month < 12; month++) {
      const m = stats.months[month]
      for (const day of m.days) {
        if (day.seconds > 0) days.push(day)
      }
    }
    days.sort((a, b) => b.timestamp - a.timestamp)
    return days
  }, [stats])

  // Timeline year selector position
  const yearsForSelect = useMemo(() => {
    const all = [...stats.years]
    if (!all.includes(currentYear)) all.push(currentYear)
    return all.sort((a, b) => b - a)
  }, [stats.years, currentYear])

  return (
    <div className="memory-shell">
      <div className="memory-workbench">
        {/* Header */}
        <header className="memory-header">
          <div>
            <p>个人历史</p>
            <h1>回忆</h1>
            <span>按日期回看你什么时候玩了什么。</span>
          </div>
          <div className="memory-header-right">
            <div className="memory-view-toggle">
              <button
                type="button"
                className={`memory-toggle-btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
                onClick={() => setViewMode('calendar')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>月历</span>
              </button>
              <button
                type="button"
                className={`memory-toggle-btn ${viewMode === 'timeline' ? 'is-active' : ''}`}
                onClick={() => setViewMode('timeline')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><polyline points="19 7 12 2 5 7"/><polyline points="5 17 12 22 19 17"/></svg>
                <span>时间轴</span>
              </button>
            </div>
            <select
              value={selectedYear}
              onChange={event => { setSelectedYear(Number(event.target.value)); setSelectedDate(null) }}
              className="field memory-year-select"
            >
              {yearsForSelect.map(year => (
                <option key={year} value={year}>{year} 年</option>
              ))}
            </select>
          </div>
        </header>

        {/* Summary */}
        <section className="memory-summary">
          <div className="memory-summary-tile">
            <span>年度游玩</span>
            <strong>{formatDuration(stats.summary.totalSeconds)}</strong>
            <p>{stats.summary.sessionCount} 次记录</p>
          </div>
          <div className="memory-summary-tile">
            <span>有记录的日子</span>
            <strong>{stats.summary.activeDays} 天</strong>
            <p>{stats.summary.gameCount} 个游戏</p>
          </div>
          <div className="memory-summary-tile">
            <span>最常回到</span>
            <strong>{stats.summary.topGame ? titleOf(stats.summary.topGame.game) : '-'}</strong>
            <p>{stats.summary.topGame ? formatDuration(stats.summary.topGame.seconds) : '暂无记录'}</p>
          </div>
        </section>

        {/* View content */}
        {viewMode === 'calendar' ? (
          <CalendarView
            stats={stats}
            todayKey={todayKey}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            selectedDay={selectedDay}
            onOpenGame={onOpenGame}
          />
        ) : (
          <TimelineView
            timelineDays={timelineDays}
            selectedYear={selectedYear}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenGame={onOpenGame}
          />
        )}
      </div>
    </div>
  )
}

/* ── Calendar View ── */

function CalendarView({
  stats,
  todayKey,
  selectedDate,
  onSelectDate,
  selectedDay,
  onOpenGame,
}: {
  stats: ReturnType<typeof buildMemoryStats>
  todayKey: string
  selectedDate: string | null
  onSelectDate: (date: string) => void
  selectedDay: MemoryDay | null
  onOpenGame: (game: LibraryGame) => void
}) {
  return (
    <div className="memory-main">
      <div className="memory-year-grid">
        {stats.months.map((month, monthIdx) => {
          const activeCount = month.days.filter(d => d.seconds > 0).length
          return (
            <div key={monthIdx} className="memory-month-card">
              <div className="memory-month-header">
                <span className="memory-month-name">{formatMonthLabel(monthIdx)}</span>
                {activeCount > 0 && <span className="memory-month-count">{activeCount} 天</span>}
              </div>
              <div className="memory-mini-weekdays">
                {weekdayLabels.map(label => <span key={label}>{label}</span>)}
              </div>
              <div className="memory-mini-grid">
                {month.calendarDays.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="memory-mini-day is-empty" />
                  const active = day.seconds > 0
                  const selected = selectedDate === day.date
                  const isToday = day.date === todayKey
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => onSelectDate(day.date)}
                      className={`memory-mini-day ${active ? 'has-data' : ''} ${selected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                      title={active ? `${day.date}\n${formatDuration(day.seconds)}` : day.date}
                    >
                      <span className="memory-mini-day-num">{Number(day.date.slice(-2))}</span>
                      {active && <span className="memory-mini-dot" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Panel */}
      <aside className="memory-detail-panel">
        {selectedDay && selectedDay.seconds > 0 ? (
          <>
            <div className="memory-section-head">
              <div>
                <h2>{formatDayTitle(selectedDay.date)}</h2>
                <p>{selectedDay.sessionCount} 次记录 / {formatDuration(selectedDay.seconds)}</p>
              </div>
            </div>
            <div className="memory-entry-list">
              {selectedDay.entries.map(entry => (
                <button key={entry.game.id} type="button" onClick={() => onOpenGame(entry.game)} className="memory-entry">
                  {entry.game.cover_url ? <img src={entry.game.cover_url} alt="" /> : <span className="memory-entry-cover-empty">无</span>}
                  <span className="memory-entry-main">
                    <strong>{titleOf(entry.game)}</strong>
                    {entry.game.name_cn && <small>{entry.game.name}</small>}
                    <em>{formatClock(entry.firstStartedAt)}{entry.lastEndedAt ? ` - ${formatClock(entry.lastEndedAt)}` : ''}</em>
                  </span>
                  <span className="memory-entry-duration">{formatDuration(entry.seconds)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="memory-empty-detail">
            <div className="memory-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h2>{selectedDay ? '这一天还没有记录' : '选择一天'}</h2>
            <p>{selectedDay ? '换个日子试试吧。' : '点击月历中有标记的日期，查看当天的游玩详情。'}</p>
          </div>
        )}
      </aside>
    </div>
  )
}

/* ── Timeline View ── */

function TimelineView({
  timelineDays,
  selectedYear,
  selectedDate,
  onSelectDate,
  onOpenGame,
}: {
  timelineDays: MemoryDay[]
  selectedYear: number
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onOpenGame: (game: LibraryGame) => void
}) {
  if (timelineDays.length === 0) {
    return (
      <div className="memory-timeline-empty">
        <div className="memory-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
            <line x1="12" y1="2" x2="12" y2="22"/>
            <polyline points="19 7 12 2 5 7"/>
            <polyline points="5 17 12 22 19 17"/>
          </svg>
        </div>
        <h2>{selectedYear} 年暂无记录</h2>
        <p>开始记录游玩后，时间轴会在这里显示。</p>
      </div>
    )
  }

  return (
    <div className="memory-timeline-shell">
      {/* Vertical timeline line */}
      <div className="memory-timeline">
        {timelineDays.map((day) => {
          const isSelected = selectedDate === day.date
          return (
            <div key={day.date} className={`memory-timeline-group ${isSelected ? 'is-selected' : ''}`}>
              {/* Date marker */}
              <div className="memory-timeline-marker">
                <button
                  type="button"
                  className={`memory-timeline-dot ${isSelected ? 'is-active' : ''}`}
                  onClick={() => onSelectDate(isSelected ? '' : day.date)}
                  aria-label={formatDayTitle(day.date)}
                />
                <div className="memory-timeline-date">
                  <span className="memory-timeline-date-main">
                    {formatDayTitle(day.date)}
                  </span>
                  <span className="memory-timeline-date-meta">
                    {day.sessionCount} 次记录 · {formatDuration(day.seconds)}
                  </span>
                </div>
              </div>

              {/* Entries */}
              <div className={`memory-timeline-entries ${isSelected ? 'is-expanded' : ''}`}>
                {day.entries.map(entry => (
                  <button
                    key={entry.game.id}
                    type="button"
                    onClick={() => onOpenGame(entry.game)}
                    className="memory-timeline-entry"
                  >
                    <div className="memory-timeline-entry-cover">
                      {entry.game.cover_url ? (
                        <img src={entry.game.cover_url} alt="" />
                      ) : (
                        <span className="memory-timeline-entry-cover-empty">无</span>
                      )}
                    </div>
                    <div className="memory-timeline-entry-body">
                      <div className="memory-timeline-entry-title">
                        <strong>{titleOf(entry.game)}</strong>
                        <span className="memory-timeline-entry-time">
                          {formatShortDuration(entry.seconds)}
                        </span>
                      </div>
                      {entry.game.name_cn && (
                        <small className="memory-timeline-entry-sub">{entry.game.name}</small>
                      )}
                      <span className="memory-timeline-entry-clock">
                        {formatClock(entry.firstStartedAt)}
                        {entry.lastEndedAt ? ` — ${formatClock(entry.lastEndedAt)}` : ' — 进行中'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

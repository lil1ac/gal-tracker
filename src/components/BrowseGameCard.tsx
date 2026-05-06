import type { BangumiSubject } from '../types'

interface BrowseGameCardProps {
  subject: BangumiSubject
  isInLibrary: boolean
  onViewDetail: (id: number) => void
}

export function BrowseGameCard({ subject, isInLibrary, onViewDetail }: BrowseGameCardProps) {
  const title = subject.name_cn || subject.name || `#${subject.id}`
  const year = subject.air_date?.split('-')[0]

  return (
    <button
      type="button"
      onClick={() => onViewDetail(subject.id)}
      className="browse-card rounded-lg overflow-hidden cursor-pointer bg-[var(--bg-secondary)] border border-[var(--border)] group text-left"
    >
      <div className="aspect-[3/4] relative bg-[var(--bg-primary)]">
        {subject.cover ? (
          <img
            src={subject.cover}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] text-sm">
            无封面
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Library badge */}
        {isInLibrary && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--accent)] text-white shadow-md">
            已入库
          </span>
        )}

        {/* Score badge - bottom right */}
        <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {subject.score !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-black/60 text-amber-400">
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {subject.score.toFixed(1)}
            </span>
          )}
        </div>

        {/* Rank badge - top left, visible on hover if ranked */}
        {subject.rank !== null && (
          <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-black/60 text-white">
              #{subject.rank}
            </span>
          </div>
        )}
      </div>

      <div className="p-2">
        <h3 className="text-[13px] font-medium truncate group-hover:text-[var(--accent)] transition-colors duration-200">
          {title}
        </h3>
        {subject.name_cn && subject.name && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">{subject.name}</p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--text-secondary)]">
          {subject.rank !== null && (
            <span className="tabular-nums font-medium">#{subject.rank}</span>
          )}
          {subject.score !== null && (
            <span className="tabular-nums">{subject.score.toFixed(1)}</span>
          )}
          {year && (
            <span>{year}</span>
          )}
        </div>
      </div>
    </button>
  )
}

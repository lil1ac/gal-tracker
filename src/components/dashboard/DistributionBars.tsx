import type { DashboardDistributionItem } from '../../services/dashboardStats'

interface DistributionBarsProps {
  title: string
  items: DashboardDistributionItem[]
  emptyText: string
  compact?: boolean
}

export function DistributionBars({ title, items, emptyText, compact = false }: DistributionBarsProps) {
  const visibleItems = items.filter(item => item.count > 0)

  return (
    <section className="dashboard-panel">
      <h2 className="dashboard-section-title">{title}</h2>
      {visibleItems.length === 0 ? (
        <div className="dashboard-empty">{emptyText}</div>
      ) : (
        <div className={compact ? 'grid grid-cols-2 gap-x-5 gap-y-3' : 'space-y-3'}>
          {visibleItems.map(item => (
            <div key={item.key} className="dashboard-bar-row">
              <div className="dashboard-bar-meta">
                <span>{item.label}</span>
                <span>{item.count} · {item.percent}%</span>
              </div>
              <div className="dashboard-bar-track">
                <div
                  className="dashboard-bar-fill"
                  style={{ width: `${Math.max(3, item.percent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

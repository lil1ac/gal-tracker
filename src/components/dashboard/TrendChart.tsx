import { formatDuration } from '../../services/libraryStats'
import type { DashboardTrendPoint } from '../../services/dashboardStats'

interface TrendChartProps {
  points: DashboardTrendPoint[]
}

export function TrendChart({ points }: TrendChartProps) {
  const maxSeconds = Math.max(...points.map(point => point.seconds), 0)
  const hasData = maxSeconds > 0

  return (
    <section className="dashboard-panel dashboard-trend-panel">
      <div className="dashboard-section-head">
        <h2 className="dashboard-section-title">近 30 天游玩趋势</h2>
        <span>按开始日期统计</span>
      </div>
      {!hasData ? (
        <div className="dashboard-empty is-tall">暂无游玩记录</div>
      ) : (
        <div className="dashboard-chart">
          <div className="dashboard-chart-grid" />
          <div className="dashboard-chart-bars">
            {points.map(point => {
              const height = maxSeconds === 0 ? 0 : Math.max(4, Math.round((point.seconds / maxSeconds) * 100))
              return (
                <div key={point.date} className="dashboard-chart-column group">
                  <div className="dashboard-tooltip">
                    {point.label} · {formatDuration(point.seconds)}
                  </div>
                  <div
                    className="dashboard-chart-bar"
                    style={{ height: `${height}%` }}
                    title={`${point.label} ${formatDuration(point.seconds)}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="dashboard-chart-labels">
            <span>{points[0]?.label}</span>
            <span>{points[Math.floor(points.length / 2)]?.label}</span>
            <span>{points[points.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </section>
  )
}

interface MetricTileProps {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'accent'
}

export function MetricTile({ label, value, hint, tone = 'default' }: MetricTileProps) {
  return (
    <div className={`dashboard-metric ${tone === 'accent' ? 'is-accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <p>{hint}</p> : null}
    </div>
  )
}

/**
 * Shared chart card. Optional `toolbar` renders controls on the right of the title row.
 */
export default function ChartCard({ title, sub, toolbar, children, style, className }) {
  return (
    <div className={`chart-wrapper${className ? ' ' + className : ''}`} style={style}>
      <div className="chart-head">
        <div className="chart-head-titles">
          <div className="chart-title">{title}</div>
          {sub && <div className="chart-sub">{sub}</div>}
        </div>
        {toolbar && <div className="chart-toolbar">{toolbar}</div>}
      </div>
      {children}
    </div>
  )
}

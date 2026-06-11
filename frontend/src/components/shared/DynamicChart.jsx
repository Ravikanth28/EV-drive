import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import ChartCard from './ChartCard'

/* ── chart-type icons ─────────────────────────────────── */
const TypeIcon = ({ type }) => {
  if (type === 'line') return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 11l3.5-4 3 2L14 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
  if (type === 'area') return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 11l3.5-4 3 2L14 4v8H2z" fill="currentColor" opacity="0.35" /><path d="M2 11l3.5-4 3 2L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
  return ( // bar
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="8" width="3" height="6" rx="1" fill="currentColor" /><rect x="6.5" y="4" width="3" height="10" rx="1" fill="currentColor" /><rect x="11" y="6" width="3" height="8" rx="1" fill="currentColor" /></svg>
  )
}

const TYPE_LABEL = { bar: 'Bar', line: 'Line', area: 'Area' }

/**
 * A chart card with a built-in type switcher (bar/line/area) and optional metric selector.
 *
 * Props:
 *  title, sub, height
 *  xKey                      x-axis dataKey (default 'month')
 *  types                     allowed chart types, default ['bar','line','area']
 *  defaultType
 *  metrics                   [{ key, label, color, data?, format?, colorFn? }]
 *                            If multiple, they render as multiple series (no selector).
 *  metricOptions             [{ key, label, color, data, dataKey?, format?, colorFn? }]
 *                            If provided, a dropdown selects ONE metric to show.
 *  data                      shared dataset (used when a metric has no own `data`)
 *  xTickProps, yTickFormatter, extraToolbar
 */
export default function DynamicChart({
  title,
  sub,
  height = 240,
  xKey = 'month',
  types = ['bar', 'line', 'area'],
  defaultType,
  metrics,
  metricOptions,
  data = [],
  yTickFormatter,
  xTickProps,
  extraToolbar,
}) {
  const [type, setType] = useState(defaultType || types[0])
  const [activeMetric, setActiveMetric] = useState(metricOptions ? metricOptions[0].key : null)

  // Resolve series + data
  let series
  let chartData
  if (metricOptions) {
    const opt = metricOptions.find(m => m.key === activeMetric) || metricOptions[0]
    chartData = opt.data ?? data
    series = [{ key: opt.dataKey || 'value', label: opt.label, color: opt.color, format: opt.format, colorFn: opt.colorFn }]
  } else {
    series = metrics
    chartData = data
  }

  const fmtTip = (v, name) => {
    const s = series.find(x => x.label === name) || series[0]
    return [s?.format ? s.format(v) : v, name]
  }

  const gid = s => `dcg-${String(s.key).replace(/\W/g, '')}-${String(s.color).replace('#', '')}`

  const renderSeries = () => series.map(s => {
    if (type === 'line') {
      return <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
    }
    if (type === 'area') {
      return <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={`url(#${gid(s)})`} dot={{ r: 3 }} />
    }
    return (
      <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[5, 5, 0, 0]}>
        {s.colorFn && chartData.map((row, ci) => <Cell key={ci} fill={s.colorFn(row)} />)}
      </Bar>
    )
  })

  const ChartEl = type === 'line' ? LineChart : type === 'area' ? AreaChart : BarChart

  const toolbar = (
    <>
      {extraToolbar}
      {metricOptions && (
        <select className="mini-select" value={activeMetric} onChange={e => setActiveMetric(e.target.value)}>
          {metricOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      )}
      {types.length > 1 && (
        <div className="seg" role="group" aria-label="Chart type">
          {types.map(t => (
            <button
              key={t}
              type="button"
              className={`seg-btn${type === t ? ' active' : ''}`}
              onClick={() => setType(t)}
              title={`${TYPE_LABEL[t]} chart`}
              aria-label={`${TYPE_LABEL[t]} chart`}
            >
              <TypeIcon type={t} />
            </button>
          ))}
        </div>
      )}
    </>
  )

  return (
    <ChartCard title={title} sub={sub} toolbar={toolbar}>
      <ResponsiveContainer width="100%" height={height}>
        <ChartEl data={chartData} margin={{ top: 8, right: 20, bottom: 6, left: 8 }}>
          {type === 'area' && (
            <defs>
              {series.map(s => (
                <linearGradient key={gid(s)} id={gid(s)} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
          )}
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#868c98' }} tickLine={false} axisLine={{ stroke: '#e8e9ee' }} {...xTickProps} />
          <YAxis tick={{ fontSize: 11, fill: '#868c98' }} tickLine={false} axisLine={false} tickFormatter={yTickFormatter} />
          <Tooltip formatter={fmtTip} contentStyle={{ borderRadius: 10, border: '1px solid #e8e9ee', boxShadow: '0 6px 16px rgba(20,22,28,0.10)', fontSize: 12 }} />
          {series.length > 1 && <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 10, fontSize: 12 }} />}
          {renderSeries()}
        </ChartEl>
      </ResponsiveContainer>
    </ChartCard>
  )
}

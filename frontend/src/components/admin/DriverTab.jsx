import { useContext, useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { DataContext } from '../../App'
import {
  uniqueValues, groupBy, monthlyAgg, countWhere,
  fmtNum, fmtCurrency, sumBy, avgBy, driverName,
} from '../../utils/dataUtils'

export default function DriverTab() {
  const data = useContext(DataContext)
  const driverIds = useMemo(() => uniqueValues(data, 'Driver_ID').map(String), [data])
  const [selectedDriver, setDriver] = useState(driverIds[0] ?? '')

  const dRows = useMemo(
    () => data.filter(r => String(r.Driver_ID) === selectedDriver),
    [data, selectedDriver]
  )

  // ── Monthly overspeed count ────────────────────────────────────────────────
  const monthlyOverspeed = useMemo(
    () => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Overspeed === 'Yes')),
    [dRows]
  )

  // ── Monthly distance ──────────────────────────────────────────────────────
  const monthlyDist = useMemo(
    () => monthlyAgg(dRows, 'Distance_Travelled_km'),
    [dRows]
  )

  // ── Monthly expense ───────────────────────────────────────────────────────
  const monthlyExp = useMemo(
    () => monthlyAgg(dRows, 'Total_Expense'),
    [dRows]
  )

  // ── Monthly income ────────────────────────────────────────────────────────
  const monthlyInc = useMemo(
    () => monthlyAgg(dRows, 'Income_Generated'),
    [dRows]
  )

  // ── Maintenance events per month ──────────────────────────────────────────
  const monthlyWorkshop = useMemo(
    () => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Workshop_Visit === 'Yes')),
    [dRows]
  )

  // ── Breakdown per month ───────────────────────────────────────────────────
  const monthlyBreakdown = useMemo(
    () => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Breakdown === 'Yes')),
    [dRows]
  )

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalTrips:    dRows.length,
    totalKm:       sumBy(dRows, 'Distance_Travelled_km'),
    overspeedPct:  dRows.length ? (countWhere(dRows, r => r.Overspeed === 'Yes') / dRows.length * 100) : 0,
    totalIncome:   sumBy(dRows, 'Income_Generated'),
    totalExpense:  sumBy(dRows, 'Total_Expense'),
    workshops:     countWhere(dRows, r => r.Workshop_Visit === 'Yes'),
    breakdowns:    countWhere(dRows, r => r.Breakdown === 'Yes'),
    avgSpeed:      avgBy(dRows, 'Speed_kmph'),
  }), [dRows])

  return (
    <div className="tab-content">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <p className="section-title">Driver Performance Analytics</p>
          <p className="section-sub">Month-wise breakdown per driver — overspeed, income, expenses & maintenance</p>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Driver</label>
            <select className="select" value={selectedDriver} onChange={e => setDriver(e.target.value)}>
              {driverIds.map(d => (
                <option key={d} value={d}>{driverName(d)} (#{d})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="stat-cards">
        <div className="stat-card blue">
          <span className="label">Total Trips</span>
          <span className="value">{fmtNum(stats.totalTrips)}</span>
        </div>
        <div className="stat-card cyan">
          <span className="label">Total Distance</span>
          <span className="value">{fmtNum(stats.totalKm, 0)} km</span>
        </div>
        <div className="stat-card red">
          <span className="label">Overspeed %</span>
          <span className="value">{stats.overspeedPct.toFixed(1)}%</span>
          <span className="sub">{countWhere(dRows, r => r.Overspeed === 'Yes')} events</span>
        </div>
        <div className="stat-card green">
          <span className="label">Total Income</span>
          <span className="value">{fmtCurrency(stats.totalIncome)}</span>
        </div>
        <div className="stat-card orange">
          <span className="label">Total Expense</span>
          <span className="value">{fmtCurrency(stats.totalExpense)}</span>
        </div>
        <div className="stat-card purple">
          <span className="label">Workshop Visits</span>
          <span className="value">{stats.workshops}</span>
        </div>
        <div className="stat-card red">
          <span className="label">Breakdowns</span>
          <span className="value">{stats.breakdowns}</span>
        </div>
        <div className="stat-card cyan">
          <span className="label">Avg Speed</span>
          <span className="value">{stats.avgSpeed.toFixed(1)} km/h</span>
        </div>
      </div>

      {/* ── Row 1: Overspeed + Distance ── */}
      <div className="charts-grid-2">
        <ChartCard title="Monthly Overspeed Events" sub="Number of trips where speed limit was exceeded">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyOverspeed} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Events', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip formatter={v => [v, 'Overspeed Events']} />
              <Bar dataKey="value" name="Overspeed Events" fill="#dc2626" radius={[4, 4, 0, 0]}>
                {monthlyOverspeed.map((_, i) => (
                  <Cell key={i} fill={_ .value > 5 ? '#dc2626' : '#fca5a5'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Distance Travelled (km)" sub="Total kilometres covered per month">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyDist} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'km', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip formatter={v => [fmtNum(v, 1) + ' km', 'Distance']} />
              <Legend verticalAlign="top" />
              <Line type="monotone" dataKey="value" name="Distance (km)" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 2: Income + Expense ── */}
      <div className="charts-grid-2">
        <ChartCard title="Monthly Income Generated (₹)" sub="Revenue generated per month">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyInc} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'} label={{ value: 'Income (₹)', angle: -90, position: 'insideLeft', offset: -10, fontSize: 11 }} />
              <Tooltip formatter={v => [fmtCurrency(v), 'Income']} />
              <Bar dataKey="value" name="Income (₹)" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Expenses (₹)" sub="Total operational expenses per month">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyExp} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'} label={{ value: 'Expense (₹)', angle: -90, position: 'insideLeft', offset: -10, fontSize: 11 }} />
              <Tooltip formatter={v => [fmtCurrency(v), 'Expense']} />
              <Bar dataKey="value" name="Expense (₹)" fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 3: Workshop + Breakdown ── */}
      <div className="charts-grid-2">
        <ChartCard title="Monthly Workshop Visits" sub="Maintenance visits count per month">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyWorkshop} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Visits', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip formatter={v => [v, 'Workshop Visits']} />
              <Bar dataKey="value" name="Workshop Visits" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Breakdown Events" sub="Number of breakdowns reported per month">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyBreakdown} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Breakdowns', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip formatter={v => [v, 'Breakdowns']} />
              <Legend verticalAlign="top" />
              <Line type="monotone" dataKey="value" name="Breakdowns" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({ title, sub, children }) {
  return (
    <div className="chart-wrapper">
      <div className="chart-title">{title}</div>
      {sub && <div className="chart-sub">{sub}</div>}
      {children}
    </div>
  )
}

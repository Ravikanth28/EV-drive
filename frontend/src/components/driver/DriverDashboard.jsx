import { useContext, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { DataContext } from '../../App'
import {
  monthlyAgg, countWhere, sumBy, avgBy,
  fmtNum, fmtCurrency, driverName,
} from '../../utils/dataUtils'

export default function DriverDashboard({ user, onLogout }) {
  const data    = useContext(DataContext)
  const driverId = String(user.id)

  // ── Filter to this driver only ────────────────────────────────────────────
  const dRows = useMemo(
    () => data.filter(r => String(r.Driver_ID) === driverId),
    [data, driverId]
  )

  // ── Monthly aggregations ──────────────────────────────────────────────────
  const monthlyOverspeed = useMemo(
    () => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Overspeed === 'Yes')),
    [dRows]
  )
  const monthlyDist = useMemo(() => monthlyAgg(dRows, 'Distance_Travelled_km'), [dRows])
  const monthlyInc  = useMemo(() => monthlyAgg(dRows, 'Income_Generated'), [dRows])
  const monthlyExp  = useMemo(() => monthlyAgg(dRows, 'Total_Expense'), [dRows])
  const monthlyWorkshop = useMemo(
    () => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Workshop_Visit === 'Yes')),
    [dRows]
  )
  const monthlyBreakdown = useMemo(
    () => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Breakdown === 'Yes')),
    [dRows]
  )

  // ── Income vs Expense combined chart ──────────────────────────────────────
  const monthlyFinance = useMemo(() => {
    const expMap = Object.fromEntries(monthlyExp.map(r => [r.month, r.value]))
    return monthlyInc.map(r => ({
      month: r.month,
      income: r.value,
      expense: expMap[r.month] ?? 0,
    }))
  }, [monthlyInc, monthlyExp])

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalTrips:    dRows.length,
    totalKm:       sumBy(dRows, 'Distance_Travelled_km'),
    overspeedCount: countWhere(dRows, r => r.Overspeed === 'Yes'),
    overspeedPct:  dRows.length ? (countWhere(dRows, r => r.Overspeed === 'Yes') / dRows.length * 100) : 0,
    totalIncome:   sumBy(dRows, 'Income_Generated'),
    totalExpense:  sumBy(dRows, 'Total_Expense'),
    netProfit:     sumBy(dRows, 'Income_Generated') - sumBy(dRows, 'Total_Expense'),
    workshops:     countWhere(dRows, r => r.Workshop_Visit === 'Yes'),
    breakdowns:    countWhere(dRows, r => r.Breakdown === 'Yes'),
    avgSpeed:      avgBy(dRows, 'Speed_kmph'),
    avgPassengers: avgBy(dRows, 'Passenger_Count'),
  }), [dRows])

  // ── Recent trips (last 10) ────────────────────────────────────────────────
  const recentTrips = useMemo(
    () => [...dRows]
      .sort((a, b) => new Date(b.Date) - new Date(a.Date))
      .slice(0, 10),
    [dRows]
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'var(--sidebar-bg)',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #1e293b',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: '22px', marginBottom: '2px' }}>⚡</div>
          <div style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>EV Fleet</div>
          <div style={{ color: '#475569', fontSize: '11px' }}>Driver Portal</div>
        </div>

        {/* Driver info card */}
        <div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e40af, #2563eb)',
            borderRadius: '10px',
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: '28px', textAlign: 'center', marginBottom: '6px' }}>🚗</div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px', textAlign: 'center' }}>
              {driverName(driverId)}
            </div>
            <div style={{ color: '#bfdbfe', fontSize: '11px', textAlign: 'center' }}>Driver #{driverId}</div>
            <div style={{ color: '#bfdbfe', fontSize: '11px', textAlign: 'center', marginTop: '2px' }}>
              {stats.totalTrips} trips recorded
            </div>
          </div>
        </div>

        {/* Quick stats in sidebar */}
        <div style={{ padding: '12px', flex: 1 }}>
          {[
            { label: 'Total Distance', value: fmtNum(stats.totalKm, 0) + ' km', color: '#0891b2' },
            { label: 'Total Income', value: fmtCurrency(stats.totalIncome), color: '#16a34a' },
            { label: 'Overspeed %', value: stats.overspeedPct.toFixed(1) + '%', color: stats.overspeedPct > 20 ? '#dc2626' : '#ea580c' },
            { label: 'Breakdowns', value: String(stats.breakdowns), color: stats.breakdowns > 0 ? '#dc2626' : '#16a34a' },
          ].map(item => (
            <div key={item.label} style={{
              background: '#1e293b',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '8px',
            }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {item.label}
              </div>
              <div style={{ color: item.color, fontWeight: '700', fontSize: '15px', marginTop: '2px' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
            Logged in as <span style={{ color: '#fff', fontWeight: '600' }}>Driver {driverId}</span>
          </div>
          <button
            onClick={onLogout}
            style={{
              width: '100%', padding: '8px',
              background: '#1e293b', color: '#94a3b8',
              border: '1px solid #334155', borderRadius: '8px',
              cursor: 'pointer', fontSize: '12px',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{
          background: 'var(--card-bg)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              🚗 My Performance Dashboard
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Driver #{driverId} — Personal analytics overview
            </p>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            EV Fleet Analytics Platform
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>

          {/* ── KPI Cards ── */}
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
              <span className="label">Overspeed Rate</span>
              <span className="value">{stats.overspeedPct.toFixed(1)}%</span>
              <span className="sub">{stats.overspeedCount} events</span>
            </div>
            <div className="stat-card green">
              <span className="label">Total Income</span>
              <span className="value" style={{ fontSize: '18px' }}>{fmtCurrency(stats.totalIncome)}</span>
            </div>
            <div className="stat-card orange">
              <span className="label">Total Expense</span>
              <span className="value" style={{ fontSize: '18px' }}>{fmtCurrency(stats.totalExpense)}</span>
            </div>
            <div className={`stat-card ${stats.netProfit >= 0 ? 'blue' : 'red'}`}>
              <span className="label">Net Earnings</span>
              <span className="value" style={{ fontSize: '18px' }}>{fmtCurrency(stats.netProfit)}</span>
            </div>
            <div className="stat-card purple">
              <span className="label">Workshop Visits</span>
              <span className="value">{stats.workshops}</span>
            </div>
            <div className="stat-card red">
              <span className="label">Breakdowns</span>
              <span className="value">{stats.breakdowns}</span>
            </div>
          </div>

          {/* ── Row 1: Overspeed + Distance ── */}
          <div className="charts-grid-2">
            <ChartCard title="Monthly Overspeed Events" sub="Number of trips where you exceeded the speed limit each month">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyOverspeed} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Overspeed Events', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <Tooltip formatter={v => [v, 'Overspeed Events']} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="value" name="Overspeed Events" radius={[4, 4, 0, 0]}>
                    {monthlyOverspeed.map((entry, i) => (
                      <Cell key={i} fill={entry.value > 5 ? '#dc2626' : '#fca5a5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Distance Travelled (km)" sub="Total distance covered each month across all your trips">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyDist} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                  <defs>
                    <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <Tooltip formatter={v => [fmtNum(v, 1) + ' km', 'Distance']} />
                  <Legend verticalAlign="top" />
                  <Area type="monotone" dataKey="value" name="Distance (km)" stroke="#2563eb" fill="url(#distGrad)" strokeWidth={2} dot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Row 2: Income vs Expense ── */}
          <ChartCard title="Monthly Income vs Expense (₹)" sub="Your revenue generated vs operational costs each month">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={monthlyFinance} margin={{ top: 10, right: 30, bottom: 20, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'}
                  label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', offset: -15, fontSize: 11 }}
                />
                <Tooltip formatter={(v, name) => [fmtCurrency(v), name]} />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '8px' }} />
                <Bar dataKey="income" name="Income (₹)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense (₹)" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Row 3: Workshop + Breakdown ── */}
          <div className="charts-grid-2">
            <ChartCard title="Monthly Workshop Visits" sub="Number of maintenance visits per month">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyWorkshop} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Visits', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <Tooltip formatter={v => [v, 'Workshop Visits']} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="value" name="Workshop Visits" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Breakdown Events" sub="Number of breakdowns reported per month">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyBreakdown} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Breakdowns', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <Tooltip formatter={v => [v, 'Breakdown Events']} />
                  <Legend verticalAlign="top" />
                  <Line type="monotone" dataKey="value" name="Breakdown Events" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Recent Trips Table ── */}
          <div className="chart-wrapper" style={{ overflowX: 'auto' }}>
            <div className="chart-title">Recent Trips (Last 10)</div>
            <div className="chart-sub">Your most recent trip records with key performance indicators</div>
            <table className="data-table">
              <thead>
                <tr>
                  {['Date', 'Vehicle', 'Distance (km)', 'Speed (km/h)', 'Overspeed', 'Passengers', 'Income (₹)', 'Expense (₹)', 'Workshop', 'Breakdown'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((trip, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>{trip.Date}</td>
                    <td style={{ fontWeight: '700' }}>{trip.Vehicle_ID}</td>
                    <td>{Number(trip.Distance_Travelled_km || 0).toFixed(1)}</td>
                    <td>{Number(trip.Speed_kmph || 0).toFixed(1)}</td>
                    <td><span className={`badge ${trip.Overspeed === 'Yes' ? 'badge-red' : 'badge-green'}`}>{trip.Overspeed === 'Yes' ? 'Yes' : 'No'}</span></td>
                    <td>{trip.Passenger_Count}</td>
                    <td style={{ color: 'var(--success)', fontWeight: '600' }}>{fmtCurrency(parseFloat(trip.Income_Generated) || 0)}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: '600' }}>{fmtCurrency(parseFloat(trip.Total_Expense) || 0)}</td>
                    <td><span className={`badge ${trip.Workshop_Visit === 'Yes' ? 'badge-orange' : 'badge-green'}`}>{trip.Workshop_Visit === 'Yes' ? 'Yes' : 'No'}</span></td>
                    <td><span className={`badge ${trip.Breakdown === 'Yes' ? 'badge-red' : 'badge-green'}`}>{trip.Breakdown === 'Yes' ? 'Yes' : 'No'}</span></td>
                  </tr>
                ))}
                {recentTrips.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No trip data found for Driver #{driverId}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  )
}

function ChartCard({ title, sub, children }) {
  return (
    <div className="chart-wrapper" style={{ marginBottom: '20px' }}>
      <div className="chart-title">{title}</div>
      {sub && <div className="chart-sub">{sub}</div>}
      {children}
    </div>
  )
}

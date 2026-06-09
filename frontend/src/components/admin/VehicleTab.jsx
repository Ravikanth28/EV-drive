import { useContext, useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { DataContext } from '../../App'
import {
  uniqueValues, monthlyAgg, countWhere, sumBy, avgBy,
  fmtNum, fmtCurrency, COLORS, groupBy,
} from '../../utils/dataUtils'

export default function VehicleTab() {
  const data = useContext(DataContext)
  const vehicleIds = useMemo(() => uniqueValues(data, 'Vehicle_ID'), [data])
  const [selectedVehicle, setVehicle] = useState(vehicleIds[0] ?? '')
  const [activeView, setActiveView] = useState('overview') // 'overview' | 'brand'

  // ── Rows for selected vehicle (last 3 months of data) ────────────────────
  const vRows = useMemo(() => {
    const allVRows = data.filter(r => r.Vehicle_ID === selectedVehicle)
    // Find the latest date in this vehicle's records, then take last 3 months
    const dates = allVRows.map(r => r.Date).filter(Boolean).sort()
    if (!dates.length) return allVRows
    const latest = new Date(dates[dates.length - 1])
    const cutoff = new Date(latest)
    cutoff.setMonth(cutoff.getMonth() - 2)
    cutoff.setDate(1)
    return allVRows.filter(r => r.Date && new Date(r.Date) >= cutoff)
  }, [data, selectedVehicle])
  const vInfo = useMemo(
    () => data.find(r => r.Vehicle_ID === selectedVehicle) || {},
    [data, selectedVehicle]
  )

  // ── Monthly charging sessions ──────────────────────────────────────────────
  const monthlyCharging = useMemo(
    () => monthlyAgg(vRows, null, rows => countWhere(rows, r => r.Charging_Status === 'Yes')),
    [vRows]
  )
  // ── Monthly avg passengers ─────────────────────────────────────────────────
  const monthlyPassengers = useMemo(
    () => monthlyAgg(vRows, 'Passenger_Count', 'avg'),
    [vRows]
  )
  // ── Monthly workshop visits ────────────────────────────────────────────────
  const monthlyWorkshop = useMemo(
    () => monthlyAgg(vRows, null, rows => countWhere(rows, r => r.Workshop_Visit === 'Yes')),
    [vRows]
  )
  // ── Monthly expense ────────────────────────────────────────────────────────
  const monthlyExp = useMemo(
    () => monthlyAgg(vRows, 'Total_Expense'),
    [vRows]
  )
  // ── Monthly overspeed count ────────────────────────────────────────────────
  const monthlyOverspeed = useMemo(
    () => monthlyAgg(vRows, null, rows => countWhere(rows, r => r.Overspeed === 'Yes')),
    [vRows]
  )

  // ── Brand-wise aggregation ─────────────────────────────────────────────────
  const brandStats = useMemo(() => {
    const byBrand = groupBy(data, 'Brand')
    return Object.entries(byBrand).map(([brand, rows]) => ({
      brand,
      totalVehicles: uniqueValues(rows, 'Vehicle_ID').length,
      totalDistance: Math.round(sumBy(rows, 'Distance_Travelled_km')),
      avgExpense:    Math.round(avgBy(rows, 'Total_Expense') * 100) / 100,
      overspeedEvents: countWhere(rows, r => r.Overspeed === 'Yes'),
      workshopVisits:  countWhere(rows, r => r.Workshop_Visit === 'Yes'),
      breakdowns:      countWhere(rows, r => r.Breakdown === 'Yes'),
      totalIncome:  Math.round(sumBy(rows, 'Income_Generated')),
    })).sort((a, b) => b.totalVehicles - a.totalVehicles)
  }, [data])

  // ── Overspeed: how many cars exceed speed limit ───────────────────────────
  const carsByOverspeedCount = useMemo(() => {
    const byVehicle = groupBy(data, 'Vehicle_ID')
    return Object.entries(byVehicle).map(([vid, rows]) => ({
      vehicle: vid,
      overspeedTrips: countWhere(rows, r => r.Overspeed === 'Yes'),
    })).sort((a, b) => b.overspeedTrips - a.overspeedTrips).slice(0, 15)
  }, [data])

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalTrips:      vRows.length,
    totalKm:         sumBy(vRows, 'Distance_Travelled_km'),
    chargingSessions: countWhere(vRows, r => r.Charging_Status === 'Yes'),
    workshopVisits:  countWhere(vRows, r => r.Workshop_Visit === 'Yes'),
    breakdowns:      countWhere(vRows, r => r.Breakdown === 'Yes'),
    totalExpense:    sumBy(vRows, 'Total_Expense'),
    overspeedPct:    vRows.length ? (countWhere(vRows, r => r.Overspeed === 'Yes') / vRows.length * 100) : 0,
    avgPassengers:   avgBy(vRows, 'Passenger_Count'),
  }), [vRows])

  return (
    <div className="tab-content">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <p className="section-title">Vehicle Analytics</p>
          <p className="section-sub">Last 3-month performance — charging, passengers, maintenance & expenses</p>
        </div>
        <div className="page-header-right">
          <div className="view-toggle">
            {['overview', 'brand'].map(v => (
              <button key={v}
                className={`view-toggle-btn${activeView === v ? ' active' : ''}`}
                onClick={() => setActiveView(v)}
              >
                {v === 'overview' ? '🚗 Vehicle View' : '🏷️ Brand View'}
              </button>
            ))}
          </div>
          {activeView === 'overview' && (
            <select className="select" value={selectedVehicle} onChange={e => setVehicle(e.target.value)}>
              {vehicleIds.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── OVERVIEW VIEW ── */}
      {activeView === 'overview' && (
        <>
          {/* Vehicle info banner */}
          <div className="vehicle-banner">
            {[
              { label: 'Vehicle',   val: vInfo.Vehicle_ID },
              { label: 'Brand',     val: vInfo.Brand },
              { label: 'Model',     val: vInfo.Vehicle_Model },
              { label: 'Category',  val: vInfo.Category },
              { label: 'Max Range', val: vInfo.Max_Range_km ? vInfo.Max_Range_km + ' km' : '—' },
              { label: 'Battery',   val: vInfo.Battery_Capacity_kWh ? vInfo.Battery_Capacity_kWh + ' kWh' : '—' },
            ].map(({ label, val }) => (
              <div className="vehicle-banner-item" key={label}>
                <div className="vehicle-banner-label">{label}</div>
                <div className="vehicle-banner-value">{val || '—'}</div>
              </div>
            ))}
          </div>

          {/* KPI cards */}
          <div className="stat-cards">
            <div className="stat-card blue"><span className="label">Total Trips</span><span className="value">{fmtNum(stats.totalTrips)}</span></div>
            <div className="stat-card cyan"><span className="label">Total Distance</span><span className="value">{fmtNum(stats.totalKm, 0)} km</span></div>
            <div className="stat-card green"><span className="label">Charging Sessions</span><span className="value">{stats.chargingSessions}</span></div>
            <div className="stat-card purple"><span className="label">Workshop Visits</span><span className="value">{stats.workshopVisits}</span></div>
            <div className="stat-card orange"><span className="label">Total Expense</span><span className="value">{fmtCurrency(stats.totalExpense)}</span></div>
            <div className="stat-card red"><span className="label">Overspeed %</span><span className="value">{stats.overspeedPct.toFixed(1)}%</span></div>
            <div className="stat-card blue"><span className="label">Breakdowns</span><span className="value">{stats.breakdowns}</span></div>
            <div className="stat-card cyan"><span className="label">Avg Passengers</span><span className="value">{stats.avgPassengers.toFixed(1)}</span></div>
          </div>

          {/* Charts */}
          <div className="charts-grid-2">
            <ChartCard title="Monthly Charging Sessions" sub="Number of times vehicle was charged per month">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={monthlyCharging} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Sessions', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip formatter={v => [v, 'Charging Sessions']} />
                  <Bar dataKey="value" name="Charging Sessions" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Avg Passengers" sub="Average number of passengers per trip per month">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={monthlyPassengers} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Avg Passengers', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip formatter={v => [Number(v).toFixed(1), 'Avg Passengers']} />
                  <Legend verticalAlign="top" />
                  <Line type="monotone" dataKey="value" name="Avg Passengers" stroke="#0891b2" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="charts-grid-2">
            <ChartCard title="Monthly Workshop Visits" sub="Maintenance/workshop visits per month">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={monthlyWorkshop} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Visits', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip formatter={v => [v, 'Workshop Visits']} />
                  <Bar dataKey="value" name="Workshop Visits" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Total Expense (₹)" sub="Operational costs including maintenance per month">
              <ResponsiveContainer width="100%" height={230}>
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

          {/* Overspeed chart for all vehicles */}
          <ChartCard title="Overspeed Events — Top 15 Vehicles" sub="Vehicles with the highest number of speed-limit violations">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={carsByOverspeedCount} margin={{ top: 5, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="vehicle" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0}
                  label={{ value: 'Vehicle ID', position: 'insideBottom', offset: -22, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Overspeed Trips', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip formatter={v => [v, 'Overspeed Trips']} />
                <Bar dataKey="overspeedTrips" name="Overspeed Trips" fill="#dc2626" radius={[4, 4, 0, 0]}>
                  {carsByOverspeedCount.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#7f1d1d' : i < 3 ? '#dc2626' : '#fca5a5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ── BRAND VIEW ── */}
      {activeView === 'brand' && (
        <>
          <div className="charts-grid-2" style={{ marginBottom: 0 }}>
            <ChartCard title="Total Distance by Brand (km)" sub="Cumulative distance travelled across all vehicles per brand">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={brandStats} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="brand" tick={{ fontSize: 11 }} label={{ value: 'Brand', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtNum(v / 1000) + 'k'} label={{ value: 'km', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip formatter={v => [fmtNum(v) + ' km', 'Total Distance']} />
                  <Bar dataKey="totalDistance" name="Total Distance (km)" radius={[4, 4, 0, 0]}>
                    {brandStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Overspeed Events by Brand" sub="Total speed-limit violations per brand">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={brandStats} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="brand" tick={{ fontSize: 11 }} label={{ value: 'Brand', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Overspeed Events', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip formatter={v => [v, 'Overspeed Events']} />
                  <Bar dataKey="overspeedEvents" name="Overspeed Events" fill="#dc2626" radius={[4, 4, 0, 0]}>
                    {brandStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="charts-grid-2" style={{ marginTop: '20px' }}>
            <ChartCard title="Workshop Visits by Brand" sub="Total maintenance visits per brand">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={brandStats} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="brand" tick={{ fontSize: 11 }} label={{ value: 'Brand', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Visits', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip formatter={v => [v, 'Workshop Visits']} />
                  <Bar dataKey="workshopVisits" name="Workshop Visits" fill="#7c3aed" radius={[4, 4, 0, 0]}>
                    {brandStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Total Income by Brand (₹)" sub="Revenue generated per brand">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={brandStats} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="brand" tick={{ fontSize: 11 }} label={{ value: 'Brand', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'} label={{ value: 'Income (₹)', angle: -90, position: 'insideLeft', offset: -10, fontSize: 11 }} />
                  <Tooltip formatter={v => [fmtCurrency(v), 'Income']} />
                  <Bar dataKey="totalIncome" name="Total Income" fill="#16a34a" radius={[4, 4, 0, 0]}>
                    {brandStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Brand summary table */}
          <div className="chart-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
            <div className="chart-title">Brand Summary Table</div>
            <div className="chart-sub">Aggregated performance metrics across all vehicles grouped by manufacturer</div>
            <table className="data-table">
              <thead>
                <tr>
                  {['Brand', 'Vehicles', 'Total Dist (km)', 'Avg Expense (₹)', 'Overspeed', 'Workshop', 'Breakdowns', 'Total Income (₹)'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brandStats.map((b) => (
                  <tr key={b.brand}>
                    <td style={{ fontWeight: '700' }}>{b.brand}</td>
                    <td>{b.totalVehicles}</td>
                    <td>{fmtNum(b.totalDistance)}</td>
                    <td>{fmtCurrency(b.avgExpense)}</td>
                    <td><span className="badge badge-red">{b.overspeedEvents}</span></td>
                    <td>{b.workshopVisits}</td>
                    <td><span className="badge badge-orange">{b.breakdowns}</span></td>
                    <td style={{ color: 'var(--success)', fontWeight: '600' }}>{fmtCurrency(b.totalIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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

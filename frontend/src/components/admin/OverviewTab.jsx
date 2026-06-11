import { useContext, useMemo } from 'react'
import { DataContext } from '../../App'
import {
  PieChart, Pie, Cell, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  uniqueValues, sumBy, groupBy, countWhere, monthlyAgg, getMonthKey, fmtNum, fmtCurrency, driverName
} from '../../utils/dataUtils'
import ChartCard from '../shared/ChartCard'
import DynamicChart from '../shared/DynamicChart'

const STATUS_COLORS = {
  Running: '#34d399',
  Charging: '#22d3ee',
  Workshop: '#fb923c',
  Other: '#a78bfa'
}

const fmtK = v => '₹' + fmtNum(v / 1000) + 'k'

export default function OverviewTab() {
  const data = useContext(DataContext)

  // ── Fleet KPI aggregations ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalTrips = data.length
    const uniqueVehicles = uniqueValues(data, 'Vehicle_ID').length
    const uniqueDrivers = uniqueValues(data, 'Driver_ID').length
    const totalDistance = sumBy(data, 'Distance_Travelled_km')
    const totalRevenue = sumBy(data, 'Income_Generated')
    const totalExpense = sumBy(data, 'Total_Expense')
    const totalProfit = totalRevenue - totalExpense

    // Calculate utilization (roughly active vs inactive from latest status)
    const byVehicle = groupBy(data, 'Vehicle_ID')
    let runningOrCharging = 0
    Object.values(byVehicle).forEach(rows => {
      const sorted = [...rows].sort((a, b) => new Date(b.Date + ' ' + (b.Time || '')) - new Date(a.Date + ' ' + (a.Time || '')))
      const latest = sorted[0] || {}
      if (['Running', 'Charging'].includes(latest.Vehicle_Status)) runningOrCharging++
    })
    const utilization = uniqueVehicles > 0 ? (runningOrCharging / uniqueVehicles) * 100 : 0

    return { totalTrips, uniqueVehicles, uniqueDrivers, totalDistance, totalRevenue, totalExpense, totalProfit, utilization }
  }, [data])

  // ── Fleet Status Pie ────────────────────────────────────────────────────────
  const fleetStatusCounts = useMemo(() => {
    const byVehicle = groupBy(data, 'Vehicle_ID')
    const counts = { Running: 0, Charging: 0, Workshop: 0, Other: 0 }
    
    Object.values(byVehicle).forEach(rows => {
      const sorted = [...rows].sort((a, b) => new Date(b.Date + ' ' + (b.Time || '')) - new Date(a.Date + ' ' + (a.Time || '')))
      const latest = sorted[0] || {}
      const status = latest.Vehicle_Status || 'Other'
      if (counts[status] !== undefined) counts[status]++
      else counts.Other++
    })

    return [
      { name: 'Running', value: counts.Running, color: STATUS_COLORS.Running },
      { name: 'Charging', value: counts.Charging, color: STATUS_COLORS.Charging },
      { name: 'Workshop', value: counts.Workshop, color: STATUS_COLORS.Workshop },
      ...(counts.Other > 0 ? [{ name: 'Other', value: counts.Other, color: STATUS_COLORS.Other }] : [])
    ].filter(s => s.value > 0)
  }, [data])

  // ── Revenue vs Expense Trend ────────────────────────────────────────────────
  const monthlyProfit = useMemo(() => {
    const monthlyExpense = monthlyAgg(data, 'Total_Expense')
    const monthlyRevenue = monthlyAgg(data, 'Income_Generated')
    const revMap = Object.fromEntries(monthlyRevenue.map(r => [r.month, r.value]))
    
    return monthlyExpense.map(r => ({
      month: r.month,
      expense: r.value,
      revenue: revMap[r.month] ?? 0,
      profit: (revMap[r.month] ?? 0) - r.value,
    }))
  }, [data])

  // ── Top Overspeeding Drivers ────────────────────────────────────────────────
  const topOverspeedDrivers = useMemo(() => {
    const byDriver = groupBy(data, 'Driver_ID')
    return Object.entries(byDriver).map(([did, rows]) => {
      return {
        driver: driverName(did),
        driverId: did,
        overspeedEvents: countWhere(rows, r => r.Overspeed === 'Yes')
      }
    })
    .sort((a, b) => b.overspeedEvents - a.overspeedEvents)
    .slice(0, 6)
  }, [data])

  // ── Vehicle Status Breakdown ────────────────────────────────────────────────
  const vehicleStatusTable = useMemo(() => {
    const byVehicle = groupBy(data, 'Vehicle_ID')
    return Object.entries(byVehicle).map(([vid, rows]) => {
      const sorted = [...rows].sort((a, b) => new Date(b.Date + ' ' + (b.Time || '')) - new Date(a.Date + ' ' + (a.Time || '')))
      const latest = sorted[0] || {}
      return {
        vehicle: vid,
        model: latest.Vehicle_Model || 'Unknown',
        status: latest.Vehicle_Status || 'Other',
        battery: latest.Battery_Percentage ? parseFloat(latest.Battery_Percentage).toFixed(0) + '%' : '—'
      }
    }).slice(0, 8) // show top 8 recently active
  }, [data])

  return (
    <div className="tab-content">
      <div className="overview-welcome">
        <h2>Dashboard Overview</h2>
        <p>A high-level summary of your fleet's operations, finances, and active status.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div className="stat-card blue"><span className="label">Total Trips</span><span className="value">{fmtNum(kpis.totalTrips)}</span></div>
        <div className="stat-card cyan"><span className="label">Vehicles</span><span className="value">{kpis.uniqueVehicles}</span></div>
        <div className="stat-card purple"><span className="label">Drivers</span><span className="value">{kpis.uniqueDrivers}</span></div>
        <div className="stat-card green"><span className="label">Distance (km)</span><span className="value" style={{fontSize: '22px'}}>{fmtNum(kpis.totalDistance, 0)}</span></div>
        <div className="stat-card green"><span className="label">Total Revenue</span><span className="value" style={{fontSize: '20px'}}>{fmtCurrency(kpis.totalRevenue)}</span></div>
        <div className="stat-card orange"><span className="label">Total Expense</span><span className="value" style={{fontSize: '20px'}}>{fmtCurrency(kpis.totalExpense)}</span></div>
        <div className={`stat-card ${kpis.totalProfit >= 0 ? 'blue' : 'red'}`}><span className="label">Net Profit</span><span className="value" style={{fontSize: '20px'}}>{fmtCurrency(kpis.totalProfit)}</span></div>
        <div className="stat-card cyan"><span className="label">Utilization</span><span className="value">{kpis.utilization.toFixed(1)}%</span></div>
      </div>

      {/* Charts Grid Row 1 */}
      <div className="overview-grid">
        <ChartCard title="Current Fleet Status" sub="Live breakdown of all assigned vehicles">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={fleetStatusCounts} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="rgba(255,255,255,0.05)" strokeWidth={2}>
                {fleetStatusCounts.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [v + ' vehicles', name]} contentStyle={{ background: 'rgba(13,17,27,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e4e7ed', fontSize: 12 }} itemStyle={{ color: '#e4e7ed' }} />
              <Legend wrapperStyle={{ color: '#8892a6' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue vs Expense" sub="Financial performance over time">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={monthlyProfit} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8892a6' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8892a6' }} tickLine={false} axisLine={false} tickFormatter={fmtK} />
              <Tooltip formatter={(v, name) => [fmtCurrency(v), name]} contentStyle={{ background: 'rgba(13,17,27,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e4e7ed', fontSize: 12 }} itemStyle={{ color: '#e4e7ed' }} />
              <Legend wrapperStyle={{ paddingBottom: '10px', fontSize: 12, color: '#8892a6' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#fb923c" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#6c8cff" strokeWidth={3} dot={{ r: 4, fill: '#131a28' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Grid Row 2 */}
      <div className="overview-grid">
        <DynamicChart 
          title="Top Overspeeding Drivers" 
          sub="Drivers with the most speed-limit violations"
          data={topOverspeedDrivers} 
          xKey="driver" 
          defaultType="bar"
          height={260}
          metrics={[{ key: 'overspeedEvents', label: 'Violations', color: '#f87171', colorFn: r => (r.overspeedEvents > 10 ? '#ef4444' : '#fca5a5') }]} 
        />

        <div className="chart-wrapper">
          <div className="chart-title">Recent Vehicle Status</div>
          <div className="chart-sub">Snapshot of latest fleet telemetry</div>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Battery</th>
                </tr>
              </thead>
              <tbody>
                {vehicleStatusTable.map((v, i) => {
                  const sm = v.status === 'Running' ? { c: '#34d399', bg: 'rgba(52,211,153,0.15)' } 
                           : v.status === 'Charging' ? { c: '#22d3ee', bg: 'rgba(34,211,238,0.15)' }
                           : v.status === 'Workshop' ? { c: '#fb923c', bg: 'rgba(251,146,60,0.15)' }
                           : { c: '#a78bfa', bg: 'rgba(167,139,250,0.15)' }
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{v.vehicle}</td>
                      <td><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v.model}</span></td>
                      <td>
                        <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: sm.c, background: sm.bg }}>
                          {v.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: parseInt(v.battery) < 20 ? '#f87171' : 'inherit' }}>
                        {v.battery}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

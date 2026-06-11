import { useState, useContext, useMemo } from 'react'
import {
  LineChart, Line, ComposedChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { DataContext } from '../../App'
import RangePredictionTab from './RangePredictionTab'
import {
  monthlyAgg, countWhere, sumBy, avgBy,
  fmtNum, fmtCurrency, COLORS, driverName
} from '../../utils/dataUtils'
import DynamicChart from '../shared/DynamicChart'
import SortableTable from '../shared/SortableTable'
import { LayoutDashboard, Ruler, Battery, CarFront, Map, BrainCircuit, Zap, User, LogOut, Calendar, Circle, PlugZap, Trophy, AlertTriangle } from 'lucide-react'
import logoImg from '../../assets/logo.png'

const NAV_TABS = [
  { key: 'overview', icon: <LayoutDashboard size={18} />, label: 'Overview', sub: 'General performance & history' },
  { key: 'distance', icon: <Ruler size={18} />, label: 'Distance Travelled', sub: 'Mileage & trip distances' },
  { key: 'battery',  icon: <Battery size={18} />, label: 'Battery & Charge', sub: 'State of charge & health' },
  { key: 'vehicle',  icon: <CarFront size={18} />, label: 'Vehicle Specs', sub: 'Assigned car details' },
  { key: 'road',     icon: <Map size={18} />, label: 'Road Performance', sub: 'Highway vs City driving' },
  { key: 'predict',  icon: <BrainCircuit size={18} />, label: 'Range Predictor', sub: 'Send inputs to the Flask model' },
]

export default function DriverDashboard({ user, onLogout }) {
  const data     = useContext(DataContext)
  const driverId = String(user.id)
  const [tab, setTab] = useState('overview')

  // ── Filter to this driver only ────────────────────────────────────────────
  const dRows = useMemo(
    () => data.filter(r => String(r.Driver_ID) === driverId),
    [data, driverId]
  )

  // Sort rows chronologically for timeline metrics
  const sortedChronological = useMemo(() => {
    return [...dRows].sort((a, b) => {
      const da = new Date(a.Date + ' ' + (a.Time || '00:00:00'))
      const db = new Date(b.Date + ' ' + (b.Time || '00:00:00'))
      return da - db
    })
  }, [dRows])

  // Sort rows reverse chronologically to find latest values
  const sortedReverseChronological = useMemo(() => {
    return [...dRows].sort((a, b) => {
      const da = new Date(a.Date + ' ' + (a.Time || '00:00:00'))
      const db = new Date(b.Date + ' ' + (b.Time || '00:00:00'))
      return db - da
    })
  }, [dRows])

  const latestRecord = useMemo(() => sortedReverseChronological[0] || {}, [sortedReverseChronological])

  // ── Monthly aggregations ──────────────────────────────────────────────────
  const monthlyOverspeed = useMemo(
    () => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Overspeed === 'Yes')),
    [dRows]
  )
  const monthlyDist = useMemo(() => monthlyAgg(dRows, 'Distance_Travelled_km'), [dRows])
  const monthlyInc  = useMemo(() => monthlyAgg(dRows, 'Income_Generated'), [dRows])
  const monthlyExp  = useMemo(() => monthlyAgg(dRows, 'Total_Expense'), [dRows])

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
  }), [dRows])

  // ── Recent trips (last 10) ────────────────────────────────────────────────
  const recentTrips = useMemo(() => sortedReverseChronological.slice(0, 10), [sortedReverseChronological])

  // ── DISTANCE TAB COMPUTATIONS ─────────────────────────────────────────────
  const maxTripDist = useMemo(() => {
    return Math.max(...dRows.map(r => parseFloat(r.Distance_Travelled_km) || 0), 0)
  }, [dRows])

  const avgTripDist = useMemo(() => {
    return avgBy(dRows, 'Distance_Travelled_km')
  }, [dRows])

  const tripDistanceHistory = useMemo(() => {
    return sortedChronological
      .filter(r => parseFloat(r.Distance_Travelled_km) > 0)
      .slice(-15)
      .map((r, i) => ({
        tripIndex: `Trip #${i + 1}`,
        distance: parseFloat(r.Distance_Travelled_km) || 0,
        date: r.Date
      }))
  }, [sortedChronological])

  const longestTrips = useMemo(() => {
    return [...dRows]
      .sort((a, b) => (parseFloat(b.Distance_Travelled_km) || 0) - (parseFloat(a.Distance_Travelled_km) || 0))
      .slice(0, 5)
  }, [dRows])

  // ── BATTERY TAB COMPUTATIONS ──────────────────────────────────────────────
  const latestBattery = parseFloat(latestRecord.Battery_Percentage) || 0
  const latestRange = parseFloat(latestRecord.Remaining_Range_km) || 0
  const latestHealth = parseFloat(latestRecord.Battery_Health_Percentage) || 0
  const latestCycle = latestRecord.Charge_Cycle_Count || 0
  const currentStatus = latestRecord.Vehicle_Status || 'Unknown'

  const batteryHistory = useMemo(() => {
    return sortedChronological
      .slice(-25)
      .map(r => ({
        timeLabel: `${r.Date} ${r.Time ? r.Time.substring(0, 5) : ''}`,
        battery: parseFloat(r.Battery_Percentage) || 0,
        range: parseFloat(r.Remaining_Range_km) || 0,
        status: r.Charging_Status === 'Yes' ? 'Charging' : 'Running'
      }))
  }, [sortedChronological])

  const monthlyEnergy = useMemo(() => monthlyAgg(dRows, 'Energy_Consumed_kWh'), [dRows])

  const chargingSessions = useMemo(() => {
    return dRows
      .filter(r => r.Charging_Status === 'Yes')
      .sort((a, b) => new Date(b.Date + ' ' + (b.Time || '00:00:00')) - new Date(a.Date + ' ' + (a.Time || '00:00:00')))
      .slice(0, 5)
  }, [dRows])

  // ── ROAD ANALYTICS COMPUTATIONS ───────────────────────────────────────────
  const roadAnalytics = useMemo(() => {
    const roadTypes = ['City', 'Highway', 'Mixed']
    return roadTypes.map(type => {
      const trips = dRows.filter(r => r.Road_Type === type)
      const distance = sumBy(trips, 'Distance_Travelled_km')
      const avgSpeed = avgBy(trips, 'Speed_kmph')
      const overspeedCount = countWhere(trips, r => r.Overspeed === 'Yes')
      const energy = sumBy(trips, 'Energy_Consumed_kWh')
      // Wh/km = (Energy in kWh * 1000) / distance in km
      const efficiency = distance > 0 ? (energy * 1000) / distance : 0
      return {
        type,
        tripsCount: trips.length,
        distance,
        avgSpeed,
        overspeedCount,
        efficiency,
      }
    })
  }, [dRows])

  const roadTypePieData = useMemo(() => {
    return roadAnalytics.map((item, i) => ({
      name: item.type,
      value: Math.round(item.distance),
      color: COLORS[i % COLORS.length]
    })).filter(s => s.value > 0)
  }, [roadAnalytics])

  const activeTabDetails = NAV_TABS.find(t => t.key === tab)
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: 'transparent', padding: 0, boxShadow: 'none' }}>
            <img src={logoImg} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', marginLeft: '-8px' }} />
          </div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">EV Fleet</div>
            <div className="sidebar-logo-sub">Driver Portal</div>
          </div>
        </div>

        {/* Driver Profile Summary */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--sidebar-border)' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e40af, #2563eb)',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '6px' }}><CarFront size={28} /></div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px', textAlign: 'center' }}>
              {driverName(driverId)}
            </div>
            <div style={{ color: '#bfdbfe', fontSize: '11px', textAlign: 'center' }}>Driver #{driverId}</div>
            <div style={{ color: '#bfdbfe', fontSize: '11px', textAlign: 'center', marginTop: '2px' }}>
              Vehicle: {latestRecord.Vehicle_ID || 'EV—'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Driver Portal</div>
          {NAV_TABS.map(({ key, icon, label, sub }) => (
            <button
              key={key}
              className={`nav-btn${tab === key ? ' active' : ''}`}
              onClick={() => setTab(key)}
            >
              <span className="nav-btn-icon">{icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '13px' }}>{label}</span>
                <span style={{ display: 'block', fontSize: '10px', opacity: tab === key ? 0.8 : 0.55, marginTop: '1px' }}>{sub}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card" style={{ marginBottom: '10px' }}>
            <div className="sidebar-user-avatar"><User size={20} /></div>
            <div>
              <div className="sidebar-user-name" style={{ fontSize: '12px' }}>Driver #{driverId}</div>
              <div className="sidebar-user-role" style={{ fontSize: '10px' }}>{stats.totalTrips} recorded trips</div>
            </div>
          </div>
          <button className="btn-signout" onClick={onLogout}>
            <span><LogOut size={16} /></span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-icon-wrap" style={{ background: '#dbeafe', color: '#1e40af' }}>
              {activeTabDetails?.icon}
            </div>
            <div>
              <div className="topbar-title">{activeTabDetails?.label}</div>
              <div className="topbar-sub">{activeTabDetails?.sub} — Driver #{driverId}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-pill">
              <span className="topbar-pill-dot" />
              Online
            </div>
            <div className="topbar-date"><Calendar size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} /> {today}</div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="tab-content" style={{ flex: 1, overflow: 'auto', padding: '28px' }}>

          {tab === 'predict' && (
            <RangePredictionTab user={user} latestRecord={latestRecord} />
          )}
          
          {/* ════════════════ OVERVIEW TAB ════════════════ */}
          {tab === 'overview' && (
            <>
              {/* KPI Cards */}
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

              {/* Row 1: Overspeed + Distance Charts */}
              <div className="charts-grid-2">
                <DynamicChart title="Monthly Overspeed Events" sub="Trips where you exceeded the speed limit"
                  data={monthlyOverspeed} defaultType="bar"
                  metrics={[{ key: 'value', label: 'Overspeed Events', color: '#dc2626', colorFn: r => (r.value > 5 ? '#dc2626' : '#fca5a5') }]} />
                <DynamicChart title="Monthly Distance Travelled (km)" sub="Total distance covered each month across your trips"
                  data={monthlyDist} defaultType="area"
                  metrics={[{ key: 'value', label: 'Distance (km)', color: '#2563eb', format: v => fmtNum(v, 1) + ' km' }]} />
              </div>

              {/* Row 2: Income vs Expense */}
              <ChartCard title="Monthly Income vs Expense (₹)" sub="Your revenue generated vs operational costs each month" style={{ marginBottom: '20px' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={monthlyFinance} margin={{ top: 10, right: 30, bottom: 20, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'} />
                    <Tooltip formatter={(v, name) => [fmtCurrency(v), name]} />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '8px' }} />
                    <Bar dataKey="income" name="Income (₹)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense (₹)" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Row 3: Recent Trips Table */}
              <div className="chart-wrapper" style={{ overflowX: 'auto' }}>
                <div className="chart-title">Recent Trips (Last 10)</div>
                <div className="chart-sub">Your most recent trip records — click any column to sort ascending / descending</div>
                <SortableTable
                  rows={recentTrips}
                  rowKey={(t, i) => i}
                  initialSort={{ key: 'Date', dir: 'desc' }}
                  emptyMessage={`No trip data found for Driver #${driverId}`}
                  columns={[
                    { key: 'Date', label: 'Date', tdStyle: { whiteSpace: 'nowrap' } },
                    { key: 'Vehicle_ID', label: 'Vehicle', render: t => <span style={{ fontWeight: 700 }}>{t.Vehicle_ID}</span> },
                    { key: 'Distance_Travelled_km', label: 'Distance (km)', align: 'right', sortAccessor: t => parseFloat(t.Distance_Travelled_km) || 0, render: t => Number(t.Distance_Travelled_km || 0).toFixed(1) },
                    { key: 'Speed_kmph', label: 'Speed (km/h)', align: 'right', sortAccessor: t => parseFloat(t.Speed_kmph) || 0, render: t => Number(t.Speed_kmph || 0).toFixed(1) },
                    { key: 'Overspeed', label: 'Overspeed', align: 'center', render: t => <span className={`badge ${t.Overspeed === 'Yes' ? 'badge-red' : 'badge-green'}`}>{t.Overspeed === 'Yes' ? 'Yes' : 'No'}</span> },
                    { key: 'Passenger_Count', label: 'Passengers', align: 'right', sortAccessor: t => parseFloat(t.Passenger_Count) || 0 },
                    { key: 'Income_Generated', label: 'Income (₹)', align: 'right', sortAccessor: t => parseFloat(t.Income_Generated) || 0, render: t => <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtCurrency(parseFloat(t.Income_Generated) || 0)}</span> },
                    { key: 'Total_Expense', label: 'Expense (₹)', align: 'right', sortAccessor: t => parseFloat(t.Total_Expense) || 0, render: t => <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{fmtCurrency(parseFloat(t.Total_Expense) || 0)}</span> },
                    { key: 'Workshop_Visit', label: 'Workshop', align: 'center', render: t => <span className={`badge ${t.Workshop_Visit === 'Yes' ? 'badge-orange' : 'badge-green'}`}>{t.Workshop_Visit === 'Yes' ? 'Yes' : 'No'}</span> },
                    { key: 'Breakdown', label: 'Breakdown', align: 'center', render: t => <span className={`badge ${t.Breakdown === 'Yes' ? 'badge-red' : 'badge-green'}`}>{t.Breakdown === 'Yes' ? 'Yes' : 'No'}</span> },
                  ]}
                />
              </div>
            </>
          )}

          {/* ════════════════ DISTANCE TRAVELLED TAB ════════════════ */}
          {tab === 'distance' && (
            <>
              {/* KPI Cards */}
              <div className="stat-cards">
                <div className="stat-card blue">
                  <span className="label">Total Distance Travelled</span>
                  <span className="value">{fmtNum(stats.totalKm, 0)} km</span>
                  <span className="sub">Across all trips</span>
                </div>
                <div className="stat-card cyan">
                  <span className="label">Avg Distance / Trip</span>
                  <span className="value">{avgTripDist.toFixed(1)} km</span>
                  <span className="sub">Mean per driving record</span>
                </div>
                <div className="stat-card purple">
                  <span className="label">Longest Single Trip</span>
                  <span className="value">{maxTripDist.toFixed(1)} km</span>
                  <span className="sub">Personal record distance</span>
                </div>
                <div className="stat-card green">
                  <span className="label">Active Driving Trips</span>
                  <span className="value">{tripDistanceHistory.length}</span>
                  <span className="sub">Recorded runs</span>
                </div>
              </div>

              {/* Distance Charts */}
              <div className="charts-grid-2">
                <DynamicChart title="Monthly Distance Profile" sub="Total kilometers logged per calendar month"
                  data={monthlyDist} height={260} defaultType="area"
                  metrics={[{ key: 'value', label: 'Distance (km)', color: '#0891b2', format: v => fmtNum(v, 1) + ' km' }]} />

                <ChartCard title="Trip-by-Trip Distance Progress" sub="Distance logged in each of the last 15 active runs">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={tripDistanceHistory} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="tripIndex" tick={{ fontSize: 10 }} />
                      <YAxis label={{ value: 'km', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                      <Tooltip formatter={(v, name, props) => [v + ' km', `${props.payload.date}`]} />
                      <Line type="monotone" dataKey="distance" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Longest Trips Table */}
              <div className="chart-wrapper" style={{ overflowX: 'auto', marginTop: '20px' }}>
                <div className="chart-title"><Trophy size={18} style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> Longest Trips (Top 5)</div>
                <div className="chart-sub">Your top distance records — click any column to sort ascending / descending</div>
                <SortableTable
                  rows={longestTrips}
                  rowKey={(t, i) => i}
                  initialSort={{ key: 'Distance_Travelled_km', dir: 'desc' }}
                  columns={[
                    { key: 'Date', label: 'Date' },
                    { key: 'Vehicle_ID', label: 'Vehicle ID', render: t => <span style={{ fontWeight: 700 }}>{t.Vehicle_ID}</span> },
                    { key: 'Distance_Travelled_km', label: 'Distance (km)', align: 'right', sortAccessor: t => parseFloat(t.Distance_Travelled_km) || 0, render: t => <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{Number(t.Distance_Travelled_km || 0).toFixed(1)} km</span> },
                    { key: 'Speed_kmph', label: 'Avg Speed (km/h)', align: 'right', sortAccessor: t => parseFloat(t.Speed_kmph) || 0, render: t => Number(t.Speed_kmph || 0).toFixed(1) },
                    { key: 'Road_Type', label: 'Road Type', render: t => <span className={`badge ${t.Road_Type === 'Highway' ? 'badge-blue' : t.Road_Type === 'City' ? 'badge-green' : 'badge-orange'}`}>{t.Road_Type}</span> },
                    { key: 'Income_Generated', label: 'Income (₹)', align: 'right', sortAccessor: t => parseFloat(t.Income_Generated) || 0, render: t => <span style={{ color: 'var(--success)' }}>{fmtCurrency(parseFloat(t.Income_Generated) || 0)}</span> },
                    { key: 'Total_Expense', label: 'Expense (₹)', align: 'right', sortAccessor: t => parseFloat(t.Total_Expense) || 0, render: t => <span style={{ color: 'var(--warning)' }}>{fmtCurrency(parseFloat(t.Total_Expense) || 0)}</span> },
                  ]}
                />
              </div>
            </>
          )}

          {/* ════════════════ BATTERY & CHARGE TAB ════════════════ */}
          {tab === 'battery' && (
            <>
              {/* KPI Cards */}
              <div className="stat-cards">
                <div className="stat-card green">
                  <span className="label">Current Charge</span>
                  <span className="value" style={{ color: latestBattery < 20 ? 'var(--danger)' : 'var(--success)' }}>
                    {latestBattery.toFixed(1)}%
                  </span>
                  <span className="sub">State of Charge (latest)</span>
                </div>
                <div className="stat-card cyan">
                  <span className="label">Remaining Range</span>
                  <span className="value">{latestRange.toFixed(0)} km</span>
                  <span className="sub">Estimated travel limit</span>
                </div>
                <div className="stat-card blue">
                  <span className="label">Battery Health</span>
                  <span className="value">{latestHealth}%</span>
                  <span className="sub">Max capacity capacity retention</span>
                </div>
                <div className="stat-card orange">
                  <span className="label">Total Charge Cycles</span>
                  <span className="value">{latestCycle}</span>
                  <span className="sub">Cycles completed</span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="vehicle-banner" style={{ background: currentStatus === 'Charging' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: 'none', marginBottom: '20px' }}>
                <div className="vehicle-banner-item">
                  <div className="vehicle-banner-label">Vehicle Status</div>
                  <div className="vehicle-banner-value"><Zap size={16} style={{ display: 'inline-block', verticalAlign: '-2px' }} /> {currentStatus}</div>
                </div>
                <div className="vehicle-banner-item">
                  <div className="vehicle-banner-label">Battery Capacity</div>
                  <div className="vehicle-banner-value">{latestRecord.Battery_Capacity_kWh || '—'} kWh</div>
                </div>
                <div className="vehicle-banner-item">
                  <div className="vehicle-banner-label">Health Status</div>
                  <div className="vehicle-banner-value">{latestHealth >= 90 ? <><Circle size={14} fill="#4ade80" color="#4ade80" style={{ display: 'inline-block', verticalAlign: '-2px' }} /> Excellent</> : latestHealth >= 80 ? <><Circle size={14} fill="#facc15" color="#facc15" style={{ display: 'inline-block', verticalAlign: '-2px' }} /> Good</> : <><AlertTriangle size={14} color="#f87171" style={{ display: 'inline-block', verticalAlign: '-2px' }} /> Service Required</>}</div>
                </div>
              </div>

              {/* Charts */}
              <div className="charts-grid-2">
                <ChartCard title="Battery SoC saw-tooth (Last 25 logs)" sub="Saw-tooth pattern showing battery draining and charging events chronologically">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={batteryHistory} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="timeLabel" tick={{ fontSize: 9 }} />
                      <YAxis domain={[0, 100]} label={{ value: 'SoC %', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                      <Tooltip formatter={(v, name, props) => [`${v}% (${props.payload.status})`, 'SoC']} />
                      <Line type="monotone" dataKey="battery" stroke="#16a34a" strokeWidth={2.5} dot={(props) => {
                        const { cx, cy, payload } = props
                        if (payload.status === 'Charging') {
                          return <circle key={cx} cx={cx} cy={cy} r={5} fill="#2563eb" stroke="#fff" strokeWidth={1} />
                        }
                        return <circle key={cx} cx={cx} cy={cy} r={3} fill="#16a34a" />
                      }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Energy Consumed (kWh) per Month" sub="Monthly energy pulled from battery pack for driving">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyEnergy} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" />
                      <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                      <Tooltip formatter={v => [v + ' kWh', 'Energy Consumed']} />
                      <Bar dataKey="value" name="Energy Consumed" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Recent Charging Events */}
              <div className="chart-wrapper" style={{ overflowX: 'auto', marginTop: '20px' }}>
                <div className="chart-title"><PlugZap size={18} style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> Recent Charging Sessions</div>
                <div className="chart-sub">List of recent charging state logs recorded for your vehicle</div>
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Date', 'Time', 'Vehicle ID', 'Battery Level', 'Charge Cycles', 'Odometer Reading (km)'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chargingSessions.map((session, idx) => (
                      <tr key={idx}>
                        <td>{session.Date}</td>
                        <td>{session.Time}</td>
                        <td style={{ fontWeight: '700' }}>{session.Vehicle_ID}</td>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}><Zap size={14} style={{ display: 'inline-block', verticalAlign: '-2px' }} /> {Number(session.Battery_Percentage).toFixed(1)}%</td>
                        <td>{session.Charge_Cycle_Count}</td>
                        <td>{fmtNum(session.Odometer_km)} km</td>
                      </tr>
                    ))}
                    {chargingSessions.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No charging events logged in history.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ════════════════ VEHICLE SPECS TAB ════════════════ */}
          {tab === 'vehicle' && (
            <>
              {/* Main Spec Banner */}
              <div className="vehicle-banner" style={{ padding: '28px 34px', marginBottom: '28px' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#fff', marginBottom: '10px', textTransform: 'uppercase' }}>
                    Assigned Fleet Unit
                  </span>
                  <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px' }}>
                    {latestRecord.Brand} {latestRecord.Vehicle_Model}
                  </h2>
                  <p style={{ margin: 0, opacity: 0.8, fontSize: '13px' }}>
                    Vehicle Registration ID: <strong>{latestRecord.Vehicle_ID}</strong> · Category: {latestRecord.Category}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap', marginTop: '16px' }}>
                  <div style={{ borderLeft: '2px solid rgba(255, 255, 255, 0.25)', paddingLeft: '18px' }}>
                    <div style={{ fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Odometer</div>
                    <div style={{ fontSize: '22px', fontWeight: '800' }}>{latestRecord.Odometer_km ? fmtNum(latestRecord.Odometer_km) + ' km' : '—'}</div>
                  </div>
                  <div style={{ borderLeft: '2px solid rgba(255, 255, 255, 0.25)', paddingLeft: '18px' }}>
                    <div style={{ fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Battery Health</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#4ade80' }}>{latestHealth}%</div>
                  </div>
                </div>
              </div>

              {/* Technical Spec Grid */}
              <div className="charts-grid-2">
                <div className="chart-wrapper">
                  <div className="chart-title">Technical Specifications</div>
                  <div className="chart-sub">Manufacturer factory details of the current EV</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                    {[
                      { label: 'Manufacturer / Brand', value: latestRecord.Brand },
                      { label: 'Model Name', value: latestRecord.Vehicle_Model },
                      { label: 'Vehicle Class', value: latestRecord.Category },
                      { label: 'Battery Capacity (kWh)', value: latestRecord.Battery_Capacity_kWh ? latestRecord.Battery_Capacity_kWh + ' kWh' : '—' },
                      { label: 'Motor Rating (kW)', value: latestRecord.Motor_Spec_kW ? latestRecord.Motor_Spec_kW + ' kW' : '—' },
                      { label: 'Curb Weight (kg)', value: latestRecord.Vehicle_Weight_kg ? fmtNum(latestRecord.Vehicle_Weight_kg) + ' kg' : '—' },
                      { label: 'Factory Rated Max Range', value: latestRecord.Max_Range_km ? latestRecord.Max_Range_km + ' km' : '—' }
                    ].map((spec, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{spec.label}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{spec.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyItems: 'center' }}>
                  <div className="chart-title">Battery Health Profile</div>
                  <div className="chart-sub">SOH (State of Health) details & capacity summary</div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                    <div style={{
                      width: '140px', height: '140px',
                      borderRadius: '50%',
                      background: `conic-gradient(#16a34a ${latestHealth}%, #e2e8f0 0)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{
                        width: '116px', height: '116px',
                        borderRadius: '50%',
                        background: 'var(--card-bg)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>{latestHealth}%</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>SOH Status</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '24px', textAlign: 'center', maxWidth: '300px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {latestHealth >= 90 ? <><Battery size={16} style={{ display: 'inline-block', verticalAlign: '-2px' }} /> Excellent Battery Health</> : latestHealth >= 80 ? <><Battery size={16} style={{ display: 'inline-block', verticalAlign: '-2px' }} /> Good Battery Health</> : <><AlertTriangle size={16} style={{ display: 'inline-block', verticalAlign: '-2px' }} /> Battery Degraded</>}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                        Your battery health is sitting at {latestHealth}%. Capacity retention is optimal for normal operational ranges.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ════════════════ ROAD PERFORMANCE TAB ════════════════ */}
          {tab === 'road' && (
            <>
              {/* KPI Cards */}
              <div className="stat-cards">
                <div className="stat-card blue">
                  <span className="label">Highway Share</span>
                  <span className="value">
                    {(() => {
                      const highway = roadAnalytics.find(r => r.type === 'Highway')?.distance || 0
                      return stats.totalKm > 0 ? ((highway / stats.totalKm) * 100).toFixed(1) + '%' : '0%'
                    })()}
                  </span>
                  <span className="sub">Of total distance driven</span>
                </div>
                <div className="stat-card green">
                  <span className="label">City Share</span>
                  <span className="value">
                    {(() => {
                      const city = roadAnalytics.find(r => r.type === 'City')?.distance || 0
                      return stats.totalKm > 0 ? ((city / stats.totalKm) * 100).toFixed(1) + '%' : '0%'
                    })()}
                  </span>
                  <span className="sub">Of total distance driven</span>
                </div>
                <div className="stat-card orange">
                  <span className="label">Overspeed Risks</span>
                  <span className="value">
                    {countWhere(dRows, r => r.Overspeed === 'Yes' && (r.Road_Type === 'City' || r.Road_Type === 'Highway'))}
                  </span>
                  <span className="sub">City / Highway warnings</span>
                </div>
                <div className="stat-card purple">
                  <span className="label">Optimal Efficiency</span>
                  <span className="value" style={{ fontSize: '18px' }}>
                    {(() => {
                      const valid = roadAnalytics.filter(r => r.efficiency > 0)
                      if (!valid.length) return '—'
                      const best = [...valid].sort((a, b) => a.efficiency - b.efficiency)[0]
                      return `${best.efficiency.toFixed(0)} Wh/km (${best.type})`
                    })()}
                  </span>
                  <span className="sub">Lowest energy consumption</span>
                </div>
              </div>

              {/* Road Type Charts */}
              <div className="charts-grid-2">
                <ChartCard title="Distance breakdown by Road Type (km)" sub="Proportion of driving distance split across City, Highway & Mixed environments">
                  {roadTypePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={roadTypePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {roadTypePieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={v => [v + ' km', 'Distance']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="no-data">No distance details logged.</div>
                  )}
                </ChartCard>

                <ChartCard title="Energy Efficiency (Wh/km)" sub="Average energy consumed in Wh per kilometer (lower is more efficient)">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={roadAnalytics} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="type" />
                      <YAxis label={{ value: 'Wh / km', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                      <Tooltip formatter={v => [Number(v).toFixed(0) + ' Wh/km', 'Energy Rate']} />
                      <Bar dataKey="efficiency" name="Efficiency (Wh/km)" radius={[4, 4, 0, 0]}>
                        {roadAnalytics.map((entry, idx) => (
                          <Cell key={idx} fill={entry.type === 'City' ? '#16a34a' : entry.type === 'Highway' ? '#2563eb' : '#ea580c'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Comparative Table */}
              <div className="chart-wrapper" style={{ overflowX: 'auto', marginTop: '20px' }}>
                <div className="chart-title">Road Type Comparison Table</div>
                <div className="chart-sub">Core performance and energy efficiency differences across driving environments</div>
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Road Type', 'Trips Count', 'Total Distance (km)', 'Avg Speed (km/h)', 'Overspeed Warnings', 'Avg Efficiency (Wh/km)'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roadAnalytics.map((row) => (
                      <tr key={row.type}>
                        <td style={{ fontWeight: '700' }}>{row.type}</td>
                        <td>{row.tripsCount}</td>
                        <td>{row.distance.toFixed(1)} km</td>
                        <td>{row.avgSpeed.toFixed(1)} km/h</td>
                        <td>
                          <span className={`badge ${row.overspeedCount > 0 ? 'badge-red' : 'badge-green'}`}>
                            {row.overspeedCount} events
                          </span>
                        </td>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                          {row.efficiency > 0 ? `${row.efficiency.toFixed(0)} Wh/km` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}

function ChartCard({ title, sub, children, style }) {
  return (
    <div className="chart-wrapper" style={{ ...style }}>
      <div className="chart-title">{title}</div>
      {sub && <div className="chart-sub">{sub}</div>}
      {children}
    </div>
  )
}

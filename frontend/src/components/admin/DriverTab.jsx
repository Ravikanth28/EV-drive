import { useContext, useState, useMemo } from 'react'
import { DataContext } from '../../App'
import {
  uniqueValues, monthlyAgg, countWhere,
  fmtNum, fmtCurrency, sumBy, avgBy, driverName,
  getMonthKey, getMonthLabel, groupBy,
} from '../../utils/dataUtils'
import DynamicChart from '../shared/DynamicChart'
import SortableTable from '../shared/SortableTable'
import FilterPanel, { FilterGroup, FilterRange, FilterCheckboxGroup } from '../shared/FilterPanel'

const CHART_OPTIONS = [
  { value: 'overspeed', label: 'Overspeed' },
  { value: 'distance', label: 'Distance' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'breakdown', label: 'Breakdown' },
]
const ALL_CHART_KEYS = CHART_OPTIONS.map(c => c.value)
const fmtK = v => '₹' + fmtNum(v / 1000) + 'k'

export default function DriverTab() {
  const data = useContext(DataContext)
  const driverIds = useMemo(() => uniqueValues(data, 'Driver_ID').map(String), [data])
  
  // View state: 'all' or 'individual'
  const [viewMode, setViewMode] = useState('all')
  const [selectedDriver, setDriver] = useState(driverIds[0] ?? '')

  // ── ALL DRIVERS VIEW LOGIC ──────────────────────────────────────────────────
  const allDriversStats = useMemo(() => {
    const byDriver = groupBy(data, 'Driver_ID')
    return Object.entries(byDriver).map(([did, rows]) => {
      const distance = sumBy(rows, 'Distance_Travelled_km')
      const income = sumBy(rows, 'Income_Generated')
      const expense = sumBy(rows, 'Total_Expense')
      const overspeedCount = countWhere(rows, r => r.Overspeed === 'Yes')
      return {
        id: did,
        name: driverName(did),
        trips: rows.length,
        distance,
        overspeedCount,
        overspeedPct: rows.length ? (overspeedCount / rows.length * 100) : 0,
        income,
        expense,
        profit: income - expense,
        workshops: countWhere(rows, r => r.Workshop_Visit === 'Yes'),
        breakdowns: countWhere(rows, r => r.Breakdown === 'Yes'),
      }
    }).sort((a, b) => b.trips - a.trips)
  }, [data])

  // ── INDIVIDUAL DRIVER VIEW LOGIC ─────────────────────────────────────────────
  const [range, setRange] = useState([0, 0])
  const [shownCharts, setShownCharts] = useState(ALL_CHART_KEYS)

  const driverAllRows = useMemo(
    () => data.filter(r => String(r.Driver_ID) === selectedDriver),
    [data, selectedDriver]
  )

  const allMonths = useMemo(
    () => [...new Set(driverAllRows.map(r => getMonthKey(r.Date)).filter(Boolean))].sort(),
    [driverAllRows]
  )
  const monthTripCounts = useMemo(() => {
    const byMonth = groupBy(driverAllRows, r => getMonthKey(r.Date))
    return allMonths.map(k => (byMonth[k] || []).length)
  }, [driverAllRows, allMonths])

  const safeRange = useMemo(() => {
    const hi = allMonths.length ? allMonths.length - 1 : 0
    if (range[1] === 0 && range[0] === 0) return [0, hi]
    const lo = Math.min(Math.max(0, range[0]), hi)
    return [lo, Math.min(Math.max(lo, range[1]), hi)]
  }, [range, allMonths.length])

  const loKey = allMonths[safeRange[0]]
  const hiKey = allMonths[safeRange[1]]

  const dRows = useMemo(() => {
    if (!allMonths.length) return driverAllRows
    return driverAllRows.filter(r => {
      const k = getMonthKey(r.Date)
      return k && k >= loKey && k <= hiKey
    })
  }, [driverAllRows, allMonths.length, loKey, hiKey])

  const periodLabel = allMonths.length
    ? `${getMonthLabel(loKey + '-01')} – ${getMonthLabel(hiKey + '-01')}`
    : 'All time'

  const monthlyOverspeed = useMemo(() => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Overspeed === 'Yes')), [dRows])
  const monthlyDist      = useMemo(() => monthlyAgg(dRows, 'Distance_Travelled_km'), [dRows])
  const monthlyExp       = useMemo(() => monthlyAgg(dRows, 'Total_Expense'), [dRows])
  const monthlyInc       = useMemo(() => monthlyAgg(dRows, 'Income_Generated'), [dRows])
  const monthlyWorkshop  = useMemo(() => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Workshop_Visit === 'Yes')), [dRows])
  const monthlyBreakdown = useMemo(() => monthlyAgg(dRows, null, rows => countWhere(rows, r => r.Breakdown === 'Yes')), [dRows])

  const monthlyTable = useMemo(() => {
    const map = {}
    const put = (arr, key) => arr.forEach(r => { (map[r.month] = map[r.month] || { month: r.month })[key] = r.value })
    put(monthlyDist, 'distance'); put(monthlyInc, 'income'); put(monthlyExp, 'expense')
    put(monthlyOverspeed, 'overspeed'); put(monthlyWorkshop, 'workshop'); put(monthlyBreakdown, 'breakdown')
    return Object.values(map).map(r => ({
      month: r.month, distance: r.distance || 0, income: r.income || 0, expense: r.expense || 0,
      profit: (r.income || 0) - (r.expense || 0),
      overspeed: r.overspeed || 0, workshop: r.workshop || 0, breakdown: r.breakdown || 0,
    }))
  }, [monthlyDist, monthlyInc, monthlyExp, monthlyOverspeed, monthlyWorkshop, monthlyBreakdown])

  const stats = useMemo(() => ({
    totalTrips:    dRows.length,
    totalKm:       sumBy(dRows, 'Distance_Travelled_km'),
    overspeedPct:  dRows.length ? (countWhere(dRows, r => r.Overspeed === 'Yes') / dRows.length * 100) : 0,
    overspeedCount: countWhere(dRows, r => r.Overspeed === 'Yes'),
    totalIncome:   sumBy(dRows, 'Income_Generated'),
    totalExpense:  sumBy(dRows, 'Total_Expense'),
    workshops:     countWhere(dRows, r => r.Workshop_Visit === 'Yes'),
    breakdowns:    countWhere(dRows, r => r.Breakdown === 'Yes'),
    avgSpeed:      avgBy(dRows, 'Speed_kmph'),
  }), [dRows])

  const show = key => shownCharts.includes(key)

  function resetFilters() {
    setRange([0, allMonths.length ? allMonths.length - 1 : 0])
    setShownCharts(ALL_CHART_KEYS)
  }

  function handleDriverSelect(id) {
    setDriver(String(id))
    setRange([0, 0])
    setViewMode('individual')
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  if (viewMode === 'all') {
    return (
      <div className="tab-content">
        <div className="page-header">
          <div className="page-header-left">
            <p className="section-title">All Drivers Overview</p>
            <p className="section-sub">Fleet-wide driver performance and leaderboard</p>
          </div>
        </div>

        {/* Charts comparing all drivers */}
        <div className="charts-grid-2">
          <DynamicChart 
            title="Total Distance by Driver" 
            sub="Distance covered (km)"
            data={[...allDriversStats].sort((a,b)=>b.distance - a.distance).slice(0, 15)} 
            xKey="name" 
            defaultType="bar"
            height={240}
            metrics={[{ key: 'distance', label: 'Distance', color: '#6c8cff', format: v => fmtNum(v, 0) + ' km' }]} 
            yTickFormatter={v => fmtNum(v/1000) + 'k'}
          />
          <DynamicChart 
            title="Overspeed Events by Driver" 
            sub="Total speed-limit violations"
            data={[...allDriversStats].sort((a,b)=>b.overspeedCount - a.overspeedCount).slice(0, 15)} 
            xKey="name" 
            defaultType="bar"
            height={240}
            metrics={[{ key: 'overspeedCount', label: 'Events', color: '#f87171' }]} 
          />
        </div>

        <div className="charts-grid-2">
          <DynamicChart 
            title="Income Generated by Driver" 
            sub="Total revenue (₹)"
            data={[...allDriversStats].sort((a,b)=>b.income - a.income).slice(0, 15)} 
            xKey="name" 
            defaultType="bar"
            height={240}
            metrics={[{ key: 'income', label: 'Income', color: '#34d399', format: fmtCurrency }]} 
            yTickFormatter={fmtK}
          />
          <DynamicChart 
            title="Net Profit by Driver" 
            sub="Income minus expenses"
            data={[...allDriversStats].sort((a,b)=>b.profit - a.profit).slice(0, 15)} 
            xKey="name" 
            defaultType="bar"
            height={240}
            metrics={[{ key: 'profit', label: 'Profit', color: '#a78bfa', format: fmtCurrency, colorFn: r => (r.profit >= 0 ? '#34d399' : '#f87171') }]} 
            yTickFormatter={fmtK}
          />
        </div>

        {/* Leaderboard Table */}
        <div className="chart-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
          <div className="chart-title">Driver Leaderboard</div>
          <div className="chart-sub">Click any column to sort, or click a row to view driver details.</div>
          <div className="table-toolbar">
            <span className="table-count">{allDriversStats.length} drivers</span>
          </div>
          <SortableTable
            rows={allDriversStats}
            rowKey={r => r.id}
            initialSort={{ key: 'trips', dir: 'desc' }}
            columns={[
              { key: 'name', label: 'Driver', render: r => <div className="driver-row-clickable" onClick={() => handleDriverSelect(r.id)}><span style={{ fontWeight: 700 }}>{r.name}</span> <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{r.id}</span></div> },
              { key: 'trips', label: 'Trips', align: 'right' },
              { key: 'distance', label: 'Distance (km)', align: 'right', render: r => fmtNum(r.distance, 1) },
              { key: 'overspeedCount', label: 'Overspeed Count', align: 'right', render: r => <span className={`badge ${r.overspeedCount > 20 ? 'badge-red' : 'badge-orange'}`}>{r.overspeedCount} ({r.overspeedPct.toFixed(1)}%)</span> },
              { key: 'income', label: 'Income (₹)', align: 'right', render: r => <span style={{ color: 'var(--success)' }}>{fmtCurrency(r.income)}</span> },
              { key: 'expense', label: 'Expense (₹)', align: 'right', render: r => <span style={{ color: 'var(--warning)' }}>{fmtCurrency(r.expense)}</span> },
              { key: 'profit', label: 'Net Profit (₹)', align: 'right', render: r => <span style={{ color: r.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{fmtCurrency(r.profit)}</span> },
              { key: 'workshops', label: 'Workshop', align: 'right' },
              { key: 'breakdowns', label: 'Breakdowns', align: 'right' },
              { key: 'actions', label: '', align: 'right', sortable: false, render: r => <button className="view-detail-btn" onClick={() => handleDriverSelect(r.id)}>Details</button> }
            ]}
          />
        </div>
      </div>
    )
  }

  // INDIVIDUAL DRIVER VIEW
  return (
    <div className="tab-content">
      <button className="back-btn" onClick={() => setViewMode('all')}>
        ← Back to All Drivers
      </button>

      <div className="page-header" style={{ marginTop: '16px' }}>
        <div className="page-header-left">
          <p className="section-title">Driver Performance Analytics</p>
          <p className="section-sub">Month-wise breakdown for <strong>{driverName(selectedDriver)}</strong> · {periodLabel}</p>
        </div>
      </div>

      <div className="analytics-layout">
        <FilterPanel onReset={resetFilters}>
          <FilterGroup label="Driver">
            <select className="mini-select" style={{ width: '100%' }} value={selectedDriver}
              onChange={e => { setDriver(e.target.value); setRange([0, 0]) }}>
              {driverIds.map(d => <option key={d} value={d}>{driverName(d)} (#{d})</option>)}
            </select>
          </FilterGroup>

          <FilterGroup label="Reporting period">
            <FilterRange
              min={0}
              max={allMonths.length ? allMonths.length - 1 : 0}
              value={safeRange}
              onChange={setRange}
              histogram={monthTripCounts}
              fromLabel="From"
              toLabel="To"
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600 }}>{periodLabel}</div>
          </FilterGroup>

          <FilterGroup label="Visible charts" action={
            <button type="button" className="filter-reset"
              onClick={() => setShownCharts(shownCharts.length === ALL_CHART_KEYS.length ? [] : ALL_CHART_KEYS)}>
              {shownCharts.length === ALL_CHART_KEYS.length ? 'Hide all' : 'Show all'}
            </button>
          }>
            <FilterCheckboxGroup options={CHART_OPTIONS} value={shownCharts} onChange={setShownCharts} />
          </FilterGroup>
        </FilterPanel>

        <div>
          {/* KPI cards */}
          <div className="stat-cards">
            <div className="stat-card blue"><span className="label">Total Trips</span><span className="value">{fmtNum(stats.totalTrips)}</span></div>
            <div className="stat-card cyan"><span className="label">Total Distance</span><span className="value">{fmtNum(stats.totalKm, 0)} km</span></div>
            <div className="stat-card red"><span className="label">Overspeed %</span><span className="value">{stats.overspeedPct.toFixed(1)}%</span><span className="sub">{stats.overspeedCount} events</span></div>
            <div className="stat-card green"><span className="label">Total Income</span><span className="value">{fmtCurrency(stats.totalIncome)}</span></div>
            <div className="stat-card orange"><span className="label">Total Expense</span><span className="value">{fmtCurrency(stats.totalExpense)}</span></div>
            <div className="stat-card purple"><span className="label">Workshop Visits</span><span className="value">{stats.workshops}</span></div>
            <div className="stat-card red"><span className="label">Breakdowns</span><span className="value">{stats.breakdowns}</span></div>
            <div className="stat-card cyan"><span className="label">Avg Speed</span><span className="value">{stats.avgSpeed.toFixed(1)} km/h</span></div>
          </div>

          <div className="charts-grid-2">
            {show('overspeed') && (
              <DynamicChart title="Monthly Overspeed Events" sub="Trips where the speed limit was exceeded"
                data={monthlyOverspeed} defaultType="bar"
                metrics={[{ key: 'value', label: 'Overspeed Events', color: '#f87171', colorFn: r => (r.value > 5 ? '#f87171' : '#fca5a5') }]} />
            )}
            {show('distance') && (
              <DynamicChart title="Monthly Distance Travelled (km)" sub="Total kilometres covered per month"
                data={monthlyDist} defaultType="line"
                metrics={[{ key: 'value', label: 'Distance (km)', color: '#6c8cff', format: v => fmtNum(v, 1) + ' km' }]} />
            )}
          </div>

          <div className="charts-grid-2">
            {show('income') && (
              <DynamicChart title="Monthly Income Generated (₹)" sub="Revenue generated per month"
                data={monthlyInc} defaultType="bar"
                metrics={[{ key: 'value', label: 'Income', color: '#34d399', format: fmtCurrency }]} yTickFormatter={fmtK} />
            )}
            {show('expense') && (
              <DynamicChart title="Monthly Expenses (₹)" sub="Total operational expenses per month"
                data={monthlyExp} defaultType="bar"
                metrics={[{ key: 'value', label: 'Expense', color: '#fb923c', format: fmtCurrency }]} yTickFormatter={fmtK} />
            )}
          </div>

          <div className="charts-grid-2">
            {show('workshop') && (
              <DynamicChart title="Monthly Workshop Visits" sub="Maintenance visits count per month"
                data={monthlyWorkshop} defaultType="bar"
                metrics={[{ key: 'value', label: 'Workshop Visits', color: '#a78bfa' }]} />
            )}
            {show('breakdown') && (
              <DynamicChart title="Monthly Breakdown Events" sub="Number of breakdowns reported per month"
                data={monthlyBreakdown} defaultType="line"
                metrics={[{ key: 'value', label: 'Breakdowns', color: '#f87171' }]} />
            )}
          </div>

          {/* Sortable monthly summary table */}
          <div className="chart-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
            <div className="chart-title">Monthly Summary</div>
            <div className="chart-sub">Per-month performance for this driver — click any column to sort</div>
            <div className="table-toolbar">
              <span className="table-count">{monthlyTable.length} month{monthlyTable.length === 1 ? '' : 's'}</span>
            </div>
            <SortableTable
              rows={monthlyTable}
              rowKey={r => r.month}
              initialSort={{ key: 'month', dir: 'asc' }}
              emptyMessage="No records for this driver in the selected period."
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'distance', label: 'Distance (km)', align: 'right', render: r => fmtNum(r.distance, 1) },
                { key: 'income', label: 'Income (₹)', align: 'right', render: r => <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtCurrency(r.income)}</span> },
                { key: 'expense', label: 'Expense (₹)', align: 'right', render: r => <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{fmtCurrency(r.expense)}</span> },
                { key: 'profit', label: 'Net (₹)', align: 'right', render: r => <span style={{ color: r.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{fmtCurrency(r.profit)}</span> },
                { key: 'overspeed', label: 'Overspeed', align: 'right', render: r => <span className={`badge ${r.overspeed > 5 ? 'badge-red' : 'badge-orange'}`}>{r.overspeed}</span> },
                { key: 'workshop', label: 'Workshop', align: 'right' },
                { key: 'breakdown', label: 'Breakdown', align: 'right' },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

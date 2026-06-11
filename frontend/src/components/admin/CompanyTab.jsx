import { useContext, useMemo, useState } from 'react'
import {
  BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { DataContext } from '../../App'
import {
  groupBy, monthlyAgg, countWhere, sumBy, fmtNum, fmtCurrency,
  getMonthKey, getMonthLabel,
} from '../../utils/dataUtils'
import ChartCard from '../shared/ChartCard'
import DynamicChart from '../shared/DynamicChart'
import SortableTable from '../shared/SortableTable'
import FilterPanel, { FilterGroup, FilterChips, FilterRange, FilterCheckboxGroup } from '../shared/FilterPanel'

const CHART_OPTIONS = [
  { value: 'revexp', label: 'Revenue vs Expense' },
  { value: 'expense', label: 'Monthly Expense' },
  { value: 'revenue', label: 'Monthly Revenue' },
  { value: 'profit', label: 'Net Profit' },
  { value: 'topexp', label: 'Top Expense Months' },
  { value: 'breakdown', label: 'Breakdowns' },
  { value: 'workshop', label: 'Workshop Visits' },
  { value: 'overspeed', label: 'Overspeed' },
  { value: 'brand', label: 'By Brand' },
]
const ALL_CHART_KEYS = CHART_OPTIONS.map(c => c.value)

const fmtK = v => '₹' + fmtNum(v / 1000) + 'k'

export default function CompanyTab() {
  const data = useContext(DataContext)

  // ── Available months (chronological) ──────────────────────────────────────
  const allMonths = useMemo(() => {
    const keys = [...new Set(data.map(r => getMonthKey(r.Date)).filter(Boolean))].sort()
    return keys
  }, [data])

  const monthTripCounts = useMemo(() => {
    const byMonth = groupBy(data, r => getMonthKey(r.Date))
    return allMonths.map(k => (byMonth[k] || []).length)
  }, [data, allMonths])

  // ── Filter state ──────────────────────────────────────────────────────────
  const [range, setRange] = useState([0, 0])
  const [profitFilter, setProfitFilter] = useState('all')   // all | profit | loss
  const [shownCharts, setShownCharts] = useState(ALL_CHART_KEYS)

  // Keep range valid when months load
  const safeRange = useMemo(() => {
    const hi = allMonths.length ? allMonths.length - 1 : 0
    let [lo, h] = range
    if (h === 0 && range[0] === 0) return [0, hi]      // initial
    lo = Math.min(Math.max(0, lo), hi)
    h = Math.min(Math.max(lo, h), hi)
    return [lo, h]
  }, [range, allMonths.length])

  const [loIdx, hiIdx] = safeRange
  const loKey = allMonths[loIdx]
  const hiKey = allMonths[hiIdx]

  // ── Data filtered by selected period ──────────────────────────────────────
  const fdata = useMemo(() => {
    if (!allMonths.length) return data
    return data.filter(r => {
      const k = getMonthKey(r.Date)
      return k && k >= loKey && k <= hiKey
    })
  }, [data, allMonths.length, loKey, hiKey])

  const periodLabel = allMonths.length
    ? `${getMonthLabel(loKey + '-01')} – ${getMonthLabel(hiKey + '-01')}`
    : 'All time'

  // ── Aggregations (over filtered data) ─────────────────────────────────────
  const monthlyExpense  = useMemo(() => monthlyAgg(fdata, 'Total_Expense'), [fdata])
  const monthlyRevenue  = useMemo(() => monthlyAgg(fdata, 'Income_Generated'), [fdata])
  const monthlyBreakdown = useMemo(() => monthlyAgg(fdata, null, rows => countWhere(rows, r => r.Breakdown === 'Yes')), [fdata])
  const monthlyWorkshop  = useMemo(() => monthlyAgg(fdata, null, rows => countWhere(rows, r => r.Workshop_Visit === 'Yes')), [fdata])
  const monthlyOvespeed  = useMemo(() => monthlyAgg(fdata, null, rows => countWhere(rows, r => r.Overspeed === 'Yes')), [fdata])

  const monthlyProfit = useMemo(() => {
    const revMap = Object.fromEntries(monthlyRevenue.map(r => [r.month, r.value]))
    return monthlyExpense.map(r => ({
      month: r.month,
      expense: r.value,
      revenue: revMap[r.month] ?? 0,
      profit: (revMap[r.month] ?? 0) - r.value,
    }))
  }, [monthlyExpense, monthlyRevenue])

  const topExpenseMonths = useMemo(
    () => [...monthlyExpense].sort((a, b) => b.value - a.value).slice(0, 10),
    [monthlyExpense]
  )

  const stats = useMemo(() => {
    const totalRevenue   = sumBy(fdata, 'Income_Generated')
    const totalExpense   = sumBy(fdata, 'Total_Expense')
    return {
      totalRevenue,
      totalExpense,
      totalProfit: totalRevenue - totalExpense,
      totalBreakdown: countWhere(fdata, r => r.Breakdown === 'Yes'),
      totalWorkshop:  countWhere(fdata, r => r.Workshop_Visit === 'Yes'),
      totalOverspeed: countWhere(fdata, r => r.Overspeed === 'Yes'),
      totalTrips:     fdata.length,
      uniqueVehicles: new Set(fdata.map(r => r.Vehicle_ID)).size,
      uniqueDrivers:  new Set(fdata.map(r => r.Driver_ID)).size,
    }
  }, [fdata])

  const expenseByBrand = useMemo(() => {
    const byBrand = groupBy(fdata, 'Brand')
    return Object.entries(byBrand)
      .map(([brand, rows]) => ({
        brand,
        expense: Math.round(sumBy(rows, 'Total_Expense')),
        revenue: Math.round(sumBy(rows, 'Income_Generated')),
      }))
      .sort((a, b) => b.expense - a.expense)
  }, [fdata])

  // ── Summary table rows (with profit filter) ───────────────────────────────
  const summaryRows = useMemo(() => {
    return monthlyProfit
      .filter(r => profitFilter === 'all' || (profitFilter === 'profit' ? r.profit >= 0 : r.profit < 0))
      .map(row => ({
        ...row,
        breakdowns: monthlyBreakdown.find(b => b.month === row.month)?.value ?? 0,
        workshops:  monthlyWorkshop.find(w => w.month === row.month)?.value ?? 0,
        overspeed:  monthlyOvespeed.find(o => o.month === row.month)?.value ?? 0,
      }))
  }, [monthlyProfit, monthlyBreakdown, monthlyWorkshop, monthlyOvespeed, profitFilter])

  const show = key => shownCharts.includes(key)

  function resetFilters() {
    setRange([0, allMonths.length ? allMonths.length - 1 : 0])
    setProfitFilter('all')
    setShownCharts(ALL_CHART_KEYS)
  }

  return (
    <div className="tab-content">
      <div className="page-header">
        <div className="page-header-left">
          <p className="section-title">Company Overview</p>
          <p className="section-sub">Fleet-wide expenses, revenue, profit &amp; breakdown analysis · <strong>{periodLabel}</strong></p>
        </div>
      </div>

      <div className="analytics-layout">
        {/* ── FILTER PANEL ── */}
        <FilterPanel onReset={resetFilters}>
          <FilterGroup label="Reporting period">
            <FilterRange
              min={0}
              max={allMonths.length ? allMonths.length - 1 : 0}
              value={safeRange}
              onChange={setRange}
              histogram={monthTripCounts}
              format={i => getMonthLabel((allMonths[i] || '') + '-01')}
              fromLabel="From month"
              toLabel="To month"
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600 }}>
              {periodLabel}
            </div>
          </FilterGroup>

          <FilterGroup label="Profitability (table)">
            <FilterChips
              options={[{ value: 'all', label: 'All' }, { value: 'profit', label: 'Profit' }, { value: 'loss', label: 'Loss' }]}
              value={profitFilter}
              onChange={setProfitFilter}
            />
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

        {/* ── CONTENT ── */}
        <div>
          {/* KPI Cards */}
          <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div className="stat-card green"><span className="label">Total Revenue</span><span className="value" style={{ fontSize: '18px' }}>{fmtCurrency(stats.totalRevenue)}</span></div>
            <div className="stat-card orange"><span className="label">Total Expense</span><span className="value" style={{ fontSize: '18px' }}>{fmtCurrency(stats.totalExpense)}</span></div>
            <div className={`stat-card ${stats.totalProfit >= 0 ? 'blue' : 'red'}`}><span className="label">Net Profit</span><span className="value" style={{ fontSize: '18px' }}>{fmtCurrency(stats.totalProfit)}</span></div>
            <div className="stat-card blue"><span className="label">Total Trips</span><span className="value">{fmtNum(stats.totalTrips)}</span></div>
            <div className="stat-card cyan"><span className="label">Vehicles</span><span className="value">{stats.uniqueVehicles}</span></div>
            <div className="stat-card purple"><span className="label">Drivers</span><span className="value">{stats.uniqueDrivers}</span></div>
            <div className="stat-card red"><span className="label">Total Breakdowns</span><span className="value">{stats.totalBreakdown}</span></div>
            <div className="stat-card orange"><span className="label">Workshop Visits</span><span className="value">{stats.totalWorkshop}</span></div>
            <div className="stat-card red"><span className="label">Overspeed Events</span><span className="value">{stats.totalOverspeed}</span></div>
          </div>

          {/* Revenue vs Expense (Composed — preserved original visualization) */}
          {show('revexp') && (
            <ChartCard
              title="Monthly Revenue vs Expense (₹)"
              sub="Side-by-side income vs operational cost, with the net-profit trend line"
              style={{ marginBottom: '20px' }}
            >
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={monthlyProfit} margin={{ top: 10, right: 30, bottom: 20, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#868c98' }} tickLine={false} axisLine={{ stroke: '#e8e9ee' }} label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 10, fill: '#868c98' }} tickLine={false} axisLine={false} tickFormatter={fmtK} />
                  <Tooltip formatter={(v, name) => [fmtCurrency(v), name]} contentStyle={{ borderRadius: 10, border: '1px solid #e8e9ee', fontSize: 12 }} />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue (₹)" fill="#16a34a" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expense" name="Expense (₹)" fill="#ea580c" radius={[5, 5, 0, 0]} />
                  <Line type="monotone" dataKey="profit" name="Net Profit (₹)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Expense + Revenue (dynamic) */}
          {(show('expense') || show('revenue')) && (
            <div className="charts-grid-2">
              {show('expense') && (
                <DynamicChart
                  title="Monthly Total Expense (₹)"
                  sub="Operational costs across the fleet per month"
                  data={monthlyExpense}
                  defaultType="area"
                  metrics={[{ key: 'value', label: 'Total Expense', color: '#ea580c', format: fmtCurrency }]}
                  yTickFormatter={fmtK}
                />
              )}
              {show('revenue') && (
                <DynamicChart
                  title="Monthly Total Revenue (₹)"
                  sub="Income generated across the fleet per month"
                  data={monthlyRevenue}
                  defaultType="area"
                  metrics={[{ key: 'value', label: 'Total Revenue', color: '#16a34a', format: fmtCurrency }]}
                  yTickFormatter={fmtK}
                />
              )}
            </div>
          )}

          {/* Net profit (dynamic, colored by sign) */}
          {show('profit') && (
            <DynamicChart
              title="Monthly Net Profit / Loss (₹)"
              sub="Net profit = Revenue − Expense. Red indicates a loss month."
              data={monthlyProfit}
              defaultType="bar"
              metrics={[{ key: 'profit', label: 'Net Profit', color: '#16a34a', format: fmtCurrency, colorFn: r => (r.profit >= 0 ? '#16a34a' : '#dc2626') }]}
              yTickFormatter={fmtK}
            />
          )}

          {/* Extra chart: top expense months */}
          {show('topexp') && (
            <div style={{ marginTop: '20px' }}>
              <DynamicChart
                title="Top Expense Months (₹)"
                sub="The costliest months in the selected period, ranked highest first"
                data={topExpenseMonths}
                defaultType="bar"
                types={['bar', 'line']}
                metrics={[{ key: 'value', label: 'Expense', color: '#b45309', format: fmtCurrency }]}
                yTickFormatter={fmtK}
              />
            </div>
          )}

          {/* Breakdown + Workshop (dynamic) */}
          {(show('breakdown') || show('workshop')) && (
            <div className="charts-grid-2" style={{ marginTop: '20px' }}>
              {show('breakdown') && (
                <DynamicChart
                  title="Monthly Breakdown Events"
                  sub="Total vehicle breakdowns reported fleet-wide per month"
                  data={monthlyBreakdown}
                  defaultType="bar"
                  metrics={[{ key: 'value', label: 'Breakdowns', color: '#dc2626', colorFn: r => (r.value > 10 ? '#7f1d1d' : r.value > 5 ? '#dc2626' : '#fca5a5') }]}
                />
              )}
              {show('workshop') && (
                <DynamicChart
                  title="Monthly Workshop Visits"
                  sub="Total fleet-wide maintenance workshop visits per month"
                  data={monthlyWorkshop}
                  defaultType="bar"
                  metrics={[{ key: 'value', label: 'Workshop Visits', color: '#7c3aed' }]}
                />
              )}
            </div>
          )}

          {/* Overspeed (dynamic) */}
          {show('overspeed') && (
            <div style={{ marginTop: '20px' }}>
              <DynamicChart
                title="Monthly Overspeed Events (Fleet-wide)"
                sub="Total speed-limit violations across all vehicles and drivers per month"
                data={monthlyOvespeed}
                defaultType="line"
                metrics={[{ key: 'value', label: 'Overspeed Events', color: '#dc2626' }]}
              />
            </div>
          )}

          {/* Revenue vs Expense by brand (preserved) */}
          {show('brand') && (
            <ChartCard title="Revenue vs Expense by Brand (₹)" sub="Comparative brand-level revenue and expense" style={{ marginTop: '20px', marginBottom: '20px' }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={expenseByBrand} margin={{ top: 10, right: 30, bottom: 20, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="brand" tick={{ fontSize: 11, fill: '#868c98' }} tickLine={false} axisLine={{ stroke: '#e8e9ee' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#868c98' }} tickLine={false} axisLine={false} tickFormatter={fmtK} />
                  <Tooltip formatter={(v, name) => [fmtCurrency(v), name]} contentStyle={{ borderRadius: 10, border: '1px solid #e8e9ee', fontSize: 12 }} />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue (₹)" fill="#16a34a" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expense" name="Expense (₹)" fill="#ea580c" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Monthly summary — sortable */}
          <div className="chart-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
            <div className="chart-title">Monthly Financial Summary</div>
            <div className="chart-sub">Month-wise revenue, expense and net profit — click any column to sort ascending / descending</div>
            <div className="table-toolbar">
              <span className="table-count">{summaryRows.length} month{summaryRows.length === 1 ? '' : 's'} shown</span>
            </div>
            <SortableTable
              rows={summaryRows}
              rowKey={r => r.month}
              initialSort={{ key: 'revenue', dir: 'desc' }}
              emptyMessage="No months match the current filters."
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'revenue', label: 'Total Revenue (₹)', align: 'right', render: r => <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtCurrency(r.revenue)}</span> },
                { key: 'expense', label: 'Total Expense (₹)', align: 'right', render: r => <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{fmtCurrency(r.expense)}</span> },
                { key: 'profit', label: 'Net Profit (₹)', align: 'right', render: r => <span style={{ color: r.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{fmtCurrency(r.profit)}</span> },
                { key: 'breakdowns', label: 'Breakdowns', align: 'right', render: r => <span className={`badge ${r.breakdowns > 5 ? 'badge-red' : 'badge-orange'}`}>{r.breakdowns}</span> },
                { key: 'workshops', label: 'Workshop Visits', align: 'right' },
                { key: 'overspeed', label: 'Overspeed Events', align: 'right', render: r => <span className={`badge ${r.overspeed > 20 ? 'badge-red' : 'badge-orange'}`}>{r.overspeed}</span> },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

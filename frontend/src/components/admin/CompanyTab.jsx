import { useContext, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { DataContext } from '../../App'
import {
  groupBy, monthlyAgg, countWhere, sumBy, fmtNum, fmtCurrency, COLORS,
} from '../../utils/dataUtils'

export default function CompanyTab() {
  const data = useContext(DataContext)

  // ── Fleet-wide monthly aggregations ───────────────────────────────────────
  const monthlyExpense = useMemo(
    () => monthlyAgg(data, 'Total_Expense'),
    [data]
  )

  const monthlyRevenue = useMemo(
    () => monthlyAgg(data, 'Income_Generated'),
    [data]
  )

  const monthlyBreakdown = useMemo(
    () => monthlyAgg(data, null, rows => countWhere(rows, r => r.Breakdown === 'Yes')),
    [data]
  )

  const monthlyWorkshop = useMemo(
    () => monthlyAgg(data, null, rows => countWhere(rows, r => r.Workshop_Visit === 'Yes')),
    [data]
  )

  const monthlyOvespeed = useMemo(
    () => monthlyAgg(data, null, rows => countWhere(rows, r => r.Overspeed === 'Yes')),
    [data]
  )

  // ── Monthly profit = revenue – expense ────────────────────────────────────
  const monthlyProfit = useMemo(() => {
    const revMap = Object.fromEntries(monthlyRevenue.map(r => [r.month, r.value]))
    return monthlyExpense.map(r => ({
      month: r.month,
      expense: r.value,
      revenue: revMap[r.month] ?? 0,
      profit: (revMap[r.month] ?? 0) - r.value,
    }))
  }, [monthlyExpense, monthlyRevenue])

  // ── Fleet-wide KPIs ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalRevenue   = sumBy(data, 'Income_Generated')
    const totalExpense   = sumBy(data, 'Total_Expense')
    const totalProfit    = totalRevenue - totalExpense
    const totalBreakdown = countWhere(data, r => r.Breakdown === 'Yes')
    const totalWorkshop  = countWhere(data, r => r.Workshop_Visit === 'Yes')
    const totalOverspeed = countWhere(data, r => r.Overspeed === 'Yes')
    const totalTrips     = data.length
    const uniqueVehicles = new Set(data.map(r => r.Vehicle_ID)).size
    const uniqueDrivers  = new Set(data.map(r => r.Driver_ID)).size
    return { totalRevenue, totalExpense, totalProfit, totalBreakdown, totalWorkshop, totalOverspeed, totalTrips, uniqueVehicles, uniqueDrivers }
  }, [data])

  // ── Expense by category (vehicle model / brand) ───────────────────────────
  const expenseByBrand = useMemo(() => {
    const byBrand = groupBy(data, 'Brand')
    return Object.entries(byBrand)
      .map(([brand, rows]) => ({
        brand,
        expense: Math.round(sumBy(rows, 'Total_Expense')),
        revenue: Math.round(sumBy(rows, 'Income_Generated')),
      }))
      .sort((a, b) => b.expense - a.expense)
  }, [data])

  // ── Top 10 expense months ─────────────────────────────────────────────────
  const topExpenseMonths = useMemo(
    () => [...monthlyExpense].sort((a, b) => b.value - a.value).slice(0, 10),
    [monthlyExpense]
  )

  return (
    <div className="tab-content">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <p className="section-title">Company Overview</p>
          <p className="section-sub">Fleet-wide monthly expenses, revenue, profit & breakdown analysis</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="stat-card green">
          <span className="label">Total Revenue</span>
          <span className="value" style={{ fontSize: '18px' }}>{fmtCurrency(stats.totalRevenue)}</span>
        </div>
        <div className="stat-card orange">
          <span className="label">Total Expense</span>
          <span className="value" style={{ fontSize: '18px' }}>{fmtCurrency(stats.totalExpense)}</span>
        </div>
        <div className={`stat-card ${stats.totalProfit >= 0 ? 'blue' : 'red'}`}>
          <span className="label">Net Profit</span>
          <span className="value" style={{ fontSize: '18px' }}>{fmtCurrency(stats.totalProfit)}</span>
        </div>
        <div className="stat-card blue">
          <span className="label">Total Trips</span>
          <span className="value">{fmtNum(stats.totalTrips)}</span>
        </div>
        <div className="stat-card cyan">
          <span className="label">Vehicles</span>
          <span className="value">{stats.uniqueVehicles}</span>
        </div>
        <div className="stat-card purple">
          <span className="label">Drivers</span>
          <span className="value">{stats.uniqueDrivers}</span>
        </div>
        <div className="stat-card red">
          <span className="label">Total Breakdowns</span>
          <span className="value">{stats.totalBreakdown}</span>
        </div>
        <div className="stat-card orange">
          <span className="label">Workshop Visits</span>
          <span className="value">{stats.totalWorkshop}</span>
        </div>
        <div className="stat-card red">
          <span className="label">Overspeed Events</span>
          <span className="value">{stats.totalOverspeed}</span>
        </div>
      </div>

      {/* ── Row 1: Revenue vs Expense (Composed Chart) ── */}
      <ChartCard
        title="Monthly Revenue vs Expense (₹)"
        sub="Side-by-side comparison of income generated vs operational costs across all vehicles"
      >
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={monthlyProfit} margin={{ top: 10, right: 30, bottom: 20, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'}
              label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', offset: -15, fontSize: 12 }}
            />
            <Tooltip formatter={(v, name) => [fmtCurrency(v), name]} />
            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
            <Bar dataKey="revenue" name="Revenue (₹)" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expense (₹)" fill="#ea580c" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="profit" name="Net Profit (₹)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Row 2: Monthly Expense + Monthly Revenue ── */}
      <div className="charts-grid-2">
        <ChartCard title="Monthly Total Expense (₹)" sub="Total operational costs across the entire fleet per month">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyExpense} margin={{ top: 5, right: 20, bottom: 20, left: 30 }}>
              <defs>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'}
                label={{ value: 'Expense (₹)', angle: -90, position: 'insideLeft', offset: -15, fontSize: 11 }}
              />
              <Tooltip formatter={v => [fmtCurrency(v), 'Total Expense']} />
              <Legend verticalAlign="top" />
              <Area type="monotone" dataKey="value" name="Total Expense (₹)" stroke="#ea580c" fill="url(#expGrad)" strokeWidth={2} dot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Total Revenue (₹)" sub="Total income generated across the entire fleet per month">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyRevenue} margin={{ top: 5, right: 20, bottom: 20, left: 30 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'}
                label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft', offset: -15, fontSize: 11 }}
              />
              <Tooltip formatter={v => [fmtCurrency(v), 'Total Revenue']} />
              <Legend verticalAlign="top" />
              <Area type="monotone" dataKey="value" name="Total Revenue (₹)" stroke="#16a34a" fill="url(#revGrad)" strokeWidth={2} dot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 3: Monthly Net Profit ── */}
      <ChartCard title="Monthly Net Profit / Loss (₹)" sub="Net profit = Revenue − Expense. Red bars indicate a loss month.">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyProfit} margin={{ top: 5, right: 30, bottom: 20, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'}
              label={{ value: 'Net Profit (₹)', angle: -90, position: 'insideLeft', offset: -15, fontSize: 11 }}
            />
            <Tooltip formatter={v => [fmtCurrency(v), 'Net Profit']} />
            <Legend verticalAlign="top" />
            <Bar dataKey="profit" name="Net Profit (₹)" radius={[4, 4, 0, 0]}>
              {monthlyProfit.map((entry, i) => (
                <Cell key={i} fill={entry.profit >= 0 ? '#16a34a' : '#dc2626'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Row 4: Breakdown + Workshop ── */}
      <div className="charts-grid-2">
        <ChartCard title="Monthly Breakdown Events" sub="Total vehicle breakdowns reported fleet-wide per month">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyBreakdown} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
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
              <Bar dataKey="value" name="Breakdown Events" fill="#dc2626" radius={[4, 4, 0, 0]}>
                {monthlyBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.value > 10 ? '#7f1d1d' : entry.value > 5 ? '#dc2626' : '#fca5a5'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Workshop Visits" sub="Total fleet-wide maintenance workshop visits per month">
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
      </div>

      {/* ── Row 5: Overspeed fleet-wide ── */}
      <ChartCard title="Monthly Overspeed Events (Fleet-wide)" sub="Total speed-limit violations across all vehicles and drivers per month">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthlyOvespeed} margin={{ top: 5, right: 30, bottom: 20, left: 10 }}>
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
            <Line type="monotone" dataKey="value" name="Overspeed Events" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Row 6: Expense & Revenue by Brand ── */}
      <ChartCard title="Revenue vs Expense by Brand (₹)" sub="Comparative brand-level revenue and expense across the entire fleet">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={expenseByBrand} margin={{ top: 10, right: 30, bottom: 20, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="brand"
              tick={{ fontSize: 11 }}
              label={{ value: 'Brand', position: 'insideBottom', offset: -12, fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={v => '₹' + fmtNum(v / 1000) + 'k'}
              label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', offset: -15, fontSize: 12 }}
            />
            <Tooltip formatter={(v, name) => [fmtCurrency(v), name]} />
            <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
            <Bar dataKey="revenue" name="Revenue (₹)" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expense (₹)" fill="#ea580c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Monthly Summary Table ── */}
      <div className="chart-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
        <div className="chart-title">Monthly Financial Summary</div>
        <div className="chart-sub">Complete month-wise breakdown of revenue, expense, and net profit across all vehicles</div>
        <table className="data-table">
          <thead>
            <tr>
              {['Month', 'Total Revenue (₹)', 'Total Expense (₹)', 'Net Profit (₹)', 'Breakdowns', 'Workshop Visits', 'Overspeed Events'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlyProfit.map((row) => {
              const bd = monthlyBreakdown.find(b => b.month === row.month)?.value ?? 0
              const ws = monthlyWorkshop.find(w => w.month === row.month)?.value ?? 0
              const os = monthlyOvespeed.find(o => o.month === row.month)?.value ?? 0
              return (
                <tr key={row.month}>
                  <td style={{ fontWeight: '700' }}>{row.month}</td>
                  <td style={{ color: 'var(--success)', fontWeight: '600' }}>{fmtCurrency(row.revenue)}</td>
                  <td style={{ color: 'var(--warning)', fontWeight: '600' }}>{fmtCurrency(row.expense)}</td>
                  <td>
                    <span style={{ color: row.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '700' }}>
                      {fmtCurrency(row.profit)}
                    </span>
                  </td>
                  <td><span className={`badge ${bd > 5 ? 'badge-red' : 'badge-orange'}`}>{bd}</span></td>
                  <td>{ws}</td>
                  <td><span className={`badge ${os > 20 ? 'badge-red' : 'badge-orange'}`}>{os}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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

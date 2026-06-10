import { useContext, useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { DataContext } from '../../App'
import {
  uniqueValues, monthlyAgg, countWhere, sumBy, avgBy,
  fmtNum, fmtCurrency, COLORS, groupBy, driverName,
} from '../../utils/dataUtils'

// ── Car images imported directly so Vite bundles them ─────────────────────
import imgTiagoEV      from '../../assets/cars/tiagoev.png'
import imgPunchEV      from '../../assets/cars/punchev.png'
import imgHarrierEV    from '../../assets/cars/harrierev.png'
import imgXUV400EV     from '../../assets/cars/xuv400.png'
import imgXEV9e        from '../../assets/cars/xev9e.png'
import imgBE6          from '../../assets/cars/be6.png'
import imgEQS          from '../../assets/cars/eqs.png'
import imgEQSSUV       from '../../assets/cars/eqssuv.png'

const CAR_IMAGES = {
  'Tata Tiago EV':      imgTiagoEV,
  'Tata Punch EV':      imgPunchEV,
  'Tata Harrier EV':    imgHarrierEV,
  'Mahindra XUV400 EV': imgXUV400EV,
  'Mahindra XEV 9e':    imgXEV9e,
  'Mahindra BE 6':      imgBE6,
  'Mercedes EQS':       imgEQS,
  'Mercedes EQS SUV':   imgEQSSUV,
}

const BRAND_GRADIENTS = {
  'Mahindra':  'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)',
  'Mercedes':  'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)',
  'Tata':      'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
}

const STATUS_META = {
  Running:  { color: '#16a34a', bg: '#dcfce7', label: '● Running'  },
  Charging: { color: '#0891b2', bg: '#cffafe', label: '⚡ Charging' },
  Workshop: { color: '#ea580c', bg: '#ffedd5', label: '🔧 Workshop' },
}

export default function VehicleTab() {
  const data = useContext(DataContext)
  const vehicleIds = useMemo(() => uniqueValues(data, 'Vehicle_ID'), [data])
  const [selectedVehicle, setVehicle] = useState(vehicleIds[0] ?? '')
  const [activeView, setActiveView] = useState('cards') // 'cards' | 'fleet' | 'overview' | 'brand'
  const [cardFilter, setCardFilter]   = useState('all')
  const [cardSearch, setCardSearch]   = useState('')
  const [cardBrand, setCardBrand]     = useState('all')
  const [cardModel, setCardModel]     = useState('all')

  // ── Fleet Status: latest status per vehicle ────────────────────────────────
  const vehicleLatestStatus = useMemo(() => {
    const byVehicle = groupBy(data, 'Vehicle_ID')
    return Object.entries(byVehicle).map(([vid, rows]) => {
      const sorted = [...rows].sort((a, b) => {
        const da = new Date(a.Date + ' ' + (a.Time || ''))
        const db = new Date(b.Date + ' ' + (b.Time || ''))
        return db - da
      })
      const latest = sorted[0] || {}
      return {
        vehicle: vid,
        brand: latest.Brand || '—',
        model: latest.Vehicle_Model || '—',
        category: latest.Category || '—',
        status: latest.Vehicle_Status || 'Unknown',
        driver: latest.Driver_ID ? driverName(latest.Driver_ID) : '—',
        driverRaw: latest.Driver_ID || '',
        battery: latest.Battery_Percentage != null ? parseFloat(latest.Battery_Percentage) : null,
        lastDate: latest.Date || '',
        maxRange: latest.Max_Range_km ? parseFloat(latest.Max_Range_km) : null,
        batteryCapacity: latest.Battery_Capacity_kWh ? parseFloat(latest.Battery_Capacity_kWh) : null,
        motorKw: latest.Motor_Spec_kW ? parseFloat(latest.Motor_Spec_kW) : null,
        remainingRange: latest.Remaining_Range_km ? parseFloat(latest.Remaining_Range_km) : null,
      }
    })
  }, [data])

  const fleetStatusCounts = useMemo(() => {
    const counts = { Running: 0, Charging: 0, Workshop: 0, Other: 0 }
    vehicleLatestStatus.forEach(v => {
      if (counts[v.status] !== undefined) counts[v.status]++
      else counts.Other++
    })
    return [
      { name: 'Running',  value: counts.Running,  color: '#16a34a' },
      { name: 'Charging', value: counts.Charging, color: '#0891b2' },
      { name: 'Workshop', value: counts.Workshop, color: '#ea580c' },
      ...(counts.Other > 0 ? [{ name: 'Other', value: counts.Other, color: '#94a3b8' }] : []),
    ].filter(s => s.value > 0)
  }, [vehicleLatestStatus])

  // ── Unique brands & models for dropdowns ──────────────────────────────────
  const allBrands = useMemo(() =>
    ['all', ...Array.from(new Set(vehicleLatestStatus.map(v => v.brand))).sort()],
    [vehicleLatestStatus]
  )
  const allModels = useMemo(() => {
    const source = cardBrand === 'all' ? vehicleLatestStatus : vehicleLatestStatus.filter(v => v.brand === cardBrand)
    return ['all', ...Array.from(new Set(source.map(v => v.model))).sort()]
  }, [vehicleLatestStatus, cardBrand])

  // ── Filtered fleet cards ───────────────────────────────────────────────────
  const filteredFleetCards = useMemo(() => {
    const q = cardSearch.toLowerCase()
    return vehicleLatestStatus.filter(v => {
      const matchStatus = cardFilter === 'all' || v.status === cardFilter
      const matchBrand  = cardBrand  === 'all' || v.brand  === cardBrand
      const matchModel  = cardModel  === 'all' || v.model  === cardModel
      const matchSearch = !q ||
        v.vehicle.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)   ||
        v.brand.toLowerCase().includes(q)   ||
        v.category.toLowerCase().includes(q)
      return matchStatus && matchBrand && matchModel && matchSearch
    })
  }, [vehicleLatestStatus, cardFilter, cardBrand, cardModel, cardSearch])

  // ── Driver-wise table ──────────────────────────────────────────────────────
  const [driverSortKey, setDriverSortKey] = useState('driverRaw')
  const [driverSortDir, setDriverSortDir] = useState('asc')

  const driverTableData = useMemo(() => {
    const byDriver = groupBy(vehicleLatestStatus, v => v.driverRaw)
    return Object.entries(byDriver).map(([did, vehicles]) => ({
      driver: `Driver ${did}`,
      driverRaw: Number(did) || did,
      driverName: driverName(did),
      total: vehicles.length,
      running: vehicles.filter(v => v.status === 'Running').length,
      charging: vehicles.filter(v => v.status === 'Charging').length,
      workshop: vehicles.filter(v => v.status === 'Workshop').length,
      vehicles: vehicles.map(v => v.vehicle).join(', '),
    }))
  }, [vehicleLatestStatus])

  const sortedDriverData = useMemo(() => {
    const arr = [...driverTableData]
    arr.sort((a, b) => {
      const va = a[driverSortKey], vb = b[driverSortKey]
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return driverSortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [driverTableData, driverSortKey, driverSortDir])

  // ── Brand-wise status table ────────────────────────────────────────────────
  const [brandStatusSortKey, setBrandStatusSortKey] = useState('brand')
  const [brandStatusSortDir, setBrandStatusSortDir] = useState('asc')

  const brandStatusData = useMemo(() => {
    const byBrand = groupBy(vehicleLatestStatus, v => v.brand)
    return Object.entries(byBrand).map(([brand, vehicles]) => ({
      brand,
      total: vehicles.length,
      running: vehicles.filter(v => v.status === 'Running').length,
      charging: vehicles.filter(v => v.status === 'Charging').length,
      workshop: vehicles.filter(v => v.status === 'Workshop').length,
    }))
  }, [vehicleLatestStatus])

  const sortedBrandStatusData = useMemo(() => {
    const arr = [...brandStatusData]
    arr.sort((a, b) => {
      const va = a[brandStatusSortKey], vb = b[brandStatusSortKey]
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return brandStatusSortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [brandStatusData, brandStatusSortKey, brandStatusSortDir])

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
            {[
              { key: 'cards',    label: '🃏 Fleet Cards'   },
              { key: 'fleet',    label: '🚦 Fleet Status' },
              { key: 'overview', label: '🚗 Vehicle View' },
              { key: 'brand',    label: '🏷️ Brand View'   },
            ].map(({ key, label }) => (
              <button key={key}
                className={`view-toggle-btn${activeView === key ? ' active' : ''}`}
                onClick={() => setActiveView(key)}
              >
                {label}
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

      {/* ── FLEET CARDS VIEW ── */}
      {activeView === 'cards' && (
        <>
          {/* Filter bar */}
          <div className="fleet-cards-bar">
            <div className="fleet-cards-filters">
              {['all', 'Running', 'Charging', 'Workshop'].map(f => (
                <button
                  key={f}
                  className={`fleet-filter-btn${cardFilter === f ? ' active' : ''}`}
                  style={cardFilter === f && f !== 'all' ? { borderColor: STATUS_META[f]?.color, color: STATUS_META[f]?.color } : {}}
                  onClick={() => setCardFilter(f)}
                >
                  {f === 'all' ? `All (${vehicleLatestStatus.length})` :
                   f === 'Running'  ? `🟢 Running (${vehicleLatestStatus.filter(v => v.status === 'Running').length})` :
                   f === 'Charging' ? `⚡ Charging (${vehicleLatestStatus.filter(v => v.status === 'Charging').length})` :
                                      `🔧 Workshop (${vehicleLatestStatus.filter(v => v.status === 'Workshop').length})`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Brand filter */}
              <select
                className="select"
                style={{ fontSize: '12.5px', padding: '6px 12px', borderRadius: '20px', minWidth: '130px' }}
                value={cardBrand}
                onChange={e => { setCardBrand(e.target.value); setCardModel('all') }}
              >
                {allBrands.map(b => (
                  <option key={b} value={b}>{b === 'all' ? '🏷️ All Brands' : b}</option>
                ))}
              </select>
              {/* Model filter */}
              <select
                className="select"
                style={{ fontSize: '12.5px', padding: '6px 12px', borderRadius: '20px', minWidth: '170px' }}
                value={cardModel}
                onChange={e => setCardModel(e.target.value)}
              >
                {allModels.map(m => (
                  <option key={m} value={m}>{m === 'all' ? '🚗 All Models' : m}</option>
                ))}
              </select>
              {/* Search */}
              <input
                className="fleet-search-input"
                type="text"
                placeholder="Search vehicle, model, brand…"
                value={cardSearch}
                onChange={e => setCardSearch(e.target.value)}
              />
              {/* Clear filters */}
              {(cardFilter !== 'all' || cardBrand !== 'all' || cardModel !== 'all' || cardSearch) && (
                <button
                  className="fleet-filter-btn"
                  style={{ color: '#dc2626', borderColor: '#dc2626' }}
                  onClick={() => { setCardFilter('all'); setCardBrand('all'); setCardModel('all'); setCardSearch('') }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {/* Result count */}
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Showing {filteredFleetCards.length} of {vehicleLatestStatus.length} vehicles
          </div>

          {/* Cards grid */}
          <div className="fleet-cards-grid">
            {filteredFleetCards.map(v => {
              const img = CAR_IMAGES[v.model]
              const gradient = BRAND_GRADIENTS[v.brand] || 'linear-gradient(135deg, #1e293b 0%, #475569 100%)'
              const sm = STATUS_META[v.status] || { color: '#94a3b8', bg: '#f1f5f9', label: v.status }
              const batPct = v.battery ?? 0
              const batColor = batPct >= 60 ? '#16a34a' : batPct >= 30 ? '#f59e0b' : '#dc2626'
              return (
                <div key={v.vehicle} className="fleet-card">
                  {/* Photo / gradient header */}
                  <div className="fleet-card-img-wrap" style={{ background: gradient }}>
                    {img
                      ? <img
                          src={img}
                          alt={v.model}
                          className="fleet-card-img"
                          loading="lazy"
                          style={v.brand === 'Mercedes' ? { objectFit: 'contain', objectPosition: 'center center', padding: '8px' } : v.model === 'Mahindra XUV400 EV' ? { objectFit: 'contain', objectPosition: 'center center', padding: '4px' } : undefined}
                          onError={e => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling.style.display = 'flex'
                          }}
                        />
                      : null
                    }
                    <div className="fleet-card-img-placeholder" style={{ display: img ? 'none' : 'flex' }}>🚗</div>
                    {/* Status badge */}
                    <span className="fleet-card-status-badge" style={{ background: sm.bg, color: sm.color }}>
                      {sm.label}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="fleet-card-body">
                    <div className="fleet-card-model">{v.model}</div>
                    <div className="fleet-card-sub">{v.vehicle} &nbsp;·&nbsp; {v.category}</div>

                    {/* Specs row */}
                    <div className="fleet-card-specs">
                      <div className="fleet-card-spec">
                        <span className="spec-label">Range</span>
                        <span className="spec-val">{v.maxRange ? v.maxRange + ' km' : '—'}</span>
                      </div>
                      <div className="fleet-card-spec">
                        <span className="spec-label">Battery</span>
                        <span className="spec-val">{v.batteryCapacity ? v.batteryCapacity + ' kWh' : '—'}</span>
                      </div>
                      <div className="fleet-card-spec">
                        <span className="spec-label">Motor</span>
                        <span className="spec-val">{v.motorKw ? v.motorKw + ' kW' : '—'}</span>
                      </div>
                      <div className="fleet-card-spec">
                        <span className="spec-label">Driver</span>
                        <span className="spec-val">{v.driver}</span>
                      </div>
                    </div>

                    {/* Battery bar */}
                    <div className="fleet-card-bat-row">
                      <span className="spec-label" style={{ minWidth: 56 }}>Charge</span>
                      <div className="bat-track">
                        <div className="bat-fill" style={{ width: batPct + '%', background: batColor }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: batColor, minWidth: 36, textAlign: 'right' }}>
                        {batPct.toFixed(0)}%
                      </span>
                    </div>

                    {/* Remaining range */}
                    {v.remainingRange != null && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        <span style={{ color: '#0891b2', fontWeight: 600 }}>{v.remainingRange} km</span> remaining range
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredFleetCards.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              No vehicles match your filter.
            </div>
          )}
        </>
      )}

      {/* ── FLEET STATUS VIEW ── */}
      {activeView === 'fleet' && (
        <>
          {/* Status KPI cards */}
          <div className="stat-cards">
            <div className="stat-card blue">
              <span className="label">Total Vehicles</span>
              <span className="value">{vehicleLatestStatus.length}</span>
            </div>
            {fleetStatusCounts.map(s => (
              <div key={s.name} className="stat-card" style={{ borderTop: `4px solid ${s.color}` }}>
                <span className="label">{s.name === 'Running' ? '🟢 Running' : s.name === 'Charging' ? '🔵 Charging' : s.name === 'Workshop' ? '🟠 Workshop' : s.name}</span>
                <span className="value" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Donut + Bar side by side */}
          <div className="charts-grid-2">
            <ChartCard title="Fleet Status Distribution" sub="Current status of each vehicle in the fleet">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={fleetStatusCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {fleetStatusCounts.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v + ' vehicles', name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Vehicle Count by Status" sub="Bar view of running / charging / workshop counts">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={fleetStatusCounts} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={v => [v + ' vehicles', 'Count']} />
                  <Bar dataKey="value" name="Vehicles" radius={[6, 6, 0, 0]}>
                    {fleetStatusCounts.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Driver-wise table */}
          <div className="chart-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <div>
                <div className="chart-title">Vehicle Status — Driver Wise</div>
                <div className="chart-sub">Current fleet allocation and status breakdown per driver</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sort by:</label>
                <select className="select" style={{ fontSize: '12px', padding: '4px 8px' }}
                  value={driverSortKey} onChange={e => setDriverSortKey(e.target.value)}>
                  <option value="driverRaw">Driver ID</option>
                  <option value="total">Total</option>
                  <option value="running">Running</option>
                  <option value="charging">Charging</option>
                  <option value="workshop">Workshop</option>
                </select>
                <button className="view-toggle-btn" style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => setDriverSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                  {driverSortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    { key: 'driverRaw', label: 'Driver' },
                    { key: 'total',    label: 'Total Vehicles' },
                    { key: 'running',  label: '🟢 Running' },
                    { key: 'charging', label: '🔵 Charging' },
                    { key: 'workshop', label: '🟠 Workshop' },
                    { key: 'vehicles', label: 'Vehicle IDs' },
                  ].map(({ key, label }) => (
                    <th key={key} style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => {
                        if (driverSortKey === key) setDriverSortDir(d => d === 'asc' ? 'desc' : 'asc')
                        else { setDriverSortKey(key); setDriverSortDir('asc') }
                      }}>
                      {label} {driverSortKey === key ? (driverSortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDriverData.map(row => (
                  <tr key={row.driver}>
                    <td style={{ fontWeight: '700' }}>{row.driverName} <span style={{fontSize:'10px',color:'var(--text-muted)',fontWeight:400}}>#{row.driverRaw}</span></td>
                    <td><span className="badge badge-blue">{row.total}</span></td>
                    <td><span style={{ color: '#16a34a', fontWeight: 600 }}>{row.running}</span></td>
                    <td><span style={{ color: '#0891b2', fontWeight: 600 }}>{row.charging}</span></td>
                    <td><span style={{ color: '#ea580c', fontWeight: 600 }}>{row.workshop}</span></td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.vehicles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Brand-wise status table */}
          <div className="chart-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <div>
                <div className="chart-title">Vehicle Status — Brand Wise</div>
                <div className="chart-sub">Fleet status summary grouped by manufacturer / brand</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sort by:</label>
                <select className="select" style={{ fontSize: '12px', padding: '4px 8px' }}
                  value={brandStatusSortKey} onChange={e => setBrandStatusSortKey(e.target.value)}>
                  <option value="brand">Brand</option>
                  <option value="total">Total</option>
                  <option value="running">Running</option>
                  <option value="charging">Charging</option>
                  <option value="workshop">Workshop</option>
                </select>
                <button className="view-toggle-btn" style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => setBrandStatusSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                  {brandStatusSortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    { key: 'brand',    label: 'Brand' },
                    { key: 'total',    label: 'Total Vehicles' },
                    { key: 'running',  label: '🟢 Running' },
                    { key: 'charging', label: '🔵 Charging' },
                    { key: 'workshop', label: '🟠 Workshop' },
                  ].map(({ key, label }) => (
                    <th key={key} style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => {
                        if (brandStatusSortKey === key) setBrandStatusSortDir(d => d === 'asc' ? 'desc' : 'asc')
                        else { setBrandStatusSortKey(key); setBrandStatusSortDir('asc') }
                      }}>
                      {label} {brandStatusSortKey === key ? (brandStatusSortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedBrandStatusData.map(row => (
                  <tr key={row.brand}>
                    <td style={{ fontWeight: '700' }}>{row.brand}</td>
                    <td><span className="badge badge-blue">{row.total}</span></td>
                    <td><span style={{ color: '#16a34a', fontWeight: 600 }}>{row.running}</span></td>
                    <td><span style={{ color: '#0891b2', fontWeight: 600 }}>{row.charging}</span></td>
                    <td><span style={{ color: '#ea580c', fontWeight: 600 }}>{row.workshop}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

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

import { useContext, useState, useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { DataContext } from '../../App'
import {
  uniqueValues, monthlyAgg, countWhere, sumBy, avgBy,
  fmtNum, fmtCurrency, COLORS, groupBy, driverName,
} from '../../utils/dataUtils'
import ChartCard from '../shared/ChartCard'
import DynamicChart from '../shared/DynamicChart'
import SortableTable from '../shared/SortableTable'
import FilterPanel, { FilterGroup, FilterChips, FilterToggle, FilterRange, FilterCheckboxGroup } from '../shared/FilterPanel'

import imgTiagoEV      from '../../assets/cars/tiagoev.png'
import imgPunchEV      from '../../assets/cars/punchev.png'
import imgHarrierEV    from '../../assets/cars/harrierev.png'
import imgXUV400EV     from '../../assets/cars/xuv400.png'
import imgXEV9e        from '../../assets/cars/xev9e.png'
import imgBE6          from '../../assets/cars/be6.png'
import imgEQS          from '../../assets/cars/eqs.png'
import imgEQSSUV       from '../../assets/cars/eqssuv.png'

const CAR_IMAGES = {
  'Tata Tiago EV': imgTiagoEV, 'Tata Punch EV': imgPunchEV, 'Tata Harrier EV': imgHarrierEV,
  'Mahindra XUV400 EV': imgXUV400EV, 'Mahindra XEV 9e': imgXEV9e, 'Mahindra BE 6': imgBE6,
  'Mercedes EQS': imgEQS, 'Mercedes EQS SUV': imgEQSSUV,
}
const BRAND_GRADIENTS = {
  'Mahindra': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
  'Mercedes': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
  'Tata':     'linear-gradient(135deg, rgba(31,41,55,0.5) 0%, rgba(55,65,81,0.5) 100%)',
}
const STATUS_META = {
  Running:  { color: '#34d399', bg: 'rgba(52,211,153,0.15)', label: '● Running'  },
  Charging: { color: '#22d3ee', bg: 'rgba(34,211,238,0.15)', label: '⚡ Charging' },
  Workshop: { color: '#fb923c', bg: 'rgba(251,146,60,0.15)', label: '🔧 Workshop' },
}
const fmtK = v => '₹' + fmtNum(v / 1000) + 'k'

export default function VehicleTab() {
  const data = useContext(DataContext)
  const vehicleIds = useMemo(() => uniqueValues(data, 'Vehicle_ID'), [data])
  
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'brand' | 'individual'
  const [selectedVehicle, setVehicle] = useState(vehicleIds[0] ?? '')

  // Fleet card filters
  const [cardFilter, setCardFilter] = useState('all')
  const [cardSearch, setCardSearch] = useState('')
  const [cardBrand, setCardBrand]   = useState('all')
  const [cardModel, setCardModel]   = useState('all')
  const [cardCats, setCardCats]     = useState([])
  const [batteryRange, setBatteryRange] = useState([0, 100])
  const [chargedOnly, setChargedOnly]   = useState(false)

  // ── Latest status per vehicle ──────────────────────────────────────────────
  const vehicleLatestStatus = useMemo(() => {
    const byVehicle = groupBy(data, 'Vehicle_ID')
    return Object.entries(byVehicle).map(([vid, rows]) => {
      const sorted = [...rows].sort((a, b) =>
        new Date(b.Date + ' ' + (b.Time || '')) - new Date(a.Date + ' ' + (a.Time || '')))
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

  const allBrands = useMemo(() =>
    ['all', ...Array.from(new Set(vehicleLatestStatus.map(v => v.brand))).sort()],
    [vehicleLatestStatus])
  const allModels = useMemo(() => {
    const source = cardBrand === 'all' ? vehicleLatestStatus : vehicleLatestStatus.filter(v => v.brand === cardBrand)
    return ['all', ...Array.from(new Set(source.map(v => v.model))).sort()]
  }, [vehicleLatestStatus, cardBrand])
  const allCategories = useMemo(() =>
    Array.from(new Set(vehicleLatestStatus.map(v => v.category))).filter(c => c && c !== '—').sort(),
    [vehicleLatestStatus])

  const filteredFleetCards = useMemo(() => {
    const q = cardSearch.toLowerCase()
    const [bLo, bHi] = batteryRange
    return vehicleLatestStatus.filter(v => {
      const matchStatus = cardFilter === 'all' || v.status === cardFilter
      const matchBrand  = cardBrand  === 'all' || v.brand  === cardBrand
      const matchModel  = cardModel  === 'all' || v.model  === cardModel
      const matchCat    = cardCats.length === 0 || cardCats.includes(v.category)
      const bat = v.battery ?? 0
      const matchBat    = bat >= bLo && bat <= bHi
      const matchCharge = !chargedOnly || v.status === 'Charging'
      const matchSearch = !q ||
        v.vehicle.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)
      return matchStatus && matchBrand && matchModel && matchCat && matchBat && matchCharge && matchSearch
    })
  }, [vehicleLatestStatus, cardFilter, cardBrand, cardModel, cardCats, batteryRange, chargedOnly, cardSearch])

  function resetCardFilters() {
    setCardFilter('all'); setCardBrand('all'); setCardModel('all'); setCardCats([])
    setBatteryRange([0, 100]); setChargedOnly(false); setCardSearch('')
  }

  function handleVehicleSelect(vid) {
    setVehicle(vid)
    setViewMode('individual')
  }

  // ── Selected-vehicle (last 3 months) ───────────────────────────────────────
  const vRows = useMemo(() => {
    const allVRows = data.filter(r => r.Vehicle_ID === selectedVehicle)
    const dates = allVRows.map(r => r.Date).filter(Boolean).sort()
    if (!dates.length) return allVRows
    const latest = new Date(dates[dates.length - 1])
    const cutoff = new Date(latest)
    cutoff.setMonth(cutoff.getMonth() - 2); cutoff.setDate(1)
    return allVRows.filter(r => r.Date && new Date(r.Date) >= cutoff)
  }, [data, selectedVehicle])
  const vInfo = useMemo(() => data.find(r => r.Vehicle_ID === selectedVehicle) || {}, [data, selectedVehicle])

  const monthlyCharging   = useMemo(() => monthlyAgg(vRows, null, rows => countWhere(rows, r => r.Charging_Status === 'Yes')), [vRows])
  const monthlyPassengers = useMemo(() => monthlyAgg(vRows, 'Passenger_Count', 'avg'), [vRows])
  const monthlyWorkshop   = useMemo(() => monthlyAgg(vRows, null, rows => countWhere(rows, r => r.Workshop_Visit === 'Yes')), [vRows])
  const monthlyExp        = useMemo(() => monthlyAgg(vRows, 'Total_Expense'), [vRows])

  const stats = useMemo(() => ({
    totalTrips: vRows.length,
    totalKm: sumBy(vRows, 'Distance_Travelled_km'),
    chargingSessions: countWhere(vRows, r => r.Charging_Status === 'Yes'),
    workshopVisits: countWhere(vRows, r => r.Workshop_Visit === 'Yes'),
    breakdowns: countWhere(vRows, r => r.Breakdown === 'Yes'),
    totalExpense: sumBy(vRows, 'Total_Expense'),
    overspeedPct: vRows.length ? (countWhere(vRows, r => r.Overspeed === 'Yes') / vRows.length * 100) : 0,
    avgPassengers: avgBy(vRows, 'Passenger_Count'),
  }), [vRows])

  // ── Brand Stats ─────────────────────────────────────────────────────────────
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

  const carsByOverspeedCount = useMemo(() => {
    const byVehicle = groupBy(data, 'Vehicle_ID')
    return Object.entries(byVehicle).map(([vid, rows]) => ({
      vehicle: vid, overspeedTrips: countWhere(rows, r => r.Overspeed === 'Yes'),
    })).sort((a, b) => b.overspeedTrips - a.overspeedTrips).slice(0, 15)
  }, [data])


  // ── RENDER INDIVIDUAL VIEW ──────────────────────────────────────────────────
  if (viewMode === 'individual') {
    return (
      <div className="tab-content">
        <button className="back-btn" onClick={() => setViewMode('cards')}>
          ← Back to Fleet
        </button>

        <div className="page-header" style={{ marginTop: '16px' }}>
          <div className="page-header-left">
            <p className="section-title">Vehicle Analytics</p>
            <p className="section-sub">Detailed breakdown for <strong>{selectedVehicle}</strong></p>
          </div>
        </div>

        <div className="vehicle-banner">
          {[
            { label: 'Vehicle', val: vInfo.Vehicle_ID },
            { label: 'Brand', val: vInfo.Brand },
            { label: 'Model', val: vInfo.Vehicle_Model },
            { label: 'Category', val: vInfo.Category },
            { label: 'Max Range', val: vInfo.Max_Range_km ? vInfo.Max_Range_km + ' km' : '—' },
            { label: 'Battery', val: vInfo.Battery_Capacity_kWh ? vInfo.Battery_Capacity_kWh + ' kWh' : '—' },
          ].map(({ label, val }) => (
            <div className="vehicle-banner-item" key={label}>
              <div className="vehicle-banner-label">{label}</div>
              <div className="vehicle-banner-value">{val || '—'}</div>
            </div>
          ))}
        </div>

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

        <div className="charts-grid-2">
          <DynamicChart title="Monthly Charging Sessions" sub="Times the vehicle was charged per month"
            data={monthlyCharging} height={230} defaultType="bar"
            metrics={[{ key: 'value', label: 'Charging Sessions', color: '#34d399' }]} />
          <DynamicChart title="Monthly Avg Passengers" sub="Average passengers per trip per month"
            data={monthlyPassengers} height={230} defaultType="line"
            metrics={[{ key: 'value', label: 'Avg Passengers', color: '#22d3ee', format: v => Number(v).toFixed(1) }]} />
        </div>

        <div className="charts-grid-2">
          <DynamicChart title="Monthly Workshop Visits" sub="Maintenance/workshop visits per month"
            data={monthlyWorkshop} height={230} defaultType="bar"
            metrics={[{ key: 'value', label: 'Workshop Visits', color: '#a78bfa' }]} />
          <DynamicChart title="Monthly Total Expense (₹)" sub="Operational costs per month"
            data={monthlyExp} height={230} defaultType="bar"
            metrics={[{ key: 'value', label: 'Expense', color: '#fb923c', format: fmtCurrency }]} yTickFormatter={fmtK} />
        </div>

        <div style={{ marginTop: '20px' }}>
          <DynamicChart title="Overspeed Events — Top 15 Vehicles" sub="Vehicles with the most speed-limit violations"
            data={carsByOverspeedCount} xKey="vehicle" height={260} defaultType="bar" types={['bar', 'line']}
            xTickProps={{ angle: -35, textAnchor: 'end', interval: 0, height: 50 }}
            metrics={[{ key: 'overspeedTrips', label: 'Overspeed Trips', color: '#f87171', colorFn: (r) => (r.overspeedTrips >= 8 ? '#ef4444' : '#f87171') }]} />
        </div>
      </div>
    )
  }

  // ── RENDER FLEET CARDS / BRAND VIEW ──────────────────────────────────────────
  return (
    <div className="tab-content">
      <div className="page-header">
        <div className="page-header-left">
          <p className="section-title">Fleet Operations</p>
          <p className="section-sub">Fleet health, charging, maintenance &amp; brand metrics</p>
        </div>
        <div className="page-header-right">
          <div className="view-toggle">
            <button className={`view-toggle-btn${viewMode === 'cards' ? ' active' : ''}`} onClick={() => setViewMode('cards')}>
              🃏 Fleet Cards
            </button>
            <button className={`view-toggle-btn${viewMode === 'brand' ? ' active' : ''}`} onClick={() => setViewMode('brand')}>
              🏷️ Brand Metrics
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'cards' && (
        <div className="analytics-layout">
          <FilterPanel onReset={resetCardFilters}>
            <FilterGroup label="Status">
              <FilterChips
                options={[
                  { value: 'all', label: `All (${vehicleLatestStatus.length})` },
                  { value: 'Running', label: '🟢 Running' },
                  { value: 'Charging', label: '⚡ Charging' },
                  { value: 'Workshop', label: '🔧 Workshop' },
                ]}
                value={cardFilter}
                onChange={setCardFilter}
              />
            </FilterGroup>

            <FilterGroup label="Charging now only">
              <FilterToggle label="Show only charging vehicles" checked={chargedOnly} onChange={setChargedOnly} />
            </FilterGroup>

            <FilterGroup label="Battery charge %">
              <FilterRange min={0} max={100} step={5} value={batteryRange} onChange={setBatteryRange}
                fromLabel="Min %" toLabel="Max %" />
            </FilterGroup>

            <FilterGroup label="Brand">
              <select className="mini-select" style={{ width: '100%' }} value={cardBrand}
                onChange={e => { setCardBrand(e.target.value); setCardModel('all') }}>
                {allBrands.map(b => <option key={b} value={b}>{b === 'all' ? 'All Brands' : b}</option>)}
              </select>
            </FilterGroup>

            <FilterGroup label="Model">
              <select className="mini-select" style={{ width: '100%' }} value={cardModel} onChange={e => setCardModel(e.target.value)}>
                {allModels.map(m => <option key={m} value={m}>{m === 'all' ? 'All Models' : m}</option>)}
              </select>
            </FilterGroup>

            {allCategories.length > 0 && (
              <FilterGroup label="Body type">
                <FilterCheckboxGroup options={allCategories} value={cardCats} onChange={setCardCats} />
              </FilterGroup>
            )}

            <FilterGroup label="Search">
              <input className="fleet-search-input" style={{ width: '100%', minWidth: 0 }} type="text"
                placeholder="Vehicle, model, brand…" value={cardSearch} onChange={e => setCardSearch(e.target.value)} />
            </FilterGroup>
          </FilterPanel>

          <div>
            <div className="table-toolbar">
              <span className="table-count">{filteredFleetCards.length} of {vehicleLatestStatus.length} vehicles</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click on any vehicle card to view detailed analytics</span>
            </div>
            <div className="fleet-cards-grid">
              {filteredFleetCards.map(v => {
                const img = CAR_IMAGES[v.model]
                const gradient = BRAND_GRADIENTS[v.brand] || 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                const sm = STATUS_META[v.status] || { color: '#8892a6', bg: 'rgba(255,255,255,0.08)', label: v.status }
                const batPct = v.battery ?? 0
                const batColor = batPct >= 60 ? '#34d399' : batPct >= 30 ? '#fb923c' : '#f87171'
                return (
                  <div key={v.vehicle} className="fleet-card" onClick={() => handleVehicleSelect(v.vehicle)}>
                    <div className="fleet-card-img-wrap" style={{ background: gradient }}>
                      {img ? (
                        <img src={img} alt={v.model} className="fleet-card-img" loading="lazy"
                          style={v.brand === 'Mercedes' ? { objectFit: 'contain', padding: '8px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' } : v.model === 'Mahindra XUV400 EV' ? { objectFit: 'contain', padding: '4px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' } : { filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
                          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex' }} />
                      ) : null}
                      <div className="fleet-card-img-placeholder" style={{ display: img ? 'none' : 'flex' }}>🚗</div>
                      <span className="fleet-card-status-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                    </div>
                    <div className="fleet-card-body">
                      <div className="fleet-card-model">{v.model}</div>
                      <div className="fleet-card-sub">{v.vehicle} &nbsp;·&nbsp; {v.category}</div>
                      <div className="fleet-card-specs">
                        <div className="fleet-card-spec"><span className="spec-label">Range</span><span className="spec-val">{v.maxRange ? v.maxRange + ' km' : '—'}</span></div>
                        <div className="fleet-card-spec"><span className="spec-label">Battery</span><span className="spec-val">{v.batteryCapacity ? v.batteryCapacity + ' kWh' : '—'}</span></div>
                        <div className="fleet-card-spec"><span className="spec-label">Motor</span><span className="spec-val">{v.motorKw ? v.motorKw + ' kW' : '—'}</span></div>
                        <div className="fleet-card-spec"><span className="spec-label">Driver</span><span className="spec-val">{v.driver}</span></div>
                      </div>
                      <div className="fleet-card-bat-row">
                        <span className="spec-label" style={{ minWidth: 56 }}>Charge</span>
                        <div className="bat-track"><div className="bat-fill" style={{ width: batPct + '%', background: batColor }} /></div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: batColor, minWidth: 36, textAlign: 'right' }}>{batPct.toFixed(0)}%</span>
                      </div>
                      {v.remainingRange != null && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          <span style={{ color: '#22d3ee', fontWeight: 600 }}>{v.remainingRange} km</span> remaining range
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {filteredFleetCards.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>No vehicles match your filter.</div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'brand' && (
        <>
          <div className="charts-grid-2" style={{ marginBottom: 0 }}>
            <DynamicChart title="Total Distance by Brand (km)" sub="Cumulative distance per brand"
              data={brandStats} xKey="brand" defaultType="bar"
              metrics={[{ key: 'totalDistance', label: 'Total Distance (km)', color: '#6c8cff', format: v => fmtNum(v) + ' km' }]}
              yTickFormatter={v => fmtNum(v / 1000) + 'k'} />
            <DynamicChart title="Overspeed Events by Brand" sub="Total violations per brand"
              data={brandStats} xKey="brand" defaultType="bar"
              metrics={[{ key: 'overspeedEvents', label: 'Overspeed Events', color: '#f87171' }]} />
          </div>

          <div className="charts-grid-2" style={{ marginTop: '20px' }}>
            <DynamicChart title="Workshop Visits by Brand" sub="Total maintenance visits per brand"
              data={brandStats} xKey="brand" defaultType="bar"
              metrics={[{ key: 'workshopVisits', label: 'Workshop Visits', color: '#a78bfa' }]} />
            <DynamicChart title="Total Income by Brand (₹)" sub="Revenue generated per brand"
              data={brandStats} xKey="brand" defaultType="bar"
              metrics={[{ key: 'totalIncome', label: 'Total Income', color: '#34d399', format: fmtCurrency }]}
              yTickFormatter={fmtK} />
          </div>

          <div className="chart-wrapper" style={{ marginTop: '20px', overflowX: 'auto' }}>
            <div className="chart-title">Brand Summary Table</div>
            <div className="chart-sub">Aggregated metrics grouped by manufacturer — click any column to sort</div>
            <SortableTable
              rows={brandStats}
              rowKey={r => r.brand}
              initialSort={{ key: 'totalVehicles', dir: 'desc' }}
              columns={[
                { key: 'brand', label: 'Brand', render: r => <span style={{ fontWeight: 700 }}>{r.brand}</span> },
                { key: 'totalVehicles', label: 'Vehicles', align: 'right' },
                { key: 'totalDistance', label: 'Total Dist (km)', align: 'right', render: r => fmtNum(r.totalDistance) },
                { key: 'avgExpense', label: 'Avg Expense (₹)', align: 'right', render: r => fmtCurrency(r.avgExpense) },
                { key: 'overspeedEvents', label: 'Overspeed', align: 'right', render: r => <span className="badge badge-red">{r.overspeedEvents}</span> },
                { key: 'workshopVisits', label: 'Workshop', align: 'right' },
                { key: 'breakdowns', label: 'Breakdowns', align: 'right', render: r => <span className="badge badge-orange">{r.breakdowns}</span> },
                { key: 'totalIncome', label: 'Total Income (₹)', align: 'right', render: r => <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtCurrency(r.totalIncome)}</span> },
              ]}
            />
          </div>
        </>
      )}
    </div>
  )
}

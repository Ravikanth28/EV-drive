import { useContext, useMemo, useState } from 'react'
import { DataContext } from '../../App'
import { fmtCurrency, fmtNum, groupBy, sumBy, uniqueValues } from '../../utils/dataUtils'
import DriverTab  from './DriverTab'
import VehicleTab from './VehicleTab'
import CompanyTab from './CompanyTab'
import { User, CarFront, Building, Zap, ShieldAlert, LogOut, Calendar } from 'lucide-react'
import logoImg from '../../assets/logo.png'

const NAV = [
  { key: 'driver',  icon: <User size={18} />, label: 'Driver Analytics',  sub: 'Per-driver performance & violations' },
  { key: 'vehicle', icon: <CarFront size={18} />, label: 'Vehicle Analytics', sub: 'Fleet health, charging & maintenance'  },
  { key: 'company', icon: <Building size={18} />, label: 'Company Overview',  sub: 'Revenue, expenses & profitability'    },
]

const ICON_CLASS = { driver: 'driver', vehicle: 'vehicle', company: 'company' }

export default function AdminDashboard({ user, onLogout }) {
  const data = useContext(DataContext)
  const [tab, setTab] = useState('driver')
  const active = NAV.find(n => n.key === tab)
  const today  = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const overview = useMemo(() => {
    const grouped = groupBy(data, 'Vehicle_ID')
    const latestVehicles = Object.values(grouped).map(rows => {
      const sorted = [...rows].sort((a, b) => {
        const timeA = new Date(`${a.Date} ${a.Time || '00:00:00'}`).getTime() || 0
        const timeB = new Date(`${b.Date} ${b.Time || '00:00:00'}`).getTime() || 0
        return timeB - timeA
      })
      return sorted[0] || {}
    })

    const statusCounts = latestVehicles.reduce((acc, row) => {
      const status = row.Vehicle_Status || 'Other'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const revenue = sumBy(data, 'Income_Generated')
    const expense = sumBy(data, 'Total_Expense')

    return {
      vehicles: latestVehicles.length,
      drivers: uniqueValues(data, 'Driver_ID').length,
      trips: data.length,
      running: statusCounts.Running || 0,
      charging: statusCounts.Charging || 0,
      workshop: statusCounts.Workshop || 0,
      revenue,
      expense,
      profit: revenue - expense,
    }
  }, [data])

  return (
    <div className="admin-shell">

      {/* ═══ SIDEBAR ═══ */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: 'transparent', padding: 0, boxShadow: 'none' }}>
            <img src={logoImg} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', marginLeft: '-8px' }} />
          </div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">EV Fleet Admin</div>
            <div className="sidebar-logo-sub">Operations workspace</div>
          </div>
        </div>

        <div className="sidebar-summary-card">
          <div className="sidebar-summary-label">Assigned fleet</div>
          <div className="sidebar-summary-value">{overview.vehicles} vehicles</div>
          <div className="sidebar-summary-meta">
            <span>{overview.running} running</span>
            <span>{overview.charging} charging</span>
            <span>{overview.workshop} workshop</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Analytics</div>
          {NAV.map(({ key, icon, label, sub }) => (
            <button
              key={key}
              className={`nav-btn${tab === key ? ' active' : ''}`}
              onClick={() => setTab(key)}
            >
              <span className="nav-btn-icon">{icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '13.5px' }}>{label}</span>
                <span style={{ display: 'block', fontSize: '11px', opacity: tab === key ? 0.7 : 0.55, marginTop: '1px' }}>{sub}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar"><ShieldAlert size={20} /></div>
            <div>
              <div className="sidebar-user-name">Admin {user.id}</div>
              <div className="sidebar-user-role">Fleet Manager · 10 vehicles</div>
            </div>
          </div>
          <button className="btn-signout" onClick={onLogout}>
            <span><LogOut size={16} /></span> Sign Out
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="dashboard-main">
        <section className="workspace-hero">
          <div className="workspace-hero-copy">
            <p className="workspace-eyebrow">Fleet operations</p>
            <h1>{active?.label}</h1>
            <p>{active?.sub}</p>
          </div>

          <div className="workspace-metrics">
            <div className="workspace-metric">
              <span className="workspace-metric-label">Trips</span>
              <strong>{fmtNum(overview.trips)}</strong>
            </div>
            <div className="workspace-metric">
              <span className="workspace-metric-label">Drivers</span>
              <strong>{overview.drivers}</strong>
            </div>
            <div className="workspace-metric">
              <span className="workspace-metric-label">Net profit</span>
              <strong className={overview.profit >= 0 ? 'positive' : 'negative'}>{fmtCurrency(overview.profit)}</strong>
            </div>
          </div>
        </section>

        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className={`topbar-icon-wrap ${ICON_CLASS[tab]}`}>
              {active?.icon}
            </div>
            <div>
              <div className="topbar-title">{active?.label}</div>
              <div className="topbar-sub">{active?.sub}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-pill">
              <span className="topbar-pill-dot" />
              Fleet Live
            </div>
            <div className="topbar-date"><Calendar size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />{today}</div>
          </div>
        </div>

        {/* Tab body */}
        <div className="dashboard-scroll-area">
          {tab === 'driver'  && <DriverTab  />}
          {tab === 'vehicle' && <VehicleTab />}
          {tab === 'company' && <CompanyTab />}
        </div>
      </main>
    </div>
  )
}

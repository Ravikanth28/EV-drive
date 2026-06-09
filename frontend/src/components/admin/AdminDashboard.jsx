import { useState } from 'react'
import DriverTab  from './DriverTab'
import VehicleTab from './VehicleTab'
import CompanyTab from './CompanyTab'

const NAV = [
  { key: 'driver',  icon: '👤', label: 'Driver Analytics',  sub: 'Per-driver performance & violations' },
  { key: 'vehicle', icon: '🚗', label: 'Vehicle Analytics', sub: 'Fleet health, charging & maintenance'  },
  { key: 'company', icon: '🏢', label: 'Company Overview',  sub: 'Revenue, expenses & profitability'    },
]

const ICON_CLASS = { driver: 'driver', vehicle: 'vehicle', company: 'company' }

export default function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('driver')
  const active = NAV.find(n => n.key === tab)
  const today  = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ═══ SIDEBAR ═══ */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">EV Fleet</div>
            <div className="sidebar-logo-sub">Admin Portal</div>
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
            <div className="sidebar-user-avatar">🛡️</div>
            <div>
              <div className="sidebar-user-name">Admin {user.id}</div>
              <div className="sidebar-user-role">Full access · 10 drivers</div>
            </div>
          </div>
          <button className="btn-signout" onClick={onLogout}>
            <span>↩</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
            <div className="topbar-date">📅 {today}</div>
          </div>
        </div>

        {/* Tab body */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'driver'  && <DriverTab  />}
          {tab === 'vehicle' && <VehicleTab />}
          {tab === 'company' && <CompanyTab />}
        </div>
      </main>
    </div>
  )
}

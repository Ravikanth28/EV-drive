import { useState } from 'react'
import { uniqueValues } from '../utils/dataUtils'

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  box: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '440px',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    padding: '32px 32px 24px',
    color: '#fff',
  },
  logo: { fontSize: '28px', marginBottom: '4px' },
  title: { fontSize: '20px', fontWeight: '700', margin: 0 },
  subtitle: { fontSize: '13px', opacity: 0.8, marginTop: '4px' },
  body: { padding: '28px 32px 32px' },
  roleRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
  roleBtn: (active) => ({
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: active ? '2px solid #2563eb' : '2px solid #e2e8f0',
    background: active ? '#dbeafe' : '#f8fafc',
    color: active ? '#1d4ed8' : '#64748b',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'center',
  }),
  roleIcon: { fontSize: '22px', display: 'block', marginBottom: '4px' },
  fieldLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s',
    marginBottom: '16px',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background 0.15s',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  hint: {
    background: '#f1f5f9',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '16px',
  },
}

export default function Login({ onLogin, data }) {
  const [role, setRole]     = useState('admin')
  const [username, setUser] = useState('')
  const [password, setPass] = useState('')
  const [err, setErr]       = useState('')

  const drivers = uniqueValues(data, 'Driver_ID').map(String)
  const adminIds = uniqueValues(data, 'Admin_ID').map(String)

  function handleSubmit(e) {
    e.preventDefault()
    setErr('')

    if (role === 'admin') {
      const uid = username.trim().toUpperCase()
      if (password !== 'admin123') {
        setErr('Wrong password. Use admin123')
        return
      }
      if (!adminIds.includes(uid)) {
        setErr(`Admin ID "${uid}" not found. Valid IDs: ${adminIds.join(', ')}`)
        return
      }
      onLogin({ role: 'admin', id: uid })
      return
    }

    // Driver login
    const did = username.trim()
    if (password !== 'driver123') {
      setErr('Wrong password. Use driver123')
      return
    }
    if (!drivers.includes(did)) {
      setErr(`Driver ID "${did}" not found in the system.`)
      return
    }
    onLogin({ role: 'driver', id: did })
  }

  return (
    <div style={S.page}>
      <div style={S.box}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.logo}>⚡</div>
          <h1 style={S.title}>EV Fleet Dashboard</h1>
          <p style={S.subtitle}>Fleet Management &amp; Analytics Platform</p>
        </div>

        {/* Body */}
        <div style={S.body}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', fontWeight: '500' }}>
            Select your role to continue
          </p>

          {/* Role toggle */}
          <div style={S.roleRow}>
            {[
              { key: 'admin',  icon: '🛡️', label: 'Admin'  },
              { key: 'driver', icon: '🚗', label: 'Driver' },
            ].map(({ key, icon, label }) => (
              <button key={key} style={S.roleBtn(role === key)} onClick={() => { setRole(key); setErr(''); setUser(''); setPass('') }}>
                <span style={S.roleIcon}>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {err && <div style={S.error}>{err}</div>}

            <label style={S.fieldLabel}>
              {role === 'admin' ? 'Admin ID' : 'Driver ID'}
            </label>
            <input
              style={S.input}
              placeholder={role === 'admin' ? 'e.g. A001' : 'e.g. 4'}
              value={username}
              onChange={e => setUser(e.target.value)}
              required
            />

            <label style={S.fieldLabel}>Password</label>
            <input
              style={S.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPass(e.target.value)}
              required
            />

            <button type="submit" style={S.submitBtn}
              onMouseOver={e => (e.target.style.background = '#1d4ed8')}
              onMouseOut={e => (e.target.style.background = '#2563eb')}
            >
              Sign In →
            </button>
          </form>

          {/* Hint */}
          <div style={S.hint}>
            <strong>Demo credentials:</strong><br />
            Admin: <code>A001</code> – <code>A004</code> / <code>admin123</code><br />
            Driver: enter your Driver ID / <code>driver123</code><br />
            <span style={{ fontSize: '11px', opacity: 0.8 }}>A001 → drivers 4,5,10–12,25,26,31,33,37</span>
          </div>
        </div>
      </div>
    </div>
  )
}

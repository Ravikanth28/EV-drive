import { useState } from 'react'
import { uniqueValues } from '../utils/dataUtils'

const INK = '#16181d'
const S = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 30% 20%, #2a2d35 0%, #16181d 55%, #0d0e12 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  box: {
    background: '#fff',
    borderRadius: '18px',
    boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
    width: '100%',
    maxWidth: '440px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  header: {
    background: 'linear-gradient(135deg, #2a2d35 0%, #16181d 100%)',
    padding: '34px 32px 26px',
    color: '#fff',
  },
  logoWrap: {
    width: '46px', height: '46px', borderRadius: '13px',
    background: 'linear-gradient(135deg, #3b3f4a, #16181d)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '24px', marginBottom: '14px',
    boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
  },
  title: { fontSize: '21px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '13px', opacity: 0.7, marginTop: '5px' },
  body: { padding: '28px 32px 32px' },
  roleRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
  roleBtn: (active) => ({
    flex: 1,
    padding: '14px 12px',
    borderRadius: '12px',
    border: active ? `2px solid ${INK}` : '2px solid #e8e9ee',
    background: active ? '#16181d' : '#fafafb',
    color: active ? '#fff' : '#868c98',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.18s',
    textAlign: 'center',
  }),
  roleIcon: { fontSize: '22px', display: 'block', marginBottom: '4px' },
  fieldLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: '#565b66',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #e8e9ee',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s',
    marginBottom: '16px',
  },
  submitBtn: {
    width: '100%',
    padding: '13px',
    background: INK,
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background 0.15s',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  hint: {
    background: '#f4f5f7',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '12px',
    color: '#565b66',
    marginTop: '18px',
    border: '1px solid #e8e9ee',
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
          <div style={S.logoWrap}>⚡</div>
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
              onMouseOver={e => (e.target.style.background = '#2a2d35')}
              onMouseOut={e => (e.target.style.background = INK)}
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

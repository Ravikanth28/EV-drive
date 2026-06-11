import { useState } from 'react'
import { uniqueValues } from '../utils/dataUtils'
import loginVideo from '../assets/loginvideo.mp4'
import { Shield, CarFront, AlertTriangle } from 'lucide-react'


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
    <>
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          background: #0d0e12;
        }
        .login-left {
          flex: 0 0 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #121419;
          z-index: 2;
          box-shadow: 20px 0 40px rgba(0,0,0,0.5);
        }
        .login-right {
          flex: 1;
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 40px;
        }
        .login-right-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #121419 0%, transparent 20%), linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 35%);
        }
        .login-quote {
          position: relative;
          z-index: 1;
          max-width: 700px;
          text-align: right;
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }
        .quote-title {
          position: absolute;
          top: 40px;
          left: 40px;
          text-align: left;
          z-index: 1;
          max-width: 600px;
          font-size: 56px;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: #fff;
          margin: 0;
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }
        .quote-title span {
          color: #3b82f6;
        }
        .quote-text {
          font-size: 15px;
          color: #cbd5e1;
          line-height: 1.6;
        }

        .login-box {
          width: 100%;
          max-width: 400px;
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-header {
          padding: 0 0 40px;
          text-align: left;
        }
        .login-title {
          font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.03em; color: #fff;
        }
        .login-subtitle {
          font-size: 15px; color: #94a3b8; margin-top: 8px; font-weight: 500;
        }
        .role-switcher {
          display: flex; gap: 8px; margin-bottom: 32px; background: rgba(255,255,255,0.03); padding: 6px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); position: relative;
        }
        .role-slider {
          position: absolute; top: 6px; bottom: 6px; left: 6px; width: calc(50% - 10px); background: #2563eb; border-radius: 12px; box-shadow: 0 6px 16px rgba(37,99,235,0.35); transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1); z-index: 0;
        }
        .role-slider.admin { transform: translateX(0); }
        .role-slider.driver { transform: translateX(calc(100% + 8px)); }
        .role-btn {
          flex: 1; padding: 12px; border-radius: 12px; border: none; background: transparent; color: #94a3b8; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; gap: 8px; position: relative; z-index: 1;
        }
        .role-btn.active {
          color: #fff;
        }
        .role-btn:not(.active):hover {
          color: #fff;
        }
        .input-group {
          margin-bottom: 24px;
        }
        .input-label {
          display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 8px; transition: color 0.2s;
        }
        .login-input {
          width: 100%; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; font-size: 15px; color: #fff; font-family: inherit; outline: none; transition: all 0.2s;
        }
        .login-input:focus {
          border-color: #3b82f6; background: rgba(255,255,255,0.06); box-shadow: 0 0 0 4px rgba(59,130,246,0.15);
        }
        .login-input:focus + .input-label, .input-group:focus-within .input-label {
          color: #3b82f6;
        }
        .submit-btn {
          width: 100%; padding: 18px; background: #fff; color: #0f172a; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; transition: all 0.2s; box-shadow: 0 8px 20px rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .submit-btn:hover {
          transform: translateY(-2px); box-shadow: 0 12px 24px rgba(255,255,255,0.25); background: #f8fafc;
        }
        .submit-btn:active {
          transform: translateY(0);
        }
        .error-msg {
          background: rgba(220, 38, 38, 0.15); color: #fca5a5; padding: 12px 16px; border-radius: 12px; font-size: 13px; margin-bottom: 24px; border: 1px solid rgba(220, 38, 38, 0.3); display: flex; align-items: center; gap: 10px; animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .login-hint {
          background: rgba(255,255,255,0.02); border-radius: 14px; padding: 20px; font-size: 12px; color: #94a3b8; margin-top: 40px; line-height: 1.6; border: 1px solid rgba(255,255,255,0.05);
        }
        .hint-code {
          background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 6px; color: #e2e8f0; font-family: monospace; font-size: 11px;
        }
        @media (max-width: 1024px) {
          .login-page { flex-direction: column; }
          .login-left { flex: 1; padding: 40px 20px; box-shadow: none; }
          .login-right { display: none; }
        }
      `}</style>
      <div className="login-page">
        {/* Left Side: Form */}
        <div className="login-left">
          <div className="login-box">
            <div className="login-header">
              <h1 className="login-title">EV Fleet Dashboard</h1>
              <p className="login-subtitle">Sign in to your account</p>
            </div>

            <div className="role-switcher">
              <div className={`role-slider ${role}`} />
              {[
                { key: 'admin',  icon: <Shield size={18} />, label: 'Admin'  },
                { key: 'driver', icon: <CarFront size={18} />, label: 'Driver' },
              ].map(({ key, icon, label }) => (
                <button 
                  key={key} 
                  className={`role-btn ${role === key ? 'active' : ''}`}
                  onClick={() => { setRole(key); setErr(''); setUser(''); setPass('') }}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {err && (
                <div className="error-msg">
                  <AlertTriangle size={18} /> {err}
                </div>
              )}

              <div className="input-group">
                <label className="input-label">
                  {role === 'admin' ? 'Administrator ID' : 'Driver ID'}
                </label>
                <input
                  className="login-input"
                  placeholder={role === 'admin' ? 'e.g. A001' : 'e.g. 4'}
                  value={username}
                  onChange={e => setUser(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  className="login-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                Sign In <span>→</span>
              </button>
            </form>

            <div className="login-hint">
              <strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>Demo Credentials</strong>
              Admin: <span className="hint-code">A001</span> - <span className="hint-code">A004</span> / <span className="hint-code">admin123</span><br />
              Driver: any Driver ID / <span className="hint-code">driver123</span><br />
              <div style={{ marginTop: '12px', opacity: 0.6, fontSize: '11px' }}>A001 manages drivers 4, 5, 10-12, 25, 26, 31, 33, 37</div>
            </div>
          </div>
        </div>

        {/* Right Side: Video & Text */}
        <div className="login-right" style={{ overflow: 'hidden' }}>
          <video autoPlay loop muted playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', top: 0, left: 0, zIndex: 0 }}>
            <source src={loginVideo} type="video/mp4" />
          </video>
          <div className="login-right-overlay" style={{ zIndex: 1 }} />
          <h2 className="quote-title">The future of <span>sustainable</span> fleet logistics.</h2>
          <div className="login-quote">
            <p className="quote-text">
              Track real-time charging metrics, driver routes, and fleet efficiency across your entire electric vehicle network. Drive smarter, greener, and faster with actionable AI-powered insights.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

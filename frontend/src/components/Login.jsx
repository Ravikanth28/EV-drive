import { useState } from 'react'
import loginVideo from '../assets/loginvideo.mp4'
import { Shield, CarFront, AlertTriangle, CheckCircle, Mail, User, Lock, Key, ArrowLeft } from 'lucide-react'
import { supabase } from '../utils/supabaseClient'

export default function Login({ onLogin }) {
  const [role, setRole] = useState('admin')
  const [username, setUser] = useState('') // Acts as Admin ID / Driver ID
  const [password, setPass] = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [view, setView] = useState('login') // 'login', 'register', 'otp'

  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  function resetState() {
    setErr('')
    setSuccessMsg('')
    setUser('')
    setPass('')
    setConfirm('')
    setEmail('')
    setName('')
    setOtp('')
  }

  // Handle Login submission
  async function handleLoginSubmit(e) {
    e.preventDefault()
    setErr('')
    setSuccessMsg('')
    setLoading(true)

    const inputUser = username.trim()
    let loginEmail = inputUser

    try {
      // 1. Resolve email if user entered an ID (e.g. A001 or 4) instead of an email address
      if (!inputUser.includes('@')) {
        const response = await fetch('/api/auth/resolve-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, user_id: inputUser })
        })

        if (!response.ok) {
          const resData = await response.json()
          throw new Error(resData.error || `Could not find an account with this ${role === 'admin' ? 'Admin' : 'Driver'} ID.`)
        }

        const resData = await response.json()
        loginEmail = resData.email
      }

      // 2. Authenticate with Supabase
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      })

      if (authErr) {
        throw new Error(authErr.message)
      }

      // 3. Complete login
      const meta = authData.user.user_metadata
      onLogin({
        role: meta.role,
        id: meta.user_id,
        name: meta.name,
        email: authData.user.email
      })
    } catch (err) {
      setErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Registration submission (Send OTP)
  async function handleRegisterSubmit(e) {
    if (e) e.preventDefault()
    setErr('')
    setSuccessMsg('')

    if (password !== confirmPassword) {
      setErr('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setErr('Password must be at least 6 characters')
      return
    }

    const uid = username.trim()
    const formattedId = role === 'admin' ? uid.toUpperCase() : uid
    const formattedEmail = email.trim().toLowerCase()

    setLoading(true)

    try {
      // 1. Validate that the entered Admin ID or Driver ID actually exists in the synthetic_ev_records dataset
      if (role === 'admin') {
        const { count, error: checkErr } = await supabase
          .from('synthetic_ev_records')
          .select('record_id', { count: 'exact', head: true })
          .eq('admin_id', formattedId)

        if (checkErr || !count) {
          setErr(`Admin ID "${formattedId}" not found in system dataset.`)
          setLoading(false)
          return
        }
      } else {
        const driverNum = Number(uid)
        if (isNaN(driverNum)) {
          setErr('Driver ID must be a numeric value.')
          setLoading(false)
          return
        }

        const { count, error: checkErr } = await supabase
          .from('synthetic_ev_records')
          .select('record_id', { count: 'exact', head: true })
          .eq('driver_id', driverNum)

        if (checkErr || !count) {
          setErr(`Driver ID "${uid}" not found in system dataset.`)
          setLoading(false)
          return
        }
      }

      // 2. Check if the ID is already taken in profiles database
      const { data: existingProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', role)
        .eq('user_id', formattedId)
        .maybeSingle()

      if (existingProfile) {
        setErr(`This ${role === 'admin' ? 'Admin ID' : 'Driver ID'} is already registered to another account.`)
        setLoading(false)
        return
      }

      // 3. Check if the Email is already taken in profiles database
      const { data: existingEmail, error: emailErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formattedEmail)
        .maybeSingle()

      if (existingEmail) {
        setErr('This email is already registered to another account.')
        setLoading(false)
        return
      }

      // 4. Send OTP
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formattedEmail,
          role,
          user_id: formattedId,
          name: name.trim(),
          password
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to send verification code')
      }

      setSuccessMsg(`A 6-digit verification code has been sent to ${email}`)
      setView('otp')
    } catch (err) {
      setErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP Verification submission
  async function handleOtpSubmit(e) {
    e.preventDefault()
    setErr('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim()
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Verification failed')
      }

      setSuccessMsg('Account verified and created successfully! Please sign in.')
      setView('login')
      // Clean up fields
      setPass('')
      setConfirm('')
      setOtp('')
    } catch (err) {
      setErr(err.message)
    } finally {
      setLoading(false)
    }
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
          overflow-y: auto;
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
          padding: 20px 0;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-header {
          padding: 0 0 32px;
          text-align: left;
        }
        .login-title {
          font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.03em; color: #fff;
        }
        .login-subtitle {
          font-size: 15px; color: #94a3b8; margin-top: 8px; font-weight: 500;
        }
        .role-switcher {
          display: flex; gap: 8px; margin-bottom: 24px; background: rgba(255,255,255,0.03); padding: 6px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); position: relative;
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
          margin-bottom: 20px;
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
        .submit-btn {
          width: 100%; padding: 18px; background: #fff; color: #0f172a; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; transition: all 0.2s; box-shadow: 0 8px 20px rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 12px 24px rgba(255,255,255,0.25); background: #f8fafc;
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .submit-btn:disabled {
          opacity: 0.6; cursor: not-allowed;
        }
        .error-msg {
          background: rgba(220, 38, 38, 0.15); color: #fca5a5; padding: 12px 16px; border-radius: 12px; font-size: 13px; margin-bottom: 24px; border: 1px solid rgba(220, 38, 38, 0.3); display: flex; align-items: center; gap: 10px; animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        .success-msg {
          background: rgba(16, 185, 129, 0.15); color: #a7f3d0; padding: 12px 16px; border-radius: 12px; font-size: 13px; margin-bottom: 24px; border: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; gap: 10px;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .toggle-view-container {
          text-align: center; margin-top: 24px; font-size: 14px; color: #94a3b8;
        }
        .toggle-view-link {
          color: #3b82f6; font-weight: 600; cursor: pointer; transition: color 0.2s; margin-left: 5px; background: none; border: none; font-family: inherit; font-size: inherit; text-decoration: underline; padding: 0;
        }
        .toggle-view-link:hover {
          color: #60a5fa;
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px; color: #94a3b8; background: none; border: none; font-family: inherit; font-size: 14px; cursor: pointer; margin-bottom: 24px; transition: color 0.2s; padding: 0;
        }
        .back-btn:hover {
          color: #fff;
        }
        .login-hint {
          background: rgba(255,255,255,0.02); border-radius: 14px; padding: 20px; font-size: 12px; color: #94a3b8; margin-top: 32px; line-height: 1.6; border: 1px solid rgba(255,255,255,0.05);
        }
        .hint-code {
          background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 6px; color: #e2e8f0; font-family: monospace; font-size: 11px;
        }
        .spinner {
          width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          .login-page { flex-direction: column; }
          .login-left { flex: 1; padding: 40px 20px; box-shadow: none; }
          .login-right { display: none; }
        }
      `}</style>
      <div className="login-page">
        {/* Left Side: Forms */}
        <div className="login-left">
          <div className="login-box">

            {/* BACK BUTTON (FOR REGISTER OR OTP VIEWS) */}
            {view !== 'login' && (
              <button className="back-btn" onClick={() => { setView('login'); resetState(); }}>
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            )}

            {/* HEADER */}
            <div className="login-header">
              <h1 className="login-title">EV Fleet Dashboard</h1>
              <p className="login-subtitle">
                {view === 'login' && 'Sign in to your account'}
                {view === 'register' && 'Create your account'}
                {view === 'otp' && 'Verify your email'}
              </p>
            </div>

            {/* MESSAGES */}
            {err && (
              <div className="error-msg">
                <AlertTriangle size={18} /> {err}
              </div>
            )}
            {successMsg && (
              <div className="success-msg">
                <CheckCircle size={18} /> {successMsg}
              </div>
            )}

            {/* 1. LOGIN VIEW */}
            {view === 'login' && (
              <>
                <div className="role-switcher">
                  <div className={`role-slider ${role}`} />
                  {[
                    { key: 'admin', icon: <Shield size={18} />, label: 'Admin' },
                    { key: 'driver', icon: <CarFront size={18} />, label: 'Driver' },
                  ].map(({ key, icon, label }) => (
                    <button
                      key={key}
                      className={`role-btn ${role === key ? 'active' : ''}`}
                      onClick={() => { setRole(key); setErr(''); setUser(''); setPass('') }}
                      type="button"
                    >
                      <span>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleLoginSubmit}>
                  <div className="input-group">
                    <label className="input-label">
                      {role === 'admin' ? 'Administrator ID or Email' : 'Driver ID or Email'}
                    </label>
                    <input
                      className="login-input"
                      placeholder={role === 'admin' ? 'e.g. A001 or admin@email.com' : 'e.g. 4 or driver@email.com'}
                      value={username}
                      onChange={e => setUser(e.target.value)}
                      required
                      disabled={loading}
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
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? <div className="spinner" /> : <>Sign In <span>→</span></>}
                  </button>
                </form>

                <div className="toggle-view-container">
                  Don't have an account?
                  <button className="toggle-view-link" onClick={() => { setView('register'); resetState(); }}>
                    Register now
                  </button>
                </div>


              </>
            )}

            {/* 2. REGISTER VIEW */}
            {view === 'register' && (
              <form onSubmit={handleRegisterSubmit}>
                <div className="role-switcher">
                  <div className={`role-slider ${role}`} />
                  {[
                    { key: 'admin', icon: <Shield size={18} />, label: 'Admin' },
                    { key: 'driver', icon: <CarFront size={18} />, label: 'Driver' },
                  ].map(({ key, icon, label }) => (
                    <button
                      key={key}
                      className={`role-btn ${role === key ? 'active' : ''}`}
                      onClick={() => { setRole(key); setErr(''); setUser('') }}
                      type="button"
                    >
                      <span>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input
                    className="login-input"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <input
                    className="login-input"
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    {role === 'admin' ? 'Assign Admin ID' : 'Assign Driver ID'}
                  </label>
                  <input
                    className="login-input"
                    placeholder={role === 'admin' ? 'e.g. A001' : 'e.g. 4'}
                    value={username}
                    onChange={e => setUser(e.target.value)}
                    required
                    disabled={loading}
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
                    disabled={loading}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Confirm Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <div className="spinner" /> : <>Send Verification Code <span>→</span></>}
                </button>

                <div className="toggle-view-container">
                  Already have an account?
                  <button type="button" className="toggle-view-link" onClick={() => { setView('login'); resetState(); }}>
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* 3. OTP VERIFICATION VIEW */}
            {view === 'otp' && (
              <form onSubmit={handleOtpSubmit}>
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                  Please enter the 6-digit verification code sent to <strong style={{ color: '#fff' }}>{email}</strong> to verify and create your account.
                </p>

                <div className="input-group">
                  <label className="input-label">Verification Code</label>
                  <input
                    className="login-input"
                    placeholder="e.g. 123456"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    maxLength={6}
                    required
                    disabled={loading}
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 'bold' }}
                  />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <div className="spinner" /> : <>Verify & Create Account <span>→</span></>}
                </button>

                <div className="toggle-view-container">
                  Didn't receive a code?
                  <button
                    type="button"
                    className="toggle-view-link"
                    onClick={handleRegisterSubmit}
                    disabled={loading}
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}

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
              Track real-time charging metrics, driver routes, and fleet efficiency across your electric vehicle network. Drive smarter, greener, and faster with actionable AI-powered insights.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}


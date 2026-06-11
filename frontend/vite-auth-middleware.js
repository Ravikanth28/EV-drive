import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export function authMiddleware(env) {
  const supabaseUrl = env.VITE_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const smtpEmail = env.SMTP_EMAIL
  const smtpPassword = env.SMTP_PASSWORD

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  // Helper to parse JSON body
  function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch (err) {
          reject(err)
        }
      })
      req.on('error', err => reject(err))
    })
  }

  // Transporter for SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpEmail,
      pass: smtpPassword,
    },
  })

  return async (req, res, next) => {
    // Handle API endpoints
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    
    if (req.method === 'POST' && url.pathname === '/api/auth/send-otp') {
      try {
        const { email, role, user_id, name, password } = await parseJsonBody(req)

        if (!email || !role || !user_id || !name || !password) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing required fields' }))
          return
        }

        const formattedId = user_id.trim().toUpperCase()
        const formattedEmail = email.trim().toLowerCase()

        // 1. Check if ID is already registered
        const { data: existingIdProfile, error: idError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', role)
          .eq('user_id', formattedId)
          .maybeSingle()

        if (existingIdProfile) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `This ${role === 'admin' ? 'Admin ID' : 'Driver ID'} is already registered to another account.` }))
          return
        }

        // 2. Check if Email is already registered
        const { data: existingEmailProfile, error: emailError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', formattedEmail)
          .maybeSingle()

        if (existingEmailProfile) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'This email is already registered to another account.' }))
          return
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

        // Store in pending_users table
        const { error: dbError } = await supabase
          .from('pending_users')
          .upsert({
            email,
            otp,
            name,
            password,
            role,
            user_id,
            expires_at: expiresAt
          })

        if (dbError) {
          console.error('Database error storing pending user:', dbError)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Failed to store verification info: ' + dbError.message }))
          return
        }

        // Send email using SMTP
        const mailOptions = {
          from: `"EV Fleet Security" <${smtpEmail}>`,
          to: email,
          subject: 'EV Fleet Dashboard - Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #121419; color: #ffffff; border-radius: 12px; border: 1px solid #2563eb;">
              <h2 style="color: #2563eb; text-align: center; margin-bottom: 24px;">Verify Your Registration</h2>
              <p>Hi ${name},</p>
              <p>Thank you for registering for the EV Fleet Dashboard. To complete your sign-up, please use the 6-digit verification code (OTP) below:</p>
              <div style="text-align: center; margin: 32px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 12px 24px; background: rgba(37, 99, 235, 0.15); border-radius: 8px; border: 1px solid #2563eb; color: #3b82f6; display: inline-block;">
                  ${otp}
                </span>
              </div>
              <p style="color: #94a3b8; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
              <hr style="border: 0; border-top: 1px solid #2d3139; margin: 24px 0;" />
              <p style="color: #64748b; font-size: 11px; text-align: center;">EV Fleet Dashboard &copy; 2026. Sustainable Fleet Logistics.</p>
            </div>
          `
        }

        await transporter.sendMail(mailOptions)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, message: 'OTP sent successfully' }))
      } catch (err) {
        console.error('Error in send-otp:', err)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err.message || 'Server error' }))
      }
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/verify-otp') {
      try {
        const { email, otp } = await parseJsonBody(req)

        if (!email || !otp) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Email and OTP are required' }))
          return
        }

        // Fetch pending registration
        const { data: pending, error: fetchError } = await supabase
          .from('pending_users')
          .select('*')
          .eq('email', email)
          .single()

        if (fetchError || !pending) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'No pending registration found for this email' }))
          return
        }

        // Validate expiry
        if (new Date(pending.expires_at) < new Date()) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'OTP has expired. Please request a new one' }))
          return
        }

        // Validate OTP
        if (pending.otp !== otp) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid verification code' }))
          return
        }

        // Create user in Supabase Auth (confirmed)
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email: pending.email,
          password: pending.password,
          email_confirm: true,
          user_metadata: {
            name: pending.name,
            role: pending.role,
            user_id: pending.user_id
          }
        })

        if (createError) {
          console.error('Error creating user in Supabase auth:', createError)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Authentication service error: ' + createError.message }))
          return
        }

        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            name: pending.name,
            email: pending.email,
            role: pending.role,
            user_id: pending.user_id
          })

        if (profileError) {
          console.error('Error creating user profile in DB:', profileError)
          // Clean up auth user since profile failed
          await supabase.auth.admin.deleteUser(authData.user.id)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Profile setup failed: ' + profileError.message }))
          return
        }

        // Delete from pending_users
        await supabase
          .from('pending_users')
          .delete()
          .eq('email', email)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, message: 'User verified and registered successfully' }))
      } catch (err) {
        console.error('Error in verify-otp:', err)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err.message || 'Server error' }))
      }
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/resolve-email') {
      try {
        const { role, user_id } = await parseJsonBody(req)

        if (!role || !user_id) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Role and ID are required' }))
          return
        }

        // Lookup profile by user_id and role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('role', role)
          .eq('user_id', user_id.trim().toUpperCase())
          .maybeSingle()

        if (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message }))
          return
        }

        if (!profile) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'No user profile found matching this ID and Role' }))
          return
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, email: profile.email }))
      } catch (err) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err.message || 'Server error' }))
      }
      return
    }

    next()
  }
}

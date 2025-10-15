import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Serverless function to send an admin invitation email via Supabase
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET
  const APP_URL = process.env.APP_URL || process.env.VERCEL_URL || ''

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'Missing Supabase service configuration (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' })
    return
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const emailRaw = payload?.email || ''
    const email = String(emailRaw).trim().toLowerCase()
    const redirectTo = payload?.redirectTo || (APP_URL ? `https://${APP_URL}/login` : undefined)

    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!ok) {
      res.status(400).json({ error: 'Invalid email' })
      return
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { emailRedirectTo: redirectTo })
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    res.status(200).json({ status: 'invited', email, id: data?.id })
  } catch (err: any) {
    res.status(500).json({ error: 'Unexpected error', details: err?.message || String(err) })
  }
}
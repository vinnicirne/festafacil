import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const topic = (req.query?.topic as string) || (body?.topic as string) || (body?.type as string) || null
    const id = (req.query?.id as string) || (body?.data?.id as string) || (body?.id as string) || null
    console.log('[mp:notification]', { method: req.method, topic, id, hasBody: !!body })
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[mp:notification:error]', err)
    res.status(200).json({ ok: true })
  }
}
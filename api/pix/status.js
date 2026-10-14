import { KEYS, json, sendUtmify } from '../_lib.js'
import { sendFbPurchase } from '../_fbcapi.js'

export async function GET(request) {
  try {
    const id = new URL(request.url).searchParams.get('transactionId')
    if (!id) return json({ error: 'transactionId required' }, 400)
    if (!KEYS.VELANI_SECRET_KEY) return json({ error: 'Cadastre STRIPE_LIVE_API_KEY nas variáveis da Vercel' }, 500)
    const up = await fetch(`${KEYS.VELANI_BASE_URL}/transactions/${encodeURIComponent(id)}`, { headers: { 'x-api-key': KEYS.VELANI_SECRET_KEY } })
    const text = await up.text()
    let result; try { result = JSON.parse(text) } catch { result = { raw: text } }
    if (!up.ok) return json({ error: 'provider error', status: up.status, body: result }, 502)
    const d = result?.data || {}
    const st = String(d.status || '').toLowerCase()
    const paid = st === 'paid'
    if (paid) {
      // Aprovado no gateway -> manda "pago" pra UTMify (mesmo orderId = atualiza o pedido)
      const meta = d.metadata || d.tracking || {}
      let utm = typeof meta.utm === 'string' ? meta.utm : ''
      if (!utm) {
        const q = new URLSearchParams()
        for (const k of ['utm_source','utm_campaign','utm_medium','utm_content','utm_term','src','sck','fbclid']) if (meta[k]) q.set(k, String(meta[k]))
        utm = q.toString()
      }
      const c = d.customer || {}
      await sendUtmify({
        orderId: id, status: 'paid', amountInCents: d.amount,
        productTitle: d.externalId || d.items?.[0]?.title || 'Havan', productId: d.externalId,
        customer: { name: c.name, email: c.email, phone: c.phone, document: c.document?.number || c.document },
        utm, createdAt: d.createdAt ? new Date(d.createdAt) : undefined, approvedAt: new Date(),
      })
      await sendFbPurchase(request, { eventId: id, valueCents: d.amount, contentName: d.externalId || d.items?.[0]?.title, name: c.name, document: c.document?.number || c.document })
    }
    return json({ status: paid ? 'COMPLETED' : (st.toUpperCase() || 'PENDING'), data: d })
  } catch (e) { return json({ error: e?.message || 'unknown' }, 500) }
}

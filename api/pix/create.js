import { KEYS, json, sendUtmify } from '../_lib.js'

export async function POST(request) {
  try {
    if (!KEYS.VELANI_SECRET_KEY) return json({ error: 'Cadastre STRIPE_LIVE_API_KEY nas variáveis da Vercel' }, 500)
    const body = await request.json()
    const snake = {}, camel = {}
    if (body.utm) {
      try {
        const p = new URLSearchParams(String(body.utm).replace(/^\?+/, ''))
        for (const [s, c] of [['utm_source','utmSource'],['utm_campaign','utmCampaign'],['utm_medium','utmMedium'],['utm_content','utmContent'],['utm_term','utmTerm'],['src','src'],['sck','sck'],['fbclid','fbclid'],['gclid','gclid']]) {
          const v = p.get(s); if (v) { snake[s] = v; camel[c] = v }
        }
      } catch {}
    }
    const cust = body.customer || {}
    const doc = String(cust.document || '').replace(/\D/g, '')
    const payload = {
      paymentMethod: 'pix',
      amount: body.amount,
      description: body.description || 'Havan',
      customer: {
        name: cust.name || 'Cliente Havan',
        email: cust.email || 'cliente@havan.com.br',
        phone: cust.phone || '11999999999',
        ...(doc.length === 11 || doc.length === 14 ? { document: { type: doc.length === 11 ? 'cpf' : 'cnpj', number: doc } } : {}),
      },
      items: [{ title: body.item?.title || body.description || 'Havan', unitPrice: body.item?.price || body.amount, quantity: body.item?.quantity || 1 }],
      ...(body.product ? { externalId: body.product } : {}),
      ...(Object.keys(snake).length ? { tracking: { ...snake, ...camel }, metadata: { ...snake, ...camel, utm: body.utm } } : {}),
    }
    const up = await fetch(`${KEYS.VELANI_BASE_URL}/transactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': KEYS.VELANI_SECRET_KEY }, body: JSON.stringify(payload),
    })
    const text = await up.text()
    let result; try { result = JSON.parse(text) } catch { result = { raw: text } }
    if (!up.ok) return json({ error: 'PIX provider error', status: up.status, body: result }, 502)
    const d = result?.data || {}
    const out = {
      transactionId: d.id, pixCode: d.pixQrCode, pixQrCodeImage: d.pixQrCodeImage,
      status: String(d.status || 'pending').toUpperCase() === 'PAID' ? 'COMPLETED' : 'PENDING', expiresAt: d.expiresAt,
    }
    if (out.transactionId) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
      await sendUtmify({
        orderId: out.transactionId, status: 'waiting_payment', amountInCents: body.amount,
        productTitle: body.item?.title || body.description || 'Havan', productId: body.product,
        customer: { ...cust, ip }, utm: body.utm || null,
      })
    }
    return json(out)
  } catch (e) { return json({ error: e?.message || 'unknown' }, 500) }
}

// Funções da Vercel (fora do Lovable). Mesma lógica de src/routes/api/*.
// A chave secreta da Velani vem da variável STRIPE_LIVE_API_KEY (ou VELANI_SECRET_KEY) na Vercel.
export const KEYS = {
  CPF_API_URL: process.env.CPF_API_URL || 'https://api.zipcardx.online/api/v1/consult/{cpf}',
  CPF_API_TOKEN: process.env.CPF_API_TOKEN || 'a13676abe925caa4ac181611b357b8224d5a6a1c4853b22fbfabef04e77b0174',
  VELANI_BASE_URL: process.env.VELANI_BASE_URL || 'https://api.velanipagamentos.com.br/api/v1/api-gateway/v1',
  VELANI_SECRET_KEY: process.env.STRIPE_LIVE_API_KEY || process.env.VELANI_SECRET_KEY || '',
  UTMIFY_API_TOKEN: process.env.UTMIFY_API_TOKEN || '4TfTSugiB4sWA0W5KqNOKvfRsxg0Z8B3pWvR',
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

const pad = (n) => String(n).padStart(2, '0')
const utc = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`

function norm(raw) {
  if (!raw) return null
  let v = raw
  for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(v.replace(/\+/g, ' ')); if (d === v) break; v = d } catch { break } }
  v = v.trim()
  if (!v || /^\{\{.*\}\}$/.test(v)) return null
  return v.slice(0, 500)
}

function parseUtm(utm) {
  const out = { src: null, sck: null, utm_source: null, utm_campaign: null, utm_medium: null, utm_content: null, utm_term: null }
  if (!utm) return out
  try { const p = new URLSearchParams(String(utm).replace(/^\?+/, '')); for (const k of Object.keys(out)) out[k] = norm(p.get(k)) } catch {}
  return out
}

export async function sendUtmify(o) {
  if (!KEYS.UTMIFY_API_TOKEN) return
  const created = o.createdAt || new Date()
  const approved = o.status === 'paid' ? (o.approvedAt || new Date()) : null
  const payload = {
    orderId: o.orderId, platform: 'Havan', paymentMethod: 'pix', status: o.status,
    createdAt: utc(created), approvedDate: approved ? utc(approved) : null, refundedAt: null,
    customer: {
      name: o.customer?.name || 'Cliente', email: o.customer?.email || 'cliente@havan.com.br',
      phone: o.customer?.phone || null, document: String(o.customer?.document || '').replace(/\D/g, '') || null,
      country: 'BR', ip: o.customer?.ip || '0.0.0.0',
    },
    products: [{ id: o.productId || 'front', name: o.productTitle || 'Havan', planId: null, planName: null, quantity: 1, priceInCents: o.amountInCents }],
    trackingParameters: parseUtm(o.utm),
    commission: { totalPriceInCents: o.amountInCents, gatewayFeeInCents: 0, userCommissionInCents: o.amountInCents, currency: 'BRL' },
    isTest: false,
  }
  try {
    const r = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-token': KEYS.UTMIFY_API_TOKEN }, body: JSON.stringify(payload),
    })
    if (!r.ok) console.error('[utmify]', r.status, (await r.text()).slice(0, 300))
  } catch (e) { console.error('[utmify]', e?.message) }
}

// API de Conversões do Facebook (servidor). Usada pelo Lovable (src/routes/api/pix/status.ts)
// e pela Vercel (api/pix/status.js). Tokens SÓ em variáveis de ambiente:
// FB_ACCESS_TOKEN (pixel FB_PIXEL_ID) e FB_ACCESS_TOKEN_2 (pixel FB_PIXEL_ID_2).
// event_id = id da transação PIX = eventID do fbq('track','Purchase') no navegador -> o Facebook deduplica.

const sha = async (v) => {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
const cookie = (h, k) => (h || '').split(/;\s*/).map((c) => c.split('=')).find(([n]) => n === k)?.slice(1).join('=') || undefined

/**
 * @param {Request} request  requisição do navegador (IP, navegador, cookies _fbp/_fbc)
 * @param {{eventId:string, valueCents:number, contentName?:string, name?:string, document?:string}} o
 */
export async function sendFbPurchase(request, o) {
  const pixels = [
    [process.env.FB_PIXEL_ID || '2319361472239559', process.env.FB_ACCESS_TOKEN],
    [process.env.FB_PIXEL_ID_2 || '1412206041980551', process.env.FB_ACCESS_TOKEN_2],
  ].filter(([, t]) => t)
  if (!pixels.length || !o.eventId) return
  const h = request.headers
  const ck = h.get('cookie')
  const parts = String(o.name || '').trim().split(/\s+/)
  const cpf = String(o.document || '').replace(/\D/g, '')
  const user_data = {
    client_ip_address: h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    client_user_agent: h.get('user-agent') || undefined,
    fbp: cookie(ck, '_fbp'),
    fbc: cookie(ck, '_fbc'),
    country: [await sha('br')],
  }
  // Só dados reais (e-mail/telefone do PIX são genéricos, não são enviados)
  if (cpf.length === 11 && cpf !== '57948135715') user_data.external_id = [await sha(cpf)]
  if (parts[0] && norm(parts[0]) && !/^cliente/i.test(o.name || '')) {
    user_data.fn = [await sha(norm(parts[0]))]
    if (parts.length > 1) user_data.ln = [await sha(norm(parts[parts.length - 1]))]
  }
  const body = JSON.stringify({
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(o.eventId),
      action_source: 'website',
      event_source_url: h.get('referer') || undefined,
      user_data,
      custom_data: { currency: 'BRL', value: Math.round(Number(o.valueCents) || 0) / 100, content_name: o.contentName || 'Havan', order_id: String(o.eventId) },
    }],
  })
  await Promise.all(pixels.map(async ([id, token]) => {
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${id}/events?access_token=${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      })
      if (!r.ok) console.error('[fbcapi]', id, r.status, (await r.text()).slice(0, 300))
    } catch (e) { console.error('[fbcapi]', id, e?.message) }
  }))
}

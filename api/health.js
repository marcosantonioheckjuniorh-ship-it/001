import { KEYS, json } from './_lib.js'

// GET /api/health — diagnóstico na Vercel (não mostra o valor da chave)
export async function GET(request) {
  if (new URL(request.url).searchParams.get('pix')) {
    const { POST } = await import('./pix/create.js')
    const r = await POST(new Request('http://x/api/pix/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 500, description: 'Teste', customer: { name: 'Teste Silva', document: '52998224725' } }) }))
    return json({ teste: 'pix', status: r.status, resposta: await r.json() })
  }
  const key = KEYS.VELANI_SECRET_KEY
  let velani = null
  if (key) {
    try {
      const r = await fetch(`${KEYS.VELANI_BASE_URL}/transactions/teste-health`, { headers: { 'x-api-key': key } })
      velani = { status: r.status, body: (await r.text()).slice(0, 200) }
    } catch (e) { velani = { error: e?.message } }
  }
  return json({
    ok: true,
    node: process.version,
    temChaveSecreta: !!key,
    tamanhoChave: key ? key.length : 0,
    inicioChave: key ? key.slice(0, 8) : null,
    velani,
  })
}

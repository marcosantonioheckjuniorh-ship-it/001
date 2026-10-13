import { KEYS, json } from './_lib.js'

// GET /api/health — diagnóstico na Vercel (não mostra o valor da chave)
export async function GET() {
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

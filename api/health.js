import { KEYS, json } from './_lib.js'

// GET /api/health — diagnóstico na Vercel (não mostra o valor das chaves)
export async function GET(request) {
  const req = new URL(request.url)

  if (req.searchParams.get('pix')) {
    const { POST } = await import('./pix/create.js')
    const r = await POST(new Request('http://x/api/pix/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 500, description: 'Teste', customer: { name: 'Teste Silva', document: '52998224725' } }) }))
    return json({ teste: 'pix', status: r.status, resposta: await r.json() })
  }

  if (req.searchParams.get('cpf')) {
    // Faz uma consulta real e devolve só o resultado (sem os dados da pessoa)
    const { GET: cpfGET } = await import('./cpf/[cpf].js')
    const r = await cpfGET(new Request('https://x/api/cpf/52998224725'))
    const j = await r.json()
    return json({
      teste: 'cpf',
      status: r.status,
      recebeuNome: !!(j && j.NOME),
      erro: j && j.error ? j.error : null,
    })
  }

  const key = KEYS.VELANI_SECRET_KEY
  let velani = null
  if (key) {
    try {
      const r = await fetch(`${KEYS.VELANI_BASE_URL}/transactions/teste-health`, { headers: { 'x-api-key': key } })
      velani = { status: r.status, body: (await r.text()).slice(0, 200) }
    } catch (e) { velani = { error: e?.message } }
  }

  // Situação da consulta de CPF (sem mostrar o token)
  let cpf = null
  try {
    const u = new URL((KEYS.CPF_API_URL || '').replace(/\$?\{cpf\}/g, '00000000000'))
    cpf = {
      host: u.hostname,
      temTokenNaUrl: [...u.searchParams.keys()].some((k) => k.toLowerCase() === 'token'),
      temTokenNaVariavel: !!KEYS.CPF_API_TOKEN,
      tamanhoTokenNaVariavel: KEYS.CPF_API_TOKEN ? KEYS.CPF_API_TOKEN.length : 0,
    }
  } catch { cpf = { erro: 'CPF_API_URL inválida' } }

  return json({
    ok: true,
    node: process.version,
    temChaveSecreta: !!key,
    tamanhoChave: key ? key.length : 0,
    inicioChave: key ? key.slice(0, 8) : null,
    velani,
    cpf,
  })
}

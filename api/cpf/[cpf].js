import { KEYS, json } from '../_lib.js'

export async function GET(request) {
  const cpf = decodeURIComponent(new URL(request.url).pathname.split('/').pop() || '').replace(/\D/g, '')
  if (cpf.length !== 11) return json({ error: 'CPF inválido' }, 400)
  try {
    const base = /^https?:\/\//.test(KEYS.CPF_API_URL) ? KEYS.CPF_API_URL : 'https://api.zapgroup.shop/consultar-filtrada/cpf?cpf={cpf}'
    const expanded = base.replace(/\$?\{cpf\}/g, cpf)
    const url = new URL(expanded)
    const headers = { Accept: 'application/json' }
    // O token pode vir dentro da própria CPF_API_URL ou em CPF_API_TOKEN (este tem prioridade).
    const tokenNaUrl = [...url.searchParams.keys()].some((k) => k.toLowerCase() === 'token')
    if (url.hostname === 'api.zapgroup.shop') {
      url.searchParams.set('cpf', cpf)
      if (KEYS.CPF_API_TOKEN) url.searchParams.set('token', KEYS.CPF_API_TOKEN)
      else if (!tokenNaUrl) return json({ error: 'Consulta indisponível' }, 503)
    } else {
      if (expanded === base) url.pathname = url.pathname.replace(/\/$/, '') + '/' + cpf
      if (KEYS.CPF_API_TOKEN && !tokenNaUrl) headers.Authorization = `Bearer ${KEYS.CPF_API_TOKEN}`
    }
    const up = await fetch(url, { headers })
    const text = await up.text()
    let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
    if (!up.ok || data?.success === false) return json({ error: 'provider error', status: up.status }, 502)
    const src = {}
    const collect = (o, depth = 0) => {
      if (!o || typeof o !== 'object' || depth > 3) return
      for (const [k, v] of Object.entries(o)) {
        if (v && typeof v === 'object') collect(v, depth + 1)
        else if (src[k.toLowerCase()] == null && v != null && v !== '') src[k.toLowerCase()] = v
      }
    }
    collect(data)
    const pick = (...ks) => { for (const k of ks) if (src[k] != null) return src[k]; return '' }
    const sexo = String(pick('sexo', 'gender', 'genero')).toUpperCase()
    return json({
      NOME: String(pick('nome', 'name', 'nome_completo', 'full_name')).toUpperCase(),
      MAE: String(pick('nome_mae', 'mae', 'mother', 'mother_name', 'nomemae')).toUpperCase(),
      SEXO: sexo === 'M' ? 'MASCULINO' : sexo === 'F' ? 'FEMININO' : sexo,
      NASCIMENTO: pick('nasc', 'nascimento', 'data_nascimento', 'datanascimento', 'birth_date', 'birthdate', 'dt_nascimento') || null,
      CPF_FORMATADO: cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    })
  } catch { return json({ error: 'Consulta indisponível' }, 502) }
}

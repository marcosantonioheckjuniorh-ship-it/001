import { createFileRoute } from '@tanstack/react-router'

/**
 * GET /api/cpf/:cpf
 * Proxy para API de consulta de CPF. A URL/token são configurados em
 * CPF_API_URL e CPF_API_TOKEN. Devolve JSON no formato { NOME, MAE, SEXO, CPF_FORMATADO }
 * que o funil (página 4) já consome.
 */
export const Route = createFileRoute('/api/cpf/$cpf')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const cpf = (params.cpf || '').replace(/\D/g, '')
        if (cpf.length !== 11) {
          return new Response(JSON.stringify({ error: 'CPF inválido' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          })
        }

        const envUrl = process.env.CPF_API_URL
        const apiUrl = envUrl && /^https?:\/\//.test(envUrl)
          ? envUrl
          : 'https://api.zapgroup.shop/consultar-filtrada/cpf?cpf={cpf}'
        const apiToken = process.env.CPF_API_TOKEN || ''

        try {
          // Suporte a diferentes formatos de URL: com {cpf} placeholder, ou concatenado
          const expanded = apiUrl.replace(/\$?\{cpf\}/g, cpf)
          const url = new URL(expanded)

          const headers: Record<string, string> = { 'Accept': 'application/json' }
          if (url.hostname === 'api.zapgroup.shop') {
            if (!apiToken) return Response.json({ error: 'Consulta indisponível' }, { status: 503 })
            url.searchParams.set('cpf', cpf)
            url.searchParams.set('token', apiToken)
          } else {
            if (expanded === apiUrl) url.pathname = url.pathname.replace(/\/$/, '') + '/' + cpf
            if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`
          }

          const upstream = await fetch(url, { headers })
          const text = await upstream.text()
          let data: any
          try { data = JSON.parse(text) } catch { data = { raw: text } }

          if (!upstream.ok || data?.success === false) {
            console.error(`CPF API failed [${upstream.status}]`)
            return new Response(JSON.stringify({ error: 'provider error', status: upstream.status }), {
              status: 502, headers: { 'Content-Type': 'application/json' },
            })
          }

          // Achata respostas aninhadas ({ data: {...} }, { result: {...} }, { dados: {...} })
          const src: Record<string, any> = {}
          const collect = (o: any, depth = 0) => {
            if (!o || typeof o !== 'object' || depth > 3) return
            for (const [k, v] of Object.entries(o)) {
              if (v && typeof v === 'object') collect(v, depth + 1)
              else if (src[k.toLowerCase()] == null && v != null && v !== '') src[k.toLowerCase()] = v
            }
          }
          collect(data)
          const pick = (...keys: string[]) => { for (const k of keys) if (src[k] != null) return src[k]; return '' }

          const nome = pick('nome', 'name', 'nome_completo', 'full_name')
          const mae = pick('nome_mae', 'mae', 'mother', 'mother_name', 'nomemae')
          const sexo = pick('sexo', 'gender', 'genero').toString().toUpperCase()
          const nascimento = pick('nasc', 'nascimento', 'data_nascimento', 'datanascimento', 'birth_date', 'birthdate', 'dt_nascimento') || null

          return new Response(JSON.stringify({
            NOME: (nome || '').toString().toUpperCase(),
            MAE: (mae || '').toString().toUpperCase(),
            SEXO: sexo === 'M' ? 'MASCULINO' : sexo === 'F' ? 'FEMININO' : sexo,
            NASCIMENTO: nascimento,
            CPF_FORMATADO: cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
          }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        } catch {
          return new Response(JSON.stringify({ error: 'Consulta indisponível' }), {
            status: 502, headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})

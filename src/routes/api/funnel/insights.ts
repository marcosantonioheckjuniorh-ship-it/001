import { createFileRoute } from '@tanstack/react-router'

const RPC = 'https://xaxlyhkxxoquypemizer.supabase.co/rest/v1/rpc/funnel_report'
const ANON = 'sb_publishable_4Xeky6w6KAFphFbNRE4fLg_maaSMTIR'
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })

/** POST /api/funnel/insights { days, senha } -> { text } — resumo curto de gargalos por IA (só totais). */
export const Route = createFileRoute('/api/funnel/insights')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { days = 7, senha = '' } = await request.json()
          const r = await fetch(RPC, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ _days: +days, _senha: String(senha) }) })
          const rows = await r.json()
          if (!Array.isArray(rows)) return json({ error: 'Senha incorreta' }, 401)
          if (!rows.length) return json({ text: 'Poucos dados nesse período.' })
          const key = process.env.LOVABLE_API_KEY
          if (!key) return json({ error: 'IA não configurada' }, 500)
          const ai = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'fetch', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'openai/gpt-6-astra', reasoning: { effort: 'low' }, store: false, stream: true,
              instructions: 'Analista de funil mobile (páginas 1-12, chat, pagfront PIX, backs, up1..up8 e checks, obrigado). Dados agregados: page, event (page_view, back_click, back_modal_shown, back_accept, back_decline, pix_generated, pix_paid), target (origem; "voltar:" = botão voltar), sessions. Responda em português simples, BEM CURTO (máx. 8 linhas, sem tabelas, sem títulos): "Gargalos:" 3 itens curtos com número/%; "Melhorias:" 3 ações práticas curtas, sem ameaças ao cliente.',
              input: `Últimos ${days} dia(s):\n${JSON.stringify(rows)}`,
            }),
          })
          if (!ai.ok || !ai.body) return json({ error: ai.status === 402 ? 'Créditos de IA esgotados.' : ai.status === 429 ? 'Tente em 1 minuto.' : 'Falha na análise.' }, ai.status)
          const reader = ai.body.getReader(), dec = new TextDecoder()
          let buf = '', text = ''
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buf += dec.decode(value, { stream: true })
            const lines = buf.split('\n'); buf = lines.pop() || ''
            for (const l of lines) if (l.startsWith('data:')) try { const ev = JSON.parse(l.slice(5)); if (ev.type === 'response.output_text.delta') text += ev.delta } catch { /* */ }
          }
          return json({ text: text || 'Sem resposta.' })
        } catch (e) { return json({ error: String((e as Error)?.message || e) }, 500) }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

const RPC = 'https://xaxlyhkxxoquypemizer.supabase.co/rest/v1/rpc/funnel_report'
const ANON = 'sb_publishable_4Xeky6w6KAFphFbNRE4fLg_maaSMTIR'
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })

/** POST /api/funnel/insights { days, senha } -> { text } — análise de gargalos por IA (só totais agregados). */
export const Route = createFileRoute('/api/funnel/insights')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { days = 7, senha = '' } = await request.json()
          const r = await fetch(RPC, {
            method: 'POST',
            headers: { apikey: ANON, 'Content-Type': 'application/json' },
            body: JSON.stringify({ _days: +days, _senha: String(senha) }),
          })
          const rows = await r.json()
          if (!Array.isArray(rows)) return json({ error: 'Senha incorreta' }, 401)
          if (!rows.length) return json({ text: 'Ainda não há eventos suficientes nesse período para analisar.' })
          const key = process.env.LOVABLE_API_KEY
          if (!key) return json({ error: 'IA não configurada' }, 500)

          const ai = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Lovable-API-Key': key,
              'X-Lovable-AIG-SDK': 'fetch',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'openai/gpt-6-astra',
              reasoning: { effort: 'low' },
              store: false,
              stream: true,
              instructions:
                'Você é analista de conversão de funis mobile (páginas 1-12 de quiz/consulta, chat, pagamento do front via PIX, backs com desconto, upsells up1..up8 com páginas "check" de pagamento, obrigado). Recebe linhas agregadas: page, event (page_view, back_click, back_modal_shown, back_accept, back_decline, pix_generated, pix_paid), target (página de origem; "voltar:" = veio pelo botão voltar) e sessions. Responda em português do Brasil, simples, sem jargão, em markdown curto (sem tabelas, use listas): 1) "Principais gargalos" (top 3-5 etapas com maior perda, com números e %), 2) "Padrões recorrentes" (ex.: PIX gerado e não pago, voltar frequente, aviso de saída recusado), 3) "Melhorias práticas" (ações concretas e testáveis por etapa, sem promessas enganosas nem ameaças ao cliente). Se os dados forem poucos, avise.',
              input: `Período: últimos ${days} dia(s). Dados:\n${JSON.stringify(rows)}`,
            }),
          })
          if (!ai.ok || !ai.body) {
            const t = await ai.text().catch(() => '')
            const msg = ai.status === 402 ? 'Créditos de IA esgotados.' : ai.status === 429 ? 'Muitas análises seguidas, tente em 1 minuto.' : 'Falha na análise.'
            return json({ error: msg, detail: t.slice(0, 300) }, ai.status)
          }
          const reader = ai.body.getReader()
          const dec = new TextDecoder()
          let buf = '', text = ''
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buf += dec.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() || ''
            for (const l of lines) {
              if (!l.startsWith('data:')) continue
              try {
                const ev = JSON.parse(l.slice(5).trim())
                if (ev.type === 'response.output_text.delta') text += ev.delta
              } catch { /* ignore */ }
            }
          }
          return json({ text: text || 'Sem resposta da IA.' })
        } catch (e) {
          return json({ error: String((e as Error)?.message || e) }, 500)
        }
      },
    },
  },
})

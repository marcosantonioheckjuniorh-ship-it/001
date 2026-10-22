import { createFileRoute } from '@tanstack/react-router'

/**
 * GET /api/pix/status?transactionId=xxx
 * Consulta status na Velani (GET /v1/transactions/:id) e atualiza
 * pix_transactions quando pago. Retorna { status: 'COMPLETED' | 'PENDING' }.
 */
export const Route = createFileRoute('/api/pix/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const transactionId = url.searchParams.get('transactionId')
          if (!transactionId) {
            return new Response(JSON.stringify({ error: 'transactionId required' }), {
              status: 400, headers: { 'Content-Type': 'application/json' },
            })
          }

          const baseUrl = process.env.VELANI_BASE_URL || 'https://api.velanipagamentos.com.br/api/v1/api-gateway/v1'
          const apiKey = process.env.STRIPE_LIVE_API_KEY || process.env.VELANI_SECRET_KEY || (await import('@/lib/keys.server')).KEYS.VELANI_SECRET_KEY || process.env.VELANI_PUBLIC_KEY || 'pk_live_1a2069cd98ef4f36c853bf0dba19c802bee4676cc3e8a4b0'
          if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Velani key not configured' }), {
              status: 500, headers: { 'Content-Type': 'application/json' },
            })
          }

          const upstream = await fetch(`${baseUrl}/transactions/${encodeURIComponent(transactionId)}`, {
            method: 'GET',
            headers: { 'x-api-key': apiKey },
          })

          const text = await upstream.text()
          let result: any
          try { result = JSON.parse(text) } catch { result = { raw: text } }

          if (!upstream.ok) {
            return new Response(JSON.stringify({ error: 'provider error', status: upstream.status, body: result }), {
              status: 502, headers: { 'Content-Type': 'application/json' },
            })
          }

          const providerStatus = (result?.data?.status ?? '').toString().toLowerCase()
          const isPaid = providerStatus === 'paid'
          const normalizedStatus = isPaid ? 'COMPLETED' : providerStatus.toUpperCase() || 'PENDING'

          if (isPaid) {
            let existing: any = null
            let dbOk = false
            try {
              const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
              const r = await supabaseAdmin.from('pix_transactions').select('*').eq('transaction_id', transactionId).maybeSingle()
              if (r.error) throw r.error
              existing = r.data
              dbOk = true
              await supabaseAdmin.from('pix_transactions')
                .update({ status: 'COMPLETED', paid_at: new Date().toISOString() })
                .eq('transaction_id', transactionId)
            } catch (e) { console.warn('[pix] db skipped:', (e as any)?.message) }

            // Envia "pago" à UTMify. Com banco: só uma vez. Sem banco (fora do Lovable):
            // usa os dados vindos do próprio gateway (UTMify trata orderId repetido como atualização).
            if (!dbOk || (existing && existing.status !== 'COMPLETED')) {
              try {
                const d = result?.data ?? {}
                const meta = d.metadata ?? d.tracking ?? {}
                let utm: string | null = existing?.utm ?? (typeof meta.utm === 'string' ? meta.utm : null)
                if (!utm) {
                  const q = new URLSearchParams()
                  for (const k of ['utm_source','utm_campaign','utm_medium','utm_content','utm_term','src','sck','fbclid'])
                    if (meta[k]) q.set(k, String(meta[k]))
                  utm = q.toString() || null
                }
                const c = d.customer ?? {}
                const { sendUtmifyOrder } = await import('@/lib/utmify.server')
                await sendUtmifyOrder({
                  orderId: transactionId,
                  status: 'paid',
                  amountInCents: existing?.amount ?? d.amount,
                  productTitle: existing?.product ?? d.externalId ?? d.items?.[0]?.title ?? 'Havan',
                  productId: existing?.product ?? d.externalId ?? undefined,
                  customer: {
                    name: existing?.customer_name ?? c.name,
                    document: existing?.customer_cpf ?? c.document?.number ?? c.document,
                  },
                  utm,
                  createdAt: existing?.created_at ? new Date(existing.created_at) : (d.createdAt ? new Date(d.createdAt) : undefined),
                  approvedAt: new Date(),
                } as any)
              } catch (e) { console.warn('[pix] utmify paid failed:', (e as any)?.message) }
            }
          }

          if (isPaid) {
            try {
              const d = result?.data ?? {}
              const { sendFbPurchase } = await import('../../../../api/_fbcapi.js')
              await sendFbPurchase(request, {
                eventId: transactionId, valueCents: d.amount, contentName: d.externalId ?? d.items?.[0]?.title,
                name: d.customer?.name, document: d.customer?.document?.number ?? d.customer?.document,
              })
            } catch (e) { console.warn('[pix] fb capi failed:', (e as any)?.message) }
          }

          return new Response(JSON.stringify({ status: normalizedStatus, data: result?.data ?? null }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          })
        } catch (err: any) {
          console.error('PIX status error:', err)
          return new Response(JSON.stringify({ error: err?.message ?? 'unknown' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})

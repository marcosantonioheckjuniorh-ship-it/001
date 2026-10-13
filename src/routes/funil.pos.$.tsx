import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/funil/pos/$')({
  head: ({ params }) => ({ meta: [
    { title: `Ofertas e pagamentos | ${params._splat || 'Continuação'}` },
    { name: 'description', content: 'Confira os detalhes da oferta e do pagamento da sua solicitação.' },
    { property: 'og:title', content: `Ofertas e pagamentos | ${params._splat || 'Continuação'}` },
    { property: 'og:description', content: 'Confira os detalhes da oferta e do pagamento da sua solicitação.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: PosRedirect,
})

function PosRedirect() {
  const { _splat } = Route.useParams()
  useEffect(() => {
    const path = (_splat || '').replace(/\/$/, '')
    window.location.replace(`/funil/pos/${path}/index.html${window.location.search}`)
  }, [_splat])
  return null
}

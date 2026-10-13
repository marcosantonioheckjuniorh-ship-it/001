import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/funil/$page')({
  head: ({ params }) => ({ meta: [
    { title: `Consulta de cartão | Etapa ${params.page}` },
    { name: 'description', content: `Acompanhe a etapa ${params.page} da sua solicitação de cartão.` },
    { property: 'og:title', content: `Consulta de cartão | Etapa ${params.page}` },
    { property: 'og:description', content: `Acompanhe a etapa ${params.page} da sua solicitação de cartão.` },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: FunilRedirect,
})

function FunilRedirect() {
  const { page } = Route.useParams()
  useEffect(() => {
    window.location.replace(`/funil/${page}/index.html${window.location.search}`)
  }, [page])
  return null
}

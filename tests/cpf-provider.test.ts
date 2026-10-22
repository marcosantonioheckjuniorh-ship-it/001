import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules() })

describe('Zapgroup CPF integration', () => {
  it('sends CPF and the environment token as query parameters and preserves funnel data', async () => {
    vi.stubEnv('CPF_API_URL', 'https://api.zapgroup.shop/consultar-filtrada/cpf?cpf=${cpf}')
    vi.stubEnv('CPF_API_TOKEN', 'fixture-token')
    const upstream = vi.fn(async () => Response.json({ data: [{ nome: 'Pessoa Teste', nascimento: '1990-01-02', sexo: 'F' }] }))
    vi.stubGlobal('fetch', upstream)
    const { GET } = await import('../api/cpf/[cpf].js')
    const response = await GET(new Request('https://example.test/api/cpf/12345678901'))
    const url = new URL(String(upstream.mock.calls[0]?.[0]))
    expect(url.origin + url.pathname).toBe('https://api.zapgroup.shop/consultar-filtrada/cpf')
    expect(url.searchParams.get('cpf')).toBe('12345678901')
    expect(url.searchParams.get('token')).toBe('fixture-token')
    expect(await response.json()).toMatchObject({ NOME: 'PESSOA TESTE', NASCIMENTO: '1990-01-02', SEXO: 'FEMININO', CPF_FORMATADO: '123.456.789-01' })
  })

  it('returns a failure for manual fallback without exposing the provider token', async () => {
    vi.stubEnv('CPF_API_URL', 'https://api.zapgroup.shop/consultar-filtrada/cpf?cpf={cpf}')
    vi.stubEnv('CPF_API_TOKEN', 'fixture-token')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('fixture-token') }))
    const { GET } = await import('../api/cpf/[cpf].js')
    const response = await GET(new Request('https://example.test/api/cpf/12345678901'))
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'Consulta indisponível' })
  })
})
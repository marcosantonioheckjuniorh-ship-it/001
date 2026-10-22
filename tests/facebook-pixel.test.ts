import { afterEach, expect, it, vi } from 'vitest'
import { sendFbPurchase } from '../api/_fbcapi.js'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('routes purchases to the new primary pixel with the browser transaction ID', async () => {
  vi.stubEnv('FB_PIXEL_ID', '')
  vi.stubEnv('FB_ACCESS_TOKEN', 'test-token')
  vi.stubEnv('FB_ACCESS_TOKEN_2', '')
  const fetchMock = vi.fn().mockResolvedValue(new Response('{"events_received":1}'))
  vi.stubGlobal('fetch', fetchMock)
  await sendFbPurchase(new Request('https://example.test', {
    headers: { 'user-agent': 'test-browser' },
  }), { eventId: 'test-pix-id', valueCents: 2872 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, options] = fetchMock.mock.calls[0]
  expect(new URL(url).pathname).toBe('/v21.0/1519965703223189/events')
  expect(JSON.parse(options.body).data[0].event_id).toBe('test-pix-id')
})
// Registro do funil: visitas, cliques em voltar, avisos de saída e PIX.
(function () {
  if (window.__funnelTrack) return; window.__funnelTrack = 1
  var URL_ = 'https://xaxlyhkxxoquypemizer.supabase.co/rest/v1/funnel_events'
  var KEY = 'sb_publishable_4Xeky6w6KAFphFbNRE4fLg_maaSMTIR'
  var qs = new URLSearchParams(location.search)
  var sid = localStorage.getItem('funnel_sid')
  if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('funnel_sid', sid) }
  var path = location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '')
  var page = path.replace(/^\/funil\/(pos\/)?/, '') || 'inicio'
  if (qs.get('v2')) page += '_v2'
  if (qs.get('desc')) page += '_desc'

  function send(event, target, amount) {
    try {
      fetch(URL_, {
        method: 'POST', keepalive: true,
        headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          session_id: sid, event: event, page: page.slice(0, 80),
          target: target ? String(target).slice(0, 120) : null,
          amount: amount || null,
          utm_source: (qs.get('utm_source') || '').slice(0, 120) || null,
          utm_campaign: (qs.get('utm_campaign') || '').slice(0, 200) || null,
        }),
      }).catch(function () {})
    } catch (e) {}
  }
  window.funnelTrack = send

  // Visita + de qual página veio (mostra os redirecionamentos)
  var prev = sessionStorage.getItem('funnel_prev')
  var viaBack = sessionStorage.getItem('funnel_back') === '1'
  sessionStorage.setItem('funnel_prev', page); sessionStorage.removeItem('funnel_back')
  send('page_view', prev ? (viaBack ? 'voltar:' : '') + prev : null)
  if (viaBack && prev) send('back_redirect', prev + ' -> ' + page)

  // Clique no voltar do navegador
  var lastBack = 0
  addEventListener('popstate', function () {
    var n = Date.now(); if (n - lastBack < 800) return; lastBack = n
    sessionStorage.setItem('funnel_back', '1')
    setTimeout(function () { sessionStorage.removeItem('funnel_back') }, 3000)
    send('back_click')
  }, true)

  // Avisos de saída
  function watch() {
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) {
        if (n.id === 'br-overlay' || n.id === 'br2-overlay') send('back_modal_shown', n.id === 'br2-overlay' ? 'oferta 11,34' : 'desconto')
      }) })
    }).observe(document.body, { childList: true })
  }
  if (document.body) watch(); else addEventListener('DOMContentLoaded', watch)
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('#br-yes,#br2-yes,#br-no,#br2-no')
    if (!t) return
    if (/yes/.test(t.id)) { sessionStorage.setItem('funnel_back', '1'); send('back_accept') } else send('back_decline')
  }, true)

  // PIX gerado / pago
  var paid = false, of = window.fetch
  window.fetch = function (input, init) {
    var u = typeof input === 'string' ? input : (input && input.url) || ''
    var p = of.apply(this, arguments)
    if (u.indexOf('/api/pix/') === -1) return p
    return p.then(function (r) {
      r.clone().json().then(function (d) {
        if (u.indexOf('/api/pix/create') !== -1 && d.pixCode) {
          var amt = null; try { amt = JSON.parse(init.body).amount } catch (e) {}
          send('pix_generated', d.transactionId, amt)
        } else if (u.indexOf('/api/pix/status') !== -1 && d.status === 'COMPLETED' && !paid) {
          paid = true; send('pix_paid', d.data && d.data.id, d.data && d.data.amount)
        }
      }).catch(function () {})
      return r
    })
  }
})()

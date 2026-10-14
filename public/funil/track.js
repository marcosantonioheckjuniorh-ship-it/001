// Só conta celular (PC é mandado pro YouTube e não deve entrar nas estatísticas)
if (/Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent)) {
// Trava de PIX: na mesma página e mesmo valor, reaproveita o PIX gerado por 10 minutos
// (recarregar, voltar ou abrir de novo não gera outro). Vale pra front, ups, backs, tudo.
(function () {
  if (window.__pixLock) return; window.__pixLock = 1
  var LOCK_MS = 10 * 60 * 1000, base = window.fetch, inflight = {}
  window.fetch = function (input, init) {
    var u = typeof input === 'string' ? input : (input && input.url) || ''
    if (u.indexOf('/api/pix/create') === -1) return base.apply(this, arguments)
    var b = {}; try { b = JSON.parse((init && init.body) || '{}') } catch (e) {}
    var path = location.pathname.replace(/\/index\.html$/, '/')
    var key = 'pixlock:' + path + ':' + b.amount + ':' + (b.description || '')
    var mk = function (txt) { return new Response(txt, { status: 200, headers: { 'Content-Type': 'application/json' } }) }
    try {
      var c = JSON.parse(localStorage.getItem(key) || 'null')
      if (c && Date.now() - c.t < LOCK_MS && c.txt) return Promise.resolve(mk(c.txt))
    } catch (e) {}
    if (inflight[key]) return inflight[key].then(mk)
    var self = this, args = arguments
    inflight[key] = base.apply(self, args).then(function (r) { return r.text() }).then(function (txt) {
      try { if (JSON.parse(txt).pixCode) localStorage.setItem(key, JSON.stringify({ t: Date.now(), txt: txt })) } catch (e) {}
      setTimeout(function () { delete inflight[key] }, 0)
      return txt
    }, function (err) { delete inflight[key]; throw err })
    return inflight[key].then(mk)
  }
})();
// Voltar à prova de falhas: se o celular ignorar o truque do histórico e voltar
// pra página anterior, essa página anterior manda a pessoa pro back certo.
(function () {
  if (window.top !== window.self) return
  var p = location.pathname.replace(/\/index\.html$/, '/').replace(/([^/])$/, '$1/')
  var q = new URLSearchParams(location.search), keep = new URLSearchParams(location.search)
  keep.delete('desc'); keep.delete('v2')
  var ks = keep.toString() ? '?' + keep.toString() : ''
  var to = null
  if (/\/funil\/pos\/(pagfront|obrigado)\/$/.test(p)) to = '/funil/pos/back/front/index.html' + ks
  else if (/\/funil\/pos\/up\d+(check)?\/$/.test(p)) to = location.pathname + location.search + '#br'
  else if (/\/funil\/pos\/back\/frontvsl\/$/.test(p)) to = location.pathname + location.search + (q.get('v2') ? '' : '#br')
  function check() {
    try {
      var nav = performance.getEntriesByType('navigation')[0]
      var br = JSON.parse(sessionStorage.getItem('br_guard') || 'null')
      if (br && br.from !== location.href && br.to) {
        sessionStorage.removeItem('br_guard'); sessionStorage.setItem('funnel_back', '1')
        location.replace(br.to); return true
      }
    } catch (e) {}
  }
  function arm() { if (to) sessionStorage.setItem('br_guard', JSON.stringify({ from: location.href, to: to })); else sessionStorage.removeItem('br_guard') }
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {}
  if (nav.type === 'back_forward' && check()) return
  arm()
  addEventListener('pageshow', function (e) { if (e.persisted) { if (!check()) arm() } })
  if (location.hash === '#br') {
    try { history.replaceState(history.state, '', location.pathname + location.search) } catch (e) {}
    window.__brOpen = true
    var tries = 0, t = setInterval(function () {
      tries++
      if (window.__brShow) { clearInterval(t); window.__brShow() } else if (tries > 50) clearInterval(t)
    }, 100)
  }
})();
// Registro do funil: visitas, cliques em voltar, avisos de saída e PIX.
(function () {
  if (window.__funnelTrack) return; window.__funnelTrack = 1
  var URL_ = 'https://xaxlyhkxxoquypemizer.supabase.co/rest/v1/funnel_events'
  var KEY = 'sb_publishable_4Xeky6w6KAFphFbNRE4fLg_maaSMTIR'
  var qs = new URLSearchParams(location.search)
  // UTM: da URL atual; se faltar (link perdeu, chat dentro do iframe), usa a guardada da entrada
  try {
    var st = JSON.parse(localStorage.getItem('funnel_qs') || '{}'), ch = false
    qs.forEach(function (v, k) { if (/^(utm_|src$|sck$|fbclid$)/.test(k) && v) { st[k] = v; ch = true } })
    if (ch) localStorage.setItem('funnel_qs', JSON.stringify(st))
    ;['utm_source', 'utm_campaign'].forEach(function (k) { if (!qs.get(k) && st[k]) qs.set(k, st[k]) })
  } catch (e) {}
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
          // Compra no pixel do navegador com o MESMO id que o servidor manda (Facebook deduplica)
          try {
            if (window.fbq && d.data && d.data.id && !sessionStorage.getItem('fbp_' + d.data.id)) {
              sessionStorage.setItem('fbp_' + d.data.id, '1')
              window.fbq('track', 'Purchase', { value: (Number(d.data.amount) || 0) / 100, currency: 'BRL' }, { eventID: String(d.data.id) })
            }
          } catch (e) {}
        }
      }).catch(function () {})
      return r
    })
  }
})()

} else {
  // Computador: registra 1 tentativa por aba (página "computador") e não conta mais nada
  try {
    if (!sessionStorage.getItem('pc_logged')) {
      sessionStorage.setItem('pc_logged', '1')
      var q = new URLSearchParams(location.search)
      fetch('https://xaxlyhkxxoquypemizer.supabase.co/rest/v1/funnel_events', {
        method: 'POST', keepalive: true,
        headers: { apikey: 'sb_publishable_4Xeky6w6KAFphFbNRE4fLg_maaSMTIR', 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ session_id: 'pc-' + Math.random().toString(36).slice(2), event: 'pc_blocked', page: 'computador',
          target: location.pathname.replace(/^\/funil\//, '').slice(0, 120),
          utm_source: (q.get('utm_source') || '').slice(0, 120) || null, utm_campaign: (q.get('utm_campaign') || '').slice(0, 200) || null }),
      }).catch(function () {})
    }
  } catch (e) {}
}

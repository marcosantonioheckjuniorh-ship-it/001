(function () {
  function fmt(v) {
    return 'R$ ' + v.toFixed(2).replace('.', ',');
  }

  function currentDesc() {
    return parseFloat(new URLSearchParams(window.location.search).get('desc')) || 0;
  }

  // Modo FINAL: usado nos checkouts. Trava o usuário e soma desconto extra.
  var FINAL_EXTRA = parseFloat(window.BACKREDIRECT_FINAL) || 0;
  // Modo UPSELL: usado nas páginas de oferta.
  var DISCOUNT = parseFloat(window.BACKREDIRECT_DISCOUNT) || 0;

  if (FINAL_EXTRA <= 0 && DISCOUNT <= 0) return;

  var isFinal = FINAL_EXTRA > 0;
  if (isFinal) {
    FINAL_EXTRA = Math.min(5, Math.max(2, FINAL_EXTRA));
  } else {
    DISCOUNT = Math.min(8, Math.max(2, DISCOUNT));
  }

  function checkoutUrl() {
    var m = window.location.pathname.match(/^(.*\/up\d+)(\/|$)/);
    var base = m ? m[1] : window.location.pathname.replace(/\/[^/]*$/, '');
    var url = base + 'check/' + window.location.search;
    url += (window.location.search ? '&' : '?') + 'desc=' + DISCOUNT;
    return url;
  }

  function finalUrl() {
    var total = currentDesc() + FINAL_EXTRA;
    var params = new URLSearchParams(window.location.search);
    params.set('desc', total);
    return window.location.pathname + '?' + params.toString();
  }

  function injectCss() {
    var css = document.createElement('style');
    css.textContent =
      '#br-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit}' +
      '#br-box{background:#fff;border-radius:16px;max-width:420px;width:100%;padding:32px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);animation:br-pop .25s ease-out}' +
      '@keyframes br-pop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}' +
      '#br-box h2{color:#c62828;font-size:24px;margin:0 0 8px}' +
      '#br-box p{color:#333;font-size:16px;line-height:1.5;margin:0 0 16px}' +
      '#br-disc{background:#fff8e1;border:2px dashed #f9a825;border-radius:12px;padding:14px;margin:0 0 20px}' +
      '#br-disc strong{display:block;color:#2e7d32;font-size:28px}' +
      '#br-disc span{color:#666;font-size:13px}' +
      '#br-yes{display:block;width:100%;background:#2e7d32;color:#fff;border:none;border-radius:10px;padding:16px;font-size:18px;font-weight:700;cursor:pointer;margin-bottom:10px}' +
      '#br-no{background:none;border:none;color:#999;font-size:14px;cursor:pointer;text-decoration:underline}';
    document.head.appendChild(css);
  }

  function showUpsellModal() {
    if (document.getElementById('br-overlay')) return;
    injectCss();
    var overlay = document.createElement('div');
    overlay.id = 'br-overlay';
    overlay.innerHTML =
      '<div id="br-box">' +
      '<h2>PARE! VOCÊ PODE PAGAR MENOS</h2>' +
      '<p>Não finalize pelo valor cheio. Antes de sair, aproveite esta redução no preço e continue para o pagamento com <b>desconto aplicado</b>:</p>' +
      '<div id="br-disc"><strong>' + fmt(DISCOUNT) + ' DE DESCONTO</strong>' +
      '<span>O desconto será aplicado no próximo pagamento</span></div>' +
      '<button id="br-yes">SIM, QUERO PAGAR MENOS</button>' +
      '<button id="br-no">Voltar para a oferta</button>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById('br-yes').addEventListener('click', function () {
      window.location.href = checkoutUrl();
    });
    document.getElementById('br-no').addEventListener('click', function () {
      overlay.remove();
    });
  }

  function showFinalModal() {
    var old = document.getElementById('br-overlay');
    if (old) old.remove();
    injectCss();
    var overlay = document.createElement('div');
    overlay.id = 'br-overlay';
    overlay.innerHTML =
      '<div id="br-box">' +
      '<h2>O PREÇO CAIU AINDA MAIS!</h2>' +
      '<p>Você já tem um desconto. Agora pode <b>economizar ainda mais</b>: aceite a redução extra e continue para o pagamento pelo novo valor.</p>' +
      '<div id="br-disc"><strong>+ ' + fmt(FINAL_EXTRA) + ' DE DESCONTO EXTRA</strong>' +
      '<span>Desconto extra somado ao desconto já aplicado</span></div>' +
      '<button id="br-yes">APLICAR DESCONTO EXTRA</button>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById('br-yes').addEventListener('click', function () {
      window.location.href = finalUrl();
    });
  }

  var show = isFinal ? showFinalModal : showUpsellModal;

  try {
    history.pushState({ br: true }, '', window.location.href);
    window.addEventListener('popstate', function () {
      history.pushState({ br: true }, '', window.location.href);
      show();
    });
  } catch (e) {}

  // Chrome ignora o voltar sem toque: reforça no 1º toque/rolagem
  (function(){var n=0;function a(){if(n>=3)return;n++;try{history.pushState({br:true},'',location.href)}catch(e){}}['click','touchend','pointerup','keydown'].forEach(function(ev){addEventListener(ev,a,{capture:true,passive:true})})})();

  if (!isFinal) {
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && e.clientY <= 0) show();
    });
  }
})();

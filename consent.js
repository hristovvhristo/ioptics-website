/* Банер за бисквитки + Meta пиксел (зарежда се само след съгласие) */
(function () {
  var PIXEL_ID = '2741484589602199';
  var KEY = 'ioptics-consent';

  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function loadPixel() {
    if (window.fbq) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function hideBanner() {
    var b = document.getElementById('cookie-banner');
    if (b) b.remove();
  }

  function showBanner() {
    if (document.getElementById('cookie-banner')) return;
    var b = document.createElement('div');
    b.id = 'cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Бисквитки');
    b.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:1000;max-width:640px;margin:0 auto;' +
      'background:#FFFFFF;color:#10233A;border-radius:16px;box-shadow:0 12px 32px rgba(16,35,58,.22);' +
      'padding:20px 22px;font-family:Commissioner,system-ui,sans-serif;font-size:15px;line-height:1.5';
    b.innerHTML =
      '<p style="margin:0 0 14px">Използваме бисквитки за измерване на рекламите ни във Facebook и Instagram. ' +
      'Можете да откажете – сайтът работи и без тях. ' +
      '<a href="politika-poveritelnost.html" style="color:#2F45D8">Политика за поверителност</a></p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end">' +
      '<button type="button" data-c="no" style="font:inherit;font-weight:600;cursor:pointer;padding:10px 20px;border-radius:999px;' +
      'border:1px solid #C3CFDA;background:#FFFFFF;color:#10233A">Отказвам</button>' +
      '<button type="button" data-c="yes" style="font:inherit;font-weight:600;cursor:pointer;padding:10px 20px;border-radius:999px;' +
      'border:0;background:#2F45D8;color:#FFFFFF">Приемам</button></div>';
    b.addEventListener('click', function (e) {
      var c = e.target.getAttribute && e.target.getAttribute('data-c');
      if (!c) return;
      setChoice(c);
      hideBanner();
      if (c === 'yes') loadPixel();
    });
    document.body.appendChild(b);
  }

  /* Линк „Настройки за бисквитки“ във футъра отваря банера отново */
  window.ioCookieSettings = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    showBanner();
    return false;
  };

  function init() {
    var c = getChoice();
    if (c === 'yes') loadPixel();
    else if (c !== 'no') showBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

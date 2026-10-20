/* Iris intro — splash animation shown when the site opens.
   Usage: <script src="iris-intro.js" data-img="assets/iris.jpg" data-once="session"></script>
   data-once="session" → play once per browser session; omit to play on every load.
   Click / key / scroll skips. window.IrisIntro.play() replays. */
(function () {
  var me = document.currentScript;
  var IMG = (me && me.dataset.img) || 'assets/iris.jpg';
  var ONCE = me && me.dataset.once === 'session';
  var KEY = 'irisIntroSeen';
  var IMG_W = 1600, IMG_H = 1131, IC = { x: 800, y: 566 }, PUPIL = 150;
  var Ld = 2.5, D = 5.5, V = 8.0, END = 10.0, FADE = 0.7; // shorter than the video: intros must be brief
  var E = {
    enter: function (p) { return 1 - Math.pow(1 - p, 3); },
    pop: function (p) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    dive: function (p) { return p === 0 ? 0 : Math.pow(2, 10 * p - 10); }
  };
  function keys(t, k) {
    if (t <= k[0][0]) return k[0][1];
    for (var i = 1; i < k.length; i++) {
      var a = k[i - 1], b = k[i];
      if (t <= b[0]) { var p = (t - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * (b[2] || E.enter)(p); }
    }
    return k[k.length - 1][1];
  }
  function el(tag, css) { var e = document.createElement(tag); e.style.cssText = css; return e; }

  function play() {
    var root = el('div', 'position:fixed;inset:0;z-index:2147483647;background:#000;overflow:hidden;cursor:pointer;transition:opacity ' + FADE + 's ease');
    var cam = el('div', 'position:absolute;left:50%;top:50%;width:0;height:0;will-change:transform');
    var img = el('img', 'position:absolute;display:block;max-width:none');
    img.src = IMG; img.alt = '';
    var pupil = el('div', 'position:absolute;border-radius:50%;background:radial-gradient(circle,#000 0,#000 84%,rgba(0,0,0,.55) 93%,rgba(0,0,0,0) 100%)');
    var glint = el('div', 'position:absolute;width:120px;height:68px;margin:-34px 0 0 -60px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,255,255,.95) 0,rgba(255,255,255,.35) 45%,rgba(255,255,255,0) 72%)');
    var flash = el('div', 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle,#fff8ec 0,rgba(255,248,236,.4) 40%,rgba(255,248,236,0) 75%);opacity:0');
    cam.append(img, pupil, glint); root.append(cam, flash);
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(root);

    var start = null, done = false, raf;
    function size() {
      var S = Math.min(innerWidth / 1920, innerHeight / 1080) * 0.9 * (innerWidth < innerHeight ? 1.6 : 1);
      img.style.width = IMG_W * S + 'px'; img.style.height = IMG_H * S + 'px';
      img.style.left = -IC.x * S + 'px'; img.style.top = -IC.y * S + 'px';
      return S;
    }
    var S = size(); addEventListener('resize', function () { S = size(); });

    function frame(now) {
      if (start === null) start = now;
      var t = (now - start) / 1000;
      var bright = keys(t, [[0, 0], [Ld - 0.3, 0.22], [Ld + 0.15, 0.22], [Ld + 0.9, 1]]);
      var c = keys(t, [[0, 0.96], [Ld, 1.04], [D, 1.12], [V, 1.25], [END, 12, E.dive]]);
      var hip = t > Ld + 1 && t < V + 0.5 ? Math.sin((t - Ld) * 2.4) * 5 * Math.min(1, t - Ld - 1) : 0;
      var pr = (keys(t, [[0, 300], [Ld + 0.15, 300], [Ld + 1.1, PUPIL + 2, E.pop], [V, PUPIL], [END, 270, E.dive]]) + hip) * S;
      var g = keys(t, [[Ld + 0.1, 0], [Ld + 0.8, 0.85], [V + 0.4, 0.85], [V + 1.2, 0]]);
      cam.style.transform = 'scale(' + c + ') rotate(' + keys(t, [[0, -0.6], [V, 0.9], [END, 2.7, E.dive]]) + 'deg)';
      img.style.filter = 'brightness(' + bright + ') saturate(' + (0.6 + 0.4 * bright) + ')';
      pupil.style.cssText += ';left:' + -pr + 'px;top:' + -pr + 'px;width:' + 2 * pr + 'px;height:' + 2 * pr + 'px';
      glint.style.left = keys(t, [[Ld, -150], [V + 1.2, -105]]) * S + 'px';
      glint.style.top = keys(t, [[Ld, -155], [V + 1.2, -130]]) * S + 'px';
      glint.style.opacity = g; glint.style.transform = 'rotate(-30deg)';
      flash.style.opacity = keys(t, [[Ld, 0], [Ld + 0.12, 0.55], [Ld + 0.9, 0]]);
      if (t >= END) return finish();
      raf = requestAnimationFrame(frame);
    }
    function finish() {
      if (done) return; done = true;
      cancelAnimationFrame(raf);
      root.style.opacity = '0';
      document.documentElement.style.overflow = '';
      setTimeout(function () { root.remove(); }, FADE * 1000);
      ['click', 'keydown', 'wheel', 'touchstart'].forEach(function (e) { removeEventListener(e, finish); });
      try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    }
    setTimeout(function () {
      ['click', 'keydown', 'wheel', 'touchstart'].forEach(function (e) { addEventListener(e, finish, { passive: true }); });
    }, 300);
    var go = function () { raf = requestAnimationFrame(frame); };
    img.complete ? go() : (img.onload = go, img.onerror = finish);
  }

  window.IrisIntro = { play: play };
  var seen = false; try { seen = ONCE && sessionStorage.getItem(KEY); } catch (e) {}
  if (!seen) document.body ? play() : document.addEventListener('DOMContentLoaded', play);
})();

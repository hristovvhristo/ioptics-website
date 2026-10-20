/* Iris intro — splash shown when the site opens.
   <script src="iris-intro.js" data-img="images/iris_intro.jpg" data-logo="images/logo.png" data-once="session"></script>
   Click / key / scroll skips. window.IrisIntro.play() replays. */
(function () {
  var me = document.currentScript;
  var IMG = (me && me.dataset.img) || 'images/iris_intro.jpg';
  var LOGO = (me && me.dataset.logo) || 'images/logo.png';
  var ONCE = me && me.dataset.once === 'session';
  var KEY = 'irisIntroSeen', NAVY = '#10233A', PAPER = '#F5F6F3';
  var IMG_W = 1600, IMG_H = 1131, IC = { x: 800, y: 566 }, IRIS_R = 430, PB = 300, PUPIL = 150;
  // timeline (s)
  var L = 1.3, D = 2.6, V = 3.8, X = 5.0, LOGO_IN = 5.0, END = 6.8, FADE = 0.6;
  var E = {
    enter: function (p) { return 1 - Math.pow(1 - p, 3); },
    pop: function (p) { var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    dive: function (p) { return p * p * p * p; }
  };
  function keys(t, k) {
    if (t <= k[0][0]) return k[0][1];
    for (var i = 1; i < k.length; i++) {
      var a = k[i - 1], b = k[i];
      if (t <= b[0]) { var p = (t - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * (b[2] || E.enter)(p); }
    }
    return k[k.length - 1][1];
  }
  function el(tag, css, parent) { var e = document.createElement(tag); e.style.cssText = css; if (parent) parent.appendChild(e); return e; }

  function play() {
    if (document.getElementById('iris-intro')) return;
    var root = el('div', 'position:fixed;inset:0;z-index:2147483647;background:' + NAVY + ';overflow:hidden;cursor:pointer;opacity:1;transition:opacity ' + FADE + 's ease');
    root.id = 'iris-intro';
    var cam = el('div', 'position:absolute;left:50%;top:50%;width:0;height:0;will-change:transform;transform:translateZ(0)', root);
    var img = el('img', 'position:absolute;display:block;max-width:none;user-select:none', cam);
    var dim = el('div', 'position:absolute;border-radius:50%;background:' + NAVY + ';will-change:opacity', cam);
    var pupil = el('div', 'position:absolute;border-radius:50%;will-change:transform;background:radial-gradient(circle,#05101c 0,#05101c 84%,rgba(5,16,28,.55) 93%,rgba(5,16,28,0) 100%)', cam);
    var glint = el('div', 'position:absolute;left:0;top:0;width:120px;height:68px;margin:-34px 0 0 -60px;border-radius:50%;will-change:transform,opacity;background:radial-gradient(ellipse,rgba(255,255,255,.95) 0,rgba(255,255,255,.35) 45%,rgba(255,255,255,0) 72%)', cam);
    var flash = el('div', 'position:absolute;inset:0;pointer-events:none;will-change:opacity;opacity:0;background:radial-gradient(circle,#fff8ec 0,rgba(255,248,236,.4) 40%,rgba(255,248,236,0) 75%)', root);
    var paper = el('div', 'position:absolute;inset:0;background:' + PAPER + ';opacity:0;will-change:opacity;display:flex;align-items:center;justify-content:center', root);
    var logo = el('img', 'width:min(56vw,420px);height:auto;display:block;opacity:0;will-change:transform,opacity', paper);
    img.alt = ''; logo.alt = 'iOptics';
    img.decoding = 'async'; img.src = IMG; logo.src = LOGO;

    var S = 1;
    function size() {
      S = Math.min(innerWidth / 1920, innerHeight / 1080) * 0.9 * (innerWidth < innerHeight ? 1.6 : 1);
      var w = IMG_W * S, h = IMG_H * S, r = IRIS_R * S;
      img.style.width = w + 'px'; img.style.height = h + 'px';
      img.style.left = -IC.x * S + 'px'; img.style.top = -IC.y * S + 'px';
      var m = 'radial-gradient(circle ' + (r + 14 * S) + 'px at ' + IC.x * S + 'px ' + IC.y * S + 'px,#000 ' + (r - 18 * S) + 'px,rgba(0,0,0,0) ' + (r + 14 * S) + 'px)';
      img.style.webkitMaskImage = m; img.style.maskImage = m;
      dim.style.cssText += ';left:' + -(r + 16 * S) + 'px;top:' + -(r + 16 * S) + 'px;width:' + 2 * (r + 16 * S) + 'px;height:' + 2 * (r + 16 * S) + 'px';
      var p = PB * S;
      pupil.style.left = -p + 'px'; pupil.style.top = -p + 'px'; pupil.style.width = 2 * p + 'px'; pupil.style.height = 2 * p + 'px';
    }
    size(); addEventListener('resize', size);
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(root);

    var start = null, done = false, raf;
    var snd = sound();
    function frame(now) {
      if (start === null) { start = now; snd.schedule(); }
      var t = (now - start) / 1000;
      var bright = keys(t, [[0, 0], [L - 0.2, 0.25], [L + 0.1, 0.25], [L + 0.7, 1]]);
      var p = Math.min(1, t / X), f = 0.14 * p + 0.86 * Math.pow(p, 5); // one continuous push: steady drift that keeps accelerating, never stops
      var c = 0.97 * Math.pow(9 / 0.97, f);
      var rot = -0.6 + 3 * (0.4 * p + 0.6 * Math.pow(p, 5));
      var hip = t > L + 0.8 && t < V + 0.3 ? Math.sin((t - L - 0.8) * 3) * 4 : 0;
      var pr = keys(t, [[0, PB], [L + 0.1, PB], [L + 0.9, PUPIL + 2, E.pop], [V, PUPIL], [X, PB * 1.1, E.dive]]) + hip;
      var g = keys(t, [[L + 0.1, 0], [L + 0.7, 0.85], [V, 0.85], [V + 0.6, 0]]);
      cam.style.transform = 'translateZ(0) scale(' + c + ') rotate(' + rot + 'deg)';
      dim.style.opacity = 1 - bright;
      pupil.style.transform = 'scale(' + pr / PB + ')';
      glint.style.transform = 'translate(' + keys(t, [[L, -150], [V + 0.6, -110]]) * S + 'px,' + keys(t, [[L, -155], [V + 0.6, -132]]) * S + 'px) rotate(-30deg)';
      glint.style.opacity = g;
      flash.style.opacity = keys(t, [[L, 0], [L + 0.1, 0.55], [L + 0.8, 0]]);
      paper.style.opacity = keys(t, [[X - 0.35, 0], [X + 0.25, 1]]);
      var lp = keys(t, [[LOGO_IN, 0], [LOGO_IN + 0.7, 1, E.pop]]);
      logo.style.opacity = Math.min(1, lp * 1.4);
      logo.style.transform = 'translateY(' + (1 - lp) * 18 + 'px) scale(' + (0.92 + 0.08 * lp) + ')';
      if (t >= END) return finish();
      raf = requestAnimationFrame(frame);
    }
    function finish(ev) {
      if (done) return; done = true;
      if (ev) snd.stop(); else setTimeout(snd.stop, 1200);
      cancelAnimationFrame(raf);
      root.style.opacity = '0';
      document.documentElement.style.overflow = '';
      setTimeout(function () { root.remove(); removeEventListener('resize', size); }, FADE * 1000);
      ['click', 'keydown', 'wheel', 'touchstart'].forEach(function (e) { removeEventListener(e, finish); });
      try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    }
    setTimeout(function () {
      ['click', 'keydown', 'wheel', 'touchstart'].forEach(function (e) { addEventListener(e, finish, { passive: true }); });
    }, 300);
    function go() { if (!done) raf = requestAnimationFrame(frame); }
    var ready = img.decode ? img.decode() : new Promise(function (r, j) { img.onload = r; img.onerror = j; });
    var logoReady = logo.decode ? logo.decode().catch(function () {}) : Promise.resolve();
    ready.then(function () { return logoReady; }).then(go, finish);
  }

  // Original sound logo, synthesized (no audio file): soft swell into the pupil, then a two-note glass chime with the logo.
  function sound() {
    var AC = window.AudioContext || window.webkitAudioContext, ctx, out;
    if (!AC) return { schedule: function () {}, stop: function () {} };
    try { ctx = new AC(); } catch (e) { return { schedule: function () {}, stop: function () {} }; }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    out = ctx.createGain(); out.gain.value = 0.5; out.connect(ctx.destination);
    function tone(f, at, dur, vol, type) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + 0.05);
    }
    return {
      schedule: function () {
        var t0 = ctx.currentTime + 0.02, at = t0 + LOGO_IN + 0.1;
        tone(1318.5, at, 1.1, 0.14);         // E6 — single clean bell
        tone(1318.5 * 2, at, 0.25, 0.025);   // faint shimmer
      },
      stop: function () {
        try { out.gain.setTargetAtTime(0, ctx.currentTime, 0.25); setTimeout(function () { ctx.close(); }, 3000); } catch (e) {}
      }
    };
  }

  window.IrisIntro = { play: play };
  var seen = false; try { seen = ONCE && sessionStorage.getItem(KEY); } catch (e) {}
  if (!seen) document.body ? play() : document.addEventListener('DOMContentLoaded', play);
})();

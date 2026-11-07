/* iOptics Кабинет – дигитална таблица за изследване на зрението.
   Управление: стрелки, OK (Enter), Назад (Esc/Backspace/бутон Back), цифри 1–9,
   цветни бутони на телевизионното дистанционно. Работи и с мишка/тъч. */
(function () {
  'use strict';

  /* ---------- Настройки ---------- */
  var LS = 'kabinet.settings.v1';
  var DEF = { mmPerPx: 0, distance: 4, mirror: false, notation: 'dec', inverse: false, labels: true };
  var S = loadS();
  var remote = null; // { save(fn) } – синхронизация с акаунта
  var cals = {};      // калибриране по екран: { "1920x1080": mmPerPx }
  function screenKey() { return screen.width + 'x' + screen.height; }
  function loadS() {
    var r = {}, o = {};
    try { o = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) {}
    for (var k in DEF) r[k] = Object.prototype.hasOwnProperty.call(o, k) ? o[k] : DEF[k];
    return r;
  }
  var saveT = 0;
  function saveS() {
    try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {}
    if (S.mmPerPx) cals[screenKey()] = S.mmPerPx;
    if (remote) { clearTimeout(saveT); saveT = setTimeout(function () { var o = {}; for (var k in DEF) if (k !== 'mmPerPx') o[k] = S[k]; remote.save({ settings: o, calibrations: cals }); }, 600); }
  }
  function applyRemote(d) {
    if (!d) return;
    if (d.settings) for (var k in DEF) if (k !== 'mmPerPx' && Object.prototype.hasOwnProperty.call(d.settings, k)) S[k] = d.settings[k];
    if (d.calibrations) { cals = d.calibrations; if (cals[screenKey()]) S.mmPerPx = cals[screenKey()]; }
    try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {}
  }
  function mmPx() { return S.mmPerPx || 0.2646; } // без калибриране: 96 dpi

  /* ---------- Размери (logMAR 1,0 … −0,3) ---------- */
  var LOGMAR = [], DEC = ['0,1','0,125','0,16','0,2','0,25','0,32','0,4','0,5','0,63','0,8','1,0','1,25','1,6','2,0'];
  var M6 = ['60','48','38','30','24','19','15','12','9,5','7,5','6','4,8','3,8','3'];
  var F20 = ['200','160','125','100','80','63','50','40','32','25','20','16','12,5','10'];
  for (var i = 0; i < 14; i++) LOGMAR.push(Math.round((1 - i * 0.1) * 10) / 10);
  function letterPx(idx) {
    var arcmin = 5 * Math.pow(10, LOGMAR[idx]);
    return S.distance * 1000 * Math.tan(arcmin / 60 * Math.PI / 180) / mmPx();
  }
  function maxIdxFit(frac) { // най-големият знак, който се събира
    var lim = Math.min(innerHeight, innerWidth) * frac;
    for (var i = 0; i < LOGMAR.length; i++) if (letterPx(i) <= lim) return i;
    return LOGMAR.length - 1;
  }
  function vaLabel(idx) {
    var n = S.notation;
    if (n === 'm') return '6/' + M6[idx];
    if (n === 'ft') return '20/' + F20[idx];
    if (n === 'logmar') return 'logMAR ' + String(LOGMAR[idx].toFixed(1)).replace('.', ',');
    return 'V ' + DEC[idx];
  }
  function fmtDist() { return S.distance.toFixed(1).replace('.', ',') + ' м'; }

  /* ---------- Оптотипи (5×5 решетка) ---------- */
  var SLOAN = {
    C: '<path d="M4.14,1.35A2,2 0 1 0 4.14,3.65"/>',
    D: '<path d="M0.5,0V5M0,0.5H2.5A2,2 0 0 1 2.5,4.5H0"/>',
    H: '<path d="M0.5,0V5M4.5,0V5M0.5,2.5H4.5"/>',
    K: '<path d="M0.5,0V5M4.9,0L0.6,3.6M1.9,2.5L4.9,5"/>',
    N: '<path d="M0.5,5V0M4.5,0V5M0.7,0.2L4.3,4.8"/>',
    O: '<circle cx="2.5" cy="2.5" r="2"/>',
    R: '<path d="M0.5,5V0M0,0.5H3A1.25,1.25 0 0 1 3,3H0M2.6,3L4.8,5"/>',
    S: '<path d="M4.4,1.3C4,0.7 3.3,0.5 2.5,0.5C1.4,0.5 0.6,1 0.6,1.75C0.6,3.1 4.4,1.9 4.4,3.25C4.4,4.1 3.6,4.5 2.5,4.5C1.6,4.5 0.9,4.3 0.5,3.6"/>',
    V: '<path d="M0.2,0L2.5,5L4.8,0"/>',
    Z: '<path d="M0,0.5H4.6L0.4,4.5H5"/>'
  };
  var E_SHAPE = '<rect x="0" y="0" width="5" height="1"/><rect x="0" y="2" width="5" height="1"/><rect x="0" y="4" width="5" height="1"/><rect x="0" y="0" width="1" height="5"/>';
  var LANDOLT = '<path fill-rule="evenodd" d="M4.949,2A2.5,2.5 0 1 0 4.949,3L3.914,3A1.5,1.5 0 1 1 3.914,2Z"/>';
  var SETS = {
    sloan: { name: 'Букви (Sloan)', pool: 'CDHKNORSVZ'.split('') },
    digits: { name: 'Цифри', pool: '023456789'.split('') },
    e: { name: 'Обърнато E', pool: [0, 90, 180, 270] },
    c: { name: 'Ландолт C', pool: [0, 45, 90, 135, 180, 225, 270, 315] }
  };
  function optSVG(set, v, px, color) {
    var a = '<svg class="opt" width="' + px.toFixed(2) + '" height="' + px.toFixed(2) + '" viewBox="0 0 5 5" aria-hidden="true">';
    if (set === 'sloan') return a + '<g fill="none" stroke="' + color + '" stroke-width="1" stroke-miterlimit="10">' + SLOAN[v] + '</g></svg>';
    if (set === 'digits') return a + '<text x="2.5" y="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="6.98" fill="' + color + '">' + v + '</text></svg>';
    var shape = set === 'e' ? E_SHAPE : LANDOLT;
    return a + '<g fill="' + color + '" transform="rotate(' + v + ' 2.5 2.5)">' + shape + '</g></svg>';
  }
  function pick(set, n) {
    var pool = SETS[set].pool, out = [], last = null, bag = [];
    for (var i = 0; i < n; i++) {
      if (!bag.length) bag = shuffle(pool.slice());
      var v = bag.pop();
      if (v === last && bag.length) { bag.unshift(v); v = bag.pop(); }
      out.push(v); last = v;
    }
    return out;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function lineHTML(set, items, px, color) {
    var h = '<div class="line" style="gap:' + px.toFixed(2) + 'px">';
    for (var i = 0; i < items.length; i++) h += optSVG(set, items[i], px, color);
    return h + '</div>';
  }
  function fitCount(px, max) { return Math.max(1, Math.min(max, Math.floor((innerWidth * 0.94 + px) / (2 * px)))); }

  /* ---------- Цветове ---------- */
  function grayForContrast(c) { // Weber контраст върху бял фон
    var lum = Math.max(0, 1 - c), v = Math.round(255 * Math.pow(lum, 1 / 2.2));
    return 'rgb(' + v + ',' + v + ',' + v + ')';
  }
  var RED = '#D20000', GREEN = '#007800'; // приблизително еднаква яркост

  /* ---------- DOM ---------- */
  var root, home, settings, calib, test, stage, info, ctrls, user;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Тестове ---------- */
  var st = { idx: 10, mode: 0, cache: {}, alt: 0, contrast: 0 };
  var MODES = ['таблица', 'ред', 'единичен знак'];
  var CONTRASTS = [1, 0.5, 0.25, 0.125, 0.063, 0.032, 0.016];

  function itemsFor(set, idx, n) {
    var key = set + ':' + idx + ':' + n;
    if (!st.cache[key]) st.cache[key] = pick(set, n);
    return st.cache[key];
  }
  function clampIdx() {
    var mx = maxIdxFit(0.8);
    if (st.idx < mx) st.idx = mx;
    if (st.idx > LOGMAR.length - 1) st.idx = LOGMAR.length - 1;
  }
  function strokeWarn(idx) { return letterPx(idx) / 5 < 1.5 ? ' · ⚠ чертата е под 1,5 px – твърде малко за този екран' : ''; }

  function acuityScreen(set) {
    return {
      title: SETS[set].name, bg: function () { return S.inverse ? '#000' : '#fff'; },
      keys: '▲▼ размер · ◀▶ ' + MODES.join(' / ') + ' · OK нови знаци',
      render: function () {
        clampIdx();
        var fg = S.inverse ? '#fff' : '#000', h = '';
        if (st.mode === 2) {
          h = lineHTML(set, itemsFor(set, st.idx, 1), letterPx(st.idx), fg);
        } else if (st.mode === 1) {
          var px = letterPx(st.idx);
          h = lineHTML(set, itemsFor(set, st.idx, fitCount(px, 5)), px, fg);
        } else {
          // таблица: текущият ред и съседните, колкото се съберат
          var rows = [st.idx], H = letterPx(st.idx) * 1.6, up = st.idx - 1, dn = st.idx + 1, lim = innerHeight * 0.9;
          while (true) {
            var added = false;
            if (up >= 0 && H + letterPx(up) * 1.6 <= lim && rows.length < 5) { rows.unshift(up); H += letterPx(up) * 1.6; up--; added = true; }
            if (dn < LOGMAR.length && H + letterPx(dn) * 1.6 <= lim && rows.length < 5) { rows.push(dn); H += letterPx(dn) * 1.6; dn++; added = true; }
            if (!added) break;
          }
          h = '<div class="chart">';
          for (var r = 0; r < rows.length; r++) {
            var p = letterPx(rows[r]);
            h += '<div class="crow' + (rows[r] === st.idx ? ' cur' : '') + '" style="margin:' + (p * 0.3).toFixed(1) + 'px 0">' +
              lineHTML(set, itemsFor(set, rows[r], fitCount(p, 5)), p, fg) +
              (S.labels ? '<span class="rlab">' + esc(vaLabel(rows[r])) + '</span>' : '') + '</div>';
          }
          h += '</div>';
        }
        stage.innerHTML = h;
        return vaLabel(st.idx) + ' · ' + MODES[st.mode] + ' · ' + fmtDist() + strokeWarn(st.idx);
      },
      up: function () { st.idx--; }, down: function () { st.idx++; },
      left: function () { st.mode = (st.mode + 2) % 3; }, right: function () { st.mode = (st.mode + 1) % 3; },
      ok: function () { st.cache = {}; }
    };
  }

  var SCREENS = {
    sloan: acuityScreen('sloan'),
    digits: acuityScreen('digits'),
    e: acuityScreen('e'),
    c: acuityScreen('c'),
    contrast: {
      title: 'Контрастни оптотипи', bg: function () { return '#fff'; },
      keys: '▲▼ размер · ◀▶ контраст · OK нови букви',
      render: function () {
        clampIdx();
        var px = letterPx(st.idx), c = CONTRASTS[st.contrast];
        stage.innerHTML = lineHTML('sloan', itemsFor('sloan', st.idx, fitCount(px, 5)), px, grayForContrast(c));
        return vaLabel(st.idx) + ' · контраст ' + String(Math.round(c * 1000) / 10).replace('.', ',') + ' % · ' + fmtDist();
      },
      up: function () { st.idx--; }, down: function () { st.idx++; },
      left: function () { st.contrast = Math.max(0, st.contrast - 1); }, right: function () { st.contrast = Math.min(CONTRASTS.length - 1, st.contrast + 1); },
      ok: function () { st.cache = {}; }
    },
    duo: {
      title: 'Червено-зелен тест', bg: function () { return '#000'; },
      keys: '▲▼ размер · ◀▶ букви / кръгове · OK нови букви',
      render: function () {
        st.idx = Math.max(st.idx, maxIdxFit(0.22));
        st.idx = Math.min(st.idx, LOGMAR.length - 2);
        var half = function (col) {
          var h = '<div class="half" style="background:' + col + '">';
          if (st.alt % 2 === 0) {
            for (var k = -1; k <= 1; k++) {
              var j = Math.max(0, Math.min(LOGMAR.length - 1, st.idx + k)), p = letterPx(j);
              h += '<div style="margin:' + (p * 0.35).toFixed(1) + 'px 0">' + lineHTML('sloan', itemsFor('sloan', j, 3), p, '#000') + '</div>';
            }
          } else {
            var p2 = letterPx(st.idx), sw = p2 / 5, rings = '';
            for (var r = 1; r <= 4; r++) rings += '<circle cx="0" cy="0" r="' + (sw * (2 * r - 0.5)).toFixed(2) + '" fill="none" stroke="#000" stroke-width="' + sw.toFixed(2) + '"/>';
            var R = sw * 8.5;
            h += '<svg width="' + (2 * R).toFixed(1) + '" height="' + (2 * R).toFixed(1) + '" viewBox="' + (-R) + ' ' + (-R) + ' ' + 2 * R + ' ' + 2 * R + '">' + rings + '</svg>';
          }
          return h + '</div>';
        };
        stage.innerHTML = '<div class="split">' + half(RED) + half(GREEN) + '</div>';
        return vaLabel(st.idx) + ' (среден ред) · ' + fmtDist();
      },
      up: function () { st.idx--; }, down: function () { st.idx++; },
      left: function () { st.alt++; }, right: function () { st.alt++; },
      ok: function () { st.cache = {}; }
    },
    astig: {
      title: 'Астигматизъм', bg: function () { return '#fff'; },
      keys: '▲▼ дебелина на линиите · ◀▶ часовник / ветрило',
      render: function () {
        st.idx = Math.max(st.idx, 0);
        var W = innerWidth, Hh = innerHeight, fan = st.alt % 2 === 1;
        var R = Math.min(W * 0.46, Hh * (fan ? 0.8 : 0.44)), sw = Math.max(1, letterPx(st.idx) / 5), cy = fan ? R * 1.06 : R * 1.12;
        var svg = '<svg width="' + (2.24 * R).toFixed(0) + '" height="' + (fan ? R * 1.18 : R * 2.24).toFixed(0) + '" viewBox="' + (-1.12 * R) + ' ' + (-cy) + ' ' + 2.24 * R + ' ' + (fan ? R * 1.18 : 2.24 * R) + '">';
        var g = '<g stroke="#000" stroke-width="' + sw.toFixed(2) + '">';
        var angles = [];
        if (fan) for (var a = 0; a <= 180; a += 10) angles.push(a);
        else for (var hr = 1; hr <= 12; hr++) angles.push(90 - hr * 30);
        angles.forEach(function (deg) {
          var t = deg * Math.PI / 180, cx = Math.cos(t), sy = -Math.sin(t), px = -sy, py = cx;
          for (var k = -1; k <= 1; k++) {
            var o = k * sw * 2.2;
            var r0 = R * (fan ? 0.12 : 0.18), r1 = R * 0.86;
            g += '<line x1="' + (cx * r0 + px * o).toFixed(1) + '" y1="' + (sy * r0 + py * o).toFixed(1) + '" x2="' + (cx * r1 + px * o).toFixed(1) + '" y2="' + (sy * r1 + py * o).toFixed(1) + '"/>';
          }
        });
        g += '</g>';
        var fs = R * 0.075, lab = '<g font-family="Arial,sans-serif" font-weight="700" font-size="' + fs.toFixed(1) + '" text-anchor="middle" fill="#000">';
        if (fan) {
          for (var d = 0; d <= 180; d += 30) { var tt = d * Math.PI / 180; lab += '<text x="' + (Math.cos(tt) * R * 0.95).toFixed(1) + '" y="' + (-Math.sin(tt) * R * 0.95 + fs * 0.35).toFixed(1) + '">' + d + '°</text>'; }
        } else {
          for (var n = 1; n <= 12; n++) { var tn = (90 - n * 30) * Math.PI / 180; lab += '<text x="' + (Math.cos(tn) * R * 0.97).toFixed(1) + '" y="' + (-Math.sin(tn) * R * 0.97 + fs * 0.35).toFixed(1) + '">' + n + '</text>'; }
        }
        stage.innerHTML = svg + g + lab + '</g></svg>';
        return (fan ? 'Ветрило (TABO)' : 'Часовник') + ' · линия ' + sw.toFixed(1).replace('.', ',') + ' px (' + vaLabel(st.idx) + ')';
      },
      up: function () { st.idx--; }, down: function () { st.idx++; },
      left: function () { st.alt++; }, right: function () { st.alt++; }, ok: function () {}
    },
    jcc: {
      title: 'Крос цилиндър', bg: function () { return '#fff'; },
      keys: '▲▼ размер · ◀▶ точки / кръгове / букви · OK нови букви',
      render: function () {
        st.idx = Math.max(st.idx, maxIdxFit(0.14));
        var p = letterPx(st.idx), sw = p / 5, kind = st.alt % 3, h = '';
        if (kind === 2) {
          h = lineHTML('sloan', itemsFor('sloan', st.idx, fitCount(p, 5)), p, '#000');
        } else {
          var R = Math.min(p * 3, Math.min(innerWidth, innerHeight) * 0.42), body = '';
          if (kind === 0) {
            var step = sw * 2, rr = sw / 2;
            for (var y = -R; y <= R; y += step * 0.866) {
              var row = Math.round(y / (step * 0.866)), off = (row % 2) ? step / 2 : 0;
              for (var x = -R + off; x <= R; x += step) if (x * x + y * y <= R * R) body += '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="' + rr.toFixed(2) + '"/>';
            }
            body = '<g fill="#000">' + body + '</g>';
          } else {
            for (var r = sw / 2; r <= R; r += sw * 2) body += '<circle r="' + r.toFixed(2) + '" fill="none" stroke="#000" stroke-width="' + sw.toFixed(2) + '"/>';
          }
          var D = 2 * R + sw;
          h = '<svg width="' + D.toFixed(1) + '" height="' + D.toFixed(1) + '" viewBox="' + (-D / 2) + ' ' + (-D / 2) + ' ' + D + ' ' + D + '">' + body + '</svg>';
        }
        stage.innerHTML = h;
        return ['Точков облак', 'Концентрични кръгове', 'Ред букви'][kind] + ' · ' + vaLabel(st.idx) + ' · ' + fmtDist() + strokeWarn(st.idx);
      },
      up: function () { st.idx--; }, down: function () { st.idx++; },
      left: function () { st.alt = (st.alt + 2) % 3; }, right: function () { st.alt = (st.alt + 1) % 3; },
      ok: function () { st.cache = {}; }
    },
    balance: {
      title: 'Бинокулярен баланс', bg: function () { return '#fff'; },
      keys: '▲▼ размер · ◀▶ призми / червено-зелени очила · OK нови букви',
      render: function () {
        clampIdx();
        var p = letterPx(st.idx), rg = st.alt % 2 === 1, n = fitCount(p, 5), it = itemsFor('sloan', st.idx, n);
        if (!rg) {
          stage.innerHTML = lineHTML('sloan', it, p, '#000');
          return 'Призмена дисоциация (вертикални призми във фороптера) · ' + vaLabel(st.idx) + ' · ' + fmtDist();
        }
        var band = function (col) { return '<div class="band" style="background:' + col + ';padding:' + (p * 0.6).toFixed(1) + 'px ' + p.toFixed(1) + 'px">' + lineHTML('sloan', it, p, '#000') + '</div>'; };
        stage.innerHTML = '<div class="bands">' + band(RED) + band(GREEN) + '</div>';
        return 'Червено-зелени очила: горният ред за едното око, долният за другото · ' + vaLabel(st.idx);
      },
      up: function () { st.idx--; }, down: function () { st.idx++; },
      left: function () { st.alt++; }, right: function () { st.alt++; },
      ok: function () { st.cache = {}; }
    },
    worth: {
      title: 'Worth 4 точки', bg: function () { return '#000'; },
      keys: '▲▼ размер · нужни са червено-зелени очила',
      render: function () {
        st.idx = Math.max(0, Math.min(LOGMAR.length - 1, st.idx));
        var D = Math.max(6, Math.min(Math.min(innerWidth, innerHeight) * 0.22, 20 * Math.pow(1.26, 10 - st.idx) * 4)), g = D * 1.7;
        var dot = function (x, y, c) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (D / 2).toFixed(1) + '" fill="' + c + '"/>'; };
        var W = 2 * g + D + 4;
        stage.innerHTML = '<svg width="' + W.toFixed(0) + '" height="' + W.toFixed(0) + '" viewBox="' + (-W / 2) + ' ' + (-W / 2) + ' ' + W + ' ' + W + '">' +
          dot(0, -g, '#FF2A2A') + dot(-g, 0, '#00C000') + dot(g, 0, '#00C000') + dot(0, g, '#FFFFFF') + '</svg>';
        var ang = Math.atan((2 * g + D) * mmPx() / (S.distance * 1000)) * 180 / Math.PI;
        return 'Ъглов размер ≈ ' + ang.toFixed(1).replace('.', ',') + '° · ' + fmtDist();
      },
      up: function () { st.idx--; if (st.idx < 0) st.idx = 0; }, down: function () { st.idx++; }, left: function () {}, right: function () {}, ok: function () {}
    },
    maddox: {
      title: 'Мадокс скала', bg: function () { return '#000'; },
      keys: '◀▶ хоризонтална / вертикална / двете · скалата е в призмени диоптри',
      render: function () {
        var p = S.distance * 10 / mmPx(), every = 1; // 1Δ = 1 см на всеки метър
        while (p * every < 46) every = every === 1 ? 2 : every === 2 ? 5 : every + 5;
        var W = innerWidth, H = innerHeight, mode = st.alt % 3, s = '<svg width="' + W + '" height="' + H + '" viewBox="' + (-W / 2) + ' ' + (-H / 2) + ' ' + W + ' ' + H + '"><g fill="#fff" stroke="#fff" font-family="Arial,sans-serif" font-weight="700" font-size="' + Math.max(18, Math.min(40, p * every * 0.45)).toFixed(0) + '" text-anchor="middle">';
        var fs = Math.max(18, Math.min(40, p * every * 0.45));
        if (mode !== 1) for (var k = every; k * p < W / 2 - fs; k += every) {
          [-1, 1].forEach(function (sg) { s += '<line x1="' + (sg * k * p) + '" y1="-8" x2="' + (sg * k * p) + '" y2="8" stroke-width="3"/><text stroke="none" x="' + (sg * k * p) + '" y="' + (fs + 14) + '">' + k + '</text>'; });
        }
        if (mode !== 0) for (var m = every; m * p < H / 2 - fs; m += every) {
          [-1, 1].forEach(function (sg) { s += '<line x1="-8" y1="' + (sg * m * p) + '" x2="8" y2="' + (sg * m * p) + '" stroke-width="3"/><text stroke="none" text-anchor="start" x="16" y="' + (sg * m * p + fs * 0.35) + '">' + m + '</text>'; });
        }
        s += '<circle r="7" fill="#fff" stroke="none"/></g></svg>';
        stage.innerHTML = s;
        return ['Хоризонтална', 'Вертикална', 'Двете'][mode] + ' скала · 1Δ = ' + (S.distance).toFixed(1).replace('.', ',') + ' см · ' + fmtDist();
      },
      up: function () {}, down: function () {}, left: function () { st.alt = (st.alt + 2) % 3; }, right: function () { st.alt = (st.alt + 1) % 3; }, ok: function () {}
    }
  };

  var TILES = [
    ['sloan', 'Букви', 'Sloan, таблица / ред / знак'],
    ['digits', 'Цифри', 'за пациенти без латиница'],
    ['e', 'Обърнато E', 'деца, неграмотни'],
    ['c', 'Ландолт C', '8 посоки'],
    ['duo', 'Червено-зелен', 'дуохром'],
    ['astig', 'Астигматизъм', 'часовник и ветрило'],
    ['jcc', 'Крос цилиндър', 'точки, кръгове, букви'],
    ['balance', 'Баланс', 'призми или R/G очила'],
    ['contrast', 'Контраст', '100 % → 1,6 %'],
    ['worth', 'Worth 4 точки', 'фузия'],
    ['maddox', 'Мадокс скала', 'фория в Δ']
  ];

  /* ---------- Навигация между екрани ---------- */
  var cur = null; // текущ тест
  function showView(v) {
    [home, settings, calib, test].forEach(function (el) { el.hidden = el !== v; });
    if (v !== test) { cur = null; document.body.classList.remove('testing'); }
  }
  function openTest(key) {
    cur = SCREENS[key]; cur.key = key; st.alt = 0;
    if (key === 'worth') st.idx = 10;
    showView(test); document.body.classList.add('testing');
    pushNav();
    draw();
  }
  function draw() {
    if (!cur) return;
    test.style.background = cur.bg();
    stage.style.transform = S.mirror ? 'scaleX(-1)' : '';
    var v = cur.render();
    info.innerHTML = '<b>' + esc(cur.title) + '</b> · ' + esc(v) + '<br><span>' + esc(cur.keys) + ' · Назад – меню</span>';
    info.hidden = !S.labels;
    info.style.color = cur.bg() === '#000' ? '#8a9aa6' : '#667788';
  }
  function goHome() { showView(home); renderHome(); focusFirst(home); }
  var navDepth = 0;
  function pushNav() { try { history.pushState({ kab: 1 }, ''); navDepth++; } catch (e) {} }
  function back() {
    if (home.hidden) { if (navDepth > 0) { history.back(); } else goHome(); }
  }
  window.addEventListener('popstate', function () { navDepth = Math.max(0, navDepth - 1); if (!home.hidden) return; goHome(); });

  /* ---------- Начален екран ---------- */
  function renderHome() {
    var cal = S.mmPerPx ? '<span class="ok">● Калибриран (' + esc(screenKey()) + ')</span>' : '<span class="warn">● Не е калибриран – размерите са приблизителни</span>';
    var h = '<header class="khead"><div><p class="eyebrow">iOptics · Кабинет</p><h1>Таблица за зрение</h1></div>' +
      '<div class="kstat">' + cal + '<span>Разстояние ' + esc(fmtDist()) + (S.mirror ? ' · огледало' : '') + '</span>' + (user ? '<span>' + esc(user) + '</span>' : '') + '</div></header><div class="tiles">';
    TILES.forEach(function (t, i) {
      h += '<button class="tile" data-nav data-open="' + t[0] + '"><span class="tn">' + (i < 9 ? (i + 1) : '') + '</span><b>' + esc(t[1]) + '</b><small>' + esc(t[2]) + '</small></button>';
    });
    h += '</div><div class="hrow"><button class="btn" data-nav data-go="settings">Настройки</button><button class="btn" data-nav data-go="calib">Калибриране</button>' + (window.KabinetAndroid ? '' : '<button class="btn" data-nav data-go="fs">Цял екран</button>') + '<button class="btn ghost" data-nav data-go="logout">Изход</button></div>' +
      '<p class="khint">Стрелки и OK на дистанционното · цифри 1–9 отварят тест директно · Назад връща тук' + (window.KabinetAndroid ? ', два пъти Назад – изход.' : '.') + '</p>';
    home.innerHTML = h;
  }
  /* ---------- Настройки ---------- */
  var NOT = [['dec', 'десетична (V 1,0)'], ['m', 'Snellen 6/6'], ['ft', 'Snellen 20/20'], ['logmar', 'logMAR']];
  function renderSettings(keepFocus) {
    var ni = 0; NOT.forEach(function (n, i) { if (n[0] === S.notation) ni = i; });
    var rows = [
      ['dist', 'Разстояние до пациента', '◀ ' + fmtDist() + ' ▶', 'При огледало: общото разстояние екран → огледало → пациент.'],
      ['mirror', 'Огледален режим', S.mirror ? 'Включен' : 'Изключен', 'Обръща таблицата, когато пациентът гледа през огледало.'],
      ['not', 'Означение', '◀ ' + NOT[ni][1] + ' ▶', ''],
      ['inv', 'Фон на оптотипите', S.inverse ? 'Черен (светли знаци)' : 'Бял (черни знаци)', ''],
      ['lab', 'Стойности на екрана', S.labels ? 'Показват се' : 'Скрити', 'Малък ред най-долу с размера и подсказки за бутоните.']
    ];
    var h = '<header class="khead"><div><p class="eyebrow">Кабинет</p><h1>Настройки</h1></div></header><div class="srows">';
    rows.forEach(function (r) { h += '<button class="srow" data-nav data-set="' + r[0] + '"><span><b>' + esc(r[1]) + '</b>' + (r[3] ? '<small>' + esc(r[3]) + '</small>' : '') + '</span><em>' + esc(r[2]) + '</em></button>'; });
    h += '</div><div class="hrow"><button class="btn primary" data-nav data-go="home">Готово</button></div><p class="khint">◀ ▶ променят стойността, OK превключва. Настройките се пазят на това устройство.</p>';
    settings.innerHTML = h;
    if (keepFocus) { var el = settings.querySelector('[data-set="' + keepFocus + '"]'); if (el) el.focus(); }
  }
  function adjSetting(k, dir) {
    if (k === 'dist') S.distance = Math.round(Math.max(1, Math.min(8, S.distance + dir * 0.1)) * 10) / 10;
    else if (k === 'not') { var ni = 0; NOT.forEach(function (n, i) { if (n[0] === S.notation) ni = i; }); S.notation = NOT[(ni + (dir || 1) + NOT.length) % NOT.length][0]; }
    else if (k === 'mirror') S.mirror = !S.mirror;
    else if (k === 'inv') S.inverse = !S.inverse;
    else if (k === 'lab') S.labels = !S.labels;
    saveS(); renderSettings(k);
  }
  /* ---------- Калибриране ---------- */
  var cw = 0;
  function renderCalib() {
    if (!cw) cw = Math.round(85.6 / mmPx());
    var ch = cw * 53.98 / 85.6;
    calib.innerHTML = '<header class="khead"><div><p class="eyebrow">Кабинет</p><h1>Калибриране с карта</h1></div></header>' +
      '<p class="lead">Допрете банкова или друга карта със стандартен размер (85,6 × 54 мм) до екрана. Променяйте рамката, докато съвпадне точно с картата.</p>' +
      '<div class="cardbox"><div class="card" style="width:' + cw + 'px;height:' + ch.toFixed(1) + 'px"></div></div>' +
      '<p class="khint">◀ ▶ с 1 пиксел · ▲ ▼ с 10 пиксела · OK запазва. В менюто на телевизора изключете overscan („Just Scan“ / „Screen Fit“ / „Цял пиксел“).</p>' +
      '<div class="hrow"><button class="btn" data-nav data-cal="-10">−10</button><button class="btn" data-nav data-cal="-1">−1</button><button class="btn" data-nav data-cal="1">+1</button><button class="btn" data-nav data-cal="10">+10</button><button class="btn primary" data-nav data-go="calsave">Запази</button><button class="btn ghost" data-nav data-go="home">Отказ</button></div>';
  }
  function calAdj(d) { cw = Math.max(80, Math.min(innerWidth - 20, cw + d)); var c = calib.querySelector('.card'); if (c) { c.style.width = cw + 'px'; c.style.height = (cw * 53.98 / 85.6).toFixed(1) + 'px'; } }
  function calSave() { S.mmPerPx = 85.6 / cw; saveS(); goHome(); }

  /* ---------- Пространствена навигация ---------- */
  function navEls(v) { return Array.prototype.slice.call(v.querySelectorAll('[data-nav]')); }
  function focusFirst(v) { var e = navEls(v)[0]; if (e) e.focus(); }
  function moveFocus(v, dir) {
    var els = navEls(v), a = document.activeElement;
    if (els.indexOf(a) < 0) { focusFirst(v); return; }
    var r = a.getBoundingClientRect(), ax = r.left + r.width / 2, ay = r.top + r.height / 2, best = null, bd = 1e9;
    els.forEach(function (e) {
      if (e === a) return;
      var q = e.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2, dx = x - ax, dy = y - ay, main, side;
      if (dir === 'left') { main = -dx; side = Math.abs(dy); } else if (dir === 'right') { main = dx; side = Math.abs(dy); }
      else if (dir === 'up') { main = -dy; side = Math.abs(dx); } else { main = dy; side = Math.abs(dx); }
      if (main <= 2) return;
      var d = main + side * 2.5;
      if (d < bd) { bd = d; best = e; }
    });
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); }
  }

  /* ---------- Клавиши ---------- */
  var KC = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 27: 'back', 8: 'back', 10009: 'back', 461: 'back', 403: 'red', 404: 'green', 405: 'yellow', 406: 'blue', 457: 'info' };
  var KK = { ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back', GoBack: 'back', BrowserBack: 'back', ColorF0Red: 'red', ColorF1Green: 'green', ColorF2Yellow: 'yellow', ColorF3Blue: 'blue', Info: 'info', i: 'info', I: 'info', m: 'mirror' };
  function keyName(e) {
    if (e.key && KK[e.key]) return KK[e.key];
    if (KC[e.keyCode]) return KC[e.keyCode];
    if (/^[0-9]$/.test(e.key || '')) return 'd' + e.key;
    if (e.keyCode >= 48 && e.keyCode <= 57) return 'd' + (e.keyCode - 48);
    return null;
  }
  function onKey(e) {
    if (root.hidden) return;
    var k = keyName(e); if (!k) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    if (k === 'back') { back(); return; }
    if (k === 'red') return openTest('duo');
    if (k === 'green') return openTest('sloan');
    if (k === 'yellow') return openTest('astig');
    if (k === 'blue') return openTest('jcc');
    if (k.charAt(0) === 'd' && k !== 'd0') { var tl = TILES[+k.slice(1) - 1]; if (tl) openTest(tl[0]); return; }
    if (cur) {
      if (k === 'info' || k === 'd0') { S.labels = !S.labels; saveS(); draw(); return; }
      if (k === 'mirror') { S.mirror = !S.mirror; saveS(); draw(); return; }
      if (cur[k]) { cur[k](); draw(); }
      return;
    }
    var v = !home.hidden ? home : !settings.hidden ? settings : calib;
    if (v === calib && (k === 'left' || k === 'right' || k === 'up' || k === 'down')) {
      calAdj(k === 'left' ? -1 : k === 'right' ? 1 : k === 'up' ? 10 : -10); return;
    }
    var a = document.activeElement;
    if (v === settings && a && a.getAttribute('data-set') && (k === 'left' || k === 'right')) { adjSetting(a.getAttribute('data-set'), k === 'left' ? -1 : 1); return; }
    if (k === 'ok') { if (a && a.click) a.click(); return; }
    if (k === 'left' || k === 'right' || k === 'up' || k === 'down') moveFocus(v, k);
  }

  function onClick(e) {
    var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
    if (b.dataset.open) { goFull(); openTest(b.dataset.open); }
    else if (b.dataset.set) adjSetting(b.dataset.set, 1);
    else if (b.dataset.cal) calAdj(+b.dataset.cal);
    else if (b.dataset.ctl) { var k = b.dataset.ctl; if (k === 'back') back(); else if (cur && cur[k]) { cur[k](); draw(); } }
    else if (b.dataset.go) {
      var g = b.dataset.go;
      if (g === 'home') goHome();
      else if (g === 'settings') { showView(settings); renderSettings(); focusFirst(settings); }
      else if (g === 'calib') { cw = 0; showView(calib); renderCalib(); var c = calib.querySelector('[data-go="calsave"]'); if (c) c.focus(); }
      else if (g === 'calsave') calSave();
      else if (g === 'fs') goFull(true);
      else if (g === 'logout') { if (window.KabinetLogout) window.KabinetLogout(); }
    }
  }
  function goFull(force) {
    var d = document.documentElement;
    if (document.fullscreenElement) { if (force && document.exitFullscreen) document.exitFullscreen(); return; }
    try { if (d.requestFullscreen) d.requestFullscreen().catch(function () {}); } catch (e) {}
  }

  /* ---------- Контроли с мишка / тъч ---------- */
  var hideT = 0;
  function pointerShow() { if (!cur) return; ctrls.classList.add('on'); test.classList.add('cursor'); clearTimeout(hideT); hideT = setTimeout(function () { ctrls.classList.remove('on'); test.classList.remove('cursor'); }, 3000); }

  /* ---------- Старт ---------- */
  window.Kabinet = {
    start: function (name, opts) {
      user = name || '';
      opts = opts || {};
      remote = opts.save ? { save: opts.save } : null;
      applyRemote(opts.data);
      root = $('app'); home = $('k-home'); settings = $('k-settings'); calib = $('k-calib'); test = $('k-test');
      stage = $('k-stage'); info = $('k-info'); ctrls = $('k-ctrls');
      root.hidden = false;
      if (!root.dataset.bound) {
        root.dataset.bound = '1';
        document.addEventListener('keydown', onKey);
        root.addEventListener('click', onClick);
        test.addEventListener('pointermove', pointerShow);
        test.addEventListener('pointerdown', pointerShow);
        window.addEventListener('resize', function () { if (cur) draw(); });
      }
      goHome();
    },
    stop: function () { if (root) root.hidden = true; }
  };
})();

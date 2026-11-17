/* Проверка на раздел „Кабинет“ с истински натискания на бутони (стрелки, OK, Назад, цифри).
   Пуска се преди всяка нова версия:   node tests/kabinet.test.js
   Нужен е Playwright (npm i playwright или вече инсталиран в средата). Не се свързва с интернет:
   входът с Firebase е заменен с макет. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});

// Макет на Firebase: вход с парола "ok", настройките от акаунта пристигат със закъснение.
const FIREBASE_STUB = `
(function(){
  var cb=null, a={languageCode:'',currentUser:null,
    onAuthStateChanged:function(f){cb=f;setTimeout(function(){f(a.currentUser)},0)},
    signInWithEmailAndPassword:function(e,p){if(p!=='ok')return Promise.reject({code:'auth/wrong-password'});
      a.currentUser={uid:'u1',email:e,emailVerified:true,displayName:'Тест'};cb(a.currentUser);return Promise.resolve()},
    signOut:function(){a.currentUser=null;cb(null);return Promise.resolve()}};
  var doc={get:function(){return new Promise(function(r){setTimeout(function(){r({exists:true,data:function(){
      return {settings:{notation:'ft',inverse:false,labels:true,distance:7,mirror:true},calibrations:{'960x540':9}}}})},300)})},
    set:function(p){(window.__saved=window.__saved||[]).push(JSON.parse(JSON.stringify(p)));return Promise.resolve()}};
  var fsf=function(){return {collection:function(){return {doc:function(){return doc}}}}};
  fsf.FieldValue={serverTimestamp:function(){return 'ts'}};
  window.firebase={initializeApp:function(){},auth:function(){return a},firestore:fsf};
})();`;

const out = []; let fails = 0;
const ok = (c, m, extra) => { out.push((c ? 'PASS ' : 'FAIL ') + m + (extra !== undefined ? '  [' + extra + ']' : '')); if (!c) fails++; };

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = 'http://localhost:' + server.address().port + '/kabinet/';
  const b = await chromium.launch();

  // mode: 'none' – библиотеката за вход липсва (няма интернет); 'stub' – макет на Firebase
  async function open(opts, { android = false, ls = null, mode = 'none' } = {}) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.route('**/fonts.googleapis.com/**', r => r.abort());
    await p.route('**/*gstatic*/**', r => mode === 'stub'
      ? r.fulfill({ contentType: 'application/javascript', body: /firebase-app-compat/.test(r.request().url()) ? FIREBASE_STUB : '' })
      : r.abort());
    if (android) await p.addInitScript(() => { window.KabinetAndroid = { version: () => 'test' }; });
    if (ls) await p.addInitScript(v => { if (!localStorage.getItem('kabinet.settings.v1')) localStorage.setItem('kabinet.settings.v1', v); }, JSON.stringify(ls));
    await p.goto(URL); await p.waitForTimeout(300);
    return p;
  }
  const demo = p => p.evaluate(() => { document.getElementById('auth').hidden = true; Kabinet.start('Демо'); });
  const key = async (p, k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(20); } };
  const act = p => p.evaluate(() => { const a = document.activeElement; return a ? (a.dataset.open || a.dataset.go || a.dataset.set || a.dataset.cal || a.name || a.tagName) : null; });
  const info = async p => (await p.evaluate(() => document.getElementById('k-info').innerText)).split('\n')[0];
  const view = p => p.evaluate(() => ['k-home', 'k-settings', 'k-calib', 'k-test'].find(i => !document.getElementById(i).hidden));
  const fits = p => p.evaluate(() => document.documentElement.scrollHeight <= innerHeight);
  const atBase = p => p.evaluate(() => history.state === null);
  const stageBad = p => p.evaluate(() => /NaN|undefined/.test(document.getElementById('k-stage').innerHTML + document.getElementById('k-info').innerText));
  const TV = { viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 }; // Android TV приставка на Full HD

  /* ===== Телевизор: навигация, тестове, настройки, калибриране ===== */
  let p = await open(TV, { android: true });
  ok(await p.isVisible('#a-offline'), 'без библиотеката за вход се показва „Няма връзка“');
  await demo(p);
  ok(await fits(p), 'началният екран се събира на 960×540');
  ok(await act(p) === 'sloan', 'фокусът е на първата плочка');
  await key(p, 'ArrowRight'); ok(await act(p) === 'digits', '▶ мести фокуса');
  await key(p, 'ArrowDown'); ok(await act(p) === 'astig', '▼ към втория ред', await act(p));
  await key(p, 'ArrowDown'); ok(await act(p) === 'worth', '▼ към третия ред', await act(p));
  await key(p, 'ArrowDown'); ok(['settings', 'calib', 'logout'].includes(await act(p)), '▼ към бутоните', await act(p));
  await key(p, 'ArrowUp', 4); await key(p, 'ArrowLeft', 4); ok(await act(p) === 'sloan', '◀ в края на реда не прескача към бутоните', await act(p));
  await key(p, 'ArrowRight', 5); ok(await act(p) === 'c', '▶ в края на реда остава на последната плочка', await act(p));
  await key(p, 'ArrowLeft', 4);

  await key(p, 'Enter'); ok(await view(p) === 'k-test', 'OK отваря тест');
  ok(/V 1,0/.test(await info(p)), 'започва от V 1,0', await info(p));
  await key(p, 'ArrowDown'); ok(/V 1,25/.test(await info(p)), '▼ намалява знаците', await info(p));
  await key(p, 'ArrowUp', 2); ok(/V 0,8/.test(await info(p)), '▲ увеличава знаците', await info(p));
  await key(p, 'ArrowDown', 30); ok(/V 2,0/.test(await info(p)), '▼ спира на 2,0', await info(p));
  await key(p, 'ArrowUp', 30); ok(!(await stageBad(p)), '▲ спира на най-големия знак', await info(p));
  await key(p, 'ArrowRight'); ok(/· ред ·/.test(await info(p)), '▶ ред');
  await key(p, 'ArrowRight'); ok(/единичен знак/.test(await info(p)), '▶ единичен знак');
  await key(p, 'ArrowLeft', 2); ok(/· таблица ·/.test(await info(p)), '◀◀ таблица');

  // Червено-зелен фон под същите знаци
  const svgs = sel => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.innerHTML), sel);
  const halves = () => p.evaluate(() => [...document.querySelectorAll('#k-stage .half')].map(h => ({ bg: h.style.background, svg: [...h.querySelectorAll('svg')].map(e => e.innerHTML) })));
  for (let i = 0; i < 20 && !/V 1,0 /.test(await info(p)); i++) await key(p, 'ArrowDown');
  await key(p, 'ArrowRight'); const line = await svgs('#k-stage svg');
  await key(p, 'ArrowRight', 2); ok(/ред червено-зелен/.test(await info(p)), '▶▶ от „ред“ към „ред червено-зелен“', await info(p));
  let hv = await halves();
  ok(hv.length === 2 && /210, 0, 0/.test(hv[0].bg) && /0, 120, 0/.test(hv[1].bg), 'вляво червено, вдясно зелено');
  ok(hv.length === 2 && hv[0].svg.join() === hv[1].svg.join() && hv[0].svg.length >= 1 && hv[0].svg.join() === line.slice(0, hv[0].svg.length).join(), 'и в двете половини са същите знаци като в реда', hv[0].svg.length + ' от ' + line.length);
  await key(p, 'ArrowDown'); ok(/V 1,25/.test(await info(p)) && (await halves()).length === 2, '▼ смалява и в червено-зелен режим', await info(p));
  await key(p, 'ArrowUp');
  await key(p, '5'); ok(/· ред ·/.test(await info(p)) && (await svgs('#k-stage svg')).join() === line.join(), '5 връща към „ред“ със същите знаци');
  await key(p, 'ArrowRight'); const single = await svgs('#k-stage svg');
  await key(p, '5'); hv = await halves(); ok(/знак червено-зелен/.test(await info(p)) && hv.length === 2 && hv[0].svg.length === 1 && hv[0].svg[0] === single[0] && hv[1].svg[0] === single[0], '5 при единичен знак: същият знак на червено и зелено', await info(p));
  await key(p, 'Enter'); hv = await halves(); ok(hv.length === 2 && hv[0].svg[0] === hv[1].svg[0], 'OK сменя знака и в двете половини');
  await key(p, '5'); ok(/единичен знак/.test(await info(p)), '5 изключва червено-зеления фон');
  await key(p, '5'); await key(p, 'ArrowDown', 20); await key(p, 'ArrowUp', 20); ok(!(await stageBad(p)), 'червено-зелен: всички размери');
  await key(p, '5'); await key(p, 'ArrowLeft', 2); ok(/· таблица ·/.test(await info(p)), 'обратно към таблица');

  for (const d of '123456789') { // всеки тест: всички размери и режими, без счупени стойности
    await key(p, d); await key(p, 'ArrowDown', 20); let bad = await stageBad(p);
    await key(p, 'ArrowUp', 20); bad = bad || await stageBad(p);
    await key(p, 'ArrowRight'); await key(p, 'Enter'); bad = bad || await stageBad(p);
    ok(!bad, 'тест ' + d + ': всички размери', await info(p));
  }
  await key(p, 'Escape'); await p.waitForTimeout(150);
  ok(await view(p) === 'k-home' && await atBase(p), 'един Назад връща в менюто и след прескачане между тестове');
  await key(p, '5'); ok(/Червено-зелен тест/.test(await info(p)), '5 от менюто отваря отделния червено-зелен тест');
  await key(p, 'Escape'); await p.waitForTimeout(150);
  for (const n of ['worth', 'maddox']) {
    await p.click(`[data-open=${n}]`); await key(p, 'ArrowDown', 20); await key(p, 'ArrowUp', 20); await key(p, 'ArrowRight');
    ok(!(await stageBad(p)), n + ': всички размери'); await key(p, 'Escape'); await p.waitForTimeout(150);
  }

  await p.click('[data-go=settings]'); ok(await view(p) === 'k-settings' && await fits(p), 'настройките се събират на екрана');
  await key(p, 'ArrowRight', 5); ok(/4,5 м/.test(await p.innerText('[data-set=dist]')), '▶ променя разстоянието');
  await key(p, 'ArrowDown'); await key(p, 'Enter'); ok(/Включен/.test(await p.innerText('[data-set=mirror]')), 'OK включва огледалото');
  await key(p, 'ArrowDown'); await key(p, 'ArrowRight'); ok(/6\/6/.test(await p.innerText('[data-set=not]')), '▶ сменя означението');
  // С мишка / пръст: ◀ ▶ до стойността
  await p.click('[data-set=dist] [data-dir="-1"]'); ok(/4,4 м/.test(await p.innerText('[data-set=dist]')), 'мишка: ◀ намалява разстоянието', await p.innerText('[data-set=dist] .sval'));
  await p.click('[data-set=dist] [data-dir="1"]'); ok(/4,5 м/.test(await p.innerText('[data-set=dist]')), 'мишка: ▶ увеличава разстоянието');
  await p.click('[data-set=dist] b'); ok(/4,5 м/.test(await p.innerText('[data-set=dist]')), 'мишка: клик по надписа не променя разстоянието');
  const dl = await p.locator('[data-set=dist] [data-dir="-1"]').boundingBox();
  await p.mouse.move(dl.x + dl.width / 2, dl.y + dl.height / 2); await p.mouse.down(); await p.waitForTimeout(1000); await p.mouse.up(); await p.waitForTimeout(100);
  const held = parseFloat((await p.innerText('[data-set=dist] .sval')).replace(',', '.'));
  ok(held <= 4.0 && held >= 1, 'мишка: задържане на ◀ намалява бързо', held);
  await p.click('[data-set=dist] [data-dir="-1"]'); const one = parseFloat((await p.innerText('[data-set=dist] .sval')).replace(',', '.'));
  ok(Math.abs(held - 0.1 - one) < 0.001 || one === 1, 'след задържане кликът пак е една стъпка', held + ' → ' + one);
  await p.click('[data-set=dist]'); await key(p, 'ArrowRight', Math.round((4.5 - one) * 10));
  ok(/4,5 м/.test(await p.innerText('[data-set=dist]')), 'връщане на 4,5 м с ▶');
  await p.click('[data-set=not] [data-dir="-1"]'); ok(/десетична/.test(await p.innerText('[data-set=not]')), 'мишка: ◀ на означението връща назад');
  await p.click('[data-set=not] [data-dir="1"]'); ok(/6\/6/.test(await p.innerText('[data-set=not]')), 'мишка: ▶ на означението');
  await key(p, 'Escape'); await p.waitForTimeout(150);
  ok(await view(p) === 'k-home' && await atBase(p), 'Назад от настройките връща в менюто');
  await key(p, '1'); while (!/· таблица ·/.test(await info(p))) await key(p, 'ArrowRight');
  const mir = await p.evaluate(() => ({ st: document.getElementById('k-stage').style.transform, lab: document.querySelector('.rlab').getAttribute('style') || '' }));
  ok(mir.st === 'scaleX(-1)' && /scaleX\(-1\)/.test(mir.lab), 'огледало: таблицата е обърната, надписите остават четливи');
  await key(p, 'm'); await key(p, 'Escape'); await p.waitForTimeout(150);

  await p.click('[data-go=calib]'); ok(await view(p) === 'k-calib' && await fits(p), 'калибрирането се събира на екрана');
  ok(/≈ 43,0″/.test(await p.innerText('#k-calinfo')), 'на телевизор започва от 43″', await p.innerText('#k-calinfo'));
  await key(p, 'ArrowUp', 12); ok(/≈ 55,0″/.test(await p.innerText('#k-calinfo')), '▲ стига до 55″ (под старата граница от 80 px)');
  const w0 = await p.evaluate(() => parseFloat(document.querySelector('#k-calib .card').style.width));
  ok(Math.abs(w0 - 67.49) < 0.05, 'рамката за 55″ Full HD е 67,5 CSS px', w0);
  await key(p, 'ArrowRight'); const w1 = await p.evaluate(() => parseFloat(document.querySelector('#k-calib .card').style.width));
  ok(Math.abs(w1 - w0 - 0.5) < 0.01, '▶ е един физически пиксел'); await key(p, 'ArrowLeft');
  await key(p, 'Enter'); await p.waitForTimeout(150);
  ok(await view(p) === 'k-home' && await atBase(p) && /Калибриран · екран ≈ 55″/.test(await p.innerText('.kstat')), 'OK запазва и връща в менюто');
  await key(p, '1'); while (!/· ред ·/.test(await info(p))) await key(p, 'ArrowRight'); await key(p, 'ArrowDown', 20); await key(p, 'ArrowUp', 3);
  const lp = await p.evaluate(() => parseFloat(document.querySelector('#k-stage svg').getAttribute('width')));
  const want = 4500 * Math.tan(5 / 60 * Math.PI / 180) / (55 * 25.4 / Math.hypot(1920, 1080) * 2);
  ok(/6\/6 /.test(await info(p)) && Math.abs(lp - want) / want < 0.01, 'размерът на знака за 6/6 е 5 дъгови минути', lp + ' ≈ ' + want.toFixed(2));
  await key(p, 'Escape'); await p.waitForTimeout(150);
  await p.reload(); await p.waitForTimeout(300); await demo(p);
  ok(/екран ≈ 55″/.test(await p.innerText('.kstat')) && /4,5 м/.test(await p.innerText('.kstat')), 'калибрирането и разстоянието се помнят след рестарт');

  await key(p, '6'); await key(p, 'ArrowRight');
  ok(await p.evaluate(() => [...document.querySelectorAll('#k-stage text')].map(t => t.textContent).join(',')) === '90,80,70,60,50,40,30,20,10,180,170,160,150,140,130,120,110,100,90', 'ветрило: числата са оста на минус цилиндъра');
  await key(p, 'Escape'); await p.waitForTimeout(150);
  ok(!(await p.$('[data-go=fs]')), 'в приложението няма бутон „Цял екран“');
  ok(p.errs.length === 0, 'без грешки в скрипта (телевизор)', p.errs.join(' | '));
  await p.context().close();

  /* ===== Стари настройки (до 1.1): калибрирането не се пренася ===== */
  p = await open(TV, { android: true, ls: { mmPerPx: 1.07, distance: 5, mirror: true, notation: 'm', inverse: false, labels: true } });
  await demo(p); const ks = (await p.innerText('.kstat')).replace(/\n/g, ' | ');
  ok(/Не е калибриран/.test(ks) && /5,0 м/.test(ks) && /огледало/.test(ks), 'стара версия: калибриране наново, разстоянието остава', ks);
  await p.context().close();

  /* ===== Вход и синхронизация (макет на Firebase) ===== */
  p = await open({ viewport: { width: 1280, height: 720 } }, { mode: 'stub' });
  ok(await p.isVisible('#f-login') && await act(p) === 'email', 'формата за вход е на фокус');
  await p.fill('#f-login [name=email]', 'a@b.bg'); await p.fill('#f-login [name=password]', 'x'); await p.click('#f-login [type=submit]'); await p.waitForTimeout(100);
  ok(/Грешен имейл или парола/.test(await p.innerText('#a-msg')), 'грешна парола дава съобщение');
  await p.fill('#f-login [name=password]', 'ok'); await p.click('#f-login [type=submit]'); await p.waitForTimeout(80);
  ok(await view(p) === 'k-home' && !(await p.isVisible('#auth')), 'кабинетът тръгва веднага, без да чака акаунта');
  await p.waitForTimeout(450); await key(p, '1');
  ok(/20\/20/.test(await info(p)) && /4,0 м/.test(await info(p)), 'от акаунта идва означението, но не и разстоянието', await info(p));
  await key(p, 'Escape'); await p.waitForTimeout(150); await p.click('[data-go=settings]'); await key(p, 'ArrowDown', 3); await key(p, 'Enter'); await p.waitForTimeout(800);
  const saved = await p.evaluate(() => window.__saved || []);
  ok(saved.length === 1 && Object.keys(saved[0].settings).sort().join() === 'inverse,labels,notation' && saved[0].settings.inverse === true, 'в акаунта се записват само предпочитанията', JSON.stringify(saved));
  await key(p, 'Escape'); await p.waitForTimeout(150);
  await p.click('[data-go=logout]'); ok(await view(p) === 'k-home', 'първото натискане на „Изход от акаунта“ само предупреждава');
  await p.click('[data-go=logout]'); await p.waitForTimeout(100); ok(await p.isVisible('#f-login'), 'второто натискане излиза от акаунта');
  ok(p.errs.length === 0, 'без грешки в скрипта (вход)', p.errs.join(' | '));
  await p.context().close();

  await b.close(); server.close();
  console.log(out.join('\n')); console.log(fails ? '\n' + fails + ' НЕУСПЕШНИ' : '\nВСИЧКИ ПРОВЕРКИ МИНАВАТ (' + out.length + ')');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ГРЕШКА', e); process.exit(1); });

// Генератор файлов для проверки (запуск: node scripts/make-review-files.js):
//  - docs/kazakh-words-interactive.html — все казахские слова приложения с отметками и полем «как правильно»;
//  - docs/tester-checklist-interactive.html — чек-лист тестировщика с отметками и заметками;
//  - docs/review-data.json — те же данные для сборки заполняемых PDF (scripts/make-review-pdfs.js).
// Данные берутся из исходников приложения, поэтому после правки текстов файлы можно пересоздать.
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..') + '/';
const CRLF = String.fromCharCode(13, 10);
const rd = (p) => fs.readFileSync(R + p, 'utf8').split(CRLF).join('\n');
const unesc = (s) => s.replace(/\\'/g, "'");

function strings(src) {
  const map = new Map();
  for (const line of src.split('\n')) {
    const m = /^\s*'([\w.]+)':\s*'((?:[^'\\]|\\.)*)',?\s*$/.exec(line);
    if (m) map.set(m[1], unesc(m[2]));
  }
  return map;
}
function arrays(src) {
  const map = new Map();
  const re = /(?:'([\w.]+)'|(\w+)):\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const items = [...m[3].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => unesc(x[1]));
    if (items.length) map.set(m[1] || m[2], items);
  }
  return map;
}

// ---------- казахские слова ----------
const ruSrc = rd('src/i18n/ru.ts');
const kkSrc = rd('src/i18n/kk.ts');
const ruS = strings(ruSrc), kkS = strings(kkSrc), ruA = arrays(ruSrc), kkA = arrays(kkSrc);

const titles = {
  common: 'Общие кнопки', tab: 'Вкладки', lists: 'Списки', list: 'Экран списка', item: 'Товар', today: 'Сегодня', calendar: 'Календарь', cal: 'Календарь',
  screen: 'Заглушки', date: 'Даты', settings: 'Настройки', theme: 'Цвета и тема', language: 'Язык', proto: 'Прототип', splash: 'Заставка',
  error: 'Ошибки', a11y: 'Для чтения с экрана (озвучка)', unitShort: 'Единицы измерения', validation: 'Проверка ввода', swipe: 'Подсказка смахивания',
  toast: 'Сообщения', copy: 'Копия списка', qty: 'Количество', cat: 'Категории', field: 'Дата и напоминание', reminders: 'Напоминания', reminder: 'Уведомление',
  update: 'Обновление приложения', icon: 'Смена ярлыка', currency: 'Валюта', voice: 'Голосовой ввод', share: 'Поделиться', import: 'Импорт', backup: 'Резервная копия',
  dish: 'Блюда', sample: 'Пример списка', tip: 'Подсказка быстрого ввода', bulk: 'Предпросмотр списка', help: 'Окно «Быстрый ввод»',
};
const order = ['common', 'tab', 'lists', 'list', 'swipe', 'toast', 'item', 'unitShort', 'qty', 'cat', 'copy', 'field', 'validation', 'today', 'cal', 'calendar', 'date', 'screen',
  'dish', 'voice', 'bulk', 'tip', 'help', 'share', 'import', 'backup', 'settings', 'currency', 'theme', 'icon', 'language', 'reminders', 'reminder', 'update', 'sample', 'proto', 'splash', 'error', 'a11y'];

const sections = []; // { title, rows: [{ru, kk}] }
const groups = new Map();
for (const [key, value] of kkS) {
  const p = key.split('.')[0];
  if (!groups.has(p)) groups.set(p, []);
  groups.get(p).push({ ru: ruS.get(key) ?? '', kk: value });
}
const rank = (p) => (order.indexOf(p) === -1 ? 99 : order.indexOf(p));
for (const p of [...groups.keys()].sort((a, b) => rank(a) - rank(b))) sections.push({ title: titles[p] ?? p, rows: groups.get(p) });

for (const [k, title] of [['months', 'Месяцы'], ['weekdays', 'Дни недели'], ['weekdaysShort', 'Дни недели (кратко)'], ['monthsShort', 'Месяцы (кратко)'], ['monthsGenitive', 'Месяцы в дате («16 ноября»)']]) {
  const a = ruA.get(k), b = kkA.get(k);
  if (a && b) sections.push({ title, rows: b.map((v, i) => ({ ru: a[i] ?? '', kk: v })) });
}
sections.push({
  title: 'Слова с числом',
  rows: [['unit.day', 'день'], ['unit.item', 'товар']].filter(([k]) => kkA.get(k)).map(([k, t]) => ({ ru: `${t}: ${(ruA.get(k) ?? []).join(' / ')}`, kk: (kkA.get(k) ?? []).join(' / ') })),
});

const cat = rd('src/logic/catalog.ts');
const catRows = [...cat.matchAll(/\['(\w+)', '([^']+)', '([^']+)', '([^']+)'\]/g)].map((m) => ({ cat: m[1], ru: m[2], kk: m[3] }));
const byCat = new Map();
for (const r of catRows) { if (!byCat.has(r.cat)) byCat.set(r.cat, []); byCat.get(r.cat).push({ ru: r.ru, kk: r.kk }); }
for (const [key, rows] of byCat) sections.push({ title: 'Каталог товаров: ' + (ruS.get('cat.' + key) ?? key), rows });

const dishSrc = rd('src/logic/dishes.ts');
sections.push({
  title: 'Названия блюд',
  rows: [...dishSrc.matchAll(/id: '(\w+)', names: \['([^']+)', '([^']+)', '([^']+)'\]/g)].map((m) => ({ ru: m[2], kk: m[3] })),
});
const themes = JSON.parse(rd('src/theme/themes.json'));
sections.push({ title: 'Цветовые профили', rows: Object.values(themes.schemes).map((s) => ({ ru: s.name.ru, kk: s.name.kk })) });
sections.push({ title: 'Цвета списков', rows: themes.goalColors.map((c) => ({ ru: c.name.ru, kk: c.name.kk })) });

// ---------- чек-лист тестировщика (разбор готового HTML) ----------
const chk = rd('docs/tester-checklist-0.7.4.html');
const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
const checklist = [];
for (const m of chk.matchAll(/<h2>([\s\S]*?)<\/h2>\s*<table>([\s\S]*?)<\/table>/g)) {
  const rows = [...m[2].matchAll(/<tr><td class="n">(\d+)<\/td><td>([\s\S]*?)<\/td><td[^>]*>([\s\S]*?)<\/td><td class="r">([\s\S]*?)<\/td>/g)].map((r) => ({
    n: Number(r[1]), what: decode(r[2]), expect: decode(r[3]), skip: /Нет\s/.test(decode(r[4])) ? decode(r[4]).replace(/.*(Нет[^]*)$/, '$1').trim() : '',
  }));
  checklist.push({ title: decode(m[1]), rows });
}
fs.writeFileSync(R + 'docs/review-data.json', JSON.stringify({ version: '0.7.4', words: sections, checklist }, null, 1));

const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const BASE_CSS = `
:root{--bg:#FFFBF2;--card:#fff;--bd:#E8DDC4;--tx:#2B2112;--mu:#7A6A4F;--pr:#FFC83D;--st:#C2570F;--ok:#1C8F4D;--bad:#CC3535}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.4 system-ui,"Segoe UI",Roboto,Arial,sans-serif}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--bd);padding:10px 14px}
h1{font-size:18px;margin:0 0 4px}.sub{color:var(--mu);font-size:13px}
.bar{height:8px;background:#EFE4C8;border-radius:4px;margin:8px 0 6px;overflow:hidden}.bar i{display:block;height:8px;background:var(--ok);width:0}
.tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
button{font:inherit;min-height:40px;padding:6px 12px;border-radius:10px;border:1px solid #BFAF8A;background:var(--card);color:var(--tx)}
button.on{background:var(--pr);border-color:#C79A00;font-weight:600}button.main{background:var(--pr);border-color:#C79A00;font-weight:700}
main{padding:8px 14px 90px;max-width:900px;margin:0 auto}
h2{font-size:15px;margin:18px 0 6px;padding:5px 9px;background:#FFE9A8;border-radius:6px}
.row{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:9px 11px;margin:6px 0}
.row.ok{border-left:5px solid var(--ok)}.row.fix{border-left:5px solid var(--bad)}.row.skip{border-left:5px solid #999}
.num{color:#aaa;font-size:12px}.ru{color:var(--mu)}.kk{font-weight:700;font-size:17px}
.ctl{display:flex;flex-wrap:wrap;gap:8px 16px;margin:8px 0 4px}label.c{display:inline-flex;align-items:center;gap:6px;min-height:36px}
input[type=radio]{width:20px;height:20px}
input[type=text],textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid #BFAF8A;border-radius:8px;background:#fff}
textarea{min-height:60px}
.me{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;margin:8px 0}
.me input{min-height:40px}
.hidden{display:none}.hint{color:var(--mu);font-size:13px}
.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#2B2112;color:#fff;padding:10px 16px;border-radius:10px;opacity:0;transition:opacity .2s;pointer-events:none}
.toast.show{opacity:1}
`;
const COMMON_JS = `
const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)}
function copyText(text){
  const done=()=>toast('Скопировано — вставьте в сообщение');
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(done,()=>fallback())}else fallback();
  function fallback(){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){toast('Не удалось скопировать — используйте «Скачать»')}ta.remove()}
}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
function loadState(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return {}}}
function saveState(key,s){try{localStorage.setItem(key,JSON.stringify(s))}catch(e){}}
`;

// ---------- интерактивные казахские слова ----------
const wordsHtml = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ShoppingList — казахские слова (проверка)</title><style>${BASE_CSS}</style></head><body>
<header>
<h1>ShoppingList — слова на казахском</h1>
<div class="sub">Для каждой строки выберите «верно» или «исправить» и впишите, как правильно. Всё сохраняется само.</div>
<div class="bar"><i id="bar"></i></div><div class="sub" id="stat"></div>
<div class="me"><input id="who" type="text" placeholder="Ваше имя" aria-label="Ваше имя"></div>
<div class="tools">
<button data-f="all" class="on">Все</button><button data-f="todo">Не проверено</button><button data-f="fix">Исправить</button>
<button id="allok">Остальные — верно</button><button id="copy" class="main">Скопировать результат</button><button id="dl">Скачать .txt</button><button id="reset">Сбросить</button>
</div></header>
<main><div class="hint">Пометки вида {n}, {title} — место, куда приложение подставит число или название: их не меняйте.</div><div id="root"></div></main>
<div class="toast" id="toast"></div>
<script>
${COMMON_JS}
const DATA=${json(sections)};
const KEY='shoppinglist-kk-review-0.7.4';
const state=loadState(KEY);state.rows=state.rows||{};
let filter='all';
const flat=[];let n=0;
const root=$('#root');
DATA.forEach(sec=>{
  const h=document.createElement('h2');h.textContent=sec.title;root.appendChild(h);
  sec.rows.forEach(r=>{
    const id=++n;flat.push({id,sec:sec.title,ru:r.ru,kk:r.kk});
    const d=document.createElement('div');d.className='row';d.dataset.id=id;
    d.innerHTML='<div class="num">'+id+'</div><div class="ru"></div><div class="kk"></div>'+
      '<div class="ctl"><label class="c"><input type="radio" name="s'+id+'" value="ok"> верно</label><label class="c"><input type="radio" name="s'+id+'" value="fix"> исправить</label></div>'+
      '<input type="text" class="t" placeholder="Как правильно по-казахски" aria-label="Как правильно">';
    $('.ru',d).textContent=r.ru;$('.kk',d).textContent=r.kk;
    root.appendChild(d);
  });
});
$('#who').value=state.who||'';
function paint(){
  let ok=0,fix=0;
  $$('.row').forEach(d=>{
    const s=state.rows[d.dataset.id]||{};
    d.classList.toggle('ok',s.s==='ok');d.classList.toggle('fix',s.s==='fix');
    $$('input[type=radio]',d).forEach(i=>i.checked=i.value===s.s);
    const t=$('.t',d);if(document.activeElement!==t)t.value=s.t||'';
    if(s.s==='ok')ok++;if(s.s==='fix')fix++;
    const show=filter==='all'||(filter==='todo'&&!s.s)||(filter==='fix'&&s.s==='fix');
    d.classList.toggle('hidden',!show);
  });
  $$('h2').forEach(h=>{let e=h.nextElementSibling,any=false;while(e&&e.classList.contains('row')){if(!e.classList.contains('hidden'))any=true;e=e.nextElementSibling}h.classList.toggle('hidden',!any)});
  const done=ok+fix;$('#bar').style.width=(done/flat.length*100)+'%';
  $('#stat').textContent='Проверено '+done+' из '+flat.length+' · верно '+ok+' · исправить '+fix;
}
root.addEventListener('change',e=>{const d=e.target.closest('.row');if(!d)return;const s=state.rows[d.dataset.id]=state.rows[d.dataset.id]||{};if(e.target.type==='radio')s.s=e.target.value;saveState(KEY,state);paint()});
root.addEventListener('input',e=>{if(!e.target.classList.contains('t'))return;const d=e.target.closest('.row');const s=state.rows[d.dataset.id]=state.rows[d.dataset.id]||{};s.t=e.target.value;if(s.t&&!s.s)s.s='fix';saveState(KEY,state);paint()});
$('#who').addEventListener('input',e=>{state.who=e.target.value;saveState(KEY,state)});
$$('[data-f]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.f;$$('[data-f]').forEach(x=>x.classList.toggle('on',x===b));paint()}));
$('#allok').addEventListener('click',()=>{flat.forEach(r=>{const s=state.rows[r.id]=state.rows[r.id]||{};if(!s.s)s.s='ok'});saveState(KEY,state);paint()});
$('#reset').addEventListener('click',()=>{if(confirm('Стереть все отметки и ответы?')){state.rows={};saveState(KEY,state);paint()}});
function report(){
  const L=['ShoppingList, казахские слова, версия 0.7.4','Проверил(а): '+(state.who||'—'),''];
  const fixes=flat.filter(r=>(state.rows[r.id]||{}).s==='fix');
  L.push('Исправить ('+fixes.length+'):');
  fixes.forEach(r=>{const s=state.rows[r.id];L.push('№'+r.id+' ['+r.sec+'] '+r.ru+' | было: '+r.kk+' | правильно: '+(s.t||'(не указано)'))});
  const ok=flat.filter(r=>(state.rows[r.id]||{}).s==='ok').length;
  L.push('','Верно: '+ok+', не проверено: '+(flat.length-ok-fixes.length));
  return L.join('\\n');
}
$('#copy').addEventListener('click',()=>copyText(report()));
$('#dl').addEventListener('click',()=>download('shoppinglist-kazakh-review.txt',report()));
paint();
</script></body></html>`;
fs.writeFileSync(R + 'docs/kazakh-words-interactive.html', wordsHtml);

// ---------- интерактивный чек-лист ----------
const checkHtml = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ShoppingList 0.7.4 — чек-лист тестировщика</title><style>${BASE_CSS}</style></head><body>
<header>
<h1>ShoppingList 0.7.4 — чек-лист тестировщика</h1>
<div class="sub">Проходите пункты по порядку, отмечайте результат и пишите заметку. Всё сохраняется само.</div>
<div class="bar"><i id="bar"></i></div><div class="sub" id="stat"></div>
<div class="tools">
<button data-f="all" class="on">Все</button><button data-f="todo">Не пройдено</button><button data-f="fail">Не ок</button>
<button id="copy" class="main">Скопировать отчёт</button><button id="dl">Скачать .txt</button><button id="reset">Сбросить</button>
</div></header>
<main>
<div class="me"><input id="who" type="text" placeholder="Имя" aria-label="Имя"><input id="phone" type="text" placeholder="Телефон" aria-label="Телефон"><input id="android" type="text" placeholder="Версия Android" aria-label="Версия Android"><input id="lang" type="text" placeholder="Язык приложения" aria-label="Язык приложения"></div>
<div class="hint">Часть пунктов (пример списка при первом запуске, импорт на другом телефоне) возможна только при определённых условиях: если не получается проверить, выберите «Нет возможности». Голосовой ввод требует интернета.</div>
<div id="root"></div>
<h2>Общие заметки и пожелания</h2>
<textarea id="gen" placeholder="Что понравилось, что неудобно, чего не хватает"></textarea>
</main>
<div class="toast" id="toast"></div>
<script>
${COMMON_JS}
const DATA=${json(checklist)};
const KEY='shoppinglist-checklist-0.7.4';
const state=loadState(KEY);state.rows=state.rows||{};
let filter='all';
const flat=[];const root=$('#root');
DATA.forEach(sec=>{
  const h=document.createElement('h2');h.textContent=sec.title;root.appendChild(h);
  sec.rows.forEach(r=>{
    flat.push({id:r.n,sec:sec.title,what:r.what});
    const d=document.createElement('div');d.className='row';d.dataset.id=r.n;
    d.innerHTML='<div class="num">№'+r.n+'</div><div class="kk" style="font-size:15px"></div><div class="ru"></div>'+
      '<div class="ctl"><label class="c"><input type="radio" name="s'+r.n+'" value="ok"> Ок</label><label class="c"><input type="radio" name="s'+r.n+'" value="fail"> Не ок</label><label class="c"><input type="radio" name="s'+r.n+'" value="skip"> Нет возможности</label></div>'+
      '<input type="text" class="t" placeholder="Заметка: что именно не так" aria-label="Заметка">';
    $('.kk',d).textContent=r.what;$('.ru',d).textContent='Как должно быть: '+r.expect;
    root.appendChild(d);
  });
});
['who','phone','android','lang','gen'].forEach(k=>{const e=$('#'+k);e.value=state[k]||'';e.addEventListener('input',()=>{state[k]=e.value;saveState(KEY,state)})});
function paint(){
  let ok=0,fail=0,skip=0;
  $$('.row').forEach(d=>{
    const s=state.rows[d.dataset.id]||{};
    d.classList.toggle('ok',s.s==='ok');d.classList.toggle('fix',s.s==='fail');d.classList.toggle('skip',s.s==='skip');
    $$('input[type=radio]',d).forEach(i=>i.checked=i.value===s.s);
    const t=$('.t',d);if(document.activeElement!==t)t.value=s.t||'';
    if(s.s==='ok')ok++;if(s.s==='fail')fail++;if(s.s==='skip')skip++;
    const show=filter==='all'||(filter==='todo'&&!s.s)||(filter==='fail'&&s.s==='fail');
    d.classList.toggle('hidden',!show);
  });
  $$('h2').forEach(h=>{if(!h.nextElementSibling||!h.nextElementSibling.classList.contains('row'))return;let e=h.nextElementSibling,any=false;while(e&&e.classList.contains('row')){if(!e.classList.contains('hidden'))any=true;e=e.nextElementSibling}h.classList.toggle('hidden',!any)});
  const done=ok+fail+skip;$('#bar').style.width=(done/flat.length*100)+'%';
  $('#stat').textContent='Пройдено '+done+' из '+flat.length+' · ок '+ok+' · не ок '+fail+' · нет возможности '+skip;
}
root.addEventListener('change',e=>{const d=e.target.closest('.row');if(!d)return;const s=state.rows[d.dataset.id]=state.rows[d.dataset.id]||{};if(e.target.type==='radio')s.s=e.target.value;saveState(KEY,state);paint()});
root.addEventListener('input',e=>{if(!e.target.classList.contains('t'))return;const d=e.target.closest('.row');const s=state.rows[d.dataset.id]=state.rows[d.dataset.id]||{};s.t=e.target.value;if(s.t&&!s.s)s.s='fail';saveState(KEY,state);paint()});
$$('[data-f]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.f;$$('[data-f]').forEach(x=>x.classList.toggle('on',x===b));paint()}));
$('#reset').addEventListener('click',()=>{if(confirm('Стереть все отметки и заметки?')){state.rows={};state.gen='';$('#gen').value='';saveState(KEY,state);paint()}});
function report(){
  const L=['ShoppingList 0.7.4, отчёт тестировщика','Имя: '+(state.who||'—')+' | Телефон: '+(state.phone||'—')+' | Android: '+(state.android||'—')+' | Язык: '+(state.lang||'—'),''];
  const fails=flat.filter(r=>(state.rows[r.id]||{}).s==='fail');
  L.push('Не ок ('+fails.length+'):');
  fails.forEach(r=>{const s=state.rows[r.id];L.push('№'+r.id+' ['+r.sec+'] '+r.what+' — '+(s.t||'(без заметки)'))});
  const skips=flat.filter(r=>(state.rows[r.id]||{}).s==='skip');
  if(skips.length){L.push('','Нет возможности проверить ('+skips.length+'): '+skips.map(r=>'№'+r.id).join(', '))}
  const withNotes=flat.filter(r=>{const s=state.rows[r.id]||{};return s.s==='ok'&&s.t});
  if(withNotes.length){L.push('','Заметки к пройденным пунктам:');withNotes.forEach(r=>L.push('№'+r.id+': '+state.rows[r.id].t))}
  const ok=flat.filter(r=>(state.rows[r.id]||{}).s==='ok').length;
  L.push('','Итого: ок '+ok+', не ок '+fails.length+', нет возможности '+skips.length+', не пройдено '+(flat.length-ok-fails.length-skips.length));
  if(state.gen)L.push('','Общие заметки: '+state.gen);
  return L.join('\\n');
}
$('#copy').addEventListener('click',()=>copyText(report()));
$('#dl').addEventListener('click',()=>download('shoppinglist-test-report.txt',report()));
paint();
</script></body></html>`;
fs.writeFileSync(R + 'docs/tester-checklist-interactive.html', checkHtml);

const wordsCount = sections.reduce((n, s) => n + s.rows.length, 0);
const checkCount = checklist.reduce((n, s) => n + s.rows.length, 0);
console.log('words', wordsCount, 'checklist', checkCount, 'sections', checklist.length);

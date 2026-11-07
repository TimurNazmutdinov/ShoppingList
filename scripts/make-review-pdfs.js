// Запуск: нужны pdf-lib и @pdf-lib/fontkit, установленные ВНЕ проекта (например, npm install --prefix <папка> pdf-lib @pdf-lib/fontkit),
// затем: node scripts/make-review-pdfs.js с NODE_PATH=<папка>\node_modules. Сначала выполнить node scripts/make-review-files.js.
// Заполняемые PDF (AcroForm): казахские слова и чек-лист тестировщика. Данные — docs/review-data.json.
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const DATA = JSON.parse(fs.readFileSync('C:/Projects/ShoppingList/docs/review-data.json', 'utf8'));
const W = 595, H = 842, M = 36, TOP = H - 40, BOTTOM = 40;
const GREY = rgb(0.4, 0.4, 0.4), LINE = rgb(0.85, 0.85, 0.85), YELLOW = rgb(1, 0.91, 0.66), BLACK = rgb(0.13, 0.13, 0.13);

function wrap(text, font, size, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      let w = word;
      // слишком длинное слово режем по символам
      while (font.widthOfTextAtSize(w, size) > maxW) {
        let cut = w.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxW) cut--;
        if (line) { out.push(line); line = ''; }
        out.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      const probe = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(probe, size) <= maxW) line = probe;
      else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

async function build(kind) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // полный шрифт (без подмножества): в полях можно будет печатать любые буквы
  const font = await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/segoeui.ttf'), { subset: false });
  const bold = await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/segoeuib.ttf'), { subset: true });
  const form = doc.getForm();
  const isWords = kind === 'words';
  let page = null, y = 0;

  const newPage = () => { page = doc.addPage([W, H]); y = TOP; };
  const text = (s, x, yy, size = 9, f = font, color = BLACK) => page.drawText(s, { x, y: yy, size, font: f, color });
  const field = (name, x, yy, w, h, opts = {}) => {
    const tf = form.createTextField(name);
    if (opts.multiline !== false) tf.enableMultiline();
    tf.addToPage(page, { x, y: yy, width: w, height: h, font, borderWidth: 0.6, borderColor: rgb(0.6, 0.6, 0.6), backgroundColor: rgb(1, 1, 1), textColor: BLACK });
    tf.setFontSize(opts.size ?? 9);
    return tf;
  };

  newPage();
  text(isWords ? 'ShoppingList — все слова на казахском' : 'ShoppingList 0.7.2 — чек-лист тестировщика', M, y - 14, 17, bold);
  y -= 22;
  const intro = isWords
    ? 'Версия 0.7.2. Для каждой строки отметьте «верно» или «исправить» и впишите, как правильно по-казахски. Пометки в фигурных скобках ({n}, {title}) — место для числа или названия: их не меняйте. Заполняйте в Adobe Acrobat или просмотре Google Диска; на телефоне удобнее интерактивная страница.'
    : 'Проходите пункты по порядку: отметьте результат и впишите заметку. Если проверить невозможно, выберите «Нет возм.». Заполняйте в Adobe Acrobat или просмотре Google Диска; на телефоне удобнее интерактивная страница.';
  for (const l of wrap(intro, font, 9, W - 2 * M)) { text(l, M, y - 10, 9, font, GREY); y -= 12; }
  y -= 6;
  if (isWords) {
    text('Ваше имя:', M, y - 11, 9, bold);
    field('who', M + 55, y - 16, 200, 18, { multiline: false });
    y -= 30;
  } else {
    const labels = ['Имя', 'Телефон', 'Android', 'Язык'];
    const cw = (W - 2 * M - 18) / 4;
    labels.forEach((lb, i) => {
      text(lb, M + i * (cw + 6), y - 9, 8, bold);
      field(['who', 'phone', 'android', 'lang'][i], M + i * (cw + 6), y - 30, cw, 18, { multiline: false });
    });
    y -= 40;
  }

  const sections = isWords ? DATA.words : DATA.checklist;
  const cols = isWords
    ? { n: [M, 22], a: [M + 24, 148], b: [M + 174, 128], ctl: [M + 306, 70], note: [M + 380, W - M - (M + 380)] }
    : { n: [M, 22], a: [M + 24, 160], b: [M + 186, 160], ctl: [M + 350, 62], note: [M + 416, W - M - (M + 416)] };
  const header = () => {
    const h = isWords ? ['№', 'По-русски', 'По-казахски', 'Проверка', 'Как правильно'] : ['№', 'Что сделать', 'Как должно быть', 'Результат', 'Заметка'];
    [cols.n, cols.a, cols.b, cols.ctl, cols.note].forEach(([x], i) => text(h[i], x, y - 9, 8, bold, GREY));
    page.drawLine({ start: { x: M, y: y - 13 }, end: { x: W - M, y: y - 13 }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
    y -= 16;
  };

  let counter = 0;
  for (const sec of sections) {
    if (y < BOTTOM + 90) newPage();
    page.drawRectangle({ x: M, y: y - 17, width: W - 2 * M, height: 17, color: YELLOW });
    text(sec.title, M + 6, y - 12.5, 10.5, bold);
    y -= 21;
    header();
    for (const r of sec.rows) {
      const id = isWords ? ++counter : r.n;
      const aText = isWords ? r.ru : r.what;
      const bText = isWords ? r.kk : r.expect;
      const aLines = wrap(aText, font, 8.5, cols.a[1] - 4);
      const bLines = wrap(bText, isWords ? bold : font, isWords ? 9.5 : 8.5, cols.b[1] - 4);
      const need = isWords ? 32 : 46;
      const h = Math.max(Math.max(aLines.length, bLines.length) * 11.5 + 8, need);
      if (y - h < BOTTOM + 14) { newPage(); text(sec.title + ' (продолжение)', M, y - 9, 9, bold, GREY); y -= 14; header(); }
      const top = y;
      text(String(id), cols.n[0], top - 11, 8, font, rgb(0.6, 0.6, 0.6));
      aLines.forEach((l, i) => text(l, cols.a[0], top - 11 - i * 11.5, 8.5, font, isWords ? GREY : BLACK));
      bLines.forEach((l, i) => text(l, cols.b[0], top - 11 - i * 11.5, isWords ? 9.5 : 8.5, isWords ? bold : font));
      const group = form.createRadioGroup((isWords ? 'w' : 'c') + id);
      const opts = isWords ? [['ok', 'верно'], ['fix', 'исправить']] : [['ok', 'Ок'], ['fail', 'Не ок'], ['skip', 'Нет возм.']];
      opts.forEach(([val, label], i) => {
        const oy = top - 13 - i * 14;
        group.addOptionToPage(val, page, { x: cols.ctl[0], y: oy, width: 10, height: 10, borderWidth: 0.8, borderColor: rgb(0.3, 0.3, 0.3), backgroundColor: rgb(1, 1, 1) });
        text(label, cols.ctl[0] + 13, oy + 1.5, 8);
      });
      field('t' + id, cols.note[0], top - h + 3, cols.note[1], h - 6);
      page.drawLine({ start: { x: M, y: top - h }, end: { x: W - M, y: top - h }, thickness: 0.4, color: LINE });
      y -= h;
    }
    y -= 4;
  }
  if (!isWords) {
    if (y < BOTTOM + 130) newPage();
    text('Общие заметки и пожелания', M, y - 12, 11, bold);
    field('gen', M, y - 112, W - 2 * M, 96, { size: 10 });
    y -= 116;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Страница ${i + 1} из ${pages.length}`, { x: W / 2 - 36, y: 22, size: 8, font, color: GREY }));
  form.updateFieldAppearances(font);
  const bytes = await doc.save();
  const out = `C:/Projects/ShoppingList/docs/${isWords ? 'kazakh-words-0.7.2-form.pdf' : 'tester-checklist-0.7.2-form.pdf'}`;
  fs.writeFileSync(out, bytes);
  const check = await PDFDocument.load(bytes);
  console.log(kind, 'pages', check.getPageCount(), 'fields', check.getForm().getFields().length, 'KB', Math.round(bytes.length / 1024));
}

(async () => {
  await build('words');
  await build('checklist');
})().catch((e) => { console.error(e); process.exit(1); });

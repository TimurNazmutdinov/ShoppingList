// Сборка PWA для GitHub Pages: node scripts/build-web.js [базовый-путь] (по умолчанию /smart-shopping-list/app).
// Результат — папка dist-web. Магазинный режим (без «Прототипа» и самообновления).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist-web');
const base = (process.argv[2] || '/smart-shopping-list/app').replace(/\/$/, '');

fs.rmSync(out, { recursive: true, force: true });
execSync(`${process.platform === 'win32' ? 'npx.cmd' : 'npx'} expo export -p web --output-dir "${out}"`, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_STORE_BUILD: '1', EXPO_PUBLIC_WEB_BASE_URL: base },
});

// Файлы PWA рядом с index.html.
for (const f of ['manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  fs.copyFileSync(path.join(root, 'pwa', f), path.join(out, f));
}

// Теги в <head>: манифест, значок и режим «на весь экран» для iPhone, тихий запрос постоянного хранилища, сервис-воркер.
const head = `
<link rel="manifest" href="./manifest.webmanifest">
<link rel="apple-touch-icon" href="./apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Shopping List">
<meta name="theme-color" content="#FFFBF0">
<script>
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
</script>`;
const indexPath = path.join(out, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace('</head>', `${head}\n</head>`);
fs.writeFileSync(indexPath, html);

// Список файлов для кэша (всё, кроме самого сервис-воркера) и версия кэша по содержимому.
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const files = walk(out).map((p) => path.relative(out, p).split(path.sep).join('/'));
const hash = crypto.createHash('sha1');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(out, f)));
const list = ['./', ...files.filter((f) => f !== 'metadata.json').map((f) => './' + f)];
const sw = fs
  .readFileSync(path.join(root, 'pwa', 'sw.js'), 'utf8')
  .replace('__CACHE__', 'shoppinglist-' + hash.digest('hex').slice(0, 10))
  .replace('__FILES__', JSON.stringify(list));
fs.writeFileSync(path.join(out, 'sw.js'), sw);

console.log(`PWA собрана: ${out} (база ${base}, файлов в кэше ${list.length})`);

// 오프라인 지원: 앱 파일을 캐시해 두고, 온라인이면 새 버전을 받아 갱신
// 앱 파일을 바꾸면 VERSION을 올려 주세요.
const VERSION = 'v9';
const CACHE = `wine-log-${VERSION}`;
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/db.js', './js/util.js', './js/model.js', './js/form.js', './js/stats.js', './js/backup.js',
  './js/i18n.js', './js/money.js', './js/budget.js', './js/progress.js', './js/study.js', './js/quiz.js', './data/label-terms.js', './data/typical.js', './data/i18n.js',
  './data/wset-l2-sat.js', './icons/icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 네트워크 우선, 실패하면 캐시 (오프라인)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});

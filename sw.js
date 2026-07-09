/* 어디가지? service worker — 최신 반영을 위해 문서는 네트워크 우선 */
const CACHE = 'eodigaji-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase / 지도 타일 / 지오코딩 / 날씨 등 외부는 그대로 네트워크로
  if (url.origin !== location.origin) return;

  const accept = req.headers.get('accept') || '';
  const isDoc = req.mode === 'navigate' || accept.includes('text/html');

  if (isDoc) {
    // HTML(문서)은 항상 네트워크 우선 → 업데이트가 바로 반영됨. 오프라인이면 캐시.
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // 그 외 정적 파일: 캐시에 있으면 쓰되, 없으면 네트워크에서 받아 캐시
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
        return res;
      })
    )
  );
});

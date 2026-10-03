/* Service Worker — کارجوی هرات
 * استراتژی:
 *  - پوستهٔ برنامه: cache-first با به‌روزرسانی پس‌زمینه
 *  - API: network-first با fallback به کش (برنامه آفلاین هم کار می‌کند)
 *  - لینک‌های تلگرام: هرگز کش نمی‌شوند تا همیشه تازه باشند
 */
const VERSION = 'karjo-v1.0.2';
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;

const SHELL_ASSETS = [
  '/', '/index.html', '/manifest.webmanifest',
  '/js/api.js', '/js/telegram-live.js', '/js/app-bridge.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // لینک‌های تلگرام همیشه از شبکه (بدون کش)
  if (url.pathname.startsWith('/api/telegram') || url.pathname.startsWith('/api/exchange-rates')) {
    e.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ success: false, error: { message: 'آفلاین' } }),
      { headers: { 'Content-Type': 'application/json' }, status: 503 },
    )));
    return;
  }

  // سایر APIها: شبکه اول، سپس کش
  if (url.pathname.startsWith('/api/')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(request);
        const c = await caches.open(DATA);
        if (res && res.ok) c.put(request, res.clone());
        return res;
      } catch {
        const cached = await caches.match(request);
        return cached || new Response(
          JSON.stringify({ success: false, error: { message: 'آفلاین هستید' } }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 },
        );
      }
    })());
    return;
  }

  // فایل‌های ثابت: کش اول + به‌روزرسانی پس‌زمینه
  e.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async (res) => {
      if (res && res.status === 200) {
        const c = await caches.open(SHELL);
        c.put(request, res.clone());
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || caches.match('/index.html');
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

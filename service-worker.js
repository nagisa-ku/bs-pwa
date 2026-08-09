const CACHE_NAME = 'book-search-v1';
const urlsToCache = [
  '/bs-pwa/', // ルートパスを追加
  '/bs-pwa/index.html', // BookSearch.htmlからindex.htmlに変更
  '/bs-pwa/manifest.json',
  '/bs-pwa/BaseData.csv',
  '/bs-pwa/icon-192x192.png',
  '/bs-pwa/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'UPDATE_DATA') {
    return;
  }

  const replyPort = event.ports[0];
  const dataUrl = new URL('BaseData.csv', self.registration.scope).toString();

  fetch(dataUrl, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) {
        throw new Error('CSV update failed');
      }

      return response.text().then(text => ({
        response,
        text
      }));
    })
    .then(({ response, text }) => {
      return caches.open(CACHE_NAME).then(cache => {
        cache.put(dataUrl, new Response(text, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8'
          }
        }));

        replyPort.postMessage({
          ok: true,
          text
        });
      });
    })
    .catch(error => {
      console.error('CSV update failed:', error);
      replyPort.postMessage({
        ok: false
      });
    });
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
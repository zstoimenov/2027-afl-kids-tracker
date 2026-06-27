const SHELL_CACHE = 'afl-shell-v14';
const DATA_CACHE  = 'afl-data-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './styles/fixtures.css',
  './styles/tracker.css',
  './styles/story.css',
  './scripts/app.js',
  './scripts/fixtures.js',
  './scripts/tracker.js',
  './scripts/story.js',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isData = url.pathname.includes('/data/');

  if (isData) {
    // Network-first for JSON data: always try to get fresh, fall back to cache
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(DATA_CACHE).then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first for app shell
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok && url.origin === self.location.origin) {
            caches.open(SHELL_CACHE).then(c => c.put(request, response.clone()));
          }
          return response;
        });
      })
    );
  }
});

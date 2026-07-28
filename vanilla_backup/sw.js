// ARQUIVO: sw.js
const CACHE_NAME = 'fudidoflix-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Permite que o app funcione normalmente online
    event.respondWith(fetch(event.request));
});
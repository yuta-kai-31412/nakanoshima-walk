const CACHE_NAME = 'nakanoshima-shiori-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './data.js',
    './manifest.json',
    './images/spot1.png',
    './images/spot2.png',
    './images/spot3.png',
    './images/spot4.png',
    './images/spot5.png',
    './images/spot6.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

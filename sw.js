const CACHE_VERSION = '20260109-v1';
const CACHE_NAME = `nakanoshima-shiori-${CACHE_VERSION}`;

const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './data.js',
    './style_data.js',
    './manifest.json',
    './images/spot1.png',
    './images/spot2.png',
    './images/spot3.png',
    './images/spot4.png',
    './images/spot5.png',
    './images/spot6.png'
];

// Install Event - Pre-cache assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all assets');
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Network First strategy for the main logic to ensure updates
self.addEventListener('fetch', (event) => {
    // For HTML, JS and CSS, try network first, then cache
    const isLogicFile = event.request.url.match(/\.(html|js|css)$/) || event.request.url.endsWith('/');

    if (isLogicFile) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Update cache on successful network fetch
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // For images and other assets, use Cache First strategy
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});


const CACHE_NAME = "healthy-nutrition-v3";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./src/core/app.js",
    "./src/styles/main.css",
    "./src/shared/storage/progress-storage.js",
    "./src/lessons/healthy-food/content/content.js",
    "./src/lessons/healthy-food/quiz/quiz-engine.js",
    "./src/lessons/school-breakfast/content/content.js",
    "./src/lessons/healthy-snacks/content/content.js",
    "./src/lessons/drinking-water/content/content.js",
    "./src/lessons/handwashing/content/content.js",
    "./src/lessons/sleep-and-learning/content/content.js",
    "./assets/icons/app-icon.svg",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== "GET" || url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put("./index.html", copy);
                        });
                    }
                    return response;
                })
                .catch(async () => {
                    return (await caches.match(request))
                        || (await caches.match("./index.html"));
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((response) => {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, copy);
                    });
                }
                return response;
            });
        })
    );
});

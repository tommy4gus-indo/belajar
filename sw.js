const CACHE = "app-pertama-v4";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Saat pertama dipasang: simpan semua file ke cache, dan langsung aktif
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});

// Saat aktif: hapus cache versi lama
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Saat dibuka: ambil yang terbaru dari internet dulu.
// Kalau tidak ada sinyal, pakai salinan yang tersimpan (jadi tetap bisa offline).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  const punyaSendiri = url.origin === self.location.origin;
  const pustakaFirebase = url.hostname === "www.gstatic.com";

  // Jangan ikut campur permintaan data Firebase (chat realtime, login, dll)
  if (!punyaSendiri && !pustakaFirebase) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const salinan = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, salinan));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

/* Toolkit Pajak — service worker
   Semua berkas disimpan saat pemasangan, sehingga aplikasi bisa dibuka tanpa internet.
   VERSI dan DAFTAR diisi otomatis oleh skrip build. */
var VERSI = "32d6817c8d";
var DAFTAR = [
 "./",
 "alat/pasal-31e.html",
 "alat/ptkp.html",
 "assets/css/app.css",
 "assets/data/cari.json",
 "assets/fonts/literata-latin-wght-italic.woff2",
 "assets/fonts/literata-latin-wght-normal.woff2",
 "assets/js/app.js",
 "assets/js/cari.js",
 "cari.html",
 "icons/apple-touch-icon.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/maskable-512.png",
 "index.html",
 "manifest.webmanifest",
 "persandingan/index.html",
 "persandingan/pph-pasal-11.html",
 "persandingan/pph-pasal-11a.html",
 "persandingan/pph-pasal-17.html",
 "persandingan/pph-pasal-18.html",
 "persandingan/pph-pasal-2.html",
 "persandingan/pph-pasal-26.html",
 "persandingan/pph-pasal-32a.html",
 "persandingan/pph-pasal-32c.html",
 "persandingan/pph-pasal-4.html",
 "persandingan/pph-pasal-6.html",
 "persandingan/pph-pasal-7.html",
 "persandingan/pph-pasal-9.html",
 "persandingan/ppn-pasal-13.html",
 "persandingan/ppn-pasal-16b.html",
 "persandingan/ppn-pasal-16g.html",
 "persandingan/ppn-pasal-1a.html",
 "persandingan/ppn-pasal-4a.html",
 "persandingan/ppn-pasal-7.html",
 "persandingan/ppn-pasal-8a.html",
 "persandingan/ppn-pasal-9.html",
 "persandingan/ppn-pasal-9a.html",
 "privasi.html",
 "resume/batas-waktu.html",
 "resume/ptkp.html",
 "tentang.html",
 "uu/bm.html",
 "uu/kup.html",
 "uu/pbb.html",
 "uu/pph.html",
 "uu/ppn.html",
 "uu/ppsp.html"
];
var NAMA = "tkp-" + VERSI;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(NAMA).then(function (c) { return c.addAll(DAFTAR); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("tkp-") === 0 && k !== NAMA; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "lewati") self.skipWaiting();
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // Tampilkan salinan tersimpan dulu (cepat & offline), lalu perbarui diam-diam
  // dari server agar suntingan terbaru terbawa pada pembukaan berikutnya.
  var u = new URL(req.url);
  var kunci = new Request(u.origin + u.pathname);
  var segar = caches.open(NAMA).then(function (c) {
    return fetch(kunci).then(function (res) {
      if (res && res.ok && res.type === "basic") c.put(kunci, res.clone());
      return res;
    });
  });
  e.respondWith(
    caches.open(NAMA).then(function (c) {
      return c.match(kunci).then(function (hit) {
        if (hit) { e.waitUntil(segar.catch(function () {})); return hit; }
        return segar.catch(function () {
          if (req.mode === "navigate") return c.match("index.html");
          return Response.error();
        });
      });
    })
  );
});

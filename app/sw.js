// Service worker: deixa o app instalável e abre a "casca" offline.
// Dados sempre vêm da rede (Supabase); arquivos do app usam rede-primeiro com cache de reserva.
const CACHE = "dmlog-v1";
const CASCA = [
  "./", "index.html", "css/app.css", "manifest.webmanifest", "icons/icon-192.png",
  "js/app.js", "js/ui.js", "js/config.js", "js/seed.js", "js/api/index.js", "js/api/local.js", "js/api/supabase.js",
  "js/views/login.js", "js/views/dados.js", "js/views/painel.js", "js/views/estoque.js", "js/views/movimentacoes.js",
  "js/views/produtos.js", "js/views/centros.js", "js/views/usuarios.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});

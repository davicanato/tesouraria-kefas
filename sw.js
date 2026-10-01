// Service worker da Tesouraria Kefas
// Guarda uma cópia das telas para abrir mais rápido.
// Os dados financeiros NUNCA são guardados: vêm sempre do banco.
const CACHE = 'kefas-v1';
const ARQUIVOS = [
    '/', '/index.html', '/dashboard.html', '/entradas.html', '/saidas.html',
    '/css/estilo.css', '/js/app.js', '/js/lancamento.js',
    '/manifest.json', '/icon-192.png', '/icon-512.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE).then((c) =>
            Promise.allSettled(ARQUIVOS.map((a) => c.add(a)))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

// Sempre tenta a internet primeiro (assim as atualizações chegam na hora);
// se estiver sem internet, usa a cópia guardada. Só arquivos do próprio site.
self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    e.respondWith(
        fetch(req)
            .then((res) => {
                const copia = res.clone();
                caches.open(CACHE).then((c) => c.put(req, copia));
                return res;
            })
            .catch(() => caches.match(req))
    );
});

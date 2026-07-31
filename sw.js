/* Catena 2001 - service worker.
   Serve a una cosa sola: dopo la prima apertura l'app deve funzionare a bordo campo
   anche senza campo. Tiene in cache il guscio dell'app e lo serve dalla cache.

   Alla pubblicazione di una versione nuova basta cambiare VERSIONE: il vecchio
   deposito viene buttato e i file riscaricati. */

const VERSIONE = 'catena-v3';
const GUSCIO = [
  './',
  './index.html',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSIONE)
      // addAll fallisce in blocco se un file manca: le icone non sono vitali,
      // quindi le aggiungo una per una e tiro avanti anche se una non c'e'
      .then((c) => Promise.all(GUSCIO.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Prima la rete, cosi una versione nuova arriva subito quando c'e' campo;
  // se la rete non risponde si ripiega sulla copia in cache.
  e.respondWith(
    fetch(req)
      .then((risp) => {
        // ATTENZIONE: fetch considera riuscito anche un 404. Senza questo controllo
        // una risposta d'errore presa mentre il sito si stava ricostruendo finirebbe
        // in cache e verrebbe servita per sempre al posto del file buono.
        if (!risp || !risp.ok || risp.type === 'opaque') {
          return caches.match(req).then((c) => c || risp);
        }
        const copia = risp.clone();
        caches.open(VERSIONE).then((c) => c.put(req, copia)).catch(() => {});
        return risp;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
  );
});

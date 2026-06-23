/* Service worker per "Le mie lezioni" — funzionamento offline */
const CACHE = "lezioni-cache-v1";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);

  // Non intercettare le chiamate a Google (login / Drive): vanno sempre in rete.
  if(/googleapis\.com|accounts\.google\.com|gstatic\.com/.test(url.hostname)) return;

  // Cache-first con aggiornamento in background per il resto (app + font).
  e.respondWith(
    caches.match(req).then(cached=>{
      const network = fetch(req).then(res=>{
        if(res && res.status===200 && (url.origin===location.origin || res.type==="cors")){
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        }
        return res;
      }).catch(()=>cached || caches.match("./index.html"));
      return cached || network;
    })
  );
});

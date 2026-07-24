const CACHE='sewp-v2-0-3-calendly';
const STATIC=[
  '/styles.v2.css',
  '/site.v2.js',
  '/calculator.v2.js',
  '/paul-scrase-480.webp',
  '/paul-scrase-800.webp',
  '/social-share.webp',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(request,copy));
          }
          return response;
        })
        .catch(async()=>await caches.match(request) || await caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached || network;
    })
  );
});
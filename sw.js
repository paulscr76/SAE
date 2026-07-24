
const CACHE='save-earn-v4-0';
const STATIC=[
'/styles.v4.css','/site.v4.js','/analytics.v4.js','/home.v4.js','/household-os.v4.js','/copilot.v4.js','/consent-centre.v4.js',
'/command-centre.v4.js','/bill-helper.v4.js','/document-register.v4.js','/calculator.v4.js','/guides.v4.js','/privacy.v4.js',
'/paul-scrase-480.webp','/paul-scrase-800.webp','/social-share.webp','/favicon.svg','/manifest.webmanifest','/icon-192.png','/icon-512.png'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(async()=>await caches.match(request)||await caches.match('/')));return;}
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;})));
});

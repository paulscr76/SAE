
const CACHE='save-earn-v5-0-2';
const STATIC=[
'/styles.v5.css','/report.v5.css','/site.v5.js','/analytics.v5.js','/home.v5.js','/household-os.v5.js',
'/copilot.v5.js','/consent-centre.v5.js','/command-centre.v5.js','/bill-helper.v5.js','/document-register.v5.js',
'/calculator.v5.js','/guides.v5.js','/privacy.v5.js','/report-studio.v5.js',
'/paul-scrase-480.webp','/paul-scrase-800.webp','/social-share.webp','/calendly-qr.png','/whatsapp-qr.png',
'/favicon.svg','/manifest.webmanifest','/icon-192.png','/icon-512.png'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(async()=>await caches.match(request)||await caches.match('/')));return;}
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;})));
});

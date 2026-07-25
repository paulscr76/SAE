const CACHE='save-earn-v6-0';
const STATIC=[
'/styles.v6.css','/report.v6.css','/site.v6.js','/analytics.v6.js','/home.v6.js','/household-os.v6.js',
'/copilot.v6.js','/consent-centre.v6.js','/command-centre.v6.js','/bill-helper.v6.js','/document-register.v6.js',
'/calculator.v6.js','/energy-model.v6.js','/guides.v6.js','/privacy.v6.js','/report-studio.v6.js',
'/paul-scrase-480.webp','/paul-scrase-800.webp','/social-share.webp','/calendly-qr.png','/whatsapp-qr.png',
'/favicon.svg','/manifest.webmanifest','/icon-192.png','/icon-512.png','/data/need-benchmarks-2024.json'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(async()=>await caches.match(request)||await caches.match('/')));return;}event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;})));});
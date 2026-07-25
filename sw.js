const CACHE='save-earn-v5-1';
const STATIC=[
'/styles.v5.1.css','/report.v5.1.css','/site.v5.1.js','/analytics.v5.1.js','/home.v5.1.js','/household-os.v5.1.js',
'/copilot.v5.1.js','/consent-centre.v5.1.js','/command-centre.v5.1.js','/bill-helper.v5.1.js','/document-register.v5.1.js',
'/calculator.v5.1.js','/guides.v5.1.js','/privacy.v5.1.js','/report-studio.v5.1.js',
'/paul-scrase-480.webp','/paul-scrase-800.webp','/social-share.webp','/calendly-qr.png','/whatsapp-qr.png',
'/favicon.svg','/manifest.webmanifest','/icon-192.png','/icon-512.png'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(async()=>await caches.match(request)||await caches.match('/')));return;}event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;})));});
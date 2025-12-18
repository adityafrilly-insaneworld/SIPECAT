const CACHE_NAME="sr-system-v1";
const ASSETS=["/","/index.html","/app","/app.html","/users.html","/styles.css","/common.js","/login.js","/app.js","/users.js","/manifest.json","/icons/icon-192.png","/icons/icon-512.png"];
self.addEventListener("install",(e)=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener("activate",(e)=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",(e)=>{const url=new URL(e.request.url);if(url.pathname.startsWith("/api/")) return;
e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));return resp;}).catch(()=>cached)));});

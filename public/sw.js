// Kill-switch: removes the old GoTyping service worker/caches left by the previous build, then unregisters itself.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  try{for(const k of await caches.keys())await caches.delete(k)}catch(_){}
  try{await self.registration.unregister()}catch(_){}
  try{for(const c of await self.clients.matchAll({type:'window'}))c.navigate(c.url)}catch(_){}
})()));

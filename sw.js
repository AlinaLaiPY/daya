/* 大雅車行記帳 — 離線快取
   每次改版把 CACHE 的版號 +1（v2 → v3 → …） */
var CACHE = "daya-merged-v2";
var ASSETS = ["./", "./index.html", "./manifest.json", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];

/* 安裝：用 cache:"reload" 逼瀏覽器重新向伺服器拿，
   不然會把 CDN 上還沒過期的舊 index.html 存進新快取，等於白更新 */
self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(ASSETS.map(function(u){
        return fetch(new Request(u, {cache:"reload"}))
          .then(function(r){ if(r && r.ok) return c.put(u, r); })
          .catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
      .catch(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  /* sw.js 不要攔，攔了就檢查不到新版 */
  if(e.request.url.indexOf("sw.js") >= 0) return;
  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ try{ c.put(e.request, copy); }catch(err){} });
        return resp;
      }).catch(function(){ return caches.match("./index.html"); });
    })
  );
});
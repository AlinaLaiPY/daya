/* 大雅車行記帳 — 離線快取
   ※ 每次改版把下面的版號 +1（v2 → v3 → …），手機才會抓到新版 */
var CACHE = "daya-merged-v5";
var ASSETS = ["./", "./index.html", "./manifest.json", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];
var lastCheck = 0;

/* 安裝：用 cache:"reload" 逼瀏覽器重新向伺服器要檔案。
   原本的 addAll() 會走瀏覽器的 HTTP 快取，可能把 GitHub Pages 上
   還沒過期（max-age=600）的舊 index.html 存進新快取，等於白更新。 */
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

  /* sw.js 不能攔，攔了就永遠檢查不到新版 */
  if(e.request.url.indexOf("sw.js") >= 0) return;

  /* 每次開啟 App 時，主動去問伺服器「sw.js 換了沒」。
     瀏覽器自己的檢查會被 HTTP 快取擋住，所以這裡自己叫一次。 */
  if(e.request.mode === "navigate"){
    var now = Date.now();
    if(now - lastCheck > 30000){
      lastCheck = now;
      e.waitUntil(self.registration.update().catch(function(){}));
    }
  }

  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ try{ c.put(e.request, copy); }catch(err){} });
        return resp;
      }).catch(function(){
        return caches.match("./index.html");
      });
    })
  );
});

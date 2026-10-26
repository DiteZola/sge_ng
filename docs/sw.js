/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "c7972da76b104ae95a78489402274a55"
  }, {
    "url": "pwa-512x512.png",
    "revision": "c7972da76b104ae95a78489402274a55"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a5c54e034b26c7583b844dbf9890ca57"
  }, {
    "url": "index.html",
    "revision": "81011b68717e5a499848db745c67a879"
  }, {
    "url": "icon.svg",
    "revision": "293309fdc038c89ab9bbbe70fd91b917"
  }, {
    "url": "favicon.ico",
    "revision": "843944875402099b19ca3eda4be12c81"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "80f4d91273c38518c75fd2e474d0cc75"
  }, {
    "url": "404.html",
    "revision": "df01c1b5b38f4151e55bfb95329ffe2a"
  }, {
    "url": "assets/purify.es-Bvo9QlJ8.js",
    "revision": null
  }, {
    "url": "assets/index.es-B1qiNCXp.js",
    "revision": null
  }, {
    "url": "assets/index-CbkrctOt.css",
    "revision": null
  }, {
    "url": "assets/index-CWbvXjEv.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "80f4d91273c38518c75fd2e474d0cc75"
  }, {
    "url": "favicon.ico",
    "revision": "843944875402099b19ca3eda4be12c81"
  }, {
    "url": "icon.svg",
    "revision": "293309fdc038c89ab9bbbe70fd91b917"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a5c54e034b26c7583b844dbf9890ca57"
  }, {
    "url": "pwa-512x512.png",
    "revision": "c7972da76b104ae95a78489402274a55"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "c7972da76b104ae95a78489402274a55"
  }, {
    "url": "manifest.webmanifest",
    "revision": "2ecd418ae8f0d668a169a01baff4d66f"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));

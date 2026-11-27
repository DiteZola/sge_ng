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
define(['./workbox-39895644'], (function (workbox) { 'use strict';

  importScripts("./sw-notifications.js");
  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "index.html",
    "revision": "a73c237536bcd87c407fff59a63ac8ad"
  }, {
    "url": "manifest.json",
    "revision": "e443656b619d7fe9e8b90e788bb8af7b"
  }, {
    "url": "sw-notifications.js",
    "revision": "c98ada7a621b3d036bc31ce5d11857c1"
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
    "url": "icon.svg",
    "revision": "293309fdc038c89ab9bbbe70fd91b917"
  }, {
    "url": "favicon.ico",
    "revision": "843944875402099b19ca3eda4be12c81"
  }, {
    "url": "favicon-32x32.png",
    "revision": "b8dd4d35477638c0f96aae5b04bf3a31"
  }, {
    "url": "favicon-16x16.png",
    "revision": "abf064b518c8ef030c37a4bdbf92ee70"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "80f4d91273c38518c75fd2e474d0cc75"
  }, {
    "url": "assets/index-DpNbIwb7.css",
    "revision": null
  }, {
    "url": "assets/index-BzfedX6e.js",
    "revision": null
  }, {
    "url": "assets/storage-DqwFtj2Q.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-DRlaIapH.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-BfoLl6v-.js",
    "revision": null
  }, {
    "url": "assets/vendor-firebase-Dfr8U4TP.js",
    "revision": null
  }, {
    "url": "assets/DashboardView-47Bej7iz.js",
    "revision": null
  }, {
    "url": "assets/PrintingDocumentsView-DTxIqUvT.js",
    "revision": null
  }, {
    "url": "assets/PatrimonyView-IA0Wj_IP.js",
    "revision": null
  }, {
    "url": "assets/pdfGenerator-BJLDq570.js",
    "revision": null
  }, {
    "url": "assets/directorHelper-CKcLL8Hu.js",
    "revision": null
  }, {
    "url": "assets/dateFormat-QE49f7CD.js",
    "revision": null
  }, {
    "url": "assets/qrCodeUtils-C4kEAAug.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "80f4d91273c38518c75fd2e474d0cc75"
  }, {
    "url": "favicon-16x16.png",
    "revision": "abf064b518c8ef030c37a4bdbf92ee70"
  }, {
    "url": "favicon-32x32.png",
    "revision": "b8dd4d35477638c0f96aae5b04bf3a31"
  }, {
    "url": "favicon.ico",
    "revision": "843944875402099b19ca3eda4be12c81"
  }, {
    "url": "icon.svg",
    "revision": "293309fdc038c89ab9bbbe70fd91b917"
  }, {
    "url": "manifest.json",
    "revision": "e443656b619d7fe9e8b90e788bb8af7b"
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
    "url": "robots.txt",
    "revision": "cb9147dc3564429734ece795725c5fef"
  }, {
    "url": "sitemap.xml",
    "revision": "d8530abaca2f156cd106d97a7d511f3f"
  }, {
    "url": "sw-notifications.js",
    "revision": "c98ada7a621b3d036bc31ce5d11857c1"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/robots\.txt$/i, /sitemap\.xml$/i, /version\.json$/i]
  }));
  workbox.registerRoute(/\/version\.json(\?.*)?$/i, new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(/\/assets\/.*\.(js|css|woff2?)(\?.*)?$/i, new workbox.StaleWhileRevalidate({
    "cacheName": "sge-modules-runtime-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 80,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
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

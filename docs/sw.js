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

  importScripts("./sw-notifications.js");
  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "sw-notifications.js",
    "revision": "97d9956d063ce7c77cc5c11217ae40ca"
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
    "url": "manifest.json",
    "revision": "1004cdacc50c5738838c08083d01058d"
  }, {
    "url": "index.html",
    "revision": "7c55ff4babece5843b2a14461f242793"
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
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/vendor-xlsx-iJMskejc.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-Dg0ur_gx.js",
    "revision": null
  }, {
    "url": "assets/vendor-qr-fR3kqfDd.js",
    "revision": null
  }, {
    "url": "assets/vendor-pdf-Sn3ZASOC.js",
    "revision": null
  }, {
    "url": "assets/vendor-firebase-Dd8ZQi0_.js",
    "revision": null
  }, {
    "url": "assets/vendor-charts-7UFzEllA.js",
    "revision": null
  }, {
    "url": "assets/rolldown-runtime-hePW80VL.js",
    "revision": null
  }, {
    "url": "assets/qrCodeUtils-BMcUOLHb.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bvo9QlJ8.js",
    "revision": null
  }, {
    "url": "assets/pdfGenerator-CSnDGJu3.js",
    "revision": null
  }, {
    "url": "assets/index.es-CCVB7FyY.js",
    "revision": null
  }, {
    "url": "assets/index-CHz8vPkP.js",
    "revision": null
  }, {
    "url": "assets/index-BTyrNJe4.css",
    "revision": null
  }, {
    "url": "assets/imageCompressor-BY9DaNCq.js",
    "revision": null
  }, {
    "url": "assets/directorHelper-CAOWYizn.js",
    "revision": null
  }, {
    "url": "assets/curriculoAngola-BsuHwveT.js",
    "revision": null
  }, {
    "url": "assets/academicHierarchyService-C5mDLpi3.js",
    "revision": null
  }, {
    "url": "assets/UserProfileView-BQCNIfad.js",
    "revision": null
  }, {
    "url": "assets/TechnicalSupportView-DEGThRP_.js",
    "revision": null
  }, {
    "url": "assets/SystemInitialSetupView-BGCf-T-Y.js",
    "revision": null
  }, {
    "url": "assets/SystemAuditBackupView-suTSiDvV.js",
    "revision": null
  }, {
    "url": "assets/StudentsView-C0C6wws_.js",
    "revision": null
  }, {
    "url": "assets/StudentRankingSection-dDfBBc02.js",
    "revision": null
  }, {
    "url": "assets/StudentPassesView-2qZCuC4K.js",
    "revision": null
  }, {
    "url": "assets/StudentClassListPdfDocument-CdEka2_7.js",
    "revision": null
  }, {
    "url": "assets/StudentAttendanceReportView-JY1GD10C.js",
    "revision": null
  }, {
    "url": "assets/StatisticsView-D_aoY3vx.js",
    "revision": null
  }, {
    "url": "assets/SchoolCalendarView-u5cpqrw_.js",
    "revision": null
  }, {
    "url": "assets/ScheduleTimetableView-wN5NdBG6.js",
    "revision": null
  }, {
    "url": "assets/ReportsView-D-pcyg7q.js",
    "revision": null
  }, {
    "url": "assets/RealtimeSecurityModal-DIb_GtVd.js",
    "revision": null
  }, {
    "url": "assets/QrScannerModal-CLfQIcoW.js",
    "revision": null
  }, {
    "url": "assets/PrintingDocumentsView-Cjde3IXM.js",
    "revision": null
  }, {
    "url": "assets/PatrimonyView-CeTTikdB.js",
    "revision": null
  }, {
    "url": "assets/ParentStudentReportView-12_jJKmv.js",
    "revision": null
  }, {
    "url": "assets/JuryCommissionView-CUNvr_NN.js",
    "revision": null
  }, {
    "url": "assets/InitialSetupModal-CwuwFOp5.js",
    "revision": null
  }, {
    "url": "assets/HumanResourcesView-BYf77VYG.js",
    "revision": null
  }, {
    "url": "assets/GuidedTourModal-X_lcVZG4.js",
    "revision": null
  }, {
    "url": "assets/ExecutiveDirectionView-DnLaetOv.js",
    "revision": null
  }, {
    "url": "assets/EvaluationMacView-HziDILCk.js",
    "revision": null
  }, {
    "url": "assets/DocumentTemplateConfigModal-DGeWPN5z.js",
    "revision": null
  }, {
    "url": "assets/DashboardView-C-4jsYyy.js",
    "revision": null
  }, {
    "url": "assets/CommunicationLibraryView-_OlDdulT.js",
    "revision": null
  }, {
    "url": "assets/ArchitectureDocsView-D-K3Fq84.js",
    "revision": null
  }, {
    "url": "assets/AngolaDateInput-DO_gpgfD.js",
    "revision": null
  }, {
    "url": "assets/AdministrativeFinanceView-DQWQLPQk.js",
    "revision": null
  }, {
    "url": "assets/AdminGlobalSchoolsView-Dd211k_d.js",
    "revision": null
  }, {
    "url": "assets/AcademicManagementView-B7b8xJk7.js",
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
    "url": "sw-notifications.js",
    "revision": "97d9956d063ce7c77cc5c11217ae40ca"
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

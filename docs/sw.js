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
    "revision": "5379ec376b6350ac6d17f082b9ff2612"
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
    "revision": "e443656b619d7fe9e8b90e788bb8af7b"
  }, {
    "url": "index.html",
    "revision": "b2e7ad444cd9624db553ea5cd66863e0"
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
    "url": "404.html",
    "revision": "8cc7989e491dbf21f2cd906915a6eb99"
  }, {
    "url": "assets/xlsx-iJMskejc.js",
    "revision": null
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-rvEbAo8W.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-BXEfg-fa.js",
    "revision": null
  }, {
    "url": "assets/vendor-firebase-Dfr8U4TP.js",
    "revision": null
  }, {
    "url": "assets/rolldown-runtime-hePW80VL.js",
    "revision": null
  }, {
    "url": "assets/qrCodeUtils-D2IljzvD.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bvo9QlJ8.js",
    "revision": null
  }, {
    "url": "assets/pdfGenerator-CsdMdira.js",
    "revision": null
  }, {
    "url": "assets/pautaExcelExporter-DgBiJ3IY.js",
    "revision": null
  }, {
    "url": "assets/index.es-DnXOONCy.js",
    "revision": null
  }, {
    "url": "assets/index-yJOsIg-y.js",
    "revision": null
  }, {
    "url": "assets/index-Cl4UapjK.css",
    "revision": null
  }, {
    "url": "assets/imageCompressor-BY9DaNCq.js",
    "revision": null
  }, {
    "url": "assets/enrollmentProgression-Cu8v6ZfX.js",
    "revision": null
  }, {
    "url": "assets/directorHelper-BWyqntYW.js",
    "revision": null
  }, {
    "url": "assets/dateFormat-SosUOu7Q.js",
    "revision": null
  }, {
    "url": "assets/curriculoAngola-Bv-MPFlv.js",
    "revision": null
  }, {
    "url": "assets/academicHierarchyService-Cq3V8VkJ.js",
    "revision": null
  }, {
    "url": "assets/UserProfileView-CX3rxfq7.js",
    "revision": null
  }, {
    "url": "assets/TechnicalSupportView-OoAsnvSM.js",
    "revision": null
  }, {
    "url": "assets/SystemAuditBackupView-Covdowb8.js",
    "revision": null
  }, {
    "url": "assets/StudentsView-Cr8p9yJv.js",
    "revision": null
  }, {
    "url": "assets/StudentRankingSection-fDb-O5dt.js",
    "revision": null
  }, {
    "url": "assets/StudentPassesView-db9-P9dF.js",
    "revision": null
  }, {
    "url": "assets/StudentClassListPdfDocument-CHc2GkbP.js",
    "revision": null
  }, {
    "url": "assets/StudentAttendanceReportView-Ce4DBGug.js",
    "revision": null
  }, {
    "url": "assets/StatisticsView-XlO1JNmR.js",
    "revision": null
  }, {
    "url": "assets/SchoolCalendarView-DuFT1_gw.js",
    "revision": null
  }, {
    "url": "assets/ScheduleTimetableView-D8uL9N4U.js",
    "revision": null
  }, {
    "url": "assets/ReportsView-BTjrh4Up.js",
    "revision": null
  }, {
    "url": "assets/RealtimeSecurityModal-DdEQbUIl.js",
    "revision": null
  }, {
    "url": "assets/QrScannerModal-0B0gb7DG.js",
    "revision": null
  }, {
    "url": "assets/PrintingDocumentsView-eYXaMe2J.js",
    "revision": null
  }, {
    "url": "assets/PieChart-Dfnot2Dd.js",
    "revision": null
  }, {
    "url": "assets/PatrimonyView-BUo13M0X.js",
    "revision": null
  }, {
    "url": "assets/ParentStudentReportView-DqKsI-di.js",
    "revision": null
  }, {
    "url": "assets/ModalJustificarFaltaFuncionario-C92LxuIb.js",
    "revision": null
  }, {
    "url": "assets/JuryCommissionView-CssT0IiM.js",
    "revision": null
  }, {
    "url": "assets/InitialSetupModal-CiQfqAjr.js",
    "revision": null
  }, {
    "url": "assets/HumanResourcesView-DlpTbg4w.js",
    "revision": null
  }, {
    "url": "assets/GuidedTourModal-oifHKRPS.js",
    "revision": null
  }, {
    "url": "assets/FeeReceiptsA4Sheet-C2A4NJgF.js",
    "revision": null
  }, {
    "url": "assets/ExecutiveDirectionView-BLjpe_pq.js",
    "revision": null
  }, {
    "url": "assets/EvaluationMacView-B9C_XKjU.js",
    "revision": null
  }, {
    "url": "assets/DocumentTemplateConfigModal-YIlEX55t.js",
    "revision": null
  }, {
    "url": "assets/DashboardView-DBwRVHgc.js",
    "revision": null
  }, {
    "url": "assets/CommunicationLibraryView-Dn9vgP1O.js",
    "revision": null
  }, {
    "url": "assets/ArchitectureDocsView-BU5dJf2a.js",
    "revision": null
  }, {
    "url": "assets/AngolaDateInput-D9ql2JGI.js",
    "revision": null
  }, {
    "url": "assets/AdministrativeFinanceView-Djy3Jm1c.js",
    "revision": null
  }, {
    "url": "assets/AdminGlobalSchoolsView-BLcaDa70.js",
    "revision": null
  }, {
    "url": "assets/AcademicManagementView-EqLxUytC.js",
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
    "revision": "5379ec376b6350ac6d17f082b9ff2612"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/robots\.txt$/i, /sitemap\.xml$/i]
  }));
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

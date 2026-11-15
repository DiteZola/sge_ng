import{r as e}from"./rolldown-runtime-hePW80VL.js";import{n as t,t as n}from"./vendor-pdf-Sn3ZASOC.js";var r=e(t(),1);function i(e,t){return typeof e!=`number`||Number.isNaN(e)?t:Math.max(2,Math.min(35,Math.round(e*10)/10))}function a(e={}){let t=e.format===`letter`?`letter`:`a4`,n=e.orientation===`landscape`?`landscape`:`portrait`,r=t===`letter`?215.9:210,a=t===`letter`?279.4:297,o=n===`landscape`?a:r,s=n===`landscape`?r:a,c=i(e.marginMm,8),l={top:i(e.margins?.top,c),right:i(e.margins?.right,c),bottom:i(e.margins?.bottom,c),left:i(e.margins?.left,c)};return{format:t,orientation:n,pageWidthMm:o,pageHeightMm:s,margins:l,printableWidthMm:Math.max(50,o-l.left-l.right),printableHeightMm:Math.max(50,s-l.top-l.bottom)}}var o=`
  [data-pdf-fixed-header="true"] {
    position: relative !important;
    width: 100% !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  [data-pdf-corner-left="true"] {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    z-index: 20 !important;
  }
  [data-pdf-corner-right="true"] {
    position: absolute !important;
    right: 0 !important;
    top: 0 !important;
    z-index: 20 !important;
  }
  [data-pdf-center-insignia="true"] {
    text-align: center !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
  [data-pdf-fixed-student="true"] {
    width: 100% !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  [data-pdf-student-grid="2"] {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  [data-pdf-student-grid="3"] {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
  [data-pdf-student-grid="4"] {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }
  [data-pdf-student-grid="6"] {
    display: grid !important;
    grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  }
  [data-pdf-student-row="true"] {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start !important;
  }
  [data-pdf-fixed-signatures="true"],
  [data-pdf-fixed-qr="true"],
  tr {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
`,s=/(?:oklch|oklab|lab|lch|color-mix|color)\([^)]*(?:\([^)]*\)[^)]*)*\)/gi,c=null,l=new Map;function u(){if(c)return c;try{let e=document.createElement(`canvas`);return e.width=1,e.height=1,c=e.getContext(`2d`,{willReadFrequently:!0}),c}catch{return null}}function d(e){if(!e||e===`transparent`||e===`inherit`||e===`initial`||e===`none`)return e;let t=e.trim(),n=l.get(t);if(n)return n;try{let e=t;if(t.includes(`var(`)||!t.startsWith(`rgb`)){let n=document.createElement(`div`);n.style.position=`fixed`,n.style.left=`-9999px`,n.style.color=t,document.body.appendChild(n),e=window.getComputedStyle(n).color||t,document.body.removeChild(n)}if(/(?:oklch|oklab|lab|lch|color-mix|color\()/i.test(e)){let n=u();if(n){n.clearRect(0,0,1,1),n.fillStyle=`#000000`,n.fillStyle=e,n.fillRect(0,0,1,1);let r=n.getImageData(0,0,1,1).data,i=Number((r[3]/255).toFixed(3)),a=`rgba(${r[0]}, ${r[1]}, ${r[2]}, ${i})`;return l.set(t,a),a}}return l.set(t,e),e}catch{return t}}function f(e){return!e||!/(?:oklch|oklab|lab|lch|color-mix)/i.test(e)?e:e.replace(s,e=>{let t=d(e);return/(?:oklch|oklab|lab|lch|color-mix|color\()/i.test(t)?`#1f2937`:t})}async function p(e){try{document.fonts&&document.fonts.ready&&await Promise.race([document.fonts.ready,new Promise(e=>setTimeout(e,1200))])}catch{}let t=Array.from(e.querySelectorAll(`img`)).map(e=>e.complete&&e.naturalHeight!==0?Promise.resolve():new Promise(t=>{e.onload=()=>t(),e.onerror=()=>t(),setTimeout(t,2500)}));await Promise.all(t)}function m(e,t,n){let r=e.getContext(`2d`,{willReadFrequently:!0});if(!r)return t;let i=e.width,a=Math.min(e.height-2,t+24),o=Math.max(n+40,t-120),s=Math.max(2,Math.floor(i/180)),c=t,l=-1;for(let e=a;e>=o;e--)try{let t=r.getImageData(0,e,i,1).data,n=0,a=0;for(let e=0;e<i;e+=s){let r=e*4,i=t[r],o=t[r+1],s=t[r+2];i>=242&&o>=242&&s>=242&&n++,a++}let o=a>0?n/a:0;if(o>=.995)return e;o>l&&(l=o,c=e)}catch{return t}return l>=.88?c:t}async function h(e,t,i={}){let s=null;if(s=typeof e==`string`?document.getElementById(e):e,!s)return console.error(`downloadElementAsPdf: Elemento não encontrado no DOM`,e),!1;let c=t.replace(/\.pdf$/i,``).trim()||`Documento_SGE_MED`,l=i.scale||2.3,{format:u,orientation:h,margins:_,printableWidthMm:v,printableHeightMm:y}=a(i);await p(s);let b=s.style.backgroundColor,x=s.hasAttribute(`data-sge-pdf-target`),S=s.getBoundingClientRect().width,C=s.scrollWidth,w=s.id===`recibo-imprimir-modal`||S>0&&S<=430&&!s.querySelector(`table`);s.style.backgroundColor=`#ffffff`,s.setAttribute(`data-sge-pdf-target`,`true`);try{let e=h===`landscape`,t=u===`letter`?e?1056:816:e?1122:794,i=w?Math.max(320,Math.round(S||360)):Math.max(t,Math.round(C||t)),a=await(0,r.default)(s,{scale:l,useCORS:!0,allowTaint:!1,backgroundColor:`#ffffff`,logging:!1,imageTimeout:15e3,windowWidth:Math.max(i+80,e?1280:1024),onclone:t=>{try{let n=``;if(Array.from(document.styleSheets).forEach(e=>{try{let t=e.cssRules||e.rules;if(t)for(let e=0;e<t.length;e++)n+=f(t[e].cssText)+`
`}catch{}}),t.querySelectorAll(`style, link[rel="stylesheet"]`).forEach(e=>{e.tagName===`STYLE`?e.textContent=f(e.textContent||``):e.remove()}),n.trim().length>0){let e=t.createElement(`style`);e.setAttribute(`data-sge-compiled-styles`,`true`),e.textContent=n,t.head.appendChild(e)}let r=t.createElement(`style`);r.innerHTML=`
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .no-print, button, input[type="button"], input[type="submit"], nav {
              display: none !important;
            }
            .print\\:block, .print-only {
              display: block !important;
            }
            .print\\:flex {
              display: flex !important;
            }
            .documento-oficial-print {
              background-color: #ffffff !important;
              color: #000000 !important;
              display: block !important;
              visibility: visible !important;
            }
            ${o}
          `,t.head.appendChild(r),t.documentElement.style.width=`${i}px`,t.documentElement.style.minWidth=`${i}px`,t.body.style.width=`${i}px`,t.body.style.minWidth=`${i}px`,t.body.style.margin=`0`,t.body.style.padding=`0`,t.body.style.overflow=`visible`,t.body.style.backgroundColor=`#ffffff`;let a=t.querySelector(`[data-sge-pdf-target="true"]`);a&&(a.style.width=`${i}px`,a.style.minWidth=`${i}px`,a.style.maxWidth=`${i}px`,a.style.zoom=`1`,a.style.transform=`none`,a.style.margin=`0 auto`,a.style.boxSizing=`border-box`,a.style.overflow=`visible`,a.style.backgroundColor=`#ffffff`),t.querySelectorAll(`[style*="zoom"]`).forEach(e=>{e.style.zoom=`1`}),t.querySelectorAll(`[data-passes-grid="true"] .grid, .passes-grid-container, .passes-sheet-grid`).forEach(t=>{let n=t;n.style.display=`grid`,n.style.gridTemplateColumns=e?`repeat(4, 1fr)`:`repeat(2, 1fr)`,n.style.gap=`10px`,n.style.width=`100%`}),t.querySelectorAll(`.boletins-grid-4`).forEach(e=>{let t=e;t.style.display=`grid`,t.style.gridTemplateColumns=`repeat(2, 1fr)`,t.style.gap=`10px`,t.style.width=`100%`}),t.querySelectorAll(`.overflow-x-auto, [class*="overflow-x"], .overflow-y-auto, .max-h-\\[75vh\\]`).forEach(e=>{let t=e;t.style.overflow=`visible`,t.style.maxHeight=`none`,t.style.width=`100%`,t.style.maxWidth=`none`}),t.querySelectorAll(`svg`).forEach(e=>{let t=e.getBoundingClientRect();!e.getAttribute(`width`)&&t.width>0&&e.setAttribute(`width`,String(Math.round(t.width))),!e.getAttribute(`height`)&&t.height>0&&e.setAttribute(`height`,String(Math.round(t.height)))});let s=[`color`,`backgroundColor`,`borderColor`,`borderTopColor`,`borderBottomColor`,`borderLeftColor`,`borderRightColor`,`outlineColor`];t.querySelectorAll(`*`).forEach(e=>{let t=e;if(t.style)try{let e=window.getComputedStyle(t);if(!e)return;for(let n of s){let r=e[n];r&&/(?:oklch|oklab|lab|lch|color-mix|color\()/i.test(r)&&(t.style[n]=d(r))}}catch{}})}catch(e){console.warn(`[PDF Generator] Aviso no ajuste do clone:`,e)}}}),p=new n({orientation:h,unit:`mm`,format:u,compress:!0}),g=a.height,b=a.width;if(w){let e=Math.min(v,105),t=g*e/b,n=_.left+Math.max(0,(v-e)/2),r=_.top+2,i=a.toDataURL(`image/png`);return p.addImage(i,`PNG`,n,r,e,Math.min(t,Math.max(20,y-4)),void 0,`FAST`),p.save(`${c}.pdf`),!0}let x=v,T=g*x/b;if(T<=y+2){let e=a.toDataURL(`image/png`);p.addImage(e,`PNG`,_.left,_.top,x,Math.min(T,y),void 0,`FAST`)}else{let e=Math.floor(b*y/x),t=0,n=0;for(;t<g-2;){n>0&&p.addPage(u,h);let r=g-t,i;if(r<=e)i=r;else{let n=m(a,t+e,t);i=Math.max(120,Math.min(r,n-t))}let o=document.createElement(`canvas`);o.width=b,o.height=i;let s=o.getContext(`2d`);if(s){s.fillStyle=`#ffffff`,s.fillRect(0,0,o.width,o.height),s.drawImage(a,0,t,b,i,0,0,b,i);let e=o.toDataURL(`image/png`),n=i*x/b;p.addImage(e,`PNG`,_.left,_.top,x,n,void 0,`FAST`)}t+=i,n++}}return p.save(`${c}.pdf`),!0}catch(e){return console.error(`[PDF Generator] Falha na renderização de canvas:`,e),g(s,c,i),!0}finally{s.style.backgroundColor=b,x||s.removeAttribute(`data-sge-pdf-target`)}}function g(e,t,n={}){try{let{format:r,orientation:i,margins:s}=a(n),c=document.createElement(`iframe`);c.style.position=`fixed`,c.style.right=`0`,c.style.bottom=`0`,c.style.width=`0`,c.style.height=`0`,c.style.border=`0`,document.body.appendChild(c);let l=c.contentWindow?.document;if(!l){window.print();return}let u=``;Array.from(document.styleSheets).forEach(e=>{try{let t=e.cssRules||e.rules;if(t)for(let e=0;e<t.length;e++)u+=t[e].cssText+`
`}catch{}}),l.open(),l.write(`
      <!DOCTYPE html>
      <html lang="pt-AO">
        <head>
          <meta charset="utf-8">
          <title>${t}</title>
          <style>${u}</style>
          <style>
            @page {
              size: ${r} ${i};
              margin: ${s.top}mm ${s.right}mm ${s.bottom}mm ${s.left}mm;
            }
            body { 
              background: #ffffff !important; 
              color: #000000 !important; 
              padding: 0 !important; 
              margin: 0 !important; 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, button { display: none !important; }
            .print\\:block { display: block !important; }
            .print\\:flex { display: flex !important; }
            svg { display: inline-block !important; }
            ${o}
          </style>
        </head>
        <body>
          <div style="background: #ffffff; width: 100%;">
            ${e.outerHTML}
          </div>
        </body>
      </html>
    `),l.close(),setTimeout(()=>{try{c.contentWindow?.focus(),c.contentWindow?.print()}catch{window.print()}finally{setTimeout(()=>{c.parentNode&&document.body.removeChild(c)},2e3)}},450)}catch(e){console.error(`[PDF Generator] Erro na impressão direta:`,e),window.print()}}export{g as n,a as r,h as t};
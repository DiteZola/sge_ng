const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./xlsx-iJMskejc.js","./rolldown-runtime-hePW80VL.js"])))=>i.map(i=>d[i]);
import{i as e}from"./storage-DqwFtj2Q.js";function t(e,t,n){let r=`<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="UTF-8">
  <title>${t}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111827; background: #fff; margin: 0; padding: 20px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
    th, td { border: 1px solid #111827; padding: 4px 6px; text-align: left; }
    th { background: #f3f4f6; font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${n}
  <script>
    window.onload = function() {
      // Opcional: auto-imprimir se desejado
    };
  <\/script>
</body>
</html>`,i=new Blob([r],{type:`text/html;charset=utf-8`}),a=URL.createObjectURL(i),o=document.createElement(`a`);o.href=a,o.download=e.endsWith(`.html`)?e:`${e}.html`,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(a)}async function n(t,n,r){if(!n||n.length===0)return;let i=await e(()=>import(`./xlsx-iJMskejc.js`).then(e=>e.i),__vite__mapDeps([0,1]),import.meta.url),a=i.utils.json_to_sheet(n),o=i.utils.book_new();i.utils.book_append_sheet(o,a,t.substring(0,31));let s=r.endsWith(`.xlsx`)?r:`${r}.xlsx`;i.writeFile(o,s)}export{t as n,n as t};
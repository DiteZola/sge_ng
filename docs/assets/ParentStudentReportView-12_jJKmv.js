import"./rolldown-runtime-hePW80VL.js";import{m as e}from"./vendor-charts-7UFzEllA.js";import{Ct as t,K as n,Lt as r,Qt as i,Rt as a,Yt as o,an as s,bn as c,rn as l,t as u}from"./vendor-react-Dg0ur_gx.js";import{o as d}from"./index-CHz8vPkP.js";import{n as f}from"./curriculoAngola-BsuHwveT.js";e();var p=u(),m=`/app/applet/src/components/ParentStudentReportView.tsx`,h=({aluno:e,escola:u,turma:h,notas:g,onFechar:_,modoModal:v=!1})=>{let y=h||d.getTurmas().find(t=>t.id===e.turmaId),b=e.classeId||y?.classe||`Não definida`,x=y?.curso||e.curso||`Ensino Geral`,S=y?.turno||`Manhã`,C=y?.sala||`Sala 01`,w=(g||d.getNotasConsolidadas()).filter(t=>t.alunoId===e.id),T=d.getDisciplinas(),E=w.reduce((e,t)=>e+(t.faltas||0),0),D=Math.floor(E*.3),O=E-D,k=Math.max(0,Math.min(100,Math.round((180-O)/180*100))),A=d.getTransacoesFinanceiras(u.id).filter(t=>t.alunoId===e.id&&t.status===`Confirmado`),j=[{id:`Outubro`,nome:`Outubro`,valor:6500},{id:`Novembro`,nome:`Novembro`,valor:6500},{id:`Dezembro`,nome:`Dezembro`,valor:6500},{id:`Janeiro`,nome:`Janeiro`,valor:6500},{id:`Fevereiro`,nome:`Fevereiro`,valor:6500},{id:`Março`,nome:`Março`,valor:6500},{id:`Abril`,nome:`Abril`,valor:6500},{id:`Maio`,nome:`Maio`,valor:6500},{id:`Junho`,nome:`Junho`,valor:6500}],M=new Set;(e.propinaStatus===`Regularizada`||e.propinaStatus===`Isento`)&&j.slice(0,6).forEach(e=>M.add(e.nome)),A.forEach(e=>{e.mesReferencia&&j.forEach(t=>{e.mesReferencia?.toLowerCase().includes(t.nome.toLowerCase())&&M.add(t.nome)})}),new Date().getMonth();let N=j.filter((e,t)=>t<=5),P=N.filter(e=>!M.has(e.nome)).reduce((e,t)=>e+t.valor,0),F=u.permitirBoletimNoPortalEncarregado===!0,I=u.trimestreBoletimPortal||`todos`,L=w.filter(e=>I===`todos`||String(e.trimestre)===String(I)),R=()=>{let t=new Date().toLocaleString(`pt-AO`,{day:`2-digit`,month:`long`,year:`numeric`,hour:`2-digit`,minute:`2-digit`}),n=`
      <!DOCTYPE html>
      <html lang="pt-AO">
      <head>
        <meta charset="utf-8">
        <title>Ficha do Educando - ${e.nomeCompleto}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; font-size: 11pt; line-height: 1.4; margin: 0; padding: 10px; }
          .header-box { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .inst-title { font-size: 15pt; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0; }
          .inst-sub { font-size: 10.5pt; color: #475569; font-weight: 600; text-transform: uppercase; margin: 0; }
          .doc-badge { display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 6px; font-size: 9.5pt; font-weight: 700; color: #1e293b; margin-top: 8px; text-transform: uppercase; }
          
          .meta-download { text-align: right; font-size: 9pt; color: #64748b; margin-bottom: 15px; }
          
          .section { margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background-color: #ffffff; }
          .section-title { font-size: 11pt; font-weight: 800; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; display: flex; align-items: center; }
          
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
          
          .field { font-size: 9.5pt; margin-bottom: 4px; }
          .field-label { color: #64748b; font-size: 8.5pt; text-transform: uppercase; font-weight: 600; display: block; }
          .field-val { font-weight: 700; color: #0f172a; }
          
          .card-stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
          .card-stat-num { font-size: 16pt; font-weight: 900; }
          .card-stat-label { font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: 600; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
          th { background: #f1f5f9; color: #0f172a; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 8.5pt; }
          td { padding: 6px 8px; border: 1px solid #cbd5e1; }
          
          .badge-pago { color: #166534; font-weight: bold; background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-size: 8.5pt; }
          .badge-pendente { color: #991b1b; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-size: 8.5pt; }
          
          .clean-footer { margin-top: 30px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 8.5pt; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="inst-sub">REPÚBLICA DE ANGOLA • MINISTÉRIO DA EDUCAÇÃO</div>
          <h1 class="inst-title">${u.nomeOficial}</h1>
          <div class="inst-sub">${u.municipio||`Município`} • ${u.provincia||`Província`}</div>
          <div class="doc-badge">Portal do Encarregado de Educação • Ficha Informativa do Estudante</div>
        </div>

        <div class="meta-download">
          Informações baixadas em: <strong>${t}</strong>
        </div>

        <!-- 1. DADOS DO ESTUDANTE -->
        <div class="section">
          <div class="section-title">1. Identificação do Discente</div>
          <div class="grid-3">
            <div class="field">
              <span class="field-label">Nome Completo:</span>
              <span class="field-val">${e.nomeCompleto}</span>
            </div>
            <div class="field">
              <span class="field-label">N.º de Processo / Matrícula:</span>
              <span class="field-val">${e.codigoMatricula}</span>
            </div>
            <div class="field">
              <span class="field-label">Bilhete de Identidade (BI):</span>
              <span class="field-val">${e.numeroBI||e.numeroDocumento||`Pendente`}</span>
            </div>
            <div class="field">
              <span class="field-label">Gênero:</span>
              <span class="field-val">${e.genero===`F`?`Feminino`:`Masculino`}</span>
            </div>
            <div class="field">
              <span class="field-label">Encarregado Registado:</span>
              <span class="field-val">${e.nomeEncarregado||`Não especificado`}</span>
            </div>
            <div class="field">
              <span class="field-label">Contacto do Encarregado:</span>
              <span class="field-val">${e.telefoneEncarregado||`Não especificado`}</span>
            </div>
          </div>
        </div>

        <!-- 2. ENQUADRAMENTO PEDAGÓGICO -->
        <div class="section">
          <div class="section-title">2. Enquadramento Pedagógico</div>
          <div class="grid-4">
            <div class="card-stat">
              <div class="card-stat-label">Classe</div>
              <div class="card-stat-num" style="color: #1d4ed8;">${b}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Turma</div>
              <div class="card-stat-num" style="color: #0f766e;">${y?.nome||`A`}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Turno / Sala</div>
              <div class="card-stat-num" style="font-size: 12pt; margin-top: 4px; color: #4338ca;">${S} • ${C}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Ano Letivo</div>
              <div class="card-stat-num" style="font-size: 13pt; margin-top: 4px; color: #b45309;">${u.anoLectivoActivo}</div>
            </div>
          </div>
          <div style="margin-top: 8px; font-size: 9.5pt;">
            Curso / Especialidade: <strong>${x}</strong>
          </div>
        </div>

        <!-- 3. ASSIDUIDADE E FREQUÊNCIA -->
        <div class="section">
          <div class="section-title">3. Assiduidade & Frequência Escolar</div>
          <div class="grid-4">
            <div class="card-stat">
              <div class="card-stat-label">Taxa de Assiduidade</div>
              <div class="card-stat-num" style="color: ${k>=85?`#166534`:`#dc2626`};">${k}%</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Faltas Injustificadas</div>
              <div class="card-stat-num" style="color: #dc2626;">${O}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Faltas Justificadas</div>
              <div class="card-stat-num" style="color: #2563eb;">${D}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Total de Faltas</div>
              <div class="card-stat-num" style="color: #475569;">${E}</div>
            </div>
          </div>
          <div style="margin-top: 8px; font-size: 9pt; color: #64748b;">
            Situação disciplinar de frequência: <strong style="color: ${k>=85?`#166534`:`#dc2626`};">${k>=85?`Assíduo e Regular`:`Atenção às Faltas`}</strong>.
          </div>
        </div>

        <!-- 4. SITUAÇÃO FINANCEIRA E EMOLUMENTOS POR PAGAR -->
        <div class="section">
          <div class="section-title">4. Situação Financeira • Emolumentos & Propinas</div>
          <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 9.5pt;">Total Pendente por Pagar:</span>
            <strong style="font-size: 13pt; color: ${P>0?`#dc2626`:`#166534`};">
              ${P.toLocaleString(`pt-AO`)} Kz
            </strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Mês / Emolumento</th>
                <th>Valor Previsto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${N.map(e=>{let t=M.has(e.nome);return`
                  <tr>
                    <td>Mensalidade de ${e.nome}</td>
                    <td>${e.valor.toLocaleString(`pt-AO`)} Kz</td>
                    <td><span class="${t?`badge-pago`:`badge-pendente`}">${t?`LIQUIDADO`:`POR PAGAR`}</span></td>
                  </tr>
                `}).join(``)}
            </tbody>
          </table>
        </div>

        <!-- 5. BOLETIM DE NOTAS (SE PERMITIDO PELO DIRETOR) -->
        <div class="section">
          <div class="section-title">5. Boletim de Aproveitamento Trimestral</div>
          ${F?`
            <table>
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th style="text-align: center;">Trimestre</th>
                  <th style="text-align: center;">MAC</th>
                  <th style="text-align: center;">NPP</th>
                  <th style="text-align: center;">Média</th>
                  <th style="text-align: center;">Classificação</th>
                </tr>
              </thead>
              <tbody>
                ${L.length>0?L.map(e=>{let t=T.find(t=>t.id===e.disciplinaId)?.nome||e.disciplinaNome||`Disciplina`,n=e.mediaTrimestral>=9.5;return`
                    <tr>
                      <td><strong>${t}</strong></td>
                      <td style="text-align: center;">${e.trimestre}º</td>
                      <td style="text-align: center;">${e.mac?.toFixed(1)||`—`}</td>
                      <td style="text-align: center;">${(e.npp??e.provaTrimestral)?.toFixed(1)||`—`}</td>
                      <td style="text-align: center; font-weight: bold; color: ${n?`#166534`:`#dc2626`};">${e.mediaTrimestral?.toFixed(1)}</td>
                      <td style="text-align: center;"><span class="${n?`badge-pago`:`badge-pendente`}">${n?`Aprovado`:`Não Aprovado`}</span></td>
                    </tr>
                  `}).join(``):`
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 12px; color: #64748b;">
                      Ainda não constam notas homologadas para o trimestre selecionado.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          `:`
            <div style="background-color: #fefce8; border: 1px solid #fef08a; padding: 10px; border-radius: 6px; font-size: 9.5pt; color: #854d0e;">
              <strong>Aviso da Direção Geral:</strong> A visualização do boletim de notas está temporariamente restrita no Portal pelo Diretor Geral da Instituição até à conclusão do conselho de notas.
            </div>
          `}
        </div>

        <div class="clean-footer">
          Documento emitido exclusivamente para consulta parental através do Portal dos Encarregados de Educação.<br/>
          <strong>${u.nomeOficial}</strong> • Sem carimbo ou assinatura institucional obrigatória.
        </div>
      </body>
      </html>
    `;f(`Ficha_Educando_${e.codigoMatricula}.html`,`Ficha do Educando - ${e.nomeCompleto}`,n)};return(0,p.jsxDEV)(`div`,{className:`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-6 p-5 sm:p-6`,children:[(0,p.jsxDEV)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200`,children:[(0,p.jsxDEV)(`div`,{className:`flex items-center space-x-3.5`,children:[(0,p.jsxDEV)(`div`,{className:`h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-black text-xl flex items-center justify-center shadow-md overflow-hidden shrink-0 border-2 border-white`,children:e.fotoUrl&&e.fotoUrl.trim()!==``?(0,p.jsxDEV)(`img`,{src:e.fotoUrl,alt:e.nomeCompleto,className:`h-full w-full object-cover`},void 0,!1,{fileName:m,lineNumber:350,columnNumber:15},void 0):e.nomeCompleto.substring(0,2).toUpperCase()},void 0,!1,{fileName:m,lineNumber:348,columnNumber:11},void 0),(0,p.jsxDEV)(`div`,{children:[(0,p.jsxDEV)(`div`,{className:`flex items-center space-x-2`,children:[(0,p.jsxDEV)(`span`,{className:`px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800`,children:`Portal dos Encarregados`},void 0,!1,{fileName:m,lineNumber:357,columnNumber:15},void 0),(0,p.jsxDEV)(`span`,{className:`text-xs text-gray-500 font-medium`,children:u.nomeOficial},void 0,!1,{fileName:m,lineNumber:360,columnNumber:15},void 0)]},void 0,!0,{fileName:m,lineNumber:356,columnNumber:13},void 0),(0,p.jsxDEV)(`h2`,{className:`text-lg sm:text-xl font-black text-gray-900 mt-0.5`,children:e.nomeCompleto},void 0,!1,{fileName:m,lineNumber:364,columnNumber:13},void 0),(0,p.jsxDEV)(`p`,{className:`text-xs text-gray-500`,children:[`Processo: `,(0,p.jsxDEV)(`span`,{className:`font-mono font-bold text-gray-800`,children:e.codigoMatricula},void 0,!1,{fileName:m,lineNumber:368,columnNumber:25},void 0),` • BI: `,(0,p.jsxDEV)(`span`,{className:`font-mono text-gray-700`,children:e.numeroBI||e.numeroDocumento||`Pendente`},void 0,!1,{fileName:m,lineNumber:368,columnNumber:114},void 0)]},void 0,!0,{fileName:m,lineNumber:367,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:355,columnNumber:11},void 0)]},void 0,!0,{fileName:m,lineNumber:347,columnNumber:9},void 0),(0,p.jsxDEV)(`div`,{className:`flex items-center space-x-2 self-start sm:self-auto`,children:[(0,p.jsxDEV)(`button`,{type:`button`,onClick:R,className:`px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer`,children:[(0,p.jsxDEV)(r,{className:`h-4 w-4`},void 0,!1,{fileName:m,lineNumber:379,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{children:`Baixar Ficha em PDF`},void 0,!1,{fileName:m,lineNumber:380,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:374,columnNumber:11},void 0),v&&_&&(0,p.jsxDEV)(`button`,{type:`button`,onClick:_,className:`px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer`,children:`Fechar`},void 0,!1,{fileName:m,lineNumber:383,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:373,columnNumber:9},void 0)]},void 0,!0,{fileName:m,lineNumber:346,columnNumber:7},void 0),(0,p.jsxDEV)(`div`,{children:[(0,p.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider mb-2 flex items-center space-x-1.5`,children:[(0,p.jsxDEV)(t,{className:`h-4 w-4 text-blue-600`},void 0,!1,{fileName:m,lineNumber:397,columnNumber:11},void 0),(0,p.jsxDEV)(`span`,{children:`Enquadramento Académico`},void 0,!1,{fileName:m,lineNumber:398,columnNumber:11},void 0)]},void 0,!0,{fileName:m,lineNumber:396,columnNumber:9},void 0),(0,p.jsxDEV)(`div`,{className:`grid grid-cols-2 sm:grid-cols-4 gap-3`,children:[(0,p.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,p.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Classe`},void 0,!1,{fileName:m,lineNumber:402,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{className:`text-base font-black text-gray-900`,children:b},void 0,!1,{fileName:m,lineNumber:403,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:401,columnNumber:11},void 0),(0,p.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,p.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Turma`},void 0,!1,{fileName:m,lineNumber:407,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{className:`text-base font-black text-gray-900`,children:y?.nome||`A`},void 0,!1,{fileName:m,lineNumber:408,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:406,columnNumber:11},void 0),(0,p.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,p.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Curso`},void 0,!1,{fileName:m,lineNumber:412,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{className:`text-xs font-black text-gray-900 truncate block mt-0.5`,children:x},void 0,!1,{fileName:m,lineNumber:413,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:411,columnNumber:11},void 0),(0,p.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,p.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Turno & Sala`},void 0,!1,{fileName:m,lineNumber:417,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{className:`text-xs font-black text-gray-900 block mt-0.5`,children:[S,` • `,C]},void 0,!0,{fileName:m,lineNumber:418,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:416,columnNumber:11},void 0)]},void 0,!0,{fileName:m,lineNumber:400,columnNumber:9},void 0)]},void 0,!0,{fileName:m,lineNumber:395,columnNumber:7},void 0),(0,p.jsxDEV)(`div`,{children:[(0,p.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider mb-2 flex items-center space-x-1.5`,children:[(0,p.jsxDEV)(o,{className:`h-4 w-4 text-indigo-600`},void 0,!1,{fileName:m,lineNumber:426,columnNumber:11},void 0),(0,p.jsxDEV)(`span`,{children:`Frequência & Assiduidade Escolar`},void 0,!1,{fileName:m,lineNumber:427,columnNumber:11},void 0)]},void 0,!0,{fileName:m,lineNumber:425,columnNumber:9},void 0),(0,p.jsxDEV)(`div`,{className:`grid grid-cols-2 sm:grid-cols-4 gap-3`,children:[(0,p.jsxDEV)(`div`,{className:`p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl`,children:[(0,p.jsxDEV)(`div`,{className:`flex items-center justify-between`,children:[(0,p.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-emerald-800`,children:`Assiduidade`},void 0,!1,{fileName:m,lineNumber:432,columnNumber:15},void 0),(0,p.jsxDEV)(n,{className:`h-3.5 w-3.5 text-emerald-600`},void 0,!1,{fileName:m,lineNumber:433,columnNumber:15},void 0)]},void 0,!0,{fileName:m,lineNumber:431,columnNumber:13},void 0),(0,p.jsxDEV)(`div`,{className:`text-xl font-black text-emerald-700 mt-1`,children:[k,`%`]},void 0,!0,{fileName:m,lineNumber:435,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{className:`text-[10px] text-emerald-600 font-semibold block mt-0.5`,children:k>=85?`Comportamento Regular`:`Atenção aos limites`},void 0,!1,{fileName:m,lineNumber:436,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:430,columnNumber:11},void 0),(0,p.jsxDEV)(`div`,{className:`p-3.5 bg-rose-50 border border-rose-200 rounded-xl`,children:[(0,p.jsxDEV)(`div`,{className:`flex items-center justify-between`,children:[(0,p.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-rose-800`,children:`Faltas Injustificadas`},void 0,!1,{fileName:m,lineNumber:443,columnNumber:15},void 0),(0,p.jsxDEV)(i,{className:`h-3.5 w-3.5 text-rose-600`},void 0,!1,{fileName:m,lineNumber:444,columnNumber:15},void 0)]},void 0,!0,{fileName:m,lineNumber:442,columnNumber:13},void 0),(0,p.jsxDEV)(`div`,{className:`text-xl font-black text-rose-700 mt-1`,children:O},void 0,!1,{fileName:m,lineNumber:446,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{className:`text-[10px] text-rose-600 font-semibold block mt-0.5`,children:`Impacto direto na nota`},void 0,!1,{fileName:m,lineNumber:447,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:441,columnNumber:11},void 0),(0,p.jsxDEV)(`div`,{className:`p-3.5 bg-blue-50 border border-blue-200 rounded-xl`,children:[(0,p.jsxDEV)(`div`,{className:`flex items-center justify-between`,children:[(0,p.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-blue-800`,children:`Faltas Justificadas`},void 0,!1,{fileName:m,lineNumber:454,columnNumber:15},void 0),(0,p.jsxDEV)(l,{className:`h-3.5 w-3.5 text-blue-600`},void 0,!1,{fileName:m,lineNumber:455,columnNumber:15},void 0)]},void 0,!0,{fileName:m,lineNumber:453,columnNumber:13},void 0),(0,p.jsxDEV)(`div`,{className:`text-xl font-black text-blue-700 mt-1`,children:D},void 0,!1,{fileName:m,lineNumber:457,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{className:`text-[10px] text-blue-600 font-semibold block mt-0.5`,children:`Com atestado averbado`},void 0,!1,{fileName:m,lineNumber:458,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:452,columnNumber:11},void 0),(0,p.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 border border-gray-200 rounded-xl`,children:[(0,p.jsxDEV)(`div`,{className:`flex items-center justify-between`,children:[(0,p.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-600`,children:`Total Geral de Faltas`},void 0,!1,{fileName:m,lineNumber:465,columnNumber:15},void 0),(0,p.jsxDEV)(o,{className:`h-3.5 w-3.5 text-gray-500`},void 0,!1,{fileName:m,lineNumber:466,columnNumber:15},void 0)]},void 0,!0,{fileName:m,lineNumber:464,columnNumber:13},void 0),(0,p.jsxDEV)(`div`,{className:`text-xl font-black text-gray-800 mt-1`,children:E},void 0,!1,{fileName:m,lineNumber:468,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{className:`text-[10px] text-gray-500 font-semibold block mt-0.5`,children:[`No ano letivo `,u.anoLectivoActivo]},void 0,!0,{fileName:m,lineNumber:469,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:463,columnNumber:11},void 0)]},void 0,!0,{fileName:m,lineNumber:429,columnNumber:9},void 0)]},void 0,!0,{fileName:m,lineNumber:424,columnNumber:7},void 0),(0,p.jsxDEV)(`div`,{className:`p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3`,children:[(0,p.jsxDEV)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between gap-2`,children:[(0,p.jsxDEV)(`div`,{children:[(0,p.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-700 tracking-wider flex items-center space-x-1.5`,children:[(0,p.jsxDEV)(a,{className:`h-4 w-4 text-emerald-600`},void 0,!1,{fileName:m,lineNumber:481,columnNumber:15},void 0),(0,p.jsxDEV)(`span`,{children:`Emolumentos & Mensalidades por Pagar`},void 0,!1,{fileName:m,lineNumber:482,columnNumber:15},void 0)]},void 0,!0,{fileName:m,lineNumber:480,columnNumber:13},void 0),(0,p.jsxDEV)(`p`,{className:`text-[11px] text-gray-500`,children:`Controlo de pagamentos para regularização junto da tesouraria escolar.`},void 0,!1,{fileName:m,lineNumber:484,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:479,columnNumber:11},void 0),(0,p.jsxDEV)(`div`,{className:`text-right`,children:[(0,p.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Total a Pagar`},void 0,!1,{fileName:m,lineNumber:490,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{className:`text-base font-black ${P>0?`text-rose-600`:`text-emerald-700`}`,children:P>0?`${P.toLocaleString(`pt-AO`)} Kz`:`Totalmente Regularizado`},void 0,!1,{fileName:m,lineNumber:491,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:489,columnNumber:11},void 0)]},void 0,!0,{fileName:m,lineNumber:478,columnNumber:9},void 0),(0,p.jsxDEV)(`div`,{className:`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2`,children:N.map(e=>{let t=M.has(e.nome);return(0,p.jsxDEV)(`div`,{className:`p-2.5 rounded-lg border text-center transition-all ${t?`bg-emerald-50/70 border-emerald-200 text-emerald-800`:`bg-white border-rose-300 text-rose-800 shadow-xs`}`,children:[(0,p.jsxDEV)(`div`,{className:`text-[11px] font-black`,children:e.nome},void 0,!1,{fileName:m,lineNumber:509,columnNumber:17},void 0),(0,p.jsxDEV)(`div`,{className:`text-[10px] font-semibold text-gray-600`,children:[e.valor.toLocaleString(`pt-AO`),` Kz`]},void 0,!0,{fileName:m,lineNumber:510,columnNumber:17},void 0),(0,p.jsxDEV)(`span`,{className:`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-black rounded ${t?`bg-emerald-200 text-emerald-900`:`bg-rose-100 text-rose-800`}`,children:t?`Pago`:`Por Pagar`},void 0,!1,{fileName:m,lineNumber:511,columnNumber:17},void 0)]},e.id,!0,{fileName:m,lineNumber:501,columnNumber:15},void 0)})},void 0,!1,{fileName:m,lineNumber:497,columnNumber:9},void 0)]},void 0,!0,{fileName:m,lineNumber:477,columnNumber:7},void 0),(0,p.jsxDEV)(`div`,{children:[(0,p.jsxDEV)(`div`,{className:`flex items-center justify-between mb-2`,children:[(0,p.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider flex items-center space-x-1.5`,children:[(0,p.jsxDEV)(c,{className:`h-4 w-4 text-blue-600`},void 0,!1,{fileName:m,lineNumber:526,columnNumber:13},void 0),(0,p.jsxDEV)(`span`,{children:`Boletim de Notas do Educando`},void 0,!1,{fileName:m,lineNumber:527,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:525,columnNumber:11},void 0),F&&(0,p.jsxDEV)(`span`,{className:`text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200`,children:[`Trimestre exibido: `,I===`todos`?`Todos os Trimestres`:`${I}º Trimestre`]},void 0,!0,{fileName:m,lineNumber:531,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:524,columnNumber:9},void 0),F?(0,p.jsxDEV)(`div`,{className:`border border-gray-200 rounded-xl overflow-hidden shadow-xs`,children:(0,p.jsxDEV)(`table`,{className:`w-full text-left text-xs`,children:[(0,p.jsxDEV)(`thead`,{className:`bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px]`,children:(0,p.jsxDEV)(`tr`,{children:[(0,p.jsxDEV)(`th`,{className:`p-3`,children:`Disciplina`},void 0,!1,{fileName:m,lineNumber:542,columnNumber:19},void 0),(0,p.jsxDEV)(`th`,{className:`p-3 text-center`,children:`Trimestre`},void 0,!1,{fileName:m,lineNumber:543,columnNumber:19},void 0),(0,p.jsxDEV)(`th`,{className:`p-3 text-center`,children:`MAC`},void 0,!1,{fileName:m,lineNumber:544,columnNumber:19},void 0),(0,p.jsxDEV)(`th`,{className:`p-3 text-center`,children:`NPP`},void 0,!1,{fileName:m,lineNumber:545,columnNumber:19},void 0),(0,p.jsxDEV)(`th`,{className:`p-3 text-center`,children:`Média Trimestral`},void 0,!1,{fileName:m,lineNumber:546,columnNumber:19},void 0),(0,p.jsxDEV)(`th`,{className:`p-3 text-center`,children:`Resultado`},void 0,!1,{fileName:m,lineNumber:547,columnNumber:19},void 0)]},void 0,!0,{fileName:m,lineNumber:541,columnNumber:17},void 0)},void 0,!1,{fileName:m,lineNumber:540,columnNumber:15},void 0),(0,p.jsxDEV)(`tbody`,{className:`divide-y divide-gray-100`,children:L.length>0?L.map(e=>{let t=T.find(t=>t.id===e.disciplinaId)?.nome||e.disciplinaNome||`Disciplina`,n=e.mediaTrimestral>=9.5;return(0,p.jsxDEV)(`tr`,{className:`hover:bg-gray-50/50`,children:[(0,p.jsxDEV)(`td`,{className:`p-3 font-bold text-gray-900`,children:t},void 0,!1,{fileName:m,lineNumber:557,columnNumber:25},void 0),(0,p.jsxDEV)(`td`,{className:`p-3 text-center font-semibold text-gray-700`,children:[e.trimestre,`º`]},void 0,!0,{fileName:m,lineNumber:558,columnNumber:25},void 0),(0,p.jsxDEV)(`td`,{className:`p-3 text-center font-mono text-gray-700`,children:e.mac?.toFixed(1)||`—`},void 0,!1,{fileName:m,lineNumber:559,columnNumber:25},void 0),(0,p.jsxDEV)(`td`,{className:`p-3 text-center font-mono text-gray-700`,children:(e.npp??e.provaTrimestral)?.toFixed(1)||`—`},void 0,!1,{fileName:m,lineNumber:560,columnNumber:25},void 0),(0,p.jsxDEV)(`td`,{className:`p-3 text-center font-black ${n?`text-emerald-700`:`text-rose-700`}`,children:e.mediaTrimestral?.toFixed(1)},void 0,!1,{fileName:m,lineNumber:561,columnNumber:25},void 0),(0,p.jsxDEV)(`td`,{className:`p-3 text-center`,children:(0,p.jsxDEV)(`span`,{className:`px-2 py-0.5 text-[10px] font-bold rounded-full ${n?`bg-emerald-100 text-emerald-800`:`bg-rose-100 text-rose-800`}`,children:n?`Aprovado`:`Não Aprovado`},void 0,!1,{fileName:m,lineNumber:565,columnNumber:27},void 0)},void 0,!1,{fileName:m,lineNumber:564,columnNumber:25},void 0)]},e.id,!0,{fileName:m,lineNumber:556,columnNumber:23},void 0)}):(0,p.jsxDEV)(`tr`,{children:(0,p.jsxDEV)(`td`,{colSpan:6,className:`p-6 text-center text-xs text-gray-500`,children:`Não existem notas homologadas e publicadas para o trimestre selecionado.`},void 0,!1,{fileName:m,lineNumber:576,columnNumber:21},void 0)},void 0,!1,{fileName:m,lineNumber:575,columnNumber:19},void 0)},void 0,!1,{fileName:m,lineNumber:550,columnNumber:15},void 0)]},void 0,!0,{fileName:m,lineNumber:539,columnNumber:13},void 0)},void 0,!1,{fileName:m,lineNumber:538,columnNumber:11},void 0):(0,p.jsxDEV)(`div`,{className:`p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-900`,children:[(0,p.jsxDEV)(s,{className:`h-5 w-5 text-amber-600 shrink-0 mt-0.5`},void 0,!1,{fileName:m,lineNumber:586,columnNumber:13},void 0),(0,p.jsxDEV)(`div`,{className:`space-y-0.5 text-xs`,children:[(0,p.jsxDEV)(`span`,{className:`font-bold block`,children:`Acesso ao Boletim Restrito pelo Diretor Geral`},void 0,!1,{fileName:m,lineNumber:588,columnNumber:15},void 0),(0,p.jsxDEV)(`p`,{className:`text-amber-800`,children:`A visualização do boletim de notas está temporariamente suspensa pela Direção da Instituição. Poderá consultar presencialmente na Secretaria da escola ou aguardar a homologação oficial no portal.`},void 0,!1,{fileName:m,lineNumber:589,columnNumber:15},void 0)]},void 0,!0,{fileName:m,lineNumber:587,columnNumber:13},void 0)]},void 0,!0,{fileName:m,lineNumber:585,columnNumber:11},void 0)]},void 0,!0,{fileName:m,lineNumber:523,columnNumber:7},void 0),(0,p.jsxDEV)(`div`,{className:`p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center justify-between`,children:[(0,p.jsxDEV)(`span`,{children:[`O documento PDF baixado através deste portal contém apenas o nome oficial da escola e a data/hora da emissão, `,(0,p.jsxDEV)(`strong`,{children:`sem carimbo nem assinatura institucional`},void 0,!1,{fileName:m,lineNumber:600,columnNumber:121},void 0),`, sendo exclusivo para acompanhamento familiar.`]},void 0,!0,{fileName:m,lineNumber:599,columnNumber:9},void 0),(0,p.jsxDEV)(`button`,{type:`button`,onClick:R,className:`text-blue-700 hover:text-blue-900 font-bold underline shrink-0 ml-3 cursor-pointer`,children:`Baixar agora`},void 0,!1,{fileName:m,lineNumber:602,columnNumber:9},void 0)]},void 0,!0,{fileName:m,lineNumber:598,columnNumber:7},void 0)]},void 0,!0,{fileName:m,lineNumber:344,columnNumber:5},void 0)};export{h as ParentStudentReportView};
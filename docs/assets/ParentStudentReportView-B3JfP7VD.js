import"./rolldown-runtime-hePW80VL.js";import{Dn as e,Fn as t,Ht as n,Ot as r,Ut as i,Y as a,dn as o,in as s,ln as c,tn as l}from"./vendor-icons-CAR85T1z.js";import{t as u}from"./vendor-react-DCcfLBTh.js";import{v as d}from"./index-BVvRV3s2.js";import{t as f}from"./pdfGenerator-DsbCz_W2.js";import{b as p}from"./academicHierarchyService-Cq3V8VkJ.js";import{n as m}from"./dateFormat-SosUOu7Q.js";import{n as h}from"./curriculoAngola-CyGs_Idb.js";t();var g=u(),_=({aluno:t,escola:u,turma:_,notas:v,onFechar:y,modoModal:b=!1})=>{let x=_||d.getTurmas().find(e=>e.id===t.turmaId&&(e.escolaId===t.escolaId||e.escolaId===u.id)),S=t.classeId||x?.classe||`Não definida`,C=p(S),w=C&&(x?.curso||t.curso)||``,T=x?.turno||`Manhã`,E=x?.sala||`Sala 01`,D=(v||d.getNotasConsolidadas()).filter(e=>e.alunoId===t.id),O=d.getDisciplinas(u.id),k=d.obterPresencasAlunos().filter(e=>e.alunoId===t.id),A=D.reduce((e,t)=>e+(t.faltas||0),0),j=k.length>0?k.filter(e=>e.estado===`Falta_Justificada`).length:0,M=k.length>0?k.filter(e=>e.estado===`Falta_Injustificada`).length:A,N=k.length>0?j+M:A,P=k.length>0?k.length:180,F=k.length>0?k.filter(e=>e.estado===`Presente`).length:Math.max(0,180-M),I=P>0?Math.max(0,Math.min(100,Math.round(F/P*100))):100,L=d.getTransacoesFinanceiras(u.id).filter(e=>e.alunoId===t.id&&e.status===`Confirmado`),R=[{id:`Outubro`,nome:`Outubro`,valor:6500},{id:`Novembro`,nome:`Novembro`,valor:6500},{id:`Dezembro`,nome:`Dezembro`,valor:6500},{id:`Janeiro`,nome:`Janeiro`,valor:6500},{id:`Fevereiro`,nome:`Fevereiro`,valor:6500},{id:`Março`,nome:`Março`,valor:6500},{id:`Abril`,nome:`Abril`,valor:6500},{id:`Maio`,nome:`Maio`,valor:6500},{id:`Junho`,nome:`Junho`,valor:6500}],z=new Set;(t.propinaStatus===`Regularizada`||t.propinaStatus===`Isento`)&&R.slice(0,6).forEach(e=>z.add(e.nome)),L.forEach(e=>{e.mesReferencia&&R.forEach(t=>{e.mesReferencia?.toLowerCase().includes(t.nome.toLowerCase())&&z.add(t.nome)})}),new Date().getMonth();let B=R.filter((e,t)=>t<=5),V=B.filter(e=>!z.has(e.nome)).reduce((e,t)=>e+t.valor,0),H=u.permitirBoletimNoPortalEncarregado===!0,U=u.trimestreBoletimPortal||`todos`,W=D.filter(e=>U===`todos`||String(e.trimestre)===String(U)),G=async()=>{let e=document.getElementById(`ficha-educando-encarregado`);e&&await f(e,`Ficha_Educando_${(t.codigoMatricula||t.nomeCompleto).replace(/[\/\s]+/g,`_`)}`,{orientation:`portrait`,format:`a4`})};return(0,g.jsxs)(`div`,{id:`ficha-educando-encarregado`,className:`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-6 p-5 sm:p-6`,children:[(0,g.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200`,children:[(0,g.jsxs)(`div`,{className:`flex items-center space-x-3.5`,children:[(0,g.jsx)(`div`,{className:`h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-black text-xl flex items-center justify-center shadow-md overflow-hidden shrink-0 border-2 border-white`,children:t.fotoUrl&&t.fotoUrl.trim()!==``?(0,g.jsx)(`img`,{src:t.fotoUrl,alt:t.nomeCompleto,className:`h-full w-full object-cover`}):t.nomeCompleto.substring(0,2).toUpperCase()}),(0,g.jsxs)(`div`,{children:[(0,g.jsxs)(`div`,{className:`flex items-center space-x-2`,children:[(0,g.jsx)(`span`,{className:`px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800`,children:`Portal dos Encarregados`}),(0,g.jsx)(`span`,{className:`text-xs text-gray-500 font-medium`,children:u.nomeOficial})]}),(0,g.jsx)(`h2`,{className:`text-lg sm:text-xl font-black text-gray-900 mt-0.5`,children:t.nomeCompleto}),(0,g.jsxs)(`p`,{className:`text-xs text-gray-500`,children:[`Processo: `,(0,g.jsx)(`span`,{className:`font-mono font-bold text-gray-800`,children:t.codigoMatricula}),` • BI: `,(0,g.jsx)(`span`,{className:`font-mono text-gray-700`,children:t.numeroBI||t.numeroDocumento||`Pendente`})]})]})]}),(0,g.jsxs)(`div`,{className:`flex items-center space-x-2 self-start sm:self-auto no-print`,children:[(0,g.jsxs)(`button`,{type:`button`,onClick:G,className:`px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer`,children:[(0,g.jsx)(n,{className:`h-4 w-4`}),(0,g.jsx)(`span`,{children:`Baixar Ficha em PDF`})]}),(0,g.jsx)(`button`,{type:`button`,onClick:()=>{let e=m(new Date),n=`
      <!DOCTYPE html>
      <html lang="pt-AO">
      <head>
        <meta charset="utf-8">
        <title>Ficha do Educando - ${t.nomeCompleto}</title>
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
          Informações baixadas em: <strong>${e}</strong>
        </div>

        <!-- 1. DADOS DO ESTUDANTE -->
        <div class="section">
          <div class="section-title">1. Identificação do Discente</div>
          <div class="grid-3">
            <div class="field">
              <span class="field-label">Nome Completo:</span>
              <span class="field-val">${t.nomeCompleto}</span>
            </div>
            <div class="field">
              <span class="field-label">N.º de Processo / Matrícula:</span>
              <span class="field-val">${t.codigoMatricula}</span>
            </div>
            <div class="field">
              <span class="field-label">Bilhete de Identidade (BI):</span>
              <span class="field-val">${t.numeroBI||t.numeroDocumento||`Pendente`}</span>
            </div>
            <div class="field">
              <span class="field-label">Gênero:</span>
              <span class="field-val">${t.genero===`F`?`Feminino`:`Masculino`}</span>
            </div>
            <div class="field">
              <span class="field-label">Encarregado Registado:</span>
              <span class="field-val">${t.nomeEncarregado||`Não especificado`}</span>
            </div>
            <div class="field">
              <span class="field-label">Contacto do Encarregado:</span>
              <span class="field-val">${t.telefoneEncarregado||`Não especificado`}</span>
            </div>
          </div>
        </div>

        <!-- 2. ENQUADRAMENTO PEDAGÓGICO -->
        <div class="section">
          <div class="section-title">2. Enquadramento Pedagógico</div>
          <div class="grid-4">
            <div class="card-stat">
              <div class="card-stat-label">Classe</div>
              <div class="card-stat-num" style="color: #1d4ed8;">${S}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Turma</div>
              <div class="card-stat-num" style="color: #0f766e;">${x?.nome||`A`}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Turno / Sala</div>
              <div class="card-stat-num" style="font-size: 12pt; margin-top: 4px; color: #4338ca;">${T} • ${E}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Ano Letivo</div>
              <div class="card-stat-num" style="font-size: 13pt; margin-top: 4px; color: #b45309;">${u.anoLectivoActivo}</div>
            </div>
          </div>
          ${C&&w?`
          <div style="margin-top: 8px; font-size: 9.5pt;">
            Curso / Especialidade: <strong>${w}</strong>
          </div>`:``}
        </div>

        <!-- 3. ASSIDUIDADE E FREQUÊNCIA -->
        <div class="section">
          <div class="section-title">3. Assiduidade & Frequência Escolar</div>
          <div class="grid-4">
            <div class="card-stat">
              <div class="card-stat-label">Taxa de Assiduidade</div>
              <div class="card-stat-num" style="color: ${I>=85?`#166534`:`#dc2626`};">${I}%</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Faltas Injustificadas</div>
              <div class="card-stat-num" style="color: #dc2626;">${M}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Faltas Justificadas</div>
              <div class="card-stat-num" style="color: #2563eb;">${j}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Total de Faltas</div>
              <div class="card-stat-num" style="color: #475569;">${N}</div>
            </div>
          </div>
          <div style="margin-top: 8px; font-size: 9pt; color: #64748b;">
            Situação disciplinar de frequência: <strong style="color: ${I>=85?`#166534`:`#dc2626`};">${I>=85?`Assíduo e Regular`:`Atenção às Faltas`}</strong>.
          </div>
        </div>

        <!-- 4. SITUAÇÃO FINANCEIRA E EMOLUMENTOS POR PAGAR -->
        <div class="section">
          <div class="section-title">4. Situação Financeira • Emolumentos & Propinas</div>
          <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 9.5pt;">Total Pendente por Pagar:</span>
            <strong style="font-size: 13pt; color: ${V>0?`#dc2626`:`#166534`};">
              ${V.toLocaleString(`pt-AO`)} Kz
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
              ${B.map(e=>{let t=z.has(e.nome);return`
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
          ${H?`
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
                ${W.length>0?W.map(e=>{let t=O.find(t=>t.id===e.disciplinaId)?.nome||e.disciplinaNome||`Disciplina`,n=e.mediaTrimestral>=9.5;return`
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
    `;h(`Ficha_Educando_${t.codigoMatricula}.html`,`Ficha do Educando - ${t.nomeCompleto}`,n)},className:`px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer`,children:(0,g.jsx)(`span`,{children:`HTML`})}),b&&y&&(0,g.jsx)(`button`,{type:`button`,onClick:y,className:`px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer`,children:`Fechar`})]})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsxs)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider mb-2 flex items-center space-x-1.5`,children:[(0,g.jsx)(r,{className:`h-4 w-4 text-blue-600`}),(0,g.jsx)(`span`,{children:`Enquadramento Académico`})]}),(0,g.jsxs)(`div`,{className:`grid grid-cols-2 ${C&&w?`sm:grid-cols-4`:`sm:grid-cols-3`} gap-3`,children:[(0,g.jsxs)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,g.jsx)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Classe`}),(0,g.jsx)(`span`,{className:`text-base font-black text-gray-900`,children:S})]}),(0,g.jsxs)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,g.jsx)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Turma`}),(0,g.jsx)(`span`,{className:`text-base font-black text-gray-900`,children:x?.nome||`A`})]}),C&&w&&(0,g.jsxs)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200 min-w-0`,children:[(0,g.jsx)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Curso`}),(0,g.jsx)(`span`,{className:`text-xs font-black text-gray-900 whitespace-normal break-words block mt-0.5`,children:w})]}),(0,g.jsxs)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,g.jsx)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Turno & Sala`}),(0,g.jsxs)(`span`,{className:`text-xs font-black text-gray-900 block mt-0.5`,children:[T,` • `,E]})]})]})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsxs)(`div`,{className:`flex items-center justify-between mb-2`,children:[(0,g.jsxs)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider flex items-center space-x-1.5`,children:[(0,g.jsx)(e,{className:`h-4 w-4 text-blue-600`}),(0,g.jsx)(`span`,{children:`Boletim de Notas do Educando`})]}),H&&(0,g.jsx)(`span`,{className:`text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200`,children:U===`todos`?`Todos os Trimestres`:`${U}º Trimestre`})]}),H?(0,g.jsx)(`div`,{className:`border border-gray-200 rounded-xl overflow-hidden shadow-xs`,children:(0,g.jsxs)(`table`,{className:`w-full text-left text-xs`,children:[(0,g.jsx)(`thead`,{className:`bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px]`,children:(0,g.jsxs)(`tr`,{children:[(0,g.jsx)(`th`,{className:`p-3`,children:`Disciplina`}),(0,g.jsx)(`th`,{className:`p-3 text-center`,children:`Trimestre`}),(0,g.jsx)(`th`,{className:`p-3 text-center`,children:`MAC`}),(0,g.jsx)(`th`,{className:`p-3 text-center`,children:`NPP`}),(0,g.jsx)(`th`,{className:`p-3 text-center`,children:`Média Trimestral`}),(0,g.jsx)(`th`,{className:`p-3 text-center`,children:`Resultado`})]})}),(0,g.jsx)(`tbody`,{className:`divide-y divide-gray-100`,children:W.length>0?W.map(e=>{let t=O.find(t=>t.id===e.disciplinaId)?.nome||e.disciplinaNome||`Disciplina`,n=e.mediaTrimestral>=9.5;return(0,g.jsxs)(`tr`,{className:`hover:bg-gray-50/50`,children:[(0,g.jsx)(`td`,{className:`p-3 font-bold text-gray-900`,children:t}),(0,g.jsxs)(`td`,{className:`p-3 text-center font-semibold text-gray-700 tabular-nums`,children:[e.trimestre,`º`]}),(0,g.jsx)(`td`,{className:`p-3 text-center font-mono text-gray-700 tabular-nums`,children:e.mac?.toFixed(1)||`—`}),(0,g.jsx)(`td`,{className:`p-3 text-center font-mono text-gray-700 tabular-nums`,children:(e.npp??e.provaTrimestral)?.toFixed(1)||`—`}),(0,g.jsx)(`td`,{className:`p-3 text-center font-black tabular-nums ${n?`text-emerald-700`:`text-rose-700`}`,children:e.mediaTrimestral?.toFixed(1)}),(0,g.jsx)(`td`,{className:`p-3 text-center`,children:(0,g.jsx)(`span`,{className:`px-2 py-0.5 text-[10px] font-bold rounded-md ${n?`bg-emerald-100 text-emerald-800`:`bg-rose-100 text-rose-800`}`,children:n?`Aprovado`:`Não Aprovado`})})]},e.id)}):(0,g.jsx)(`tr`,{children:(0,g.jsx)(`td`,{colSpan:6,className:`p-6 text-center text-xs text-gray-500`,children:`Não existem notas homologadas e publicadas para o trimestre selecionado.`})})})]})}):(0,g.jsxs)(`div`,{className:`p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-900`,children:[(0,g.jsx)(o,{className:`h-5 w-5 text-amber-600 shrink-0 mt-0.5`}),(0,g.jsxs)(`div`,{className:`space-y-0.5 text-xs`,children:[(0,g.jsx)(`span`,{className:`font-bold block`,children:`Acesso ao Boletim Restrito pelo Diretor Geral`}),(0,g.jsx)(`p`,{className:`text-amber-800`,children:`A visualização do boletim de notas está temporariamente suspensa pela Direção da Instituição. Poderá consultar presencialmente na Secretaria da escola ou aguardar a homologação oficial no portal.`})]})]})]}),(0,g.jsxs)(`div`,{children:[(0,g.jsxs)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider mb-2 flex items-center space-x-1.5`,children:[(0,g.jsx)(l,{className:`h-4 w-4 text-indigo-600`}),(0,g.jsx)(`span`,{children:`Frequência & Assiduidade Escolar`})]}),(0,g.jsxs)(`div`,{className:`grid grid-cols-2 sm:grid-cols-4 gap-3`,children:[(0,g.jsxs)(`div`,{className:`p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl`,children:[(0,g.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,g.jsx)(`span`,{className:`text-[10px] uppercase font-bold text-emerald-800`,children:`Assiduidade`}),(0,g.jsx)(a,{className:`h-3.5 w-3.5 text-emerald-600`})]}),(0,g.jsxs)(`div`,{className:`text-xl font-black text-emerald-700 mt-1 tabular-nums`,children:[I,`%`]}),(0,g.jsx)(`span`,{className:`text-[10px] text-emerald-600 font-semibold block mt-0.5`,children:I>=85?`Comportamento Regular`:`Atenção aos limites`})]}),(0,g.jsxs)(`div`,{className:`p-3.5 bg-rose-50 border border-rose-200 rounded-xl`,children:[(0,g.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,g.jsx)(`span`,{className:`text-[10px] uppercase font-bold text-rose-800`,children:`Faltas Injustificadas`}),(0,g.jsx)(s,{className:`h-3.5 w-3.5 text-rose-600`})]}),(0,g.jsx)(`div`,{className:`text-xl font-black text-rose-700 mt-1 tabular-nums`,children:M}),(0,g.jsx)(`span`,{className:`text-[10px] text-rose-600 font-semibold block mt-0.5`,children:`Impacto direto na pauta`})]}),(0,g.jsxs)(`div`,{className:`p-3.5 bg-blue-50 border border-blue-200 rounded-xl`,children:[(0,g.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,g.jsx)(`span`,{className:`text-[10px] uppercase font-bold text-blue-800`,children:`Faltas Justificadas`}),(0,g.jsx)(c,{className:`h-3.5 w-3.5 text-blue-600`})]}),(0,g.jsx)(`div`,{className:`text-xl font-black text-blue-700 mt-1 tabular-nums`,children:j}),(0,g.jsx)(`span`,{className:`text-[10px] text-blue-600 font-semibold block mt-0.5`,children:`Com justificação averbada`})]}),(0,g.jsxs)(`div`,{className:`p-3.5 bg-gray-50 border border-gray-200 rounded-xl`,children:[(0,g.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,g.jsx)(`span`,{className:`text-[10px] uppercase font-bold text-gray-600`,children:`Total Geral de Faltas`}),(0,g.jsx)(l,{className:`h-3.5 w-3.5 text-gray-500`})]}),(0,g.jsx)(`div`,{className:`text-xl font-black text-gray-800 mt-1 tabular-nums`,children:N}),(0,g.jsxs)(`span`,{className:`text-[10px] text-gray-500 font-semibold block mt-0.5`,children:[`Ano letivo `,u.anoLectivoActivo]})]})]})]}),(0,g.jsxs)(`div`,{className:`p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3`,children:[(0,g.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between gap-2`,children:[(0,g.jsxs)(`div`,{children:[(0,g.jsxs)(`h3`,{className:`text-xs font-black uppercase text-gray-700 tracking-wider flex items-center space-x-1.5`,children:[(0,g.jsx)(i,{className:`h-4 w-4 text-emerald-600`}),(0,g.jsx)(`span`,{children:`Emolumentos & Mensalidades por Pagar`})]}),(0,g.jsx)(`p`,{className:`text-[11px] text-gray-500`,children:`Controlo de pagamentos para regularização junto da tesouraria escolar.`})]}),(0,g.jsxs)(`div`,{className:`text-right`,children:[(0,g.jsx)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Total a Pagar`}),(0,g.jsx)(`span`,{className:`text-base font-black tabular-nums ${V>0?`text-rose-600`:`text-emerald-700`}`,children:V>0?`${V.toLocaleString(`pt-AO`)} Kz`:`Totalmente Regularizado`})]})]}),(0,g.jsx)(`div`,{className:`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2`,children:B.map(e=>{let t=z.has(e.nome);return(0,g.jsxs)(`div`,{className:`p-2.5 rounded-lg border text-center transition-all ${t?`bg-emerald-50/70 border-emerald-200 text-emerald-800`:`bg-white border-rose-300 text-rose-800 shadow-xs`}`,children:[(0,g.jsx)(`div`,{className:`text-[11px] font-black`,children:e.nome}),(0,g.jsxs)(`div`,{className:`text-[10px] font-semibold text-gray-600 tabular-nums`,children:[e.valor.toLocaleString(`pt-AO`),` Kz`]}),(0,g.jsx)(`span`,{className:`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-black rounded ${t?`bg-emerald-200 text-emerald-900`:`bg-rose-100 text-rose-800`}`,children:t?`Pago`:`Por Pagar`})]},e.id)})})]}),(0,g.jsxs)(`div`,{className:`p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center justify-between`,children:[(0,g.jsxs)(`span`,{children:[`O documento PDF baixado através deste portal contém apenas o nome oficial da escola e a data/hora da emissão, `,(0,g.jsx)(`strong`,{children:`sem carimbo nem assinatura institucional`}),`, sendo exclusivo para acompanhamento familiar.`]}),(0,g.jsx)(`button`,{type:`button`,onClick:G,className:`text-blue-700 hover:text-blue-900 font-bold underline shrink-0 ml-3 cursor-pointer`,children:`Baixar agora`})]})]})};export{_ as ParentStudentReportView};
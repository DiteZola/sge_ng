import"./rolldown-runtime-hePW80VL.js";import{It as e,M as t,Rn as n,Xn as r,Xt as i,Zt as a,bn as ee,et as o,pn as te,un as s,vn as ne,zn as c}from"./vendor-icons-UhbuyM8N.js";import{t as l}from"./vendor-react-DbctoR_D.js";import{r as u}from"./storage-BpiwYpwA.js";import{U as d,W as f}from"./index-CrJQ8Pmk.js";import{t as p}from"./pdfGenerator-DE3E-a4z.js";import{n as m}from"./curriculoAngola-BHWm_EZq.js";import{n as re}from"./dateFormat-SosUOu7Q.js";r();var h=l(),g=`/app/applet/src/components/ParentStudentReportView.tsx`,_=({aluno:r,escola:l,turma:_,notas:v,onFechar:y,modoModal:ie=!1})=>{let b=_||u.getTurmas().find(e=>e.id===r.turmaId&&(e.escolaId===r.escolaId||e.escolaId===l.id)),x=r.classeId||b?.classe||`Não definida`,S=d(x),C=S&&(b?.curso||r.curso)||``,w=b?.turno||`Manhã`,T=b?.sala||`Sala 01`,E=r.anoLectivo||r.anoMatricula||b?.anoLectivo||l.anoLectivoActivo||``,D=(v||u.getNotasConsolidadas()).filter(e=>e.alunoId===r.id&&(!E||!e.anoLectivo||e.anoLectivo===E)),O=u.getDisciplinas(l.id,E),k=u.obterPresencasAlunos().filter(e=>e.alunoId===r.id&&(!E||!e.anoLectivo||e.anoLectivo===E)),A=D.reduce((e,t)=>e+(t.faltas||0),0),j=k.length>0?k.filter(e=>e.estado===`Falta_Justificada`).length:0,M=k.length>0?k.filter(e=>e.estado===`Falta_Injustificada`).length:A,N=k.length>0?j+M:A,P=k.length>0?k.length:180,F=k.length>0?k.filter(e=>e.estado===`Presente`).length:Math.max(0,180-M),I=P>0?Math.max(0,Math.min(100,Math.round(F/P*100))):100,L=u.getConfiguracaoFinanceira(l.id),R=u.getTransacoesFinanceiras(l.id,E).filter(e=>e.alunoId===r.id&&e.status===`Confirmado`),z=f(x),B=L.propinasPorClasse?.[z]??L.propinasPorClasse?.[x]??6500,V=(L.mesesPropinasAtivos&&L.mesesPropinasAtivos.length>0?L.mesesPropinasAtivos:[`Outubro`,`Novembro`,`Dezembro`,`Janeiro`,`Fevereiro`,`Março`,`Abril`,`Maio`,`Junho`]).map(e=>({id:e,nome:e,valor:B})),H=new Set;(r.propinaStatus===`Regularizada`||r.propinaStatus===`Isento`)&&V.forEach(e=>H.add(e.nome)),R.forEach(e=>{e.mesReferencia&&V.forEach(t=>{e.mesReferencia?.toLowerCase().includes(t.nome.toLowerCase())&&H.add(t.nome)})});let U=e=>({setembro:0,outubro:1,novembro:2,dezembro:3,janeiro:4,fevereiro:5,março:6,marco:6,abril:7,maio:8,junho:9,julho:10,agosto:11})[e.trim().toLowerCase()]??0,W=(new Date().getMonth()+4)%12,G=V.filter(e=>U(e.nome)<=W),K=V,q=G.filter(e=>!H.has(e.nome)).reduce((e,t)=>e+t.valor,0),J=u.getMensagens().filter(e=>{if(e.escolaId!==l.id||e.remetentePapel===`AdminGeral`||e.destinatarioId===`admin-geral`)return!1;let t=e.destinatarioTipo||(e.tipo===`GERAL`?`Todos`:void 0);return!(t!==`Todos`&&t!==`Encarregados`||t===`Encarregados`&&(e.classeDestino&&f(e.classeDestino)!==f(x)||e.turmaIdDestino&&e.turmaIdDestino!==r.turmaId))}).sort((e,t)=>new Date(t.criadaEm||t.dataHora||0).getTime()-new Date(e.criadaEm||e.dataHora||0).getTime()).slice(0,12),Y=(r.ocorrencias||[]).filter(e=>e.statusAprovacao!==`Pendente`&&e.statusAprovacao!==`Rejeitada`&&e.aprovadoCoordenador!==!1&&e.aprovadoSubdiretor!==!1),X=l.permitirBoletimNoPortalEncarregado===!0,Z=l.trimestreBoletimPortal||`todos`,Q=D.filter(e=>Z===`todos`||String(e.trimestre)===String(Z)),$=async()=>{let e=document.getElementById(`ficha-educando-encarregado`);e&&await p(e,`Ficha_Educando_${(r.codigoMatricula||r.nomeCompleto).replace(/[\/\s]+/g,`_`)}`,{orientation:`portrait`,format:`a4`})};return(0,h.jsxDEV)(`div`,{id:`ficha-educando-encarregado`,className:`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-6 p-5 sm:p-6`,children:[(0,h.jsxDEV)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200`,children:[(0,h.jsxDEV)(`div`,{className:`flex items-center space-x-3.5`,children:[(0,h.jsxDEV)(`div`,{className:`h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-black text-xl flex items-center justify-center shadow-md overflow-hidden shrink-0 border-2 border-white`,children:r.fotoUrl&&r.fotoUrl.trim()!==``?(0,h.jsxDEV)(`img`,{src:r.fotoUrl,alt:r.nomeCompleto,className:`h-full w-full object-cover`},void 0,!1,{fileName:g,lineNumber:418,columnNumber:15},void 0):r.nomeCompleto.substring(0,2).toUpperCase()},void 0,!1,{fileName:g,lineNumber:416,columnNumber:11},void 0),(0,h.jsxDEV)(`div`,{children:[(0,h.jsxDEV)(`div`,{className:`flex items-center space-x-2`,children:[(0,h.jsxDEV)(`span`,{className:`px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800`,children:`Portal dos Encarregados`},void 0,!1,{fileName:g,lineNumber:425,columnNumber:15},void 0),(0,h.jsxDEV)(`span`,{className:`text-xs text-gray-500 font-medium`,children:l.nomeOficial},void 0,!1,{fileName:g,lineNumber:428,columnNumber:15},void 0)]},void 0,!0,{fileName:g,lineNumber:424,columnNumber:13},void 0),(0,h.jsxDEV)(`h2`,{className:`text-lg sm:text-xl font-black text-gray-900 mt-0.5`,children:r.nomeCompleto},void 0,!1,{fileName:g,lineNumber:432,columnNumber:13},void 0),(0,h.jsxDEV)(`p`,{className:`text-xs text-gray-500`,children:[`Processo: `,(0,h.jsxDEV)(`span`,{className:`font-mono font-bold text-gray-800`,children:r.codigoMatricula},void 0,!1,{fileName:g,lineNumber:436,columnNumber:25},void 0),` • BI: `,(0,h.jsxDEV)(`span`,{className:`font-mono text-gray-700`,children:r.numeroBI||r.numeroDocumento||`Pendente`},void 0,!1,{fileName:g,lineNumber:436,columnNumber:114},void 0)]},void 0,!0,{fileName:g,lineNumber:435,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:423,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:415,columnNumber:9},void 0),(0,h.jsxDEV)(`div`,{className:`flex items-center space-x-2 self-start sm:self-auto no-print`,children:[(0,h.jsxDEV)(`button`,{type:`button`,onClick:$,className:`px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer`,children:[(0,h.jsxDEV)(i,{className:`h-4 w-4`},void 0,!1,{fileName:g,lineNumber:447,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{children:`Baixar Ficha em PDF`},void 0,!1,{fileName:g,lineNumber:448,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:442,columnNumber:11},void 0),(0,h.jsxDEV)(`button`,{type:`button`,onClick:()=>{let e=re(new Date),t=`
      <!DOCTYPE html>
      <html lang="pt-AO">
      <head>
        <meta charset="utf-8">
        <title>${r.genero===`F`?`Ficha da Educanda`:`Ficha do Educando`} - ${r.nomeCompleto}</title>
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
          <h1 class="inst-title">${l.nomeOficial}</h1>
          <div class="inst-sub">${l.municipio||`Município`} • ${l.provincia||`Província`}</div>
          <div class="doc-badge">${r.genero===`F`?`Portal dos Encarregados • Ficha Informativa da Educanda`:`Portal dos Encarregados • Ficha Informativa do Educando`}</div>
        </div>

        <div class="meta-download">
          Informações baixadas em: <strong>${e}</strong>
        </div>

        <!-- 1. DADOS DO ESTUDANTE -->
        <div class="section">
          <div class="section-title">${r.genero===`F`?`1. Identificação da Educanda`:`1. Identificação do Educando`}</div>
          <div class="grid-3">
            <div class="field">
              <span class="field-label">Nome Completo:</span>
              <span class="field-val">${r.nomeCompleto}</span>
            </div>
            <div class="field">
              <span class="field-label">N.º de Processo / Matrícula:</span>
              <span class="field-val">${r.codigoMatricula}</span>
            </div>
            <div class="field">
              <span class="field-label">Bilhete de Identidade (BI):</span>
              <span class="field-val">${r.numeroBI||r.numeroDocumento||`Pendente`}</span>
            </div>
            <div class="field">
              <span class="field-label">Gênero:</span>
              <span class="field-val">${r.genero===`F`?`Feminino`:`Masculino`}</span>
            </div>
            <div class="field">
              <span class="field-label">Encarregado Registado:</span>
              <span class="field-val">${r.nomeEncarregado||`Não especificado`}</span>
            </div>
            <div class="field">
              <span class="field-label">Contacto do Encarregado:</span>
              <span class="field-val">${r.telefoneEncarregado||`Não especificado`}</span>
            </div>
          </div>
        </div>

        <!-- 2. ENQUADRAMENTO PEDAGÓGICO -->
        <div class="section">
          <div class="section-title">2. Enquadramento Pedagógico</div>
          <div class="grid-4">
            <div class="card-stat">
              <div class="card-stat-label">Classe</div>
              <div class="card-stat-num" style="color: #1d4ed8;">${x}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Turma</div>
              <div class="card-stat-num" style="color: #0f766e;">${b?.nome||`A`}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Turno / Sala</div>
              <div class="card-stat-num" style="font-size: 12pt; margin-top: 4px; color: #4338ca;">${w} • ${T}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Ano Letivo</div>
              <div class="card-stat-num" style="font-size: 13pt; margin-top: 4px; color: #b45309;">${l.anoLectivoActivo}</div>
            </div>
          </div>
          ${S&&C?`
          <div style="margin-top: 8px; font-size: 9.5pt;">
            Curso / Especialidade: <strong>${C}</strong>
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
            <strong style="font-size: 13pt; color: ${q>0?`#dc2626`:`#166534`};">
              ${q.toLocaleString(`pt-AO`)} Kz
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
              ${K.map(e=>{let t=H.has(e.nome);return`
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
          ${X?`
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
                ${Q.length>0?Q.map(e=>{let t=O.find(t=>t.id===e.disciplinaId)?.nome||e.disciplinaNome||`Disciplina`,n=e.mediaTrimestral>=9.5;return`
                    <tr>
                      <td><strong>${t}</strong></td>
                      <td style="text-align: center;">${e.trimestre}º</td>
                      <td style="text-align: center;">${e.mac?.toFixed(1)||`—`}</td>
                      <td style="text-align: center;">${(e.npp??e.provaTrimestral)?.toFixed(1)||`—`}</td>
                      <td style="text-align: center; font-weight: bold; color: ${n?`#166534`:`#dc2626`};">${e.mediaTrimestral?.toFixed(1)}</td>
                      <td style="text-align: center;"><span class="${n?`badge-pago`:`badge-pendente`}">${n?r.genero===`F`?`Aprovada`:`Aprovado`:r.genero===`F`?`Não Aprovada`:`Não Aprovado`}</span></td>
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

        ${J.length>0?`
        <div class="section">
          <div class="section-title">6. Comunicados da Direção, Coordenação &amp; Professores</div>
          ${J.map(e=>`
            <div style="border-bottom: 1px solid #e2e8f0; padding: 6px 0;">
              <div style="font-weight: 700; color: #0f172a;">${e.assunto||e.titulo}</div>
              <div style="font-size: 9pt; color: #475569; margin: 2px 0;">${e.conteudo}</div>
              <div style="font-size: 8pt; color: #64748b;">Por: ${e.remetenteNome} (${e.remetenteCargo||e.remetentePapel})</div>
            </div>
          `).join(``)}
        </div>`:``}

        <div class="clean-footer">
          Documento emitido exclusivamente para consulta parental através do Portal dos Encarregados de Educação.<br/>
          <strong>${l.nomeOficial}</strong> • Sem carimbo ou assinatura institucional obrigatória.
        </div>
      </body>
      </html>
    `;m(`${r.genero===`F`?`Ficha_Educanda`:`Ficha_Educando`}_${r.codigoMatricula}.html`,`${r.genero===`F`?`Ficha da Educanda`:`Ficha do Educando`} - ${r.nomeCompleto}`,t)},className:`px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer`,children:(0,h.jsxDEV)(`span`,{children:`HTML`},void 0,!1,{fileName:g,lineNumber:455,columnNumber:13},void 0)},void 0,!1,{fileName:g,lineNumber:450,columnNumber:11},void 0),ie&&y&&(0,h.jsxDEV)(`button`,{type:`button`,onClick:y,className:`px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer`,children:`Fechar`},void 0,!1,{fileName:g,lineNumber:458,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:441,columnNumber:9},void 0)]},void 0,!0,{fileName:g,lineNumber:414,columnNumber:7},void 0),(0,h.jsxDEV)(`div`,{children:[(0,h.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider mb-2 flex items-center space-x-1.5`,children:[(0,h.jsxDEV)(e,{className:`h-4 w-4 text-blue-600`},void 0,!1,{fileName:g,lineNumber:472,columnNumber:11},void 0),(0,h.jsxDEV)(`span`,{children:`Enquadramento Académico`},void 0,!1,{fileName:g,lineNumber:473,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:471,columnNumber:9},void 0),(0,h.jsxDEV)(`div`,{className:`grid grid-cols-2 ${S&&C?`sm:grid-cols-4`:`sm:grid-cols-3`} gap-3`,children:[(0,h.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Classe`},void 0,!1,{fileName:g,lineNumber:477,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{className:`text-base font-black text-gray-900`,children:x},void 0,!1,{fileName:g,lineNumber:478,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:476,columnNumber:11},void 0),(0,h.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Turma`},void 0,!1,{fileName:g,lineNumber:482,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{className:`text-base font-black text-gray-900`,children:b?.nome||`A`},void 0,!1,{fileName:g,lineNumber:483,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:481,columnNumber:11},void 0),S&&C&&(0,h.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200 min-w-0`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Curso`},void 0,!1,{fileName:g,lineNumber:488,columnNumber:15},void 0),(0,h.jsxDEV)(`span`,{className:`text-xs font-black text-gray-900 whitespace-normal break-words block mt-0.5`,children:C},void 0,!1,{fileName:g,lineNumber:489,columnNumber:15},void 0)]},void 0,!0,{fileName:g,lineNumber:487,columnNumber:13},void 0),(0,h.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 rounded-xl border border-gray-200`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Turno & Sala`},void 0,!1,{fileName:g,lineNumber:494,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{className:`text-xs font-black text-gray-900 block mt-0.5`,children:[w,` • `,T]},void 0,!0,{fileName:g,lineNumber:495,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:493,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:475,columnNumber:9},void 0)]},void 0,!0,{fileName:g,lineNumber:470,columnNumber:7},void 0),(0,h.jsxDEV)(`div`,{children:[(0,h.jsxDEV)(`div`,{className:`flex items-center justify-between mb-2`,children:[(0,h.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider flex items-center space-x-1.5`,children:[(0,h.jsxDEV)(n,{className:`h-4 w-4 text-blue-600`},void 0,!1,{fileName:g,lineNumber:504,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{children:r.genero===`F`?`Boletim de Notas da Educanda`:`Boletim de Notas do Educando`},void 0,!1,{fileName:g,lineNumber:505,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:503,columnNumber:11},void 0),X&&(0,h.jsxDEV)(`span`,{className:`text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200`,children:Z===`todos`?`Todos os Trimestres`:`${Z}º Trimestre`},void 0,!1,{fileName:g,lineNumber:509,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:502,columnNumber:9},void 0),X?(0,h.jsxDEV)(`div`,{className:`border border-gray-200 rounded-xl overflow-hidden shadow-xs`,children:(0,h.jsxDEV)(`table`,{className:`w-full text-left text-xs`,children:[(0,h.jsxDEV)(`thead`,{className:`bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px]`,children:(0,h.jsxDEV)(`tr`,{children:[(0,h.jsxDEV)(`th`,{className:`p-3`,children:`Disciplina`},void 0,!1,{fileName:g,lineNumber:520,columnNumber:19},void 0),(0,h.jsxDEV)(`th`,{className:`p-3 text-center`,children:`Trimestre`},void 0,!1,{fileName:g,lineNumber:521,columnNumber:19},void 0),(0,h.jsxDEV)(`th`,{className:`p-3 text-center`,children:`MAC`},void 0,!1,{fileName:g,lineNumber:522,columnNumber:19},void 0),(0,h.jsxDEV)(`th`,{className:`p-3 text-center`,children:`NPP`},void 0,!1,{fileName:g,lineNumber:523,columnNumber:19},void 0),(0,h.jsxDEV)(`th`,{className:`p-3 text-center`,children:`Média Trimestral`},void 0,!1,{fileName:g,lineNumber:524,columnNumber:19},void 0),(0,h.jsxDEV)(`th`,{className:`p-3 text-center`,children:`Resultado`},void 0,!1,{fileName:g,lineNumber:525,columnNumber:19},void 0)]},void 0,!0,{fileName:g,lineNumber:519,columnNumber:17},void 0)},void 0,!1,{fileName:g,lineNumber:518,columnNumber:15},void 0),(0,h.jsxDEV)(`tbody`,{className:`divide-y divide-gray-100`,children:Q.length>0?Q.map(e=>{let t=O.find(t=>t.id===e.disciplinaId)?.nome||e.disciplinaNome||`Disciplina`,n=e.mediaTrimestral>=9.5;return(0,h.jsxDEV)(`tr`,{className:`hover:bg-gray-50/50`,children:[(0,h.jsxDEV)(`td`,{className:`p-3 font-bold text-gray-900`,children:t},void 0,!1,{fileName:g,lineNumber:535,columnNumber:25},void 0),(0,h.jsxDEV)(`td`,{className:`p-3 text-center font-semibold text-gray-700 tabular-nums`,children:[e.trimestre,`º`]},void 0,!0,{fileName:g,lineNumber:536,columnNumber:25},void 0),(0,h.jsxDEV)(`td`,{className:`p-3 text-center font-mono text-gray-700 tabular-nums`,children:e.mac?.toFixed(1)||`—`},void 0,!1,{fileName:g,lineNumber:537,columnNumber:25},void 0),(0,h.jsxDEV)(`td`,{className:`p-3 text-center font-mono text-gray-700 tabular-nums`,children:(e.npp??e.provaTrimestral)?.toFixed(1)||`—`},void 0,!1,{fileName:g,lineNumber:538,columnNumber:25},void 0),(0,h.jsxDEV)(`td`,{className:`p-3 text-center font-black tabular-nums ${n?`text-emerald-700`:`text-rose-700`}`,children:e.mediaTrimestral?.toFixed(1)},void 0,!1,{fileName:g,lineNumber:539,columnNumber:25},void 0),(0,h.jsxDEV)(`td`,{className:`p-3 text-center`,children:(0,h.jsxDEV)(`span`,{className:`px-2 py-0.5 text-[10px] font-bold rounded-md ${n?`bg-emerald-100 text-emerald-800`:`bg-rose-100 text-rose-800`}`,children:n?r.genero===`F`?`Aprovada`:`Aprovado`:r.genero===`F`?`Não Aprovada`:`Não Aprovado`},void 0,!1,{fileName:g,lineNumber:543,columnNumber:27},void 0)},void 0,!1,{fileName:g,lineNumber:542,columnNumber:25},void 0)]},e.id,!0,{fileName:g,lineNumber:534,columnNumber:23},void 0)}):(0,h.jsxDEV)(`tr`,{children:(0,h.jsxDEV)(`td`,{colSpan:6,className:`p-6 text-center text-xs text-gray-500`,children:`Não existem notas homologadas e publicadas para o trimestre selecionado.`},void 0,!1,{fileName:g,lineNumber:554,columnNumber:21},void 0)},void 0,!1,{fileName:g,lineNumber:553,columnNumber:19},void 0)},void 0,!1,{fileName:g,lineNumber:528,columnNumber:15},void 0)]},void 0,!0,{fileName:g,lineNumber:517,columnNumber:13},void 0)},void 0,!1,{fileName:g,lineNumber:516,columnNumber:11},void 0):(0,h.jsxDEV)(`div`,{className:`p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-900`,children:[(0,h.jsxDEV)(ee,{className:`h-5 w-5 text-amber-600 shrink-0 mt-0.5`},void 0,!1,{fileName:g,lineNumber:564,columnNumber:13},void 0),(0,h.jsxDEV)(`div`,{className:`space-y-0.5 text-xs`,children:[(0,h.jsxDEV)(`span`,{className:`font-bold block`,children:`Acesso ao Boletim Restrito pelo Diretor Geral`},void 0,!1,{fileName:g,lineNumber:566,columnNumber:15},void 0),(0,h.jsxDEV)(`p`,{className:`text-amber-800`,children:`A visualização do boletim de notas está temporariamente suspensa pela Direção da Instituição. Poderá consultar presencialmente na Secretaria da escola ou aguardar a homologação oficial no portal.`},void 0,!1,{fileName:g,lineNumber:567,columnNumber:15},void 0)]},void 0,!0,{fileName:g,lineNumber:565,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:563,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:501,columnNumber:7},void 0),(0,h.jsxDEV)(`div`,{children:[(0,h.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider mb-2 flex items-center space-x-1.5`,children:[(0,h.jsxDEV)(s,{className:`h-4 w-4 text-indigo-600`},void 0,!1,{fileName:g,lineNumber:578,columnNumber:11},void 0),(0,h.jsxDEV)(`span`,{children:`Frequência & Assiduidade Escolar`},void 0,!1,{fileName:g,lineNumber:579,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:577,columnNumber:9},void 0),(0,h.jsxDEV)(`div`,{className:`grid grid-cols-2 sm:grid-cols-4 gap-3`,children:[(0,h.jsxDEV)(`div`,{className:`p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl`,children:[(0,h.jsxDEV)(`div`,{className:`flex items-center justify-between`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-emerald-800`,children:`Assiduidade`},void 0,!1,{fileName:g,lineNumber:584,columnNumber:15},void 0),(0,h.jsxDEV)(o,{className:`h-3.5 w-3.5 text-emerald-600`},void 0,!1,{fileName:g,lineNumber:585,columnNumber:15},void 0)]},void 0,!0,{fileName:g,lineNumber:583,columnNumber:13},void 0),(0,h.jsxDEV)(`div`,{className:`text-xl font-black text-emerald-700 mt-1 tabular-nums`,children:[I,`%`]},void 0,!0,{fileName:g,lineNumber:587,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{className:`text-[10px] text-emerald-600 font-semibold block mt-0.5`,children:I>=85?`Comportamento Regular`:`Atenção aos limites`},void 0,!1,{fileName:g,lineNumber:588,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:582,columnNumber:11},void 0),(0,h.jsxDEV)(`div`,{className:`p-3.5 bg-rose-50 border border-rose-200 rounded-xl`,children:[(0,h.jsxDEV)(`div`,{className:`flex items-center justify-between`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-rose-800`,children:`Faltas Injustificadas`},void 0,!1,{fileName:g,lineNumber:595,columnNumber:15},void 0),(0,h.jsxDEV)(te,{className:`h-3.5 w-3.5 text-rose-600`},void 0,!1,{fileName:g,lineNumber:596,columnNumber:15},void 0)]},void 0,!0,{fileName:g,lineNumber:594,columnNumber:13},void 0),(0,h.jsxDEV)(`div`,{className:`text-xl font-black text-rose-700 mt-1 tabular-nums`,children:M},void 0,!1,{fileName:g,lineNumber:598,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{className:`text-[10px] text-rose-600 font-semibold block mt-0.5`,children:`Impacto direto na pauta`},void 0,!1,{fileName:g,lineNumber:599,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:593,columnNumber:11},void 0),(0,h.jsxDEV)(`div`,{className:`p-3.5 bg-blue-50 border border-blue-200 rounded-xl`,children:[(0,h.jsxDEV)(`div`,{className:`flex items-center justify-between`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-blue-800`,children:`Faltas Justificadas`},void 0,!1,{fileName:g,lineNumber:606,columnNumber:15},void 0),(0,h.jsxDEV)(ne,{className:`h-3.5 w-3.5 text-blue-600`},void 0,!1,{fileName:g,lineNumber:607,columnNumber:15},void 0)]},void 0,!0,{fileName:g,lineNumber:605,columnNumber:13},void 0),(0,h.jsxDEV)(`div`,{className:`text-xl font-black text-blue-700 mt-1 tabular-nums`,children:j},void 0,!1,{fileName:g,lineNumber:609,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{className:`text-[10px] text-blue-600 font-semibold block mt-0.5`,children:`Com justificação averbada`},void 0,!1,{fileName:g,lineNumber:610,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:604,columnNumber:11},void 0),(0,h.jsxDEV)(`div`,{className:`p-3.5 bg-gray-50 border border-gray-200 rounded-xl`,children:[(0,h.jsxDEV)(`div`,{className:`flex items-center justify-between`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-600`,children:`Total Geral de Faltas`},void 0,!1,{fileName:g,lineNumber:617,columnNumber:15},void 0),(0,h.jsxDEV)(s,{className:`h-3.5 w-3.5 text-gray-500`},void 0,!1,{fileName:g,lineNumber:618,columnNumber:15},void 0)]},void 0,!0,{fileName:g,lineNumber:616,columnNumber:13},void 0),(0,h.jsxDEV)(`div`,{className:`text-xl font-black text-gray-800 mt-1 tabular-nums`,children:N},void 0,!1,{fileName:g,lineNumber:620,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{className:`text-[10px] text-gray-500 font-semibold block mt-0.5`,children:[`Ano letivo `,l.anoLectivoActivo]},void 0,!0,{fileName:g,lineNumber:621,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:615,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:581,columnNumber:9},void 0)]},void 0,!0,{fileName:g,lineNumber:576,columnNumber:7},void 0),(0,h.jsxDEV)(`div`,{className:`p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3`,children:[(0,h.jsxDEV)(`div`,{className:`flex flex-col sm:flex-row sm:items-center justify-between gap-2`,children:[(0,h.jsxDEV)(`div`,{children:[(0,h.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-700 tracking-wider flex items-center space-x-1.5`,children:[(0,h.jsxDEV)(a,{className:`h-4 w-4 text-emerald-600`},void 0,!1,{fileName:g,lineNumber:633,columnNumber:15},void 0),(0,h.jsxDEV)(`span`,{children:`Emolumentos & Mensalidades por Pagar`},void 0,!1,{fileName:g,lineNumber:634,columnNumber:15},void 0)]},void 0,!0,{fileName:g,lineNumber:632,columnNumber:13},void 0),(0,h.jsxDEV)(`p`,{className:`text-[11px] text-gray-500`,children:`Controlo de pagamentos para regularização junto da tesouraria escolar.`},void 0,!1,{fileName:g,lineNumber:636,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:631,columnNumber:11},void 0),(0,h.jsxDEV)(`div`,{className:`text-right`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] uppercase font-bold text-gray-500 block`,children:`Total a Pagar`},void 0,!1,{fileName:g,lineNumber:642,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{className:`text-base font-black tabular-nums ${q>0?`text-rose-600`:`text-emerald-700`}`,children:q>0?`${q.toLocaleString(`pt-AO`)} Kz`:`Totalmente Regularizado`},void 0,!1,{fileName:g,lineNumber:643,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:641,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:630,columnNumber:9},void 0),(0,h.jsxDEV)(`div`,{className:`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2`,children:K.map(e=>{let t=H.has(e.nome);return(0,h.jsxDEV)(`div`,{className:`p-2.5 rounded-lg border text-center transition-all ${t?`bg-emerald-50/70 border-emerald-200 text-emerald-800`:`bg-white border-rose-300 text-rose-800 shadow-xs`}`,children:[(0,h.jsxDEV)(`div`,{className:`text-[11px] font-black`,children:e.nome},void 0,!1,{fileName:g,lineNumber:661,columnNumber:17},void 0),(0,h.jsxDEV)(`div`,{className:`text-[10px] font-semibold text-gray-600 tabular-nums`,children:[e.valor.toLocaleString(`pt-AO`),` Kz`]},void 0,!0,{fileName:g,lineNumber:662,columnNumber:17},void 0),(0,h.jsxDEV)(`span`,{className:`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-black rounded ${t?`bg-emerald-200 text-emerald-900`:`bg-rose-100 text-rose-800`}`,children:t?`Pago`:`Por Pagar`},void 0,!1,{fileName:g,lineNumber:663,columnNumber:17},void 0)]},e.id,!0,{fileName:g,lineNumber:653,columnNumber:15},void 0)})},void 0,!1,{fileName:g,lineNumber:649,columnNumber:9},void 0)]},void 0,!0,{fileName:g,lineNumber:629,columnNumber:7},void 0),(0,h.jsxDEV)(`div`,{className:`space-y-2.5`,children:[(0,h.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider flex items-center space-x-1.5`,children:[(0,h.jsxDEV)(c,{className:`h-4 w-4 text-blue-600`},void 0,!1,{fileName:g,lineNumber:677,columnNumber:11},void 0),(0,h.jsxDEV)(`span`,{children:`Comunicados da Direção, Coordenação & Docentes`},void 0,!1,{fileName:g,lineNumber:678,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:676,columnNumber:9},void 0),J.length===0?(0,h.jsxDEV)(`div`,{className:`p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500 text-center`,children:`Sem comunicados recentes publicados para os encarregados de educação desta turma.`},void 0,!1,{fileName:g,lineNumber:681,columnNumber:11},void 0):(0,h.jsxDEV)(`div`,{className:`space-y-2.5`,children:J.map(e=>(0,h.jsxDEV)(`div`,{className:`p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-1.5`,children:[(0,h.jsxDEV)(`div`,{className:`flex flex-wrap items-center justify-between gap-2`,children:[(0,h.jsxDEV)(`div`,{className:`flex items-center gap-2 flex-wrap`,children:[(0,h.jsxDEV)(`span`,{className:`text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200`,children:e.escopoEnvioLabel||(e.destinatarioTipo===`Encarregados`?`Para Encarregados`:`Comunicado Geral`)},void 0,!1,{fileName:g,lineNumber:690,columnNumber:21},void 0),(e.urgente||e.prioridade===`Urgente`)&&(0,h.jsxDEV)(`span`,{className:`text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white`,children:`URGENTE`},void 0,!1,{fileName:g,lineNumber:694,columnNumber:23},void 0),(0,h.jsxDEV)(`h4`,{className:`text-xs font-black text-gray-900`,children:e.assunto||e.titulo},void 0,!1,{fileName:g,lineNumber:698,columnNumber:21},void 0)]},void 0,!0,{fileName:g,lineNumber:689,columnNumber:19},void 0),(0,h.jsxDEV)(`span`,{className:`text-[10px] font-mono text-gray-500`,children:new Date(e.criadaEm||e.dataHora||Date.now()).toLocaleDateString(`pt-AO`)},void 0,!1,{fileName:g,lineNumber:700,columnNumber:19},void 0)]},void 0,!0,{fileName:g,lineNumber:688,columnNumber:17},void 0),(0,h.jsxDEV)(`p`,{className:`text-xs text-gray-700 leading-relaxed whitespace-pre-wrap`,children:e.conteudo},void 0,!1,{fileName:g,lineNumber:704,columnNumber:17},void 0),(0,h.jsxDEV)(`div`,{className:`text-[11px] text-gray-500 font-medium`,children:[`Emitido por: `,(0,h.jsxDEV)(`strong`,{className:`text-gray-800`,children:e.remetenteNome},void 0,!1,{fileName:g,lineNumber:706,columnNumber:32},void 0),` (`,e.remetenteCargo||e.remetentePapel,`)`]},void 0,!0,{fileName:g,lineNumber:705,columnNumber:17},void 0)]},e.id,!0,{fileName:g,lineNumber:687,columnNumber:15},void 0))},void 0,!1,{fileName:g,lineNumber:685,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:675,columnNumber:7},void 0),Y.length>0&&(0,h.jsxDEV)(`div`,{className:`space-y-2.5`,children:[(0,h.jsxDEV)(`h3`,{className:`text-xs font-black uppercase text-gray-500 tracking-wider flex items-center space-x-1.5`,children:[(0,h.jsxDEV)(t,{className:`h-4 w-4 text-amber-600`},void 0,!1,{fileName:g,lineNumber:718,columnNumber:13},void 0),(0,h.jsxDEV)(`span`,{children:`Ocorrências & Registos Pedagógicos Homologados`},void 0,!1,{fileName:g,lineNumber:719,columnNumber:13},void 0)]},void 0,!0,{fileName:g,lineNumber:717,columnNumber:11},void 0),(0,h.jsxDEV)(`div`,{className:`space-y-2`,children:Y.map((e,t)=>(0,h.jsxDEV)(`div`,{className:`p-3 rounded-xl border border-amber-200 bg-amber-50/40 text-xs space-y-1`,children:[(0,h.jsxDEV)(`div`,{className:`flex items-center justify-between gap-2`,children:[(0,h.jsxDEV)(`span`,{className:`font-black text-amber-950`,children:[e.tipo||`Registo`,` • `,e.gravidade||`Informativo`]},void 0,!0,{fileName:g,lineNumber:725,columnNumber:19},void 0),(0,h.jsxDEV)(`span`,{className:`text-[10px] font-mono text-gray-500`,children:e.data||``},void 0,!1,{fileName:g,lineNumber:726,columnNumber:19},void 0)]},void 0,!0,{fileName:g,lineNumber:724,columnNumber:17},void 0),(0,h.jsxDEV)(`p`,{className:`text-gray-800`,children:e.descricao},void 0,!1,{fileName:g,lineNumber:728,columnNumber:17},void 0),e.registadoPor&&(0,h.jsxDEV)(`p`,{className:`text-[10px] text-gray-500`,children:[`Registado por: `,e.registadoPor]},void 0,!0,{fileName:g,lineNumber:730,columnNumber:19},void 0)]},e.id||t,!0,{fileName:g,lineNumber:723,columnNumber:15},void 0))},void 0,!1,{fileName:g,lineNumber:721,columnNumber:11},void 0)]},void 0,!0,{fileName:g,lineNumber:716,columnNumber:9},void 0),(0,h.jsxDEV)(`div`,{className:`p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center justify-between no-print`,children:[(0,h.jsxDEV)(`span`,{children:[`O documento PDF baixado através deste portal contém apenas o nome oficial da escola e a data/hora da emissão, `,(0,h.jsxDEV)(`strong`,{children:`sem carimbo nem assinatura institucional`},void 0,!1,{fileName:g,lineNumber:741,columnNumber:121},void 0),`, sendo exclusivo para acompanhamento familiar.`]},void 0,!0,{fileName:g,lineNumber:740,columnNumber:9},void 0),(0,h.jsxDEV)(`button`,{type:`button`,onClick:$,className:`text-blue-700 hover:text-blue-900 font-bold underline shrink-0 ml-3 cursor-pointer`,children:`Baixar agora`},void 0,!1,{fileName:g,lineNumber:743,columnNumber:9},void 0)]},void 0,!0,{fileName:g,lineNumber:739,columnNumber:7},void 0)]},void 0,!0,{fileName:g,lineNumber:412,columnNumber:5},void 0)};export{_ as ParentStudentReportView};
import React from 'react';
import { Award, User, Phone } from 'lucide-react';
import {
  Aluno,
  ConfiguracaoPassesEscola,
  ConfiguracaoSistema,
  ElementoPasseConfig,
  Escola,
  Turma
} from '../types';
import { InsigniaAngola } from '../constants/insignia';
import { OfficialQrCode, gerarPayloadQrEstudante } from '../utils/qrCodeUtils';
import { isSegundoCiclo, normalizarClasse } from '../services/academicHierarchyService';

export interface SchoolPassCardProps {
  aluno: Aluno;
  turma?: Turma;
  escola: Escola;
  passConfig: ConfiguracaoPassesEscola;
  configSistema?: Partial<ConfiguracaoSistema>;
  visualizacao: 'frente' | 'verso' | 'ambos';
  numeroSequencial: number;
  dataEmissao: string;
  dataValidade: string;
  nomeDiretorCompleto: string;
  tituloDiretorOficial: string;
  fotoPosicao?: 'esquerda' | 'direita';
}

function formatarDocIdentificacao(al: Aluno): { rotulo: string; numero: string } {
  const tipo = al.tipoDocumento || 'BI';
  const numeroLimpo = (
    al.numeroDocumento ||
    (al.numeroBI && al.numeroBI !== '000000000LA000' ? al.numeroBI : '') ||
    ''
  ).trim();
  const rotulo =
    tipo === 'Cédula'
      ? 'Cédula Nº:'
      : tipo === 'Passaporte'
      ? 'Passaporte Nº:'
      : tipo === 'Cartão de Residente'
      ? 'Cartão Resid. Nº:'
      : tipo === 'Outro'
      ? 'Doc. Ident. Nº:'
      : 'B.I. Nº:';
  return {
    rotulo,
    numero: numeroLimpo || 'Não Registado'
  };
}

function renderBarcodeBars(seed: string, color: string) {
  const clean = (seed || 'SGE2026').toUpperCase();
  const widths: number[] = [];
  for (let i = 0; i < 28; i++) {
    const code = clean.charCodeAt(i % clean.length);
    widths.push(((code + i * 7) % 3) + 1);
  }
  return (
    <div className="flex items-end justify-center gap-[1px] h-3.5 px-1" aria-label={`Código ${clean}`}>
      {widths.map((w, idx) => (
        <span
          key={idx}
          style={{
            width: `${w}px`,
            height: idx % 5 === 0 ? '14px' : '11px',
            backgroundColor: color,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
          className="inline-block shrink-0"
        />
      ))}
    </div>
  );
}

export const SchoolPassCard: React.FC<SchoolPassCardProps> = ({
  aluno,
  turma,
  escola,
  passConfig,
  configSistema,
  visualizacao,
  numeroSequencial,
  dataEmissao,
  dataValidade,
  nomeDiretorCompleto,
  tituloDiretorOficial,
  fotoPosicao
}) => {
  const isAtivo = (chave: ElementoPasseConfig['chave']) => {
    const el = passConfig.elementos.find(e => e.chave === chave);
    return el ? el.ativo : true;
  };

  const fotoElem = passConfig.elementos.find(e => e.chave === 'foto');
  const posFoto: 'esquerda' | 'direita' =
    fotoPosicao || (fotoElem?.posicao === 'direita' ? 'direita' : 'esquerda');

  const corPrimaria = passConfig.corPrimaria || escola.corPrimaria || '#1e3a8a';
  const corSecundaria = passConfig.corSecundaria || escola.corSecundaria || '#d97706';
  const corTextoTarja = passConfig.corTexto || '#ffffff';
  const corTextoCorpo = passConfig.corTextoSecundario || '#111827';
  const corFundoFrente = passConfig.corFundoFrente || escola.corFundoPasses || '#ffffff';
  const corBorda = passConfig.corBorda || corPrimaria;

  const formato = passConfig.formatoLayout || (passConfig.orientacao === 'vertical' ? 'vertical_cracha' : 'classico_horizontal');
  const tipoFundo = passConfig.tipoFundo || 'solido';
  const estiloTarja = passConfig.estiloTarja || 'elegante_dourado';
  const tamanhoFoto = passConfig.tamanhoFoto || 'padrao';

  const isVerticalCard = passConfig.orientacao === 'vertical' || formato === 'vertical_cracha';

  const anoLectivoNome = aluno.anoLectivo || aluno.anoMatricula || turma?.anoLectivo || escola.anoLectivoActivo || '—';
  const numProcesso = aluno.numeroProcesso || aluno.codigoMatricula || '—';
  const classeExibida = turma?.classe || aluno.classeId || '—';
  const docInfo = formatarDocIdentificacao(aluno);
  const ehSegundoCicloPass = isSegundoCiclo(normalizarClasse(classeExibida));
  const logoEscolaUrl = (escola.logotipoUrl || escola.logotipo || '').trim();
  const assinaturaUrl = (passConfig.assinaturaDiretorUrl || escola.assinaturaDiretorUrl || '').trim();
  const insigniaUrl = (configSistema?.insigniaNacionalUrl || '').trim();
  const encarregadoNome = aluno.encarregadoNome || aluno.nomeEncarregado || aluno.encarregado || '';
  const contactoEmergencia = aluno.encarregadoTelefone || aluno.telefoneEncarregado || aluno.contactoEncarregado || aluno.telefone || '';

  const printColorExact: React.CSSProperties = {
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact'
  };

  const backgroundStyle: React.CSSProperties =
    tipoFundo === 'gradiente_suave'
      ? {
          background: `linear-gradient(135deg, ${corFundoFrente} 0%, ${corPrimaria}14 60%, ${corSecundaria}18 100%)`,
          ...printColorExact
        }
      : {
          backgroundColor: corFundoFrente,
          ...printColorExact
        };

  const tarjaStyle: React.CSSProperties = (() => {
    if (estiloTarja === 'gradiente') {
      return {
        background: `linear-gradient(90deg, ${corPrimaria} 0%, ${corSecundaria} 100%)`,
        color: corTextoTarja,
        ...printColorExact
      };
    }
    if (estiloTarja === 'elegante_dourado') {
      return {
        backgroundColor: corPrimaria,
        color: corTextoTarja,
        borderBottom: `2px solid ${corSecundaria}`,
        ...printColorExact
      };
    }
    if (estiloTarja === 'minimalista') {
      return {
        backgroundColor: `${corPrimaria}14`,
        color: corPrimaria,
        borderTop: `1px solid ${corPrimaria}50`,
        borderBottom: `1px solid ${corPrimaria}50`,
        ...printColorExact
      };
    }
    return {
      backgroundColor: corPrimaria,
      color: corTextoTarja,
      ...printColorExact
    };
  })();

  const photoSizeClasses = isVerticalCard
    ? tamanhoFoto === 'maximo'
      ? 'h-[112px] w-[92px]'
      : tamanhoFoto === 'grande'
      ? 'h-[98px] w-[80px]'
      : 'h-[86px] w-[70px]'
    : tamanhoFoto === 'maximo'
    ? 'h-[112px] w-[88px]'
    : tamanhoFoto === 'grande'
    ? 'h-[104px] w-[82px]'
    : 'h-[92px] w-[72px]';

  const qrSize = isVerticalCard ? 40 : 44;

  return (
    <div
      className={`border-2 rounded-xl shadow-xs hover:shadow-md transition-shadow relative flex flex-col justify-between print:shadow-none print:break-inside-avoid select-none overflow-hidden ${
        isVerticalCard ? 'min-h-[320px]' : 'min-h-[246px]'
      }`}
      style={{
        borderColor: corBorda,
        color: corTextoCorpo,
        backgroundColor: corFundoFrente,
        ...printColorExact
      }}
    >
      {/* FRENTE DO PASSE */}
      {(visualizacao === 'frente' || visualizacao === 'ambos') && (
        <div
          className={`relative flex flex-col justify-between flex-1 ${
            formato === 'moderno_faixa' ? 'pl-3 pr-2 py-2' : 'p-2'
          }`}
          style={backgroundStyle}
        >
          {/* Marca de água opcional */}
          {tipoFundo === 'marca_dagua' && logoEscolaUrl && (
            <img
              src={logoEscolaUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 m-auto h-28 w-28 object-contain opacity-[0.06]"
            />
          )}

          {/* Faixa lateral para formato moderno_faixa */}
          {formato === 'moderno_faixa' && (
            <div
              className="absolute left-0 top-0 bottom-0 w-2"
              style={{
                background: `linear-gradient(180deg, ${corPrimaria} 0%, ${corSecundaria} 100%)`,
                ...printColorExact
              }}
            />
          )}

          {/* Cabeçalho Institucional */}
          {formato === 'bicolor_institucional' ? (
            <div
              className="-mx-2 -mt-2 px-2.5 py-1.5 mb-1 flex items-center justify-between gap-1.5"
              style={{
                backgroundColor: corPrimaria,
                color: corTextoTarja,
                borderBottom: `3px solid ${corSecundaria}`,
                ...printColorExact
              }}
            >
              {isAtivo('insignia') && (
                <div className="h-7 w-7 flex items-center justify-center shrink-0 bg-white/95 rounded-full p-0.5">
                  {insigniaUrl ? (
                    <img src={insigniaUrl} alt="Insígnia" className="h-6 w-6 object-contain" />
                  ) : (
                    <InsigniaAngola size={22} />
                  )}
                </div>
              )}

              <div className="flex-1 text-center min-w-0 px-1">
                <p className="text-[6.5px] font-black uppercase opacity-90 tracking-wider leading-[1.15]">
                  República de Angola • {escola.provincia || 'Luanda'} ({escola.municipio || 'Luanda'})
                </p>
                <h4 className="text-[8px] font-black uppercase whitespace-normal break-words leading-[1.15] mt-0.5">
                  {escola.nomeOficial}
                </h4>
              </div>

              {isAtivo('logotipo') && (
                <div className="h-7 w-7 flex items-center justify-center shrink-0 bg-white/95 rounded p-0.5">
                  {logoEscolaUrl ? (
                    <img src={logoEscolaUrl} alt="Logo" className="h-6 w-6 object-contain rounded" />
                  ) : (
                    <Award className="h-5 w-5" style={{ color: corPrimaria }} />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              className="border-b pb-1 flex items-center justify-between gap-1.5 relative z-10"
              style={{ borderColor: `${corPrimaria}45`, ...printColorExact }}
            >
              {isAtivo('insignia') && (
                <div className="h-7 w-7 flex items-center justify-center shrink-0">
                  {insigniaUrl ? (
                    <img src={insigniaUrl} alt="Insígnia" className="h-7 w-7 object-contain" />
                  ) : (
                    <InsigniaAngola size={24} />
                  )}
                </div>
              )}

              <div className="flex-1 text-center min-w-0 px-1">
                <p className="text-[6.5px] font-black uppercase opacity-80 tracking-wider leading-[1.15]">
                  República de Angola
                </p>
                <p className="text-[6.5px] font-bold uppercase opacity-75 whitespace-normal break-words leading-[1.15]">
                  Província: {escola.provincia || 'Luanda'} • Município: {escola.municipio || 'Luanda'}
                </p>
                <h4
                  className="text-[8px] font-black uppercase whitespace-normal break-words leading-[1.15] mt-0.5"
                  style={{ color: corPrimaria, ...printColorExact }}
                >
                  {escola.nomeOficial}
                </h4>
              </div>

              {isAtivo('logotipo') && (
                <div className="h-7 w-7 flex items-center justify-center shrink-0">
                  {logoEscolaUrl ? (
                    <img src={logoEscolaUrl} alt="Logo" className="h-7 w-7 object-contain rounded" />
                  ) : (
                    <Award className="h-5 w-5" style={{ color: corPrimaria }} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tarja Oficial */}
          <div
            className="text-center py-0.5 my-1 rounded-xs shadow-2xs relative z-10"
            style={tarjaStyle}
          >
            <span className="text-[7.5px] font-black uppercase tracking-widest block">
              Cartão de Estudante • {anoLectivoNome}
            </span>
          </div>

          {/* Corpo do Cartão */}
          <div
            className={`relative z-10 my-auto flex ${
              isVerticalCard
                ? 'flex-col items-center text-center gap-1.5 py-1'
                : `items-center gap-2 ${posFoto === 'direita' ? 'flex-row-reverse' : 'flex-row'}`
            }`}
          >
            {isAtivo('foto') && (
              <div className="shrink-0 flex flex-col items-center">
                {aluno.fotoUrl && aluno.fotoUrl.trim() !== '' ? (
                  <img
                    src={aluno.fotoUrl}
                    alt={aluno.nomeCompleto}
                    className={`${photoSizeClasses} rounded-md object-cover border-2 shadow-2xs`}
                    style={{ borderColor: corPrimaria, ...printColorExact }}
                  />
                ) : (
                  <div
                    className={`${photoSizeClasses} rounded-md border-2 bg-slate-100 flex flex-col items-center justify-center text-[8px] text-gray-400 font-bold shadow-2xs`}
                    style={{ borderColor: `${corPrimaria}80`, ...printColorExact }}
                  >
                    <User className="h-7 w-7 text-gray-300 mb-0.5" />
                    <span>FOTO 3x4</span>
                  </div>
                )}
              </div>
            )}

            {/* Dados Académicos e Pessoais do Aluno */}
            <div className={`flex-1 min-w-0 text-[8.5px] leading-[1.2] space-y-0.5 ${isVerticalCard ? 'w-full' : ''}`} style={{ color: corTextoCorpo }}>
              {isAtivo('nome') && (
                <div
                  className="font-black uppercase whitespace-normal break-words text-[9px] leading-[1.15]"
                  style={{ color: corPrimaria, ...printColorExact }}
                >
                  {aluno.nomeCompleto}
                </div>
              )}

              {isAtivo('classeTurma') && (
                <>
                  <div className="whitespace-normal break-words">
                    Classe: <strong>{classeExibida}</strong> • <strong className="font-mono">Nº {numeroSequencial}</strong>
                  </div>
                  <div className="whitespace-normal break-words">
                    Turma: <strong>{turma?.nome || '—'}</strong>
                    {isAtivo('turno') && (
                      <>
                        {' '}• Turno: <strong>{turma?.turno || 'Manhã'}</strong>
                        {turma?.sala ? ` • ${turma.sala}` : ''}
                      </>
                    )}
                  </div>
                </>
              )}

              {!isAtivo('classeTurma') && isAtivo('turno') && (
                <div className="whitespace-normal break-words">
                  Turno: <strong>{turma?.turno || 'Manhã'}</strong>
                  {turma?.sala ? ` • ${turma.sala}` : ''}
                </div>
              )}

              {ehSegundoCicloPass && isAtivo('curso') && (
                <div className="whitespace-normal break-words text-[8px]">
                  Curso: <strong>{aluno.curso || turma?.curso || 'Geral'}</strong>
                </div>
              )}

              {isAtivo('numeroBI') && (
                <div className="font-mono whitespace-normal break-words text-[8px]">
                  {docInfo.rotulo} <strong>{docInfo.numero}</strong>
                </div>
              )}

              {isAtivo('numeroProcesso') && (
                <div className="font-mono whitespace-normal break-words text-[8px]">
                  Proc. Nº: <strong>{numProcesso}</strong>
                </div>
              )}

              {isAtivo('encarregado') && encarregadoNome && (
                <div className="opacity-80 whitespace-normal break-words text-[7.5px]">
                  Enc.: {encarregadoNome}
                </div>
              )}

              {isAtivo('contactoEmergencia') && contactoEmergencia && (
                <div className="opacity-85 whitespace-normal break-words text-[7.5px] inline-flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5 inline shrink-0" style={{ color: corSecundaria }} />
                  <span>Emerg.: <strong>{contactoEmergencia}</strong></span>
                </div>
              )}
            </div>

            {isAtivo('qrCode') && (
              <div className="shrink-0 flex flex-col items-center justify-center gap-0.5">
                <OfficialQrCode
                  value={gerarPayloadQrEstudante(aluno, escola, turma)}
                  size={qrSize}
                  className="border-gray-300 bg-white"
                />
              </div>
            )}
          </div>

          {/* Código de barras opcional */}
          {isAtivo('codigoBarras') && (
            <div className="mt-1 flex items-center justify-center relative z-10">
              {renderBarcodeBars(numProcesso !== '—' ? numProcesso : aluno.id, corPrimaria)}
            </div>
          )}

          {/* Rodapé Oficial: Validade & Assinatura */}
          <div
            className="pt-1 mt-1 border-t flex items-end justify-between gap-1.5 text-[7.5px] relative z-10"
            style={{ borderColor: `${corSecundaria}55`, color: corTextoCorpo, ...printColorExact }}
          >
            {isAtivo('validade') && (
              <div className="shrink-0">
                <span>Val: <strong>{dataValidade || '—'}</strong></span>
              </div>
            )}

            {isAtivo('assinaturaDiretor') && (
              <div className="flex-1 flex flex-col items-center justify-end text-center min-w-0">
                <span className="text-[6.5px] font-bold uppercase leading-[1.1] mb-0.5 whitespace-normal break-words max-w-full">
                  {tituloDiretorOficial}
                </span>
                {passConfig.chancelaDigitalAtiva !== false && assinaturaUrl ? (
                  <img
                    src={assinaturaUrl}
                    alt="Assinatura do Director"
                    className="h-3.5 w-auto max-w-[75px] object-contain my-0.5"
                  />
                ) : (
                  <div className="border-b border-gray-500 w-24 my-1" />
                )}
                <span className="font-bold text-[7px] leading-[1.1] whitespace-normal break-words max-w-full">
                  {nomeDiretorCompleto}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VERSO DO PASSE (REGRAS E AVISOS) */}
      {(visualizacao === 'verso' || visualizacao === 'ambos') && (passConfig.mostrarVerso !== false || visualizacao === 'verso') && (
        <div
          className={`p-2.5 bg-gray-50 relative flex flex-col justify-between flex-1 text-[8px] leading-tight text-gray-800 ${
            visualizacao === 'ambos' ? 'border-t border-dashed' : ''
          }`}
          style={{
            borderColor: corSecundaria,
            ...printColorExact
          }}
        >
          <div>
            <div
              className="text-center font-black uppercase text-[8.5px] border-b pb-1"
              style={{ color: corPrimaria, borderColor: `${corPrimaria}35`, ...printColorExact }}
            >
              Regulamento de Uso do Cartão
            </div>
            <ul className="list-disc pl-3 pt-1.5 space-y-1">
              {(passConfig.regrasVerso || []).map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between text-[7.5px] mt-1">
            <div>
              <span>Emissão: <strong>{dataEmissao}</strong></span>
            </div>
            <div className="text-right">
              <span className="font-bold" style={{ color: corPrimaria }}>{escola.nomeOficial}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

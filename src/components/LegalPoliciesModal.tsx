import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  FileText,
  Cookie,
  CheckCircle2,
  Mail,
  Phone,
  Scale,
  Server
} from 'lucide-react';
import { dbService } from '../services/storage';
import {
  LegalPolicyTab,
  resetCookieConsentBanner
} from '../services/legalPoliciesService';

interface LegalPoliciesModalProps {
  initialTab?: LegalPolicyTab;
}

export const LegalPoliciesModal: React.FC<LegalPoliciesModalProps> = ({ initialTab = 'confidencialidade' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LegalPolicyTab>(initialTab);
  const configSistema = dbService.getConfiguracaoSistema();

  useEffect(() => {
    const handleOpen = (ev: Event) => {
      const custom = ev as CustomEvent<{ tab?: LegalPolicyTab }>;
      if (custom?.detail?.tab) {
        setActiveTab(custom.detail.tab);
      }
      setIsOpen(true);
    };

    window.addEventListener('sge_open_legal_modal', handleOpen);

    // Suporte direto aos URLs listados no sitemap.xml (?politica=...)
    try {
      const params = new URLSearchParams(window.location.search);
      const politicaParam = params.get('politica') as LegalPolicyTab | null;
      if (politicaParam && ['confidencialidade', 'privacidade', 'termos', 'cookies'].includes(politicaParam)) {
        setActiveTab(politicaParam);
        setIsOpen(true);
      }
    } catch {}

    return () => {
      window.removeEventListener('sge_open_legal_modal', handleOpen);
    };
  }, []);

  if (!isOpen) return null;

  const nomeSistema = configSistema.nomeSistema || 'SGE-NG';
  const emailDPO = configSistema.emailDPO || 'privacidade@sge-ng.ao';
  const telefoneSuporte = configSistema.telefoneSuporte || '+244 923 000 000';
  const versao = configSistema.politicaVersao || '1.0 (2026)';

  const tabs: Array<{ id: LegalPolicyTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'confidencialidade', label: 'Política de Confidencialidade', icon: Lock },
    { id: 'privacidade', label: 'Política de Privacidade', icon: ShieldCheck },
    { id: 'termos', label: 'Termos e Condições', icon: Scale },
    { id: 'cookies', label: 'Política de Cookies', icon: Cookie }
  ];

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[90] flex items-center justify-center p-3 sm:p-5 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Políticas Legais, Confidencialidade e Termos de Uso"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/25 border border-blue-400/30">
              <FileText className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight">
                Conformidade Legal, Confidencialidade &amp; Proteção de Dados
              </h2>
              <p className="text-[11px] text-slate-300">
                {nomeSistema} • Versão {versao} • Enquadramento Legal da República de Angola
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar políticas legais"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegação de Abas */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200 dark:border-blue-800'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
          {activeTab === 'confidencialidade' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80">
                <h3 className="text-sm font-black text-blue-950 dark:text-blue-200 mb-1">
                  1. Compromisso de Confidencialidade Institucional
                </h3>
                <p className="text-blue-900 dark:text-blue-300">
                  O {nomeSistema} assegura o sigilo rigoroso de toda a informação académica, administrativa, financeira e pessoal registada pelas instituições de ensino, em conformidade com as normas éticas e jurídicas aplicáveis ao setor da educação em Angola.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white">2. Classificação de Informação Confidencial</h4>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Dados Escolares e Pedagógicos:</strong> Pautas trimestrais, médias MAC/NPP/NPT, atas da comissão de júri, históricos escolares, declarações e certificados.</li>
                  <li><strong>Identificação de Menores e Encarregados:</strong> Bilhetes de identidade, cédulas pessoais, fotografias de passes escolares, filiação, moradas e fichas médicas escolares.</li>
                  <li><strong>Recursos Humanos e Finanças:</strong> Processos individuais de docentes e colaboradores, IBAN, números de agente, recibos de propinas e registos patrimoniais.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white">3. Controlo de Acesso Baseado em Perfis (RBAC) e Sigilo Profissional</h4>
                <p>
                  O acesso aos registos é estritamente segmentado por perfil funcional (Administrador Geral, Diretor Geral, Subdiretores, Secretaria, Coordenadores, Professores, Tesouraria, Biblioteca e Encarregados de Educação). Cada utilizador autenticado assume o dever funcional de não divulgar, fotografar, copiar ou ceder credenciais ou dados confidenciais a terceiros não autorizados.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white">4. Medidas Técnicas de Proteção</h4>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Transmissão protegida por protocolo <strong>HTTPS/TLS</strong> obrigatório em ambiente de produção.</li>
                  <li>Encriptação local de proteção via Web Crypto API (AES-256-GCM) sem chaves secretas embutidas no código-fonte de front-end.</li>
                  <li>Registo de trilha de auditoria para operações críticas, emissão de documentos e alterações de notas.</li>
                </ul>
              </section>
            </div>
          )}

          {activeTab === 'privacidade' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80">
                <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-200 mb-1">
                  1. Política de Privacidade e Proteção de Dados Pessoais
                </h3>
                <p className="text-emerald-900 dark:text-emerald-300">
                  Esta Política de Privacidade descreve como o {nomeSistema} recolhe, armazena, sincroniza e protege os dados pessoais de estudantes, encarregados de educação, docentes e funcionários, em alinhamento com a <strong>Lei n.º 22/11 (Lei da Proteção de Dados Pessoais de Angola)</strong>.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white">2. Finalidade do Tratamento</h4>
                <p>
                  Os dados pessoais são tratados exclusivamente para fins de gestão escolar legítima: matrícula e confirmação de matrícula, emissão de passes estudantis, lançamento e certificação de notas, controlo de assiduidade, comunicação institucional, gestão de biblioteca e cobrança de emolumentos escolares.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white">3. Armazenamento Híbrido (Offline-First &amp; Nuvem)</h4>
                <p>
                  Para garantir continuidade operacional mesmo sem ligação à internet, os registos da escola são guardados localmente no dispositivo do utilizador autorizado (IndexedDB / LocalStorage) e sincronizados de forma segura com a infraestrutura na nuvem (Firebase Firestore) quando houver conectividade.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white">4. Direitos dos Titulares dos Dados</h4>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Direito de Acesso e Retificação:</strong> Alunos, encarregados e funcionários podem solicitar a consulta ou correção de dados inexatos junto da Secretaria Escolar ou Direção da instituição.</li>
                  <li><strong>Minimização e Retenção:</strong> Os dados permanecem guardados pelo período exigido pelo arquivo documental escolar e normas do Ministério da Educação.</li>
                  <li><strong>Ausência de Comercialização:</strong> Os dados escolares nunca são vendidos, cedidos para publicidade ou partilhados com redes comerciais externas.</li>
                </ul>
              </section>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span><strong>Encarregado de Privacidade (DPO):</strong> {emailDPO}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                  <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{telefoneSuporte}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'termos' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80">
                <h3 className="text-sm font-black text-amber-950 dark:text-amber-200 mb-1">
                  1. Termos e Condições de Uso do {nomeSistema}
                </h3>
                <p className="text-amber-900 dark:text-amber-300">
                  Ao aceder e utilizar esta plataforma, a instituição de ensino e os seus utilizadores autorizados concordam integralmente com os presentes Termos e Condições de Uso.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white">2. Uso Autorizado e Responsabilidade pelas Credenciais</h4>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>O acesso é pessoal e intransmissível, sendo proibido partilhar palavras-passe ou deixar sessões abertas em computadores públicos sem encerramento.</li>
                  <li>As alterações académicas (notas, pautas, declarações, certificados e recibos) ficam associadas ao utilizador operador na trilha de auditoria.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white">3. Proteção Contra Uso Abusivo e Anti-Spam</h4>
                <p>
                  É expressamente proibido executar tentativas automatizadas de força bruta, envio massivo de mensagens não solicitadas (spam), injeção de código ou exploração de formulários. O sistema aplica limitadores de taxa e verificações automáticas anti-bot para preservar a estabilidade dos serviços escolares.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white">4. Disponibilidade Offline, Cópias de Segurança e Propriedade Intelectual</h4>
                <p>
                  A plataforma disponibiliza operação offline e ferramentas de exportação/cópia de segurança. Recomenda-se à Direção e Administração a realização periódica de cópias de segurança locais. O software, arquitetura, logótipos do sistema e estrutura documental encontram-se protegidos por direitos autorais.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80">
                <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200 mb-1">
                  Política de Cookies e Armazenamento Local
                </h3>
                <p className="text-indigo-900 dark:text-indigo-300">
                  O {nomeSistema} utiliza cookies técnicos e mecanismos de armazenamento local do navegador (LocalStorage e IndexedDB) indispensáveis para manter a sessão segura, operar sem internet e recordar preferências da instituição.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 space-y-1">
                  <div className="flex items-center space-x-1.5 font-black text-slate-900 dark:text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Estritamente Necessários</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Sessão autenticada, proteção anti-spam, fila de sincronização offline e preferências de consentimento. Sempre ativos.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 space-y-1">
                  <div className="flex items-center space-x-1.5 font-black text-slate-900 dark:text-white">
                    <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Preferências</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Escola selecionada, tema de cores (Claro/Escuro), último separador aberto e filtros académicos.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 space-y-1">
                  <div className="flex items-center space-x-1.5 font-black text-slate-900 dark:text-white">
                    <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Desempenho</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Diagnóstico local da velocidade de carregamento e estado do Service Worker PWA (sem rastreadores publicitários).
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    resetCookieConsentBanner();
                  }}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 cursor-pointer shadow-xs"
                >
                  <Cookie className="h-4 w-4" />
                  <span>Gerir Preferências de Cookies Agora</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Última atualização normativa: Versão {versao} • Contacto DPO: {emailDPO}
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-5 py-2 bg-slate-900 dark:bg-blue-700 hover:bg-slate-800 dark:hover:bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Compreendido / Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

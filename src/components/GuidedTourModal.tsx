import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Sparkles, 
  LayoutDashboard, 
  Calculator, 
  GraduationCap, 
  FileText, 
  Wifi, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Check, 
  CheckCircle2, 
  ArrowRight,
  BookOpen,
  Award,
  Layers,
  Users,
  Printer,
  Download,
  Bell,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Funcionario, Escola, UserRole } from '../types';
import { InsigniaAngola } from '../constants/insignia';
import { dbService } from '../services/storage';

interface TourStep {
  id: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  titulo: string;
  subtitulo: string;
  descricao: string;
  destaques: {
    icon: React.ReactNode;
    titulo: string;
    texto: string;
  }[];
  dicaPratica: string;
  acaoRapida?: {
    label: string;
    tab: string;
  };
}

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Funcionario;
  escola: Escola;
  onNavigateTab?: (tab: any) => void;
  initialStepIndex?: number;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  escola,
  onNavigateTab,
  initialStepIndex = 0
}) => {
  const [stepIndex, setStepIndex] = useState<number>(initialStepIndex);
  const [naoMostrarNovamente, setNaoMostrarNovamente] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(initialStepIndex);
    }
  }, [isOpen, initialStepIndex]);

  if (!isOpen) return null;

  const isAdminGeral = currentUser.role === 'AdminGeral';
  const isProfessor = currentUser.role === 'Professor';
  const isSecretaria = currentUser.role === 'Secretaria' || currentUser.role === 'ChefeSecretaria';
  const isDiretor = currentUser.role === 'DiretorGeral' || currentUser.role === 'SubdiretorPedagogico';

  const steps: TourStep[] = [
    {
      id: 'boas_vindas',
      badge: 'Bem-vindo ao SGE-NG',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-200',
      icon: <Sparkles className="w-8 h-8 text-amber-500" />,
      titulo: `Olá, ${currentUser.nomeCompleto.split(' ')[0]}! Conheça a sua Plataforma`,
      subtitulo: `Sistema Integrado de Gestão Escolar e Pedagógica adaptado às normas curriculares do Ministério da Educação de Angola (MED).`,
      descricao: `O SGE-NG foi concebido para simplificar e garantir rigor na gestão de instituições escolares em Angola. Como ${currentUser.cargo || currentUser.role}, você tem acesso a ferramentas pedagógicas exclusivas e seguras.`,
      destaques: [
        {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
          titulo: 'Conformidade Ministerial',
          texto: 'Alinhado com a Lei n.º 32/20 e os Decretos Executivos n.º 250/18 (Avaliação das Aprendizagens) de Angola.'
        },
        {
          icon: <Wifi className="w-5 h-5 text-blue-600" />,
          titulo: 'Trabalho Offline & Sincronização',
          texto: 'Se a internet falhar na escola, continue a trabalhar normalmente. Os dados serão sincronizados com o Firebase assim que reconectar.'
        },
        {
          icon: <Award className="w-5 h-5 text-purple-600" />,
          titulo: 'Seu Perfil de Acesso',
          texto: `Sua função atual é ${currentUser.cargo || currentUser.role}. Todas as permissões e menus estão ajustados para o seu trabalho.`
        }
      ],
      dicaPratica: 'Pode rever este tour a qualquer momento clicando no botão "Guia do Sistema" no topo da página ou no menu lateral.'
    },
    {
      id: 'dashboard',
      badge: 'Painel Central',
      badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      icon: <LayoutDashboard className="w-8 h-8 text-indigo-600" />,
      titulo: 'Dashboard: Visão Geral e Indicadores Reais',
      subtitulo: 'Acompanhe as métricas essenciais da instituição em tempo real sem dados fictícios.',
      descricao: 'O painel reúne a contagem real de estudantes matriculados, turmas, professores em exercício e as taxas de aproveitamento escolar por trimestre.',
      destaques: [
        {
          icon: <Users className="w-5 h-5 text-blue-600" />,
          titulo: 'Estatísticas de Efetivo',
          texto: 'Total de alunos inscritos, divisão por gênero (masculino e feminino) e capacidade das salas de aula.'
        },
        {
          icon: <GraduationCap className="w-5 h-5 text-emerald-600" />,
          titulo: 'Aproveitamento Trimestral',
          texto: 'Médias calculadas estritamente com base nas notas reais lançadas e homologadas pelos docentes.'
        },
        {
          icon: <ArrowRight className="w-5 h-5 text-amber-600" />,
          titulo: 'Ações Rápidas Prioritárias',
          texto: 'Os 2 atalhos mais importantes do seu perfil ficam no topo para facilitar o acesso imediato.'
        }
      ],
      dicaPratica: 'No Administrador Geral, o painel exibe a visão macro nacional ou provincial de todas as escolas cadastradas.',
      acaoRapida: {
        label: 'Ver a Dashboard Agora',
        tab: 'dashboard'
      }
    },
    {
      id: 'avaliacoes_mac',
      badge: 'Motor Pedagógico',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      icon: <Calculator className="w-8 h-8 text-emerald-600" />,
      titulo: 'Lançamento de Notas (MAC / NPP / NPT)',
      subtitulo: 'Fórmulas oficiais do MED para 1º, 2º e 3º trimestres com arredondamentos automáticos.',
      descricao: 'O módulo de avaliações calcula as notas de acordo com os regulamentos angolanos, diferenciando classes de transição e classes com exame de saída.',
      destaques: [
        {
          icon: <BookOpen className="w-5 h-5 text-blue-600" />,
          titulo: 'Componentes Oficiais',
          texto: 'MAC (Média de Avaliação Contínua), NPP (Prova do Professor) e NPT (Prova Trimestral) com validação de escala de 0 a 20 valores.'
        },
        {
          icon: <Award className="w-5 h-5 text-purple-600" />,
          titulo: 'Homologação por Júri',
          texto: 'Gera atas e pautas homologadas pela Comissão de Exames para validação legal dos certificados.'
        },
        {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
          titulo: 'Bloqueio de Trimestre',
          texto: 'Histórico auditável com registo de data, hora e responsável por cada lançamento de notas.'
        }
      ],
      dicaPratica: 'Professores encontram as suas turmas e disciplinas atribuídas diretamente na secção "Lançamento de Notas (MAC)".',
      acaoRapida: {
        label: 'Aceder a Notas e Avaliações',
        tab: 'avaliacoes'
      }
    },
    {
      id: 'documentos_pdf',
      badge: 'Documentação Oficial',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
      icon: <Printer className="w-8 h-8 text-amber-600" />,
      titulo: 'Exportação em PDF & Modelos Oficiais do MED',
      subtitulo: 'Emissão formatada de boletins, pautas, declarações, certificados e passes escolares.',
      descricao: 'Todos os documentos oficiais foram desenhados conforme a tipografia, brasão nacional e dizeres jurídicos da República de Angola, com pré-visualização ao vivo e download em PDF de alta definição (300 DPI).',
      destaques: [
        {
          icon: <FileText className="w-5 h-5 text-blue-600" />,
          titulo: 'Boletins & Pautas Homologadas',
          texto: 'Boletins de notas trimestrais e pautas completas da turma com todas as disciplinas e médias por extenso.'
        },
        {
          icon: <Award className="w-5 h-5 text-amber-600" />,
          titulo: 'Declarações & Certificados',
          texto: 'Declaração com notas e Certificados de Conclusão do Ensino Primário (6ª), Iº Ciclo (9ª), IIº Ciclo Geral (12ª) e Técnico (12ª/13ª).'
        },
        {
          icon: <Download className="w-5 h-5 text-emerald-600" />,
          titulo: 'Passes Escolares (8 por Folha)',
          texto: 'Cartões de estudante prontos para corte em folha A4 com QR Code, dados de matrícula e fotografia.'
        }
      ],
      dicaPratica: 'No telemóvel, utilize o botão "Ajustar ao Ecrã" ou o seletor de Zoom para inspecionar qualquer tabela antes de baixar.',
      acaoRapida: {
        label: 'Explorar Emissão de Documentos',
        tab: 'documentos'
      }
    },
    {
      id: 'gestao_academica',
      badge: 'Estrutura Escolar',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-200',
      icon: <Layers className="w-8 h-8 text-purple-600" />,
      titulo: 'Gestão Académica, Horários & Presenças',
      subtitulo: 'Organização de turmas, salas, turnos (Manhã, Tarde, Noite) e controlo de assiduidade.',
      descricao: 'Configure a matriz curricular por classe e curso, estabeleça horários semanais com notificações acústicas de toque de sino e acompanhe a frequência de alunos e professores.',
      destaques: [
        {
          icon: <Users className="w-5 h-5 text-indigo-600" />,
          titulo: 'Turmas & Iniciação',
          texto: 'Criação de turmas por classe, com suporte à Classe de Iniciação pré-escolar no Ensino Primário.'
        },
        {
          icon: <Bell className="w-5 h-5 text-amber-600" />,
          titulo: 'Sino & Notificações de Período',
          texto: 'Aviso visual e sonoro no topo da tela com contagem regressiva para entrada, intervalos e saída de cada turno.'
        },
        {
          icon: <Check className="w-5 h-5 text-emerald-600" />,
          titulo: 'Fichas de Presenças',
          texto: 'Folhas de frequência semanais ou mensais para lançamento rápido de faltas justificadas e injustificadas.'
        }
      ],
      dicaPratica: 'Para turmas do IIº Ciclo ou Técnico, pode vincular a sala e o curso específico (ex: Ciências Físicas e Biológicas, Informática).',
      acaoRapida: {
        label: 'Ver Gestão Académica',
        tab: 'turmas'
      }
    },
    {
      id: 'comunicacao_suporte',
      badge: 'Comunicação & Perfil',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-200',
      icon: <Users className="w-8 h-8 text-rose-600" />,
      titulo: 'Meu Perfil, Mensagens & Suporte Técnico',
      subtitulo: 'Atualize seus dados, comunique com a equipa escolar e solicite apoio técnico.',
      descricao: 'Aceda ao seu perfil para alterar senha e foto oficial. Utilize a biblioteca de mensagens internas para circulares escolares entre Direção, Secretaria e Corpo Docente.',
      destaques: [
        {
          icon: <Users className="w-5 h-5 text-blue-600" />,
          titulo: 'Meu Perfil Seguro',
          texto: 'Altere seu número de contacto, foto de perfil e palavra-passe com encriptação e histórico auditado.'
        },
        {
          icon: <RefreshCw className="w-5 h-5 text-emerald-600" />,
          titulo: 'Sincronização com Firebase',
          texto: 'Quando estiver online, uma barra discreta no topo informa sobre o download e upload dos dados da escola.'
        },
        {
          icon: <Compass className="w-5 h-5 text-purple-600" />,
          titulo: 'Menu Permanente do Guia',
          texto: 'Se tiver dúvidas futuras, clique no botão "Guia Rápido" no topo do ecrã para abrir este tutorial.'
        }
      ],
      dicaPratica: 'Mantenha a sua senha segura e realize backups periódicos na secção de Auditoria e Sistema.',
      acaoRapida: {
        label: 'Aceder ao Meu Perfil',
        tab: 'meu_perfil'
      }
    }
  ];

  const currentStep = steps[stepIndex] || steps[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const progressPercent = Math.round(((stepIndex + 1) / steps.length) * 100);

  const handleNext = () => {
    if (!isLastStep) {
      setStepIndex(prev => prev + 1);
    } else {
      handleFinalizar();
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setStepIndex(prev => prev - 1);
    }
  };

  const handleFinalizar = () => {
    if (naoMostrarNovamente) {
      try {
        localStorage.setItem(`sge_tour_completed_${currentUser.id || currentUser.role}`, 'true');
      } catch (e) {
        console.error('Erro ao guardar preferência de tour:', e);
      }
    }
    onClose();
  };

  const handleExecutarAcaoRapida = (tab: string) => {
    handleFinalizar();
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-modal-title"
      >
        {/* Top Header com Barra de Progresso */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 shrink-0">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5 text-blue-300 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${currentStep.badgeColor}`}>
                    {currentStep.badge}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono font-bold">
                    Passo {stepIndex + 1} de {steps.length}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5 truncate max-w-xs sm:max-w-md">
                  Guia Oficial do SGE-NG Angola
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinalizar}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar Guia"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Passo Atual com Scroll Suave */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Cabeçalho do Passo */}
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl shrink-0 shadow-2xs">
              {currentStep.icon}
            </div>
            <div className="space-y-1">
              <h2 id="tour-modal-title" className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {currentStep.titulo}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {currentStep.subtitulo}
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {currentStep.descricao}
          </p>

          {/* Destaques em Grid */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              O que você precisa saber:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {currentStep.destaques.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-blue-300 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="p-1.5 bg-slate-50 rounded-lg w-fit">
                      {item.icon}
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">
                      {item.titulo}
                    </h5>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      {item.texto}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dica Prática */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-950">
            <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-[11px] text-amber-900">Dica Prática:</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {currentStep.dicaPratica}
              </p>
            </div>
          </div>

          {/* Ação Rápida Direta (se existir para o passo) */}
          {currentStep.acaoRapida && onNavigateTab && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => handleExecutarAcaoRapida(currentStep.acaoRapida!.tab)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>{currentStep.acaoRapida.label}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Rodapé com Navegação, Indicadores de Passos e Opção de Não Mostrar */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={naoMostrarNovamente}
                onChange={(e) => setNaoMostrarNovamente(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-[11px]">Não abrir automaticamente no próximo login</span>
            </label>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2">
            {/* Indicadores de Pontos Clicáveis */}
            <div className="flex items-center space-x-1 mr-2 hidden sm:flex">
              {steps.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === stepIndex 
                      ? 'w-6 bg-blue-600' 
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  title={`Ir para passo ${idx + 1}`}
                />
              ))}
            </div>

            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`px-4 py-2 text-xs font-black rounded-xl shadow-md transition-all inline-flex items-center space-x-1.5 cursor-pointer text-white ${
                isLastStep 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              <span>{isLastStep ? 'Concluir & Começar' : 'Próximo Passo'}</span>
              {isLastStep ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

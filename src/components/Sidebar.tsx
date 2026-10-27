import React, { useState } from 'react';
import { 
  Building2,
  LayoutDashboard, 
  Calendar,
  CalendarDays,
  Layers,
  GraduationCap,
  BookOpen,
  Users,
  Clock,
  UserCheck,
  Award,
  ShieldAlert,
  FileText,
  FileCheck2,
  FileSpreadsheet,
  FileBox,
  ClipboardList,
  DollarSign,
  TrendingUp,
  Library,
  Boxes,
  UserCog,
  Settings,
  ShieldCheck,
  Database,
  LifeBuoy,
  User,
  LogOut,
  ChevronRight,
  Gavel,
  CreditCard,
  Calculator,
  MessageSquare,
  BarChart3,
  Search,
  Compass,
  Sparkles
} from 'lucide-react';
import { UserRole, Funcionario } from '../types';
import { dbService } from '../services/storage';

export type NavTab = 
  // PRINCIPAL
  | 'dashboard'
  // ACADÊMICO
  | 'ano_lectivo'
  | 'calendario_escolar'
  | 'classes'
  | 'cursos'
  | 'disciplinas'
  | 'turmas'
  | 'turnos'
  | 'horarios'
  | 'presencas'
  // GESTÃO
  | 'alunos'
  | 'professores'
  | 'coordenacao'
  | 'comissao_juri'
  | 'direcao'
  // DOCUMENTOS
  | 'declaracoes'
  | 'certificados'
  | 'pautas'
  | 'boletins'
  | 'termos_exame'
  | 'passes_escolares'
  // FINANCEIRO
  | 'pagamentos'
  | 'relatorios_financeiros'
  // OUTROS
  | 'biblioteca'
  | 'patrimonio'
  // SISTEMA
  | 'usuarios_perfis'
  | 'configuracoes'
  | 'formulas_notas'
  | 'auditoria_logs'
  | 'backup_restauro'
  | 'apoio_tecnico'
  // MEU PERFIL
  | 'meu_perfil'
  // Compatibilidade legada
  | 'admin_escolas'
  | 'academico'
  | 'estudantes'
  | 'avaliacoes'
  | 'rh'
  | 'financeiro'
  | 'comunicacao'
  | 'documentos'
  | 'sistema'
  | 'auditoria'
  | 'arquitetura';

export interface MenuGroup {
  categoria: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    roles: UserRole[];
    badge?: string;
  }[];
}

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  userRole: UserRole;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  currentUser?: Funcionario;
  onLogout?: () => void;
  onOpenTour?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  userRole,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentUser,
  onLogout,
  onOpenTour
}) => {
  // Menu oficial categorizado conforme especificação estrita do MED
  const menuGrupos: MenuGroup[] = [
    {
      categoria: 'PRINCIPAL',
      items: [
        {
          id: 'dashboard',
          label: userRole === 'AdminGeral' ? 'Painel Central Ministerial' : 'Painel de Controlo',
          icon: LayoutDashboard,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdirectorAdministrativo', 'Professor', 'Secretaria', 'Encarregado'],
          badge: userRole === 'AdminGeral' ? 'Macro' : undefined
        }
      ]
    },
    {
      categoria: 'MINISTÉRIO & REDE NACIONAL',
      items: [
        {
          id: 'admin_escolas',
          label: 'Rede Nacional de Escolas',
          icon: Building2,
          roles: ['AdminGeral'],
          badge: 'Instituições'
        }
      ]
    },
    {
      categoria: 'ACADÊMICO',
      items: [
        {
          id: 'ano_lectivo',
          label: 'Ano Letivo',
          icon: Calendar,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico'],
          badge: 'Gestão'
        },
        {
          id: 'calendario_escolar',
          label: 'Calendário Escolar Oficial',
          icon: CalendarDays,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno', 'Professor', 'Secretaria', 'ChefeSecretaria', 'Secretario', 'Encarregado'],
          badge: 'MED'
        },
        {
          id: 'classes',
          label: 'Classes',
          icon: Layers,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'Secretaria'],
          badge: 'Ciclos'
        },
        {
          id: 'cursos',
          label: 'Cursos',
          icon: GraduationCap,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'Secretaria']
        },
        {
          id: 'disciplinas',
          label: 'Disciplinas',
          icon: BookOpen,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'Secretaria']
        },
        {
          id: 'turmas',
          label: 'Turmas',
          icon: Users,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'Secretaria']
        },
        {
          id: 'turnos',
          label: 'Turnos',
          icon: Clock,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno']
        },
        {
          id: 'horarios',
          label: userRole === 'Professor' ? 'O Meu Horário & Aulas' : 'Horários & Notificações',
          icon: Clock,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno', 'Professor', 'Secretaria', 'ChefeSecretaria', 'Secretario'],
          badge: 'Sino & Avisos'
        },
        {
          id: 'presencas',
          label: 'Fichas de Presenças',
          icon: ClipboardList,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno', 'Professor', 'Secretaria', 'ChefeSecretaria', 'Secretario'],
          badge: 'Diário & Faltas'
        },
        {
          id: 'avaliacoes',
          label: 'Lançamento de Notas (MAC)',
          icon: BarChart3,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno', 'Professor'],
          badge: 'Notas MED'
        }
      ]
    },
    {
      categoria: 'GESTÃO & PESSOAL',
      items: [
        {
          id: 'alunos',
          label: userRole === 'Encarregado' ? 'Acompanhar Educando' : 'Alunos',
          icon: Users,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno', 'Professor', 'Secretaria', 'ChefeSecretaria', 'Secretario', 'Encarregado'],
          badge: 'Matrículas'
        },
        {
          id: 'professores',
          label: 'Recursos Humanos & Docência',
          icon: UserCheck,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico'],
          badge: 'Quadro'
        },
        {
          id: 'coordenacao',
          label: userRole === 'Professor' ? 'Lançamento de Notas MAC' : 'Coordenação Pedagógica (MAC)',
          icon: Award,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno', 'Professor'],
          badge: 'Notas'
        },
        {
          id: 'comissao_juri',
          label: 'Comissão de Júri',
          icon: Gavel,
          roles: ['DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'Professor'],
          badge: 'Deliberação'
        },
        {
          id: 'direcao',
          label: 'Presidência / Direção',
          icon: ShieldAlert,
          roles: ['DiretorGeral', 'SubdirectorAdministrativo', 'SubdiretorAdministrativo', 'SubdiretorPedagogico', 'CoordenadorPedagogico'],
          badge: 'Executivo'
        }
      ]
    },
    {
      categoria: 'DOCUMENTOS OFICIAIS',
      items: [
        {
          id: 'declaracoes',
          label: 'Declarações',
          icon: FileText,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'Secretaria', 'ChefeSecretaria', 'Secretario', 'Encarregado']
        },
        {
          id: 'certificados',
          label: 'Certificados',
          icon: FileCheck2,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'Secretaria', 'ChefeSecretaria', 'Secretario'],
          badge: 'Autenticado'
        },
        {
          id: 'pautas',
          label: 'Pautas Trimestrais',
          icon: FileSpreadsheet,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno', 'Professor', 'Secretaria', 'ChefeSecretaria', 'Secretario']
        },
        {
          id: 'boletins',
          label: 'Boletins de Notas',
          icon: FileBox,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno', 'Professor', 'Secretaria', 'ChefeSecretaria', 'Secretario', 'Encarregado'],
          badge: '4 por A4'
        },
        {
          id: 'passes_escolares',
          label: 'Passes Escolares (8 p/ A4)',
          icon: CreditCard,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'Secretaria', 'ChefeSecretaria', 'Secretario'],
          badge: 'Configurador'
        },
        {
          id: 'termos_exame',
          label: 'Termos de Exame',
          icon: ClipboardList,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'Secretaria', 'ChefeSecretaria', 'Secretario']
        }
      ]
    },
    {
      categoria: 'FINANCEIRO & CAIXA',
      items: [
        {
          id: 'pagamentos',
          label: userRole === 'Encarregado' ? 'Pagamentos de Propinas' : 'Pagamentos & Caixa',
          icon: DollarSign,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'Secretaria', 'ChefeSecretaria', 'Secretario', 'Encarregado'],
          badge: 'Caixa'
        },
        {
          id: 'relatorios_financeiros',
          label: 'Relatórios Financeiros',
          icon: TrendingUp,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'ChefeSecretaria'],
          badge: 'Balanço'
        }
      ]
    },
    {
      categoria: 'COMUNICAÇÃO & LOGÍSTICA',
      items: [
        {
          id: 'comunicacao',
          label: 'Comunicação & Mensagens Internas',
          icon: MessageSquare,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'CoordenadorTurno', 'Professor', 'Secretaria', 'ChefeSecretaria', 'Secretario', 'Encarregado'],
          badge: 'Mensagens'
        },
        {
          id: 'biblioteca',
          label: 'Biblioteca Escolar',
          icon: Library,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo', 'CoordenadorPedagogico', 'Professor', 'Secretaria']
        },
        {
          id: 'patrimonio',
          label: 'Património Escolar',
          icon: Boxes,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo'],
          badge: 'Inventário'
        }
      ]
    },
    {
      categoria: 'SISTEMA & SEGURANÇA',
      items: [
        {
          id: 'usuarios_perfis',
          label: userRole === 'AdminGeral' ? 'Diretores & Credenciais' : 'Usuários e Perfis',
          icon: UserCog,
          roles: ['AdminGeral', 'DiretorGeral'],
          badge: 'RBAC'
        },
        {
          id: 'configuracoes',
          label: 'Configurações do Sistema',
          icon: Settings,
          roles: ['AdminGeral', 'DiretorGeral']
        },
        {
          id: 'formulas_notas',
          label: 'Fórmulas de Cálculo de Notas',
          icon: Calculator,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico'],
          badge: 'Cálculo'
        },
        {
          id: 'auditoria_logs',
          label: 'Auditoria & Segurança AES-256',
          icon: ShieldCheck,
          roles: ['AdminGeral', 'DiretorGeral'],
          badge: 'Forense'
        },
        {
          id: 'backup_restauro',
          label: 'Backup & Sincronização',
          icon: Database,
          roles: ['AdminGeral', 'DiretorGeral'],
          badge: 'Integral'
        },
        {
          id: 'apoio_tecnico',
          label: userRole === 'AdminGeral' ? 'Central de Apoio Técnico' : 'Apoio Técnico DTI',
          icon: LifeBuoy,
          roles: ['AdminGeral', 'DiretorGeral'],
          badge: 'Suporte'
        }
      ]
    },
    {
      categoria: 'CONTA & ACESSO',
      items: [
        {
          id: 'meu_perfil',
          label: 'Meu Perfil & Senha',
          icon: User,
          roles: ['AdminGeral', 'DiretorGeral', 'SubdiretorPedagogico', 'SubdirectorAdministrativo', 'Professor', 'Secretaria', 'Encarregado'],
          badge: 'Ativo'
        }
      ]
    }
  ];

  const [filtroMenu, setFiltroMenu] = useState('');

  const handleSelect = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed lg:static top-16 bottom-0 left-0 z-20
        w-72 bg-white border-r border-gray-200 flex flex-col justify-between
        transition-transform duration-200 ease-in-out no-print
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Barra de Pesquisa Rápida de Módulos */}
        <div className="p-2.5 pb-0 border-b border-gray-100 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              value={filtroMenu}
              onChange={(e) => setFiltroMenu(e.target.value)}
              placeholder="Pesquisar módulo ou menu..."
              className="w-full pl-8 pr-7 py-1.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
            {filtroMenu && (
              <button
                type="button"
                onClick={() => setFiltroMenu('')}
                className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-700 text-xs font-bold px-1"
                title="Limpar pesquisa"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="p-3 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {menuGrupos.map((grupo) => {
            const escolaAtiva = dbService.getEscolaAtiva();
            const temSessaoApoioAtiva = Boolean(escolaAtiva?.sessaoApoioTecnicoAtiva);
            const delegacoesEscola = currentUser ? dbService.getDelegacoesCobranca(escolaAtiva?.id || '') : [];
            const temDelegacaoCobranca = currentUser 
              ? delegacoesEscola.some(d => d.funcionarioId === currentUser.id && d.ativo)
              : false;

            const menusAdminGeralPadrao: NavTab[] = [
              'dashboard', 
              'admin_escolas', 
              'apoio_tecnico', 
              'usuarios_perfis', 
              'configuracoes', 
              'auditoria_logs', 
              'backup_restauro', 
              'meu_perfil'
            ];

            const itensPermitidos = grupo.items.filter(item => {
              // Filtro por texto digitado na pesquisa
              if (filtroMenu.trim()) {
                const termo = filtroMenu.toLowerCase().trim();
                const bateu = item.label.toLowerCase().includes(termo) || 
                              (item.badge && item.badge.toLowerCase().includes(termo)) ||
                              grupo.categoria.toLowerCase().includes(termo);
                if (!bateu) return false;
              }

              // 1. Regra MED: Admin Geral sem Pedido de Apoio Técnico Ativo só vê menus da administração dele
              if (userRole === 'AdminGeral') {
                // Norma do Sistema: Administrador Geral não precisa ver comissões de júri
                if (item.id === 'comissao_juri') return false;
                if (!temSessaoApoioAtiva) {
                  return menusAdminGeralPadrao.includes(item.id);
                }
                // Com sessão de apoio técnico autorizada pelo Diretor, o Admin Geral tem ACESSO aos demais menus
                return true;
              }

              // 2. Delegação Financeira pelo Diretor Geral (ao Subdiretor Pedagógico, Professor ou Secretário)
              if (item.id === 'pagamentos' && temDelegacaoCobranca) {
                return true;
              }

              if (!item.roles.includes(userRole)) return false;

              // Norma Estrita do MED: Administrador Geral não vê comissão de júri; apenas Diretor, Subdiretores ou no Professor da comissão
              if (item.id === 'comissao_juri') {
                if (['DiretorGeral', 'SubdiretorPedagogico', 'SubdiretorAdministrativo', 'SubdirectorAdministrativo'].includes(userRole)) {
                  return true;
                }
                if (userRole === 'Professor' && currentUser) {
                  const juris = dbService.getJuris();
                  const estaEmComissao = juris.some(j => 
                    j.presidenteId === currentUser.id ||
                    j.secretarioId === currentUser.id ||
                    j.membros?.some(m => m.usuarioId === currentUser.id || (currentUser.nomeCompleto && m.nome?.toLowerCase().trim() === currentUser.nomeCompleto.toLowerCase().trim()))
                  );
                  return estaEmComissao;
                }
                return false;
              }

              return true;
            });
            if (itensPermitidos.length === 0) return null;

            return (
              <div key={grupo.categoria} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  {grupo.categoria}
                </div>

                <div className="space-y-0.5">
                  {itensPermitidos.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item.id)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer
                          ${isActive 
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-600 shadow-2xs font-bold' 
                            : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-950 border border-transparent'}
                        `}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge ? (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ml-1.5 ${
                            isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.badge}
                          </span>
                        ) : (
                          isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botão de Tour & Guia do Sistema no Menu Lateral */}
        {onOpenTour && (
          <div className="px-3 pb-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (mobileMenuOpen) setMobileMenuOpen(false);
                onOpenTour();
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 text-amber-950 transition-all text-xs font-bold shadow-2xs group cursor-pointer"
              title="Abrir o Guia do Sistema e Tour da Dashboard"
            >
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-amber-600 group-hover:rotate-45 transition-transform" />
                <span>Tour da Plataforma</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </div>
        )}

        {/* User Account & Logout in Sidebar Footer */}
        {currentUser && (
          <div className="p-3 mx-2 mb-2 bg-gray-50/80 border border-gray-200 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => handleSelect('meu_perfil')}
              className="w-full flex items-center space-x-2.5 mb-2 p-1 rounded-lg hover:bg-white transition-colors text-left cursor-pointer group"
              title="Abrir Meu Perfil para atualizar dados, foto ou palavra-passe"
            >
              {currentUser.fotoUrl ? (
                <img 
                  src={currentUser.fotoUrl} 
                  alt={currentUser.nomeCompleto} 
                  className="h-8 w-8 rounded-full object-cover border border-blue-200 shrink-0" 
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 border border-blue-200">
                  {currentUser.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate group-hover:text-blue-700">
                  {currentUser.nomeCompleto}
                </p>
                <p className="text-[10px] text-gray-500 font-semibold truncate">
                  {currentUser.cargo || currentUser.role}
                </p>
              </div>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-red-600" />
                <span>Terminar Sessão</span>
              </button>
            )}
          </div>
        )}

        {/* Informações Oficiais e Desenvolvedor no Rodapé do Menu */}
        <div className="p-2.5 border-t border-gray-200 bg-gray-50/70 text-xs text-gray-600 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
            <span>SGE-NG Angola</span>
            <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded-sm text-[10px]">
              Offline-First
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>© {new Date().getFullYear()} MED Angola</span>
            <span className="font-semibold text-gray-600">Dite Zola NG</span>
          </div>
        </div>
      </aside>
    </>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  Calendar,
  Layers,
  ShieldCheck,
  LogOut,
  User,
  LifeBuoy,
  Cpu,
  MessageSquare,
  Compass,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import { Escola, Funcionario } from '../types';
import { SystemIntegrityStatus } from '../services/firebaseClient';
import { OfflineStatusWidget } from './OfflineStatusWidget';
import { PWAInstallButton } from './PWAInstallButton';
import { PeriodNotificationBell } from './PeriodNotificationBell';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';
import { useTheme } from '../services/themeService';

interface HeaderProps {
  escola: Escola;
  escolas: Escola[];
  onSelectEscola: (escolaId: string) => void;
  anosLectivos: string[];
  onSelectAnoLectivo: (ano: string) => void;
  onSelectTrimestre: (trimestre: '1' | '2' | '3') => void;
  currentUser: Funcionario;
  integrity: SystemIntegrityStatus;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenPublicPortal: () => void;
  onNavigateToPerfil: () => void;
  onNavigateToComunicacao?: () => void;
  onNavigateToTab?: (tab: string, subTab?: string) => void;
  onLogout?: () => void;
  onOpenSecurityEngine?: () => void;
  onOpenTour?: () => void;
  parentReadOnly?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  escola,
  escolas,
  onSelectEscola,
  anosLectivos,
  onSelectAnoLectivo,
  onSelectTrimestre,
  currentUser,
  mobileMenuOpen,
  setMobileMenuOpen,
  onNavigateToPerfil,
  onNavigateToComunicacao,
  onNavigateToTab,
  onLogout,
  onOpenSecurityEngine,
  onOpenTour,
  parentReadOnly = false
}) => {
  const { isDark, toggleDarkMode } = useTheme();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const isAdminGeral = currentUser.role === 'AdminGeral';
  const escolasComApoioAutorizado = escolas.filter(e => Boolean(e.sessaoApoioTecnicoAtiva && e.sessaoApoioTecnicoAtiva.dataInicio));
  const configSistema = dbService.getConfiguracaoSistema();

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [profileMenuOpen]);

  const userInitials = currentUser.nomeCompleto
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const msgsVisiveisCount = dbService.obterMensagens().filter(m =>
    m.escolaId === escola.id &&
    !m.lida &&
    (isAdminGeral || (m.remetentePapel !== 'AdminGeral' && m.destinatarioId !== 'admin-geral'))
  ).length;

  return (
    <header className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs no-print transition-colors">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-16 min-w-0">
          {/* Zona 1: Menu Mobile + Logótipo & Instituição (flexível sem estourar largura) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 xl:flex-initial">
            {!parentReadOnly && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0 transition-colors"
                aria-label={mobileMenuOpen ? 'Fechar Menu' : 'Abrir Menu'}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs shrink-0 p-1 overflow-hidden"
                title="Logótipo Oficial do Sistema"
              >
                <InsigniaAngola
                  size={34}
                  customUrl={configSistema.insigniaNacionalUrl}
                  className="object-contain"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-extrabold text-slate-950 dark:text-white text-sm sm:text-base tracking-tight whitespace-nowrap">
                    {configSistema.nomeSistema || 'SGE-NG'}
                  </span>
                  {isAdminGeral && (
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                      <ShieldCheck className="h-3 w-3 shrink-0" />
                      <span>DTI Central</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center min-w-0">
                  {isAdminGeral ? (
                    escolasComApoioAutorizado.length > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs min-w-0">
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 rounded shrink-0">
                          <LifeBuoy className="w-2.5 h-2.5" />
                          <span>Apoio:</span>
                        </span>
                        <select
                          value={escola.id}
                          onChange={(e) => onSelectEscola(e.target.value)}
                          className="text-xs text-indigo-900 dark:text-indigo-200 font-bold bg-transparent border-0 p-0 pr-4 truncate max-w-[140px] sm:max-w-[220px] focus:ring-0 cursor-pointer"
                        >
                          {escolasComApoioAutorizado.map(esc => (
                            <option key={esc.id} value={esc.id}>
                              {esc.nomeOficial}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium truncate max-w-[160px] sm:max-w-[260px] block">
                        Direção de Tecnologias de Informação (MED)
                      </span>
                    )
                  ) : (
                    <span
                      className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[150px] sm:max-w-[240px] lg:max-w-[280px] block"
                      title={escola.nomeOficial}
                    >
                      {escola.nomeOficial}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Zona 2: Ano Lectivo & Trimestre (oculto ou apenas informativo para Encarregado) */}
          {!isAdminGeral && !parentReadOnly && (
            <div className="hidden xl:flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-medium text-slate-500 dark:text-slate-400">Ano:</span>
                <select
                  value={escola.anoLectivoActivo || ''}
                  onChange={(e) => onSelectAnoLectivo(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 dark:text-white border-0 p-0 text-xs focus:ring-0 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {(!escola.anoLectivoActivo || anosLectivos.length === 0) && (
                    <option value="">Sem ano ativo</option>
                  )}
                  {anosLectivos.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              <span className="text-slate-300 dark:text-slate-600">|</span>

              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <select
                  value={escola.trimestreActivo || '1'}
                  onChange={(e) => onSelectTrimestre(e.target.value as '1' | '2' | '3')}
                  aria-label="Selecionar Trimestre Ativo"
                  className="bg-transparent font-bold text-slate-900 dark:text-white border-0 p-0 text-xs focus:ring-0 cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  <option value="1">Iº Trimestre</option>
                  <option value="2">IIº Trimestre</option>
                  <option value="3">IIIº Trimestre</option>
                </select>
              </div>

              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className={`text-[11px] font-bold whitespace-nowrap ${
                escola.estadoAno === 'Aberto'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}>
                {escola.estadoAno || 'Planeamento'}
              </span>
            </div>
          )}

          {parentReadOnly && (
            <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0 text-slate-700 dark:text-slate-200">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-bold">{escola.anoLectivoActivo || 'Ano Ativo'}</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{escola.trimestreActivo || '1'}º Trimestre</span>
            </div>
          )}

          {/* Zona 3: Ações compactas + Notificações + Foto de Perfil com Menu (Inclui Tema e Terminar Sessão) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botão de Instalação PWA (compacto em ecrãs pequenos) */}
            {!parentReadOnly && <PWAInstallButton />}

            {/* Widget de Estado Offline e Sincronização */}
            <OfflineStatusWidget />

            {/* Sino de Alertas e Mensagens Internas */}
            {!parentReadOnly && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <PeriodNotificationBell escola={escola} currentUser={currentUser} onNavigate={onNavigateToTab} />

                {onNavigateToComunicacao && (
                  <button
                    type="button"
                    onClick={onNavigateToComunicacao}
                    className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
                    title="Comunicação e Mensagens Internas da Escola"
                    aria-label="Comunicação e Mensagens Internas"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {msgsVisiveisCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-xs">
                        {msgsVisiveisCount > 9 ? '9+' : msgsVisiveisCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Motor de Segurança & Criptografia AES-256 (Exclusivo Admin Geral em desktop) */}
            {isAdminGeral && onOpenSecurityEngine && (
              <button
                type="button"
                onClick={onOpenSecurityEngine}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 text-indigo-900 dark:text-indigo-200 text-xs font-bold transition-all cursor-pointer shrink-0"
                title="Abrir Motor de Segurança & Criptografia AES-256 em Tempo Real"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden xl:inline">AES-256</span>
              </button>
            )}

            {/* Foto de Perfil com Menu Dropdown (Meu Perfil, Tema, Guia e Terminar Sessão) */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className={`flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl border transition-all text-left cursor-pointer shrink-0 ${
                  profileMenuOpen
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-slate-800 dark:border-blue-400'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                title="Abrir Menu da Conta (Meu Perfil, Tema e Terminar Sessão)"
              >
                {currentUser.fotoUrl && currentUser.fotoUrl.trim() !== '' ? (
                  <img
                    src={currentUser.fotoUrl}
                    alt={currentUser.nomeCompleto}
                    className="w-8 h-8 rounded-full object-cover border border-blue-300 dark:border-blue-500/60 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-700 shrink-0">
                    {userInitials}
                  </div>
                )}

                <div className="hidden md:flex flex-col text-left leading-tight min-w-0 max-w-[125px]">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {currentUser.nomeCompleto}
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold truncate">
                    {currentUser.cargo || currentUser.role}
                  </span>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-150 ${
                    profileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden"
                >
                  {/* Identidade no topo do menu */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    {currentUser.fotoUrl && currentUser.fotoUrl.trim() !== '' ? (
                      <img
                        src={currentUser.fotoUrl}
                        alt={currentUser.nomeCompleto}
                        className="w-10 h-10 rounded-full object-cover border border-blue-300 dark:border-blue-500 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-200 flex items-center justify-center font-black text-sm border border-blue-200 dark:border-blue-700 shrink-0">
                        {userInitials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {currentUser.nomeCompleto}
                      </p>
                      <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 truncate">
                        {currentUser.cargo || currentUser.role}
                      </p>
                      {!isAdminGeral && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {escola.nomeOficial}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Seletor rápido Ano / Trimestre para ecrãs < xl */}
                  {!isAdminGeral && !parentReadOnly && (
                    <div className="xl:hidden px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Ano Letivo:</span>
                        <select
                          value={escola.anoLectivoActivo || ''}
                          onChange={(e) => onSelectAnoLectivo(e.target.value)}
                          className="text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
                        >
                          {(!escola.anoLectivoActivo || anosLectivos.length === 0) && (
                            <option value="">Sem ano ativo</option>
                          )}
                          {anosLectivos.map(ano => (
                            <option key={ano} value={ano}>{ano}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Trimestre:</span>
                        <select
                          value={escola.trimestreActivo || '1'}
                          onChange={(e) => onSelectTrimestre(e.target.value as '1' | '2' | '3')}
                          className="text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
                        >
                          <option value="1">Iº Trimestre</option>
                          <option value="2">IIº Trimestre</option>
                          <option value="3">IIIº Trimestre</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Ações da Conta */}
                  <div className="p-1.5 space-y-0.5">
                    {!parentReadOnly && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onNavigateToPerfil();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Meu Perfil &amp; Palavra-passe</span>
                      </button>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        toggleDarkMode();
                      }}
                      className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        {isDark ? (
                          <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                        )}
                        <span>{isDark ? 'Mudar para Tema Claro' : 'Ativar Tema Escuro'}</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {isDark ? 'Escuro' : 'Claro'}
                      </span>
                    </button>

                    {!parentReadOnly && onOpenTour && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenTour();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Guia do Sistema (Tour)</span>
                      </button>
                    )}

                    {isAdminGeral && onOpenSecurityEngine && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenSecurityEngine();
                        }}
                        className="lg:hidden w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>Motor de Segurança AES-256</span>
                      </button>
                    )}
                  </div>

                  {onLogout && (
                    <div className="p-1.5 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Terminar Sessão</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

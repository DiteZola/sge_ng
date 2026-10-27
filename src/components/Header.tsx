import React from 'react';
import { 
  Building2, 
  Menu, 
  X, 
  Calendar,
  Layers,
  ShieldCheck,
  LogOut,
  User,
  LifeBuoy,
  Cpu,
  Bell,
  MessageSquare,
  Compass
} from 'lucide-react';
import { Escola, Funcionario } from '../types';
import { SystemIntegrityStatus } from '../services/firebaseClient';
import { OfflineStatusWidget } from './OfflineStatusWidget';
import { PWAInstallButton } from './PWAInstallButton';
import { PeriodNotificationBell } from './PeriodNotificationBell';
import { dbService } from '../services/storage';
import { InsigniaAngola } from '../constants/insignia';

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
  onLogout?: () => void;
  onOpenSecurityEngine?: () => void;
  onOpenTour?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  escola,
  escolas,
  onSelectEscola,
  anosLectivos,
  onSelectAnoLectivo,
  onSelectTrimestre,
  currentUser,
  integrity,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenPublicPortal,
  onNavigateToPerfil,
  onNavigateToComunicacao,
  onLogout,
  onOpenSecurityEngine,
  onOpenTour
}) => {
  // O Administrador Geral não vê escolas a não ser quando há autorização formal de apoio técnico
  const isAdminGeral = currentUser.role === 'AdminGeral';
  const temApoioAtivo = dbService.temAutorizacaoApoioTecnico(escola.id);

  // Escolas com autorização de apoio técnico
  const escolasComApoioAutorizado = escolas.filter(e => dbService.temAutorizacaoApoioTecnico(e.id));

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Instituição Contextual */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-none cursor-pointer"
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div className="flex items-center space-x-2.5">
              {/* Insígnia do Administrador Geral como Logótipo Oficial do Sistema */}
              <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs shrink-0 p-1 overflow-hidden" title="Logótipo Oficial do Sistema">
                <InsigniaAngola 
                  size={36} 
                  customUrl={dbService.getConfiguracaoSistema().insigniaNacionalUrl} 
                  className="object-contain" 
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-gray-950 text-base sm:text-lg tracking-tight">
                    {dbService.getConfiguracaoSistema().nomeSistema || 'SGE-NG'}
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    MED Angola
                  </span>
                  {isAdminGeral && (
                    <span className="hidden md:inline-flex items-center space-x-1 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Administração Central</span>
                    </span>
                  )}
                </div>

                {/* Exibição da Instituição com Proteção de Privacidade */}
                <div className="flex items-center space-x-1">
                  {isAdminGeral ? (
                    // O Administrador Geral opera de maneira macro, só podendo inspecionar uma escola se houver apoio técnico autorizado
                    escolasComApoioAutorizado.length > 0 ? (
                      <div className="flex items-center space-x-1 text-xs">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded flex items-center space-x-1">
                          <LifeBuoy className="w-2.5 h-2.5" />
                          <span>Apoio Técnico Ativo:</span>
                        </span>
                        <select
                          value={escola.id}
                          onChange={(e) => onSelectEscola(e.target.value)}
                          className="text-xs text-indigo-900 font-bold bg-transparent border-0 p-0 pr-4 truncate max-w-[180px] sm:max-w-xs focus:ring-0 cursor-pointer"
                        >
                          {escolasComApoioAutorizado.map(esc => (
                            <option key={esc.id} value={esc.id}>
                              {esc.nomeOficial}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600 font-semibold truncate max-w-[220px] sm:max-w-xs block">
                        Direção de Tecnologias de Informação (DTI / MED)
                      </span>
                    )
                  ) : (
                    // Para Diretores, Professores e Secretaria, a escola é a sua instituição oficial
                    <span 
                      className="text-xs text-gray-800 font-bold truncate max-w-[200px] sm:max-w-xs md:max-w-md block"
                      title={escola.nomeOficial}
                    >
                      {escola.nomeOficial}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Centro: Ano Lectivo & Trimestre */}
          {!isAdminGeral && (
            <div className="hidden md:flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs">
              <div className="flex items-center space-x-1 text-gray-700">
                <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="font-medium text-gray-500">Ano:</span>
                <select
                  value={escola.anoLectivoActivo}
                  onChange={(e) => onSelectAnoLectivo(e.target.value)}
                  className="bg-transparent font-extrabold text-gray-900 border-0 p-0 text-xs focus:ring-0 cursor-pointer hover:text-blue-700"
                >
                  {anosLectivos.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              <span className="text-gray-300">|</span>

              <div className="flex items-center space-x-1 text-gray-700">
                <Layers className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span className="font-medium text-gray-500">Trimestre:</span>
                <select
                  value={escola.trimestreActivo}
                  onChange={(e) => onSelectTrimestre(e.target.value as '1' | '2' | '3')}
                  className="bg-transparent font-extrabold text-gray-900 border-0 p-0 text-xs focus:ring-0 cursor-pointer hover:text-green-700"
                >
                  <option value="1">Iº Trimestre</option>
                  <option value="2">IIº Trimestre</option>
                  <option value="3">IIIº Trimestre</option>
                </select>
              </div>

              <span className="text-gray-300">|</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                escola.estadoAno === 'Aberto' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {escola.estadoAno}
              </span>
            </div>
          )}

          {/* Direita: PWA, Estado Offline, Meu Perfil & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Botão de Instalação PWA */}
            <PWAInstallButton />

            {/* Widget Interativo de Estado Offline */}
            <OfflineStatusWidget />

            {/* Notificações no Topo do Aplicativo & Avisos em Tempo Real */}
            <div className="flex items-center space-x-1">
              {/* Sino acústico e visual de períodos e horários */}
              <PeriodNotificationBell escola={escola} currentUser={currentUser} />

              {/* Botão de Notificações / Mensagens Internas da Escola */}
              {onNavigateToComunicacao && (
                <button
                  type="button"
                  onClick={onNavigateToComunicacao}
                  className="relative p-2 rounded-lg text-gray-600 hover:text-blue-700 hover:bg-blue-50 border border-gray-200 transition-colors cursor-pointer"
                  title="Comunicação e Mensagens Internas da Escola"
                >
                  <MessageSquare className="w-4 h-4 text-gray-700 hover:text-blue-700" />
                  {dbService.obterMensagens().filter(m => m.escolaId === escola.id && !m.lida).length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-xs animate-bounce">
                      {dbService.obterMensagens().filter(m => m.escolaId === escola.id && !m.lida).length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Motor de Segurança & Criptografia AES-256 */}
            {onOpenSecurityEngine && (
              <button
                type="button"
                onClick={onOpenSecurityEngine}
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Abrir Motor de Segurança & Criptografia AES-256 em Tempo Real"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span className="hidden md:inline">AES-256</span>
              </button>
            )}

            {/* Botão de Tour Guiado / Guia do Sistema */}
            {onOpenTour && (
              <button
                type="button"
                onClick={onOpenTour}
                className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                title="Abrir o Guia do Sistema e Tour da Dashboard"
              >
                <Compass className="w-4 h-4 text-amber-600 group-hover:rotate-45 transition-transform shrink-0" />
                <span className="hidden md:inline">Guia do Sistema</span>
              </button>
            )}

            {/* Botão Meu Perfil (Substitui o seletor de perfis vulnerável) */}
            <button
              type="button"
              onClick={onNavigateToPerfil}
              className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left cursor-pointer"
              title="Aceder ao Meu Perfil para atualizar dados, foto e senha"
            >
              {currentUser.fotoUrl ? (
                <img 
                  src={currentUser.fotoUrl} 
                  alt={currentUser.nomeCompleto} 
                  className="w-7 h-7 rounded-full object-cover border border-blue-300 shrink-0" 
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200 shrink-0">
                  {currentUser.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-gray-900 truncate max-w-[130px]" title={currentUser.nomeCompleto}>
                  {currentUser.nomeCompleto}
                </span>
                <span className="text-[10px] text-blue-700 font-semibold truncate max-w-[130px]">
                  {currentUser.cargo || currentUser.role}
                </span>
              </div>
            </button>

            {/* Botão Logout */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border border-red-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                title="Terminar Sessão e Voltar ao Ecrã de Login"
              >
                <LogOut className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

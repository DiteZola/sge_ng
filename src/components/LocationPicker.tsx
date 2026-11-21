import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Globe, Compass, List, Edit3, Plus, Check } from 'lucide-react';
import { locationService } from '../services/locationService';

const CUSTOM_SENTINEL = '__OUTRO__';

interface LocationPickerProps {
  provinciaSelecionada: string;
  onProvinciaChange: (provincia: string) => void;
  municipioSelecionado: string;
  onMunicipioChange: (municipio: string) => void;
  paisSelecionado?: string;
  onPaisChange?: (pais: string) => void;
  showMunicipio?: boolean;
  className?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  provinciaSelecionada,
  onProvinciaChange,
  municipioSelecionado,
  onMunicipioChange,
  paisSelecionado = 'Angola',
  onPaisChange,
  showMunicipio = true,
  className = ''
}) => {
  const [provincias, setProvincias] = useState<string[]>(() => locationService.getProvincias());
  const [municipios, setMunicipios] = useState<string[]>(() => locationService.getMunicipios(provinciaSelecionada));
  const [paises, setPaises] = useState<string[]>(() => locationService.getPaises());

  const ehEstrangeiro = Boolean(paisSelecionado && paisSelecionado.trim().toLowerCase() !== 'angola');

  const [modoManualProvincia, setModoManualProvincia] = useState<boolean>(() =>
    ehEstrangeiro || Boolean(provinciaSelecionada && !locationService.getProvincias().includes(provinciaSelecionada))
  );
  const [modoManualMunicipio, setModoManualMunicipio] = useState<boolean>(() => {
    if (ehEstrangeiro) return true;
    const lista = locationService.getMunicipios(provinciaSelecionada);
    return lista.length === 0 || Boolean(municipioSelecionado && !lista.includes(municipioSelecionado));
  });
  const [modoManualPais, setModoManualPais] = useState<boolean>(() =>
    Boolean(paisSelecionado && !locationService.getPaises().includes(paisSelecionado))
  );

  const [feedbackCampo, setFeedbackCampo] = useState<'prov' | 'munc' | 'pais' | null>(null);

  useEffect(() => {
    const novosMunc = locationService.getMunicipios(provinciaSelecionada);
    setMunicipios(novosMunc);
    if (ehEstrangeiro) {
      setModoManualProvincia(true);
      setModoManualMunicipio(true);
    } else if (novosMunc.length === 0) {
      setModoManualMunicipio(true);
    } else if (municipioSelecionado && !novosMunc.includes(municipioSelecionado)) {
      setModoManualMunicipio(true);
    }
  }, [provinciaSelecionada, municipioSelecionado, ehEstrangeiro]);

  useEffect(() => {
    if (provinciaSelecionada && !provincias.includes(provinciaSelecionada)) {
      setModoManualProvincia(true);
    }
  }, [provinciaSelecionada, provincias]);

  useEffect(() => {
    if (paisSelecionado && !paises.includes(paisSelecionado)) {
      setModoManualPais(true);
    }
  }, [paisSelecionado, paises]);

  const mostrarFeedback = (campo: 'prov' | 'munc' | 'pais') => {
    setFeedbackCampo(campo);
    setTimeout(() => setFeedbackCampo(prev => (prev === campo ? null : prev)), 2200);
  };

  const handleGuardarNovaProvincia = () => {
    const val = provinciaSelecionada.trim();
    if (!val) return;
    if (!ehEstrangeiro) {
      locationService.adicionarProvincia(val);
      setProvincias(locationService.getProvincias());
    }
    mostrarFeedback('prov');
  };

  const handleGuardarNovoMunicipio = () => {
    const val = municipioSelecionado.trim();
    if (!val) return;
    if (!ehEstrangeiro) {
      locationService.adicionarMunicipio(val, provinciaSelecionada || 'Luanda');
      setMunicipios(locationService.getMunicipios(provinciaSelecionada));
    }
    mostrarFeedback('munc');
  };

  const handleGuardarNovoPais = () => {
    const val = (paisSelecionado || '').trim();
    if (!val || !onPaisChange) return;
    locationService.adicionarPais(val);
    setPaises(locationService.getPaises());
    mostrarFeedback('pais');
  };

  const handleMudarProvinciaSelect = (val: string) => {
    if (val === CUSTOM_SENTINEL) {
      setModoManualProvincia(true);
      setModoManualMunicipio(true);
      onProvinciaChange('');
      onMunicipioChange('');
      return;
    }
    setModoManualProvincia(false);
    onProvinciaChange(val);
    const novosMunc = locationService.getMunicipios(val);
    setMunicipios(novosMunc);
    if (novosMunc.length > 0) {
      setModoManualMunicipio(false);
      if (!novosMunc.includes(municipioSelecionado)) {
        onMunicipioChange(novosMunc[0]);
      }
    } else {
      setModoManualMunicipio(true);
      onMunicipioChange('');
    }
  };

  const handleMudarMunicipioSelect = (val: string) => {
    if (val === CUSTOM_SENTINEL) {
      setModoManualMunicipio(true);
      onMunicipioChange('');
      return;
    }
    setModoManualMunicipio(false);
    onMunicipioChange(val);
  };

  const handleMudarPaisSelect = (val: string) => {
    if (!onPaisChange) return;
    if (val === CUSTOM_SENTINEL) {
      setModoManualPais(true);
      setModoManualProvincia(true);
      setModoManualMunicipio(true);
      onPaisChange('');
      return;
    }
    setModoManualPais(false);
    onPaisChange(val);
    if (val.trim().toLowerCase() === 'angola') {
      const listaProv = locationService.getProvincias();
      setProvincias(listaProv);
      const provDefault = listaProv.includes(provinciaSelecionada) ? provinciaSelecionada : (listaProv.includes('Luanda') ? 'Luanda' : listaProv[0] || '');
      if (provDefault && !listaProv.includes(provinciaSelecionada)) {
        onProvinciaChange(provDefault);
      }
      setModoManualProvincia(false);
      const muncs = locationService.getMunicipios(provDefault);
      setMunicipios(muncs);
      if (muncs.length > 0 && !muncs.includes(municipioSelecionado)) {
        onMunicipioChange(muncs[0]);
        setModoManualMunicipio(false);
      }
    } else {
      setModoManualProvincia(true);
      setModoManualMunicipio(true);
    }
  };

  const colsClass =
    onPaisChange && showMunicipio
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
      : showMunicipio || onPaisChange
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className={`grid ${colsClass} gap-3`}>
        {/* Província / Estado / Região */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-gray-700 dark:text-slate-300 text-xs flex items-center space-x-1">
              <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{ehEstrangeiro ? 'Província / Estado / Região *' : 'Província *'}</span>
            </label>
            {!ehEstrangeiro && (
              <button
                type="button"
                onClick={() => {
                  if (modoManualProvincia) {
                    setModoManualProvincia(false);
                    if (!provincias.includes(provinciaSelecionada)) {
                      const primeiro = provincias.includes('Luanda') ? 'Luanda' : (provincias[0] || 'Luanda');
                      onProvinciaChange(primeiro);
                    }
                  } else {
                    setModoManualProvincia(true);
                  }
                }}
                className="text-[10px] text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-bold flex items-center space-x-0.5 cursor-pointer"
                title={modoManualProvincia ? 'Voltar à lista de províncias' : 'Adicionar nova província que não está na lista'}
              >
                {modoManualProvincia ? <List className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                <span>{modoManualProvincia ? 'Ver lista' : 'Nova / Digitar'}</span>
              </button>
            )}
          </div>
          {modoManualProvincia ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={provinciaSelecionada}
                onChange={(e) => onProvinciaChange(e.target.value)}
                onBlur={handleGuardarNovaProvincia}
                placeholder={ehEstrangeiro ? 'Ex: Kinshasa, Lisboa, Gauteng...' : 'Digite o nome da nova província...'}
                className="w-full p-2 border border-blue-400 dark:border-blue-600 rounded-lg text-xs font-bold text-gray-900 dark:text-slate-100 bg-blue-50/30 dark:bg-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              {!ehEstrangeiro && provinciaSelecionada.trim() && (
                <button
                  type="button"
                  onClick={handleGuardarNovaProvincia}
                  className="px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shrink-0 flex items-center space-x-0.5 cursor-pointer"
                  title="Adicionar esta província à lista do sistema"
                >
                  {feedbackCampo === 'prov' ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ) : (
            <select
              value={provincias.includes(provinciaSelecionada) ? provinciaSelecionada : CUSTOM_SENTINEL}
              onChange={(e) => handleMudarProvinciaSelect(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              {provincias.map(p => (
                <option key={`prov-${p}`} value={p}>{p}</option>
              ))}
              <option value={CUSTOM_SENTINEL}>+ Adicionar Nova Província (Digitar)...</option>
            </select>
          )}
          {feedbackCampo === 'prov' && (
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 block">Província adicionada à lista!</span>
          )}
        </div>

        {/* Município / Cidade */}
        {showMunicipio && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-gray-700 dark:text-slate-300 text-xs flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{ehEstrangeiro ? 'Cidade / Município *' : 'Município / Localidade *'}</span>
              </label>
              {!ehEstrangeiro && municipios.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (modoManualMunicipio) {
                      setModoManualMunicipio(false);
                      if (!municipios.includes(municipioSelecionado)) {
                        onMunicipioChange(municipios[0] || '');
                      }
                    } else {
                      setModoManualMunicipio(true);
                    }
                  }}
                  className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-bold flex items-center space-x-0.5 cursor-pointer"
                  title={modoManualMunicipio ? 'Voltar à lista de municípios' : 'Adicionar novo município que não está na lista'}
                >
                  {modoManualMunicipio ? <List className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  <span>{modoManualMunicipio ? 'Ver lista' : 'Novo / Digitar'}</span>
                </button>
              )}
            </div>
            {modoManualMunicipio || municipios.length === 0 ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={municipioSelecionado}
                  onChange={(e) => onMunicipioChange(e.target.value)}
                  onBlur={handleGuardarNovoMunicipio}
                  placeholder={ehEstrangeiro ? 'Digite a cidade ou distrito...' : 'Digite o nome do novo município...'}
                  className="w-full p-2 border border-emerald-400 dark:border-emerald-600 rounded-lg text-xs font-bold text-gray-900 dark:text-slate-100 bg-emerald-50/30 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                {!ehEstrangeiro && municipioSelecionado.trim() && (
                  <button
                    type="button"
                    onClick={handleGuardarNovoMunicipio}
                    className="px-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shrink-0 flex items-center space-x-0.5 cursor-pointer"
                    title="Adicionar este município à lista da província"
                  >
                    {feedbackCampo === 'munc' ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ) : (
              <select
                value={municipios.includes(municipioSelecionado) ? municipioSelecionado : CUSTOM_SENTINEL}
                onChange={(e) => handleMudarMunicipioSelect(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {municipios.map(m => (
                  <option key={`munc-${m}`} value={m}>{m}</option>
                ))}
                <option value={CUSTOM_SENTINEL}>+ Adicionar Novo Município (Digitar)...</option>
              </select>
            )}
            {feedbackCampo === 'munc' && (
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 block">Município adicionado à lista!</span>
            )}
          </div>
        )}

        {/* País */}
        {onPaisChange && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-gray-700 dark:text-slate-300 text-xs flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>País de Origem</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (modoManualPais) {
                    setModoManualPais(false);
                    if (!paises.includes(paisSelecionado)) {
                      onPaisChange(paises[0] || 'Angola');
                    }
                  } else {
                    setModoManualPais(true);
                  }
                }}
                className="text-[10px] text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 font-bold flex items-center space-x-0.5 cursor-pointer"
                title={modoManualPais ? 'Voltar à lista de países' : 'Digitar outro país'}
              >
                {modoManualPais ? <List className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                <span>{modoManualPais ? 'Da lista' : 'Outro / Digitar'}</span>
              </button>
            </div>
            {modoManualPais ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={paisSelecionado}
                  onChange={(e) => onPaisChange(e.target.value)}
                  onBlur={handleGuardarNovoPais}
                  placeholder="Digite o nome do país..."
                  className="w-full p-2 border border-purple-400 dark:border-purple-600 rounded-lg text-xs font-bold text-gray-900 dark:text-slate-100 bg-purple-50/30 dark:bg-slate-800 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
                {(paisSelecionado || '').trim() && (
                  <button
                    type="button"
                    onClick={handleGuardarNovoPais}
                    className="px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold shrink-0 flex items-center cursor-pointer"
                    title="Guardar país na lista"
                  >
                    {feedbackCampo === 'pais' ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ) : (
              <select
                value={paises.includes(paisSelecionado) ? paisSelecionado : CUSTOM_SENTINEL}
                onChange={(e) => handleMudarPaisSelect(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {paises.map(p => (
                  <option key={`pais-${p}`} value={p}>{p}</option>
                ))}
                <option value={CUSTOM_SENTINEL}>Outro País (Digitar manualmente...)</option>
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface NaturalidadeInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Campo de Naturalidade com lista completa de Províncias e Municípios de Angola + opção "Outro (Digitar)" para localidades novas ou estrangeiras
 */
export const NaturalidadeInput: React.FC<NaturalidadeInputProps> = ({
  value,
  onChange,
  label = 'Naturalidade',
  placeholder = 'Ex: Luanda, Kinshasa, Lisboa, Catete...',
  className = ''
}) => {
  const [provinciasAngola, setProvinciasAngola] = useState<string[]>(() => locationService.getProvincias());
  const [municipiosAngola, setMunicipiosAngola] = useState<string[]>(() => locationService.getMunicipios());
  const [todasPersonalizadas, setTodasPersonalizadas] = useState<string[]>(() => locationService.getTodasNaturalidades());

  const todasOpcoes = useMemo(
    () => new Set([...provinciasAngola, ...municipiosAngola, ...todasPersonalizadas]),
    [provinciasAngola, municipiosAngola, todasPersonalizadas]
  );

  const [modoManual, setModoManual] = useState<boolean>(() =>
    Boolean(value && !todasOpcoes.has(value))
  );

  useEffect(() => {
    if (value && !todasOpcoes.has(value)) {
      setModoManual(true);
    }
  }, [value, todasOpcoes]);

  const atualizarListas = () => {
    setProvinciasAngola(locationService.getProvincias());
    setMunicipiosAngola(locationService.getMunicipios());
    setTodasPersonalizadas(locationService.getTodasNaturalidades());
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <label className="font-semibold text-gray-700 dark:text-slate-300 text-xs">{label}</label>
        <button
          type="button"
          onClick={() => {
            atualizarListas();
            if (modoManual) {
              setModoManual(false);
              if (!todasOpcoes.has(value)) {
                onChange(provinciasAngola.includes('Luanda') ? 'Luanda' : provinciasAngola[0] || '');
              }
            } else {
              setModoManual(true);
            }
          }}
          className="text-[10px] text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-bold flex items-center space-x-0.5 cursor-pointer"
        >
          {modoManual ? <List className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
          <span>{modoManual ? 'Ver lista' : 'Outro / Digitar'}</span>
        </button>
      </div>

      {modoManual ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (value.trim()) {
              locationService.adicionarNaturalidade(value.trim());
              atualizarListas();
            }
          }}
          placeholder={placeholder}
          className="w-full p-2 border border-blue-400 dark:border-blue-600 rounded-md text-xs font-semibold text-gray-900 dark:text-slate-100 bg-blue-50/30 dark:bg-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
      ) : (
        <select
          value={todasOpcoes.has(value) ? value : CUSTOM_SENTINEL}
          onChange={(e) => {
            if (e.target.value === CUSTOM_SENTINEL) {
              setModoManual(true);
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-md text-xs font-semibold text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
        >
          <option value={CUSTOM_SENTINEL}>Outro (Digitar localidade / cidade estrangeira...)</option>
          <optgroup label="Províncias de Angola">
            {provinciasAngola.map(p => (
              <option key={`nat-p-${p}`} value={p}>{p}</option>
            ))}
          </optgroup>
          <optgroup label="Municípios de Angola">
            {municipiosAngola.map(m => (
              <option key={`nat-m-${m}`} value={m}>{m}</option>
            ))}
          </optgroup>
          {todasPersonalizadas.filter(x => !provinciasAngola.includes(x) && !municipiosAngola.includes(x)).length > 0 && (
            <optgroup label="Outras Localidades / Cidades">
              {todasPersonalizadas
                .filter(x => !provinciasAngola.includes(x) && !municipiosAngola.includes(x))
                .map(x => (
                  <option key={`nat-c-${x}`} value={x}>{x}</option>
                ))}
            </optgroup>
          )}
        </select>
      )}
    </div>
  );
};

interface NacionalidadeInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Campo de Nacionalidade com lista + opção "Outra (Digitar manualmente)"
 */
export const NacionalidadeInput: React.FC<NacionalidadeInputProps> = ({
  value,
  onChange,
  label = 'Nacionalidade',
  placeholder = 'Digite a nacionalidade...',
  className = ''
}) => {
  const [lista, setLista] = useState<string[]>(() => locationService.getNacionalidades());
  const [modoManual, setModoManual] = useState<boolean>(() =>
    Boolean(value && !locationService.getNacionalidades().includes(value))
  );

  useEffect(() => {
    if (value && !lista.includes(value)) {
      setModoManual(true);
    }
  }, [value, lista]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <label className="font-semibold text-gray-700 dark:text-slate-300 text-xs">{label}</label>
        <button
          type="button"
          onClick={() => {
            if (modoManual) {
              setModoManual(false);
              if (!lista.includes(value)) {
                onChange('Angolana');
              }
            } else {
              setModoManual(true);
            }
          }}
          className="text-[10px] text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-bold flex items-center space-x-0.5 cursor-pointer"
        >
          {modoManual ? <List className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
          <span>{modoManual ? 'Da lista' : 'Outra / Digitar'}</span>
        </button>
      </div>

      {modoManual ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (value.trim()) {
              locationService.adicionarNacionalidade(value.trim());
              setLista(locationService.getNacionalidades());
            }
          }}
          placeholder={placeholder}
          className="w-full p-2 border border-blue-400 dark:border-blue-600 rounded-md text-xs font-semibold text-gray-900 dark:text-slate-100 bg-blue-50/30 dark:bg-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
      ) : (
        <select
          value={lista.includes(value) ? value : CUSTOM_SENTINEL}
          onChange={(e) => {
            if (e.target.value === CUSTOM_SENTINEL) {
              setModoManual(true);
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-md text-xs font-semibold text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
        >
          {lista.map(n => (
            <option key={`nac-${n}`} value={n}>{n}</option>
          ))}
          <option value={CUSTOM_SENTINEL}>Outra (Digitar manualmente...)</option>
        </select>
      )}
    </div>
  );
};

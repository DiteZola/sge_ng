import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Globe, Compass, List, Edit3 } from 'lucide-react';
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

  const [modoManualProvincia, setModoManualProvincia] = useState<boolean>(() =>
    Boolean(provinciaSelecionada && !locationService.getProvincias().includes(provinciaSelecionada))
  );
  const [modoManualMunicipio, setModoManualMunicipio] = useState<boolean>(() => {
    const lista = locationService.getMunicipios(provinciaSelecionada);
    return lista.length === 0 || Boolean(municipioSelecionado && !lista.includes(municipioSelecionado));
  });
  const [modoManualPais, setModoManualPais] = useState<boolean>(() =>
    Boolean(paisSelecionado && !locationService.getPaises().includes(paisSelecionado))
  );

  useEffect(() => {
    const novosMunc = locationService.getMunicipios(provinciaSelecionada);
    setMunicipios(novosMunc);
    if (novosMunc.length === 0) {
      setModoManualMunicipio(true);
    } else if (municipioSelecionado && !novosMunc.includes(municipioSelecionado)) {
      setModoManualMunicipio(true);
    }
  }, [provinciaSelecionada, municipioSelecionado]);

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

  const handleMudarProvinciaSelect = (val: string) => {
    if (val === CUSTOM_SENTINEL) {
      setModoManualProvincia(true);
      setModoManualMunicipio(true);
      onProvinciaChange('');
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
      onPaisChange('');
      return;
    }
    setModoManualPais(false);
    onPaisChange(val);
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
        {/* Província */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-gray-700 text-xs flex items-center space-x-1">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Província *</span>
            </label>
            <button
              type="button"
              onClick={() => {
                if (modoManualProvincia) {
                  setModoManualProvincia(false);
                  if (!provincias.includes(provinciaSelecionada)) {
                    const primeiro = provincias[0] || 'Luanda';
                    onProvinciaChange(primeiro);
                  }
                } else {
                  setModoManualProvincia(true);
                }
              }}
              className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-0.5 cursor-pointer"
              title={modoManualProvincia ? 'Voltar à lista de províncias' : 'Digitar outra província'}
            >
              {modoManualProvincia ? <List className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              <span>{modoManualProvincia ? 'Da lista' : 'Outra / Digitar'}</span>
            </button>
          </div>
          {modoManualProvincia ? (
            <input
              type="text"
              value={provinciaSelecionada}
              onChange={(e) => onProvinciaChange(e.target.value)}
              onBlur={() => {
                if (provinciaSelecionada.trim()) {
                  locationService.adicionarProvincia(provinciaSelecionada.trim());
                  setProvincias(locationService.getProvincias());
                }
              }}
              placeholder="Digite o nome da província / estado..."
              className="w-full p-2 border border-blue-400 rounded-lg text-xs font-bold text-gray-900 bg-blue-50/30 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          ) : (
            <select
              value={provincias.includes(provinciaSelecionada) ? provinciaSelecionada : CUSTOM_SENTINEL}
              onChange={(e) => handleMudarProvinciaSelect(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              {provincias.map(p => (
                <option key={`prov-${p}`} value={p}>{p}</option>
              ))}
              <option value={CUSTOM_SENTINEL}>Outro (Digitar outra província...)</option>
            </select>
          )}
        </div>

        {/* Município */}
        {showMunicipio && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-gray-700 text-xs flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Município / Localidade *</span>
              </label>
              {municipios.length > 0 && (
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
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-0.5 cursor-pointer"
                  title={modoManualMunicipio ? 'Voltar à lista de municípios' : 'Digitar outro município'}
                >
                  {modoManualMunicipio ? <List className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                  <span>{modoManualMunicipio ? 'Da lista' : 'Outro / Digitar'}</span>
                </button>
              )}
            </div>
            {modoManualMunicipio || municipios.length === 0 ? (
              <input
                type="text"
                value={municipioSelecionado}
                onChange={(e) => onMunicipioChange(e.target.value)}
                onBlur={() => {
                  if (municipioSelecionado.trim()) {
                    locationService.adicionarMunicipio(municipioSelecionado.trim(), provinciaSelecionada || 'Luanda');
                    setMunicipios(locationService.getMunicipios(provinciaSelecionada));
                  }
                }}
                placeholder="Digite o município ou cidade..."
                className="w-full p-2 border border-emerald-400 rounded-lg text-xs font-bold text-gray-900 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            ) : (
              <select
                value={municipios.includes(municipioSelecionado) ? municipioSelecionado : CUSTOM_SENTINEL}
                onChange={(e) => handleMudarMunicipioSelect(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {municipios.map(m => (
                  <option key={`munc-${m}`} value={m}>{m}</option>
                ))}
                <option value={CUSTOM_SENTINEL}>Outro (Digitar outro município...)</option>
              </select>
            )}
          </div>
        )}

        {/* País */}
        {onPaisChange && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-gray-700 text-xs flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-purple-600" />
                <span>País</span>
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
                className="text-[10px] text-purple-700 hover:text-purple-900 font-bold flex items-center space-x-0.5 cursor-pointer"
                title={modoManualPais ? 'Voltar à lista de países' : 'Digitar outro país'}
              >
                {modoManualPais ? <List className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                <span>{modoManualPais ? 'Da lista' : 'Outro / Digitar'}</span>
              </button>
            </div>
            {modoManualPais ? (
              <input
                type="text"
                value={paisSelecionado}
                onChange={(e) => onPaisChange(e.target.value)}
                onBlur={() => {
                  if (paisSelecionado.trim()) {
                    locationService.adicionarPais(paisSelecionado.trim());
                    setPaises(locationService.getPaises());
                  }
                }}
                placeholder="Digite o nome do país..."
                className="w-full p-2 border border-purple-400 rounded-lg text-xs font-bold text-gray-900 bg-purple-50/30 focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
            ) : (
              <select
                value={paises.includes(paisSelecionado) ? paisSelecionado : CUSTOM_SENTINEL}
                onChange={(e) => handleMudarPaisSelect(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
 * Campo de Naturalidade com lista completa de Províncias e Municípios de Angola + opção "Outro (Digitar)"
 */
export const NaturalidadeInput: React.FC<NaturalidadeInputProps> = ({
  value,
  onChange,
  label = 'Naturalidade',
  placeholder = 'Digite a naturalidade (cidade, município ou localidade)...',
  className = ''
}) => {
  const provinciasAngola = useMemo(() => locationService.getProvincias(), []);
  const municipiosAngola = useMemo(() => locationService.getMunicipios(), []);
  const todasOpcoes = useMemo(() => new Set([...provinciasAngola, ...municipiosAngola]), [provinciasAngola, municipiosAngola]);

  const [modoManual, setModoManual] = useState<boolean>(() =>
    Boolean(value && !todasOpcoes.has(value))
  );

  useEffect(() => {
    if (value && !todasOpcoes.has(value)) {
      setModoManual(true);
    }
  }, [value, todasOpcoes]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <label className="font-semibold text-gray-700 text-xs">{label}</label>
        <button
          type="button"
          onClick={() => {
            if (modoManual) {
              setModoManual(false);
              if (!todasOpcoes.has(value)) {
                onChange(provinciasAngola.includes('Luanda') ? 'Luanda' : provinciasAngola[0] || '');
              }
            } else {
              setModoManual(true);
            }
          }}
          className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-0.5 cursor-pointer"
        >
          {modoManual ? <List className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
          <span>{modoManual ? 'Lista Angola' : 'Outro / Digitar'}</span>
        </button>
      </div>

      {modoManual ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-2 border border-blue-400 rounded-md text-xs font-semibold text-gray-900 bg-blue-50/30 focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
          className="w-full p-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
        >
          <option value={CUSTOM_SENTINEL}>Outro (Digitar nome que não está na lista...)</option>
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
        <label className="font-semibold text-gray-700 text-xs">{label}</label>
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
          className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-0.5 cursor-pointer"
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
          className="w-full p-2 border border-blue-400 rounded-md text-xs font-semibold text-gray-900 bg-blue-50/30 focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
          className="w-full p-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
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

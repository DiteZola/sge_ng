import React, { useState } from 'react';
import { Plus, Check, MapPin, Globe, Compass, X } from 'lucide-react';
import { locationService } from '../services/locationService';

interface LocationPickerProps {
  provinciaSelecionada: string;
  onProvinciaChange: (provincia: string) => void;
  municipioSelecionado: string;
  onMunicipioChange: (municipio: string) => void;
  paisSelecionado?: string;
  onPaisChange?: (pais: string) => void;
  className?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  provinciaSelecionada,
  onProvinciaChange,
  municipioSelecionado,
  onMunicipioChange,
  paisSelecionado = 'Angola',
  onPaisChange,
  className = ''
}) => {
  const [provincias, setProvincias] = useState<string[]>(() => locationService.getProvincias());
  const [municipios, setMunicipios] = useState<string[]>(() => locationService.getMunicipios(provinciaSelecionada));
  const [paises, setPaises] = useState<string[]>(() => locationService.getPaises());

  // Modais de adicionar
  const [modalTipo, setModalTipo] = useState<'provincia' | 'municipio' | 'pais' | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const handleMudarProvincia = (prov: string) => {
    onProvinciaChange(prov);
    const novosMunc = locationService.getMunicipios(prov);
    setMunicipios(novosMunc);
    if (!novosMunc.includes(municipioSelecionado)) {
      onMunicipioChange(novosMunc[0] || '');
    }
  };

  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    if (modalTipo === 'provincia') {
      const res = locationService.adicionarProvincia(novoNome);
      if (res.sucesso && res.provincia) {
        setProvincias(locationService.getProvincias());
        handleMudarProvincia(res.provincia);
        setMensagemSucesso(`Província "${res.provincia}" adicionada com sucesso!`);
      }
    } else if (modalTipo === 'municipio') {
      const res = locationService.adicionarMunicipio(novoNome, provinciaSelecionada || 'Luanda');
      if (res.sucesso && res.municipio) {
        setMunicipios(locationService.getMunicipios(provinciaSelecionada));
        onMunicipioChange(res.municipio);
        setMensagemSucesso(`Município "${res.municipio}" adicionado com sucesso!`);
      }
    } else if (modalTipo === 'pais') {
      const res = locationService.adicionarPais(novoNome);
      if (res.sucesso && res.pais) {
        setPaises(locationService.getPaises());
        if (onPaisChange) onPaisChange(res.pais);
        setMensagemSucesso(`País "${res.pais}" adicionado com sucesso!`);
      }
    }

    setNovoNome('');
    setModalTipo(null);
    setTimeout(() => setMensagemSucesso(null), 3000);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {mensagemSucesso && (
        <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 text-xs font-bold flex items-center space-x-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Província */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-gray-700 text-xs flex items-center space-x-1">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Província *</span>
            </label>
            <button
              type="button"
              onClick={() => { setModalTipo('provincia'); setNovoNome(''); }}
              className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-0.5 cursor-pointer"
              title="Adicionar outra província que não está no sistema"
            >
              <Plus className="w-3 h-3" />
              <span>Outra</span>
            </button>
          </div>
          <select
            value={provinciaSelecionada}
            onChange={(e) => handleMudarProvincia(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            {provincias.map(p => (
              <option key={`prov-${p}`} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Município */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-gray-700 text-xs flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Município *</span>
            </label>
            <button
              type="button"
              onClick={() => { setModalTipo('municipio'); setNovoNome(''); }}
              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-0.5 cursor-pointer"
              title="Adicionar outro município que não está no sistema"
            >
              <Plus className="w-3 h-3" />
              <span>Outro</span>
            </button>
          </div>
          <select
            value={municipioSelecionado}
            onChange={(e) => onMunicipioChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            {municipios.map(m => (
              <option key={`munc-${m}`} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* País de Origem (opcional) */}
        {onPaisChange && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-gray-700 text-xs flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-purple-600" />
                <span>País de Origem</span>
              </label>
              <button
                type="button"
                onClick={() => { setModalTipo('pais'); setNovoNome(''); }}
                className="text-[10px] text-purple-700 hover:text-purple-900 font-bold flex items-center space-x-0.5 cursor-pointer"
                title="Adicionar outro país que não está no sistema"
              >
                <Plus className="w-3 h-3" />
                <span>Outro</span>
              </button>
            </div>
            <select
              value={paisSelecionado}
              onChange={(e) => onPaisChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              {paises.map(p => (
                <option key={`pais-${p}`} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Modal Rápido de Inserção */}
      {modalTipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-gray-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-black uppercase text-gray-900">
                {modalTipo === 'provincia' && 'Adicionar Nova Província'}
                {modalTipo === 'municipio' && `Adicionar Município (${provinciaSelecionada})`}
                {modalTipo === 'pais' && 'Adicionar Novo País'}
              </h4>
              <button
                type="button"
                onClick={() => setModalTipo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="space-y-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSalvarNovo(e as any);
                }
              }}
            >
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Nome {modalTipo === 'provincia' ? 'da Província' : modalTipo === 'municipio' ? 'do Município' : 'do País'}:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Introduza o nome oficial..."
                  className="w-full p-2 text-xs font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalTipo(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarNovo}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar & Selecionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

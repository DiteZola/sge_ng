import React from 'react';

// Insígnia da República de Angola - Vetor Oficial Heráldico
// Símbolos: Catana e Enxada cruzadas, Sol nascente, Livro aberto, Engrenagem dourada,
// Ramo de algodão e café, Estrela de 5 pontas vermelha e faixa "REPÚBLICA DE ANGOLA".

export const InsigniaAngola: React.FC<{ 
  className?: string; 
  size?: number;
  customUrl?: string;
}> = ({ 
  className = "h-14 w-14", 
  size,
  customUrl 
}) => {
  if (customUrl && customUrl.trim().length > 0) {
    return (
      <img 
        src={customUrl} 
        alt="Insígnia da República de Angola" 
        className={`object-contain inline-block ${className}`}
        style={size ? { width: size, height: size } : undefined}
      />
    );
  }

  const dim = size || 56;

  return (
    <svg 
      viewBox="0 0 200 200" 
      width={dim} 
      height={dim} 
      className={`inline-block ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Insígnia da República de Angola"
    >
      <defs>
        {/* Gradiente Solar */}
        <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="60%" stopColor="#FBC02D" />
          <stop offset="100%" stopColor="#F57F17" />
        </radialGradient>
        {/* Gradiente Ouro Engrenagem */}
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD54F" />
          <stop offset="50%" stopColor="#FBC02D" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        {/* Gradiente Aço Catana & Enxada */}
        <linearGradient id="steelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#ECEFF1" />
          <stop offset="100%" stopColor="#78909C" />
        </linearGradient>
        {/* Gradiente Faixa */}
        <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="100%" stopColor="#FBC02D" />
        </linearGradient>
      </defs>

      {/* Fundo de Contorno Suave */}
      <circle cx="100" cy="95" r="88" fill="#FFFDE7" fillOpacity="0.3" stroke="#F57F17" strokeWidth="1" />

      {/* Raios do Sol Nascente */}
      <g stroke="#F57F17" strokeWidth="2.5" strokeLinecap="round" opacity="0.85">
        <line x1="100" y1="95" x2="100" y2="40" />
        <line x1="100" y1="95" x2="80" y2="44" />
        <line x1="100" y1="95" x2="120" y2="44" />
        <line x1="100" y1="95" x2="62" y2="55" />
        <line x1="100" y1="95" x2="138" y2="55" />
        <line x1="100" y1="95" x2="48" y2="72" />
        <line x1="100" y1="95" x2="152" y2="72" />
      </g>

      {/* Sol Nascente */}
      <circle cx="100" cy="95" r="28" fill="url(#sunGrad)" stroke="#E65100" strokeWidth="1.5" />

      {/* Roda Dentada / Meia Engrenagem Esquerda (Indústria e Operariado) */}
      <path 
        d="M 100,20 A 75,75 0 0,0 35,135 L 50,132 A 60,60 0 0,1 100,35 Z" 
        fill="url(#goldGrad)" 
        stroke="#BF360C" 
        strokeWidth="1.5" 
      />
      {/* Dentes da Engrenagem */}
      <g fill="#E65100">
        <rect x="94" y="16" width="12" height="7" rx="1.5" transform="rotate(-5, 100, 20)" />
        <rect x="74" y="22" width="10" height="7" rx="1.5" transform="rotate(-22, 79, 25)" />
        <rect x="56" y="34" width="10" height="7" rx="1.5" transform="rotate(-38, 61, 37)" />
        <rect x="42" y="52" width="10" height="7" rx="1.5" transform="rotate(-55, 47, 55)" />
        <rect x="32" y="73" width="10" height="7" rx="1.5" transform="rotate(-72, 37, 76)" />
        <rect x="28" y="96" width="10" height="7" rx="1.5" transform="rotate(-90, 33, 99)" />
        <rect x="30" y="118" width="10" height="7" rx="1.5" transform="rotate(-108, 35, 121)" />
      </g>

      {/* Ramo de Milho, Café e Algodão Direita (Agricultura e Camponeses) */}
      <g stroke="#2E7D32" strokeWidth="2" fill="#4CAF50" strokeLinejoin="round">
        <path d="M 100,22 Q 155,50 162,130" fill="none" stroke="#33691E" strokeWidth="3" />
        {/* Folhas de Café / Algodão */}
        <path d="M 118,32 Q 138,26 142,38 Q 132,46 118,32 Z" fill="#43A047" />
        <path d="M 136,48 Q 160,46 160,60 Q 146,66 136,48 Z" fill="#2E7D32" />
        <path d="M 148,70 Q 174,72 170,88 Q 154,90 148,70 Z" fill="#43A047" />
        <path d="M 152,96 Q 176,102 168,118 Q 152,116 152,96 Z" fill="#2E7D32" />
        {/* Bagos de Café Vermelhos */}
        <circle cx="132" cy="46" r="3.5" fill="#D32F2F" stroke="#B71C1C" strokeWidth="0.8" />
        <circle cx="137" cy="51" r="3" fill="#D32F2F" stroke="#B71C1C" strokeWidth="0.8" />
        <circle cx="145" cy="68" r="3.5" fill="#D32F2F" stroke="#B71C1C" strokeWidth="0.8" />
        <circle cx="150" cy="94" r="3.5" fill="#D32F2F" stroke="#B71C1C" strokeWidth="0.8" />
      </g>

      {/* Enxada Agrícola (Cabo Castanho + Lâmina Prateada Cruzada) */}
      <g>
        {/* Cabo da Enxada */}
        <line x1="55" y1="145" x2="145" y2="55" stroke="#5D4037" strokeWidth="5.5" strokeLinecap="round" />
        {/* Lâmina da Enxada */}
        <path d="M 138,48 L 158,58 L 148,72 L 132,60 Z" fill="url(#steelGrad)" stroke="#37474F" strokeWidth="1.2" />
      </g>

      {/* Catana / Machete (Cabo Castanho/Preto + Lâmina Curva Cruzada) */}
      <g>
        {/* Cabo da Catana */}
        <line x1="145" y1="145" x2="128" y2="128" stroke="#212121" strokeWidth="6" strokeLinecap="round" />
        <circle cx="145" cy="145" r="3.5" fill="#B71C1C" />
        {/* Lâmina da Catana */}
        <path 
          d="M 128,128 L 65,65 Q 52,50 50,42 Q 62,48 78,68 L 132,122 Z" 
          fill="url(#steelGrad)" 
          stroke="#37474F" 
          strokeWidth="1.2" 
        />
      </g>

      {/* Livro Aberto (Educação, Cultura e Conhecimento) */}
      <g>
        <path 
          d="M 100,122 C 85,116 65,117 52,124 L 52,148 C 65,141 85,140 100,146 C 115,140 135,141 148,148 L 148,124 C 135,117 115,116 100,122 Z" 
          fill="#FFFFFF" 
          stroke="#263238" 
          strokeWidth="1.5" 
        />
        <line x1="100" y1="122" x2="100" y2="146" stroke="#263238" strokeWidth="1.5" />
        {/* Linhas de Texto do Livro */}
        <line x1="60" y1="129" x2="92" y2="126" stroke="#90A4AE" strokeWidth="1" />
        <line x1="60" y1="135" x2="92" y2="132" stroke="#90A4AE" strokeWidth="1" />
        <line x1="60" y1="141" x2="86" y2="138" stroke="#90A4AE" strokeWidth="1" />
        <line x1="108" y1="126" x2="140" y2="129" stroke="#90A4AE" strokeWidth="1" />
        <line x1="108" y1="132" x2="140" y2="135" stroke="#90A4AE" strokeWidth="1" />
        <line x1="114" y1="138" x2="140" y2="141" stroke="#90A4AE" strokeWidth="1" />
      </g>

      {/* Estrela Vermelha de Cinco Pontas no Topo (Solidariedade Internacional e Progresso) */}
      <polygon 
        points="100,14 103.5,23 113,23.5 105.5,29 108.5,38 100,32.5 91.5,38 94.5,29 87,23.5 96.5,23" 
        fill="#D32F2F" 
        stroke="#B71C1C" 
        strokeWidth="1" 
      />

      {/* Faixa Dourada Heráldica Sem Palavras */}
      <g>
        <path 
          d="M 32,156 Q 100,146 168,156 L 164,174 Q 100,164 36,174 Z" 
          fill="url(#bannerGrad)" 
          stroke="#E65100" 
          strokeWidth="1.5" 
        />
        {/* Pontas dobradas da faixa */}
        <polygon points="32,156 22,166 36,174 34,163" fill="#F57F17" stroke="#E65100" strokeWidth="1" />
        <polygon points="168,156 178,166 164,174 166,163" fill="#F57F17" stroke="#E65100" strokeWidth="1" />
      </g>
    </svg>
  );
};

export const DEFAULT_INSIGNIA_SVG_DATA_URL = `data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="95" r="88" fill="%23FFFDE7" stroke="%23F57F17" stroke-width="2"/><circle cx="100" cy="95" r="28" fill="%23FBC02D" stroke="%23E65100" stroke-width="2"/><path d="M 100,20 A 75,75 0 0,0 35,135 L 50,132 A 60,60 0 0,1 100,35 Z" fill="%23FBC02D" stroke="%23BF360C" stroke-width="2"/><line x1="55" y1="145" x2="145" y2="55" stroke="%235D4037" stroke-width="5" stroke-linecap="round"/><path d="M 128,128 L 65,65 Q 52,50 50,42 Q 62,48 78,68 L 132,122 Z" fill="%23ECEFF1" stroke="%2337474F" stroke-width="1.5"/><path d="M 100,122 C 85,116 65,117 52,124 L 52,148 C 65,141 85,140 100,146 C 115,140 135,141 148,148 L 148,124 C 135,117 115,116 100,122 Z" fill="%23FFFFFF" stroke="%23263238" stroke-width="1.5"/><polygon points="100,14 103.5,23 113,23.5 105.5,29 108.5,38 100,32.5 91.5,38 94.5,29 87,23.5 96.5,23" fill="%23D32F2F"/><path d="M 32,156 Q 100,146 168,156 L 164,174 Q 100,164 36,174 Z" fill="%23FBC02D" stroke="%23E65100" stroke-width="1.5"/></svg>`;

/**
 * Serviço de Gestão Territorial & Geográfica de Angola e Países
 * Permite listar e cadastrar dinamicamente novas Províncias, Municípios e Países no sistema.
 */

export interface LocalizacaoGeografica {
  provincias: string[];
  municipiosPorProvincia: Record<string, string[]>;
  paises: string[];
}

const STORAGE_KEY_PROVINCIAS = 'sgeng_provincias_personalizadas';
const STORAGE_KEY_MUNICIPIOS = 'sgeng_municipios_personalizados';
const STORAGE_KEY_PAISES = 'sgeng_paises_personalizados';

// 18 Províncias Tradicionais de Angola + Novas Províncias da Divisão Político-Administrativa
const PROVINCIAS_PADRAO: string[] = [
  'Bengo',
  'Benguela',
  'Bié',
  'Cabinda',
  'Cuando Cubango',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cunene',
  'Huambo',
  'Huíla',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Namibe',
  'Uíge',
  'Zaire',
  'Icolo e Bengo',
  'Moxico Leste',
  'Cuando'
];

// Municípios base por província
const MUNICIPIOS_PADRAO: Record<string, string[]> = {
  'Luanda': ['Luanda', 'Belas', 'Cazenga', 'Cacuaco', 'Viana', 'Kilamba Kiaxi', 'Talatona', 'Quiçama', 'Icolo e Bengo'],
  'Benguela': ['Benguela', 'Lobito', 'Baía Farta', 'Catumbela', 'Ganda', 'Cubal', 'Bocoio', 'Balombo', 'Chongoroi', 'Caimbambo'],
  'Huíla': ['Lubango', 'Humpata', 'Chibia', 'Quilengues', 'Matala', 'Cacula', 'Caluquembe', 'Cuvango', 'Jamba', 'Chicomba', 'Chipindo', 'Gambos'],
  'Zaire': ['Mbanza Kongo', 'Soyo', 'Nzeto', 'Tomboco', 'Cuimba', 'Nóqui'],
  'Cabinda': ['Cabinda', 'Cacongo', 'Buco-Zau', 'Belize'],
  'Huambo': ['Huambo', 'Caála', 'Bailundo', 'Ekunha', 'Longonjo', 'Ukuma', 'Chinjenje', 'Katchiungo', 'Mungo', 'Chicala Choloanga', 'Londuimbali'],
  'Uíge': ['Uíge', 'Negage', 'Sanza Pombo', 'Maquela do Zombo', 'Damba', 'Quitexe', 'Puri', 'Ambuíla', 'Bembe', 'Bungo', 'Mucaba', 'Milunga', 'Quimbele', 'Cangola', 'Songo'],
  'Cuanza Sul': ['Sumbe', 'Porto Amboim', 'Gabela (Amboim)', 'Waku Kungo (Cela)', 'Libolo', 'Quibala', 'Cassongue', 'Seles', 'Condé', 'Ebo', 'Mussende', 'Kilenda'],
  'Cuanza Norte': ['Ndalatando (Cazengo)', 'Cambambe', 'Golungo Alto', 'Lucala', 'Ambaca', 'Banga', 'Bolongongo', 'Quiculungo', 'Samba Caju', 'Ngonguembo'],
  'Bié': ['Kuito', 'Andulo', 'Camacupa', 'Catabola', 'Chinguar', 'Chitembo', 'Cuemba', 'Cunhinga', 'Nharea'],
  'Moxico': ['Luena (Moxico)', 'Camanongue', 'Léua', 'Luacano', 'Cameia', 'Luchazes', 'Bundas', 'Alto Zambeze'],
  'Lunda Norte': ['Dundo (Chitato)', 'Cambulo', 'Capenda-Camulemba', 'Caungula', 'Chitato', 'Cuango', 'Cuílo', 'Lubalo', 'Lucapa', 'Xá-Muteba'],
  'Lunda Sul': ['Saurimo', 'Cacolo', 'Dala', 'Muconda'],
  'Malanje': ['Malanje', 'Cangandala', 'Calandula', 'Cacuso', 'Massango', 'Marimba', 'Kiwaba Nzoji', 'Kalandula', 'Cunda-dia-Baze', 'Quela', 'Mucari', 'Luquembo', 'Quirima', 'Cambundi-Catembo'],
  'Namibe': ['Moçâmedes (Namibe)', 'Tômbwa', 'Virei', 'Bibala', 'Camucuio'],
  'Cunene': ['Ondjiva (Cuanhama)', 'Ombadja', 'Namacunde', 'Curoca', 'Cuvelai', 'Cahama'],
  'Cuando Cubango': ['Menongue', 'Cuito Cuanavale', 'Cuchi', 'Cuangar', 'Calai', 'Dirico', 'Mavinga', 'Rivungo', 'Nancova'],
  'Bengo': ['Caxito (Dande)', 'Ambriz', 'Bula Atumba', 'Dande', 'Dembos', 'Nambuangongo', 'Pango Aluquém']
};

const PAISES_PADRAO: string[] = [
  'Angola',
  'Portugal',
  'Brasil',
  'Moçambique',
  'Cabo Verde',
  'São Tomé e Príncipe',
  'República Democrática do Congo (RDC)',
  'República do Congo',
  'Namíbia',
  'África do Sul',
  'Zâmbia',
  'Zimbabué',
  'Cuba',
  'China',
  'França',
  'Reino Unido',
  'Estados Unidos',
  'Espanha',
  'Itália',
  'Alemanha',
  'Outro País'
];

class LocationService {
  /**
   * Obtém todas as províncias (padrão + adicionadas pelo utilizador)
   */
  getProvincias(): string[] {
    try {
      const salvas = localStorage.getItem(STORAGE_KEY_PROVINCIAS);
      const personalizadas: string[] = salvas ? JSON.parse(salvas) : [];
      const todas = Array.from(new Set([...PROVINCIAS_PADRAO, ...personalizadas]));
      return todas.sort((a, b) => a.localeCompare('pt-AO'));
    } catch {
      return [...PROVINCIAS_PADRAO].sort((a, b) => a.localeCompare('pt-AO'));
    }
  }

  /**
   * Adiciona uma nova província
   */
  adicionarProvincia(nome: string): { sucesso: boolean; mensagem: string; provincia?: string } {
    const limpo = (nome || '').trim();
    if (!limpo) {
      return { sucesso: false, mensagem: 'O nome da província não pode estar vazio.' };
    }
    const provincias = this.getProvincias();
    const jaExiste = provincias.some(p => p.toLowerCase() === limpo.toLowerCase());
    if (jaExiste) {
      const encontrada = provincias.find(p => p.toLowerCase() === limpo.toLowerCase());
      return { sucesso: true, mensagem: 'Província já registada no sistema.', provincia: encontrada };
    }

    try {
      const salvas = localStorage.getItem(STORAGE_KEY_PROVINCIAS);
      const personalizadas: string[] = salvas ? JSON.parse(salvas) : [];
      personalizadas.push(limpo);
      localStorage.setItem(STORAGE_KEY_PROVINCIAS, JSON.stringify(personalizadas));
      return { sucesso: true, mensagem: `Província "${limpo}" adicionada com sucesso!`, provincia: limpo };
    } catch (err) {
      return { sucesso: false, mensagem: 'Erro ao guardar nova província no armazenamento local.' };
    }
  }

  /**
   * Obtém municípios de uma província específica ou todos os municípios cadastrados
   */
  getMunicipios(provincia?: string): string[] {
    let base: string[] = [];
    if (provincia && MUNICIPIOS_PADRAO[provincia]) {
      base = [...MUNICIPIOS_PADRAO[provincia]];
    } else if (!provincia) {
      base = Object.values(MUNICIPIOS_PADRAO).flat();
    }

    try {
      const salvas = localStorage.getItem(STORAGE_KEY_MUNICIPIOS);
      const personalizadas: Record<string, string[]> = salvas ? JSON.parse(salvas) : {};
      if (provincia && personalizadas[provincia]) {
        base = [...base, ...personalizadas[provincia]];
      } else if (!provincia) {
        base = [...base, ...Object.values(personalizadas).flat()];
      }
    } catch (err) {
      // Ignorar e retornar base
    }

    return Array.from(new Set(base)).sort((a, b) => a.localeCompare('pt-AO'));
  }

  /**
   * Adiciona um novo município associado (ou não) a uma província
   */
  adicionarMunicipio(nome: string, provincia: string = 'Luanda'): { sucesso: boolean; mensagem: string; municipio?: string } {
    const limpo = (nome || '').trim();
    if (!limpo) {
      return { sucesso: false, mensagem: 'O nome do município não pode estar vazio.' };
    }

    const prov = (provincia || '').trim() || 'Luanda';
    const municipiosProv = this.getMunicipios(prov);
    if (municipiosProv.some(m => m.toLowerCase() === limpo.toLowerCase())) {
      const encontrado = municipiosProv.find(m => m.toLowerCase() === limpo.toLowerCase());
      return { sucesso: true, mensagem: 'Município já cadastrado para esta província.', municipio: encontrado };
    }

    try {
      const salvas = localStorage.getItem(STORAGE_KEY_MUNICIPIOS);
      const personalizadas: Record<string, string[]> = salvas ? JSON.parse(salvas) : {};
      if (!personalizadas[prov]) {
        personalizadas[prov] = [];
      }
      personalizadas[prov].push(limpo);
      localStorage.setItem(STORAGE_KEY_MUNICIPIOS, JSON.stringify(personalizadas));
      return { sucesso: true, mensagem: `Município "${limpo}" adicionado com sucesso!`, municipio: limpo };
    } catch (err) {
      return { sucesso: false, mensagem: 'Erro ao guardar novo município no armazenamento local.' };
    }
  }

  /**
   * Obtém a lista de países
   */
  getPaises(): string[] {
    try {
      const salvas = localStorage.getItem(STORAGE_KEY_PAISES);
      const personalizadas: string[] = salvas ? JSON.parse(salvas) : [];
      const todos = Array.from(new Set([...PAISES_PADRAO, ...personalizadas]));
      return todos.sort((a, b) => {
        if (a === 'Angola') return -1;
        if (b === 'Angola') return 1;
        return a.localeCompare('pt-AO');
      });
    } catch {
      return [...PAISES_PADRAO];
    }
  }

  /**
   * Adiciona um novo país ao sistema
   */
  adicionarPais(nome: string): { sucesso: boolean; mensagem: string; pais?: string } {
    const limpo = (nome || '').trim();
    if (!limpo) {
      return { sucesso: false, mensagem: 'O nome do país não pode estar vazio.' };
    }

    const paises = this.getPaises();
    if (paises.some(p => p.toLowerCase() === limpo.toLowerCase())) {
      const encontrado = paises.find(p => p.toLowerCase() === limpo.toLowerCase());
      return { sucesso: true, mensagem: 'País já existe no sistema.', pais: encontrado };
    }

    try {
      const salvas = localStorage.getItem(STORAGE_KEY_PAISES);
      const personalizadas: string[] = salvas ? JSON.parse(salvas) : [];
      personalizadas.push(limpo);
      localStorage.setItem(STORAGE_KEY_PAISES, JSON.stringify(personalizadas));
      return { sucesso: true, mensagem: `País "${limpo}" adicionado com sucesso!`, pais: limpo };
    } catch (err) {
      return { sucesso: false, mensagem: 'Erro ao guardar novo país no armazenamento local.' };
    }
  }
}

export const locationService = new LocationService();

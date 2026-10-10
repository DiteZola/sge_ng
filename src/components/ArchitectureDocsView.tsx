import React, { useState } from 'react';
import { 
  FileCode2, 
  Database, 
  Cpu, 
  Network, 
  Smartphone, 
  CheckCircle2, 
  Copy, 
  Layers, 
  GitBranch, 
  ShieldCheck,
  Terminal
} from 'lucide-react';

export const ArchitectureDocsView: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const mermaidER = `erDiagram
    ESCOLA ||--o{ TURMA : contem
    ESCOLA ||--o{ FUNCIONARIO : emprega
    ESCOLA ||--o{ ALUNO : matricula
    ESCOLA ||--o{ REGRA_CALCULO_MAC : governa
    
    TURMA ||--o{ ATRIBUICAO_DOCENTE : vincula
    TURMA ||--o{ ALUNO : agrupa
    TURMA ||--o{ COMISSAO_JURI : avalia
    
    FUNCIONARIO ||--o{ ATRIBUICAO_DOCENTE : leciona
    FUNCIONARIO ||--o{ AVALIACAO_CRIADA : elabora
    FUNCIONARIO ||--o{ REGISTO_ASSIDUIDADE : ponto
    FUNCIONARIO ||--o{ SOLICITACAO_ALTERACAO : requer
    
    DISCIPLINA ||--o{ ATRIBUICAO_DOCENTE : compoe
    DISCIPLINA ||--o{ AVALIACAO_CRIADA : aplica
    
    AVALIACAO_CRIADA ||--o{ NOTA_ESTUDANTE : pontua
    ALUNO ||--o{ NOTA_ESTUDANTE : recebe
    ALUNO ||--o{ NOTA_TRIMESTRAL_CONSOLIDADA : gera
    ALUNO ||--o{ HISTORICO_ANTERIOR : comprova
    
    TIPO_AVALIACAO ||--o{ AVALIACAO_CRIADA : classifica`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white border-2 border-blue-600 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-300">
              Secção 4 da Especificação Técnica
            </span>
            <span className="text-xs text-gray-500 font-medium">Arquitetura de Engenharia SGE-NG</span>
          </div>
          <h2 className="text-xl font-black text-gray-950 mt-1">
            Arquitetura, Modelagem ER, APIs & Engenharia Mobile Angola
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Documentação técnica formal de sistemas: banco de dados relacional e não-relacional, motor da MAC e estratégia offline-first.
          </p>
        </div>
      </div>

      {/* 1. MODELO ENTIDADE-RELACIONAMENTO (ER DIAGRAM) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-gray-900">
              1. Modelo de Dados Relacional & Não-Relacional (Diagrama ER)
            </h3>
          </div>

          <button
            onClick={() => copyToClipboard(mermaidER, 'mermaid')}
            className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-300 inline-flex items-center space-x-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{copiedSection === 'mermaid' ? 'Copiado!' : 'Copiar Mermaid ER'}</span>
          </button>
        </div>

        <p className="text-xs text-gray-600">
          O modelo híbrido permite funcionamento local no <strong>IndexedDB</strong> dos navegadores e sincronização bidirecional na nuvem <strong>Firebase Firestore</strong>, assegurando integridade referencial com chaves primárias e relacionais.
        </p>

        <div className="bg-gray-950 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
          <pre>{mermaidER}</pre>
        </div>

        {/* Tabelas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
            <h4 className="font-bold text-gray-900">Coleções / Tabelas Principais</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li><strong>escola</strong>: Dados cadastrais, província, município, NIF e gestores.</li>
              <li><strong>turma</strong>: Mapeamento de classe (Iniciação à 13ª), turno e sala.</li>
              <li><strong>funcionario</strong>: Docentes, administrativos que lecionam e cargos.</li>
              <li><strong>aluno</strong>: Cadastro com concordância de gênero e histórico escolar.</li>
            </ul>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
            <h4 className="font-bold text-gray-900">Coleções Pedagógicas & Avaliativas</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li><strong>regra_calculo_mac</strong>: Fórmulas aritméticas ou ponderadas com versão.</li>
              <li><strong>avaliacao_criada</strong>: Provas e testes livres criados pelo docente.</li>
              <li><strong>nota_estudante</strong>: Notas individuais por avaliação e estudante.</li>
              <li><strong>nota_trimestral_consolidada</strong>: Fecho oficial da pauta e faltas.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2. ESPECIFICAÇÃO DE APIS RESTFUL */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2">
          <Network className="h-5 w-5 text-green-700" />
          <h3 className="text-base font-bold text-gray-900">
            2. Especificação Formal das APIs RESTful do SGE-NG
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-800 font-bold border-b border-gray-200">
              <tr>
                <th className="p-2.5">Método</th>
                <th className="p-2.5">Endpoint</th>
                <th className="p-2.5">Descrição</th>
                <th className="p-2.5">Payload / Parâmetros</th>
                <th className="p-2.5">Resposta HTTP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
              <tr>
                <td className="p-2.5"><span className="px-2 py-0.5 rounded font-bold bg-green-100 text-green-800">GET</span></td>
                <td className="p-2.5 text-blue-700 font-bold">/api/v1/alunos/consulta-publica</td>
                <td className="p-2.5 font-sans">Consulta de dados do aluno sem necessidade de login</td>
                <td className="p-2.5">{`?codigoMatricula=...`}</td>
                <td className="p-2.5 text-green-700 font-bold">200 OK</td>
              </tr>
              <tr>
                <td className="p-2.5"><span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800">POST</span></td>
                <td className="p-2.5 text-blue-700 font-bold">/api/v1/avaliacoes</td>
                <td className="p-2.5 font-sans">Professor cadastra nova avaliação contínua</td>
                <td className="p-2.5">{`{ turmaId, disciplinaId, titulo, tipoId }`}</td>
                <td className="p-2.5 text-green-700 font-bold">201 Created</td>
              </tr>
              <tr>
                <td className="p-2.5"><span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">PUT</span></td>
                <td className="p-2.5 text-blue-700 font-bold">/api/v1/avaliacoes/:id/notas</td>
                <td className="p-2.5 font-sans">Lançamento em lote ou individual de notas</td>
                <td className="p-2.5">{`{ notas: [{ alunoId, valorNota }] }`}</td>
                <td className="p-2.5 text-green-700 font-bold">200 OK</td>
              </tr>
              <tr>
                <td className="p-2.5"><span className="px-2 py-0.5 rounded font-bold bg-purple-100 text-purple-800">POST</span></td>
                <td className="p-2.5 text-blue-700 font-bold">/api/v1/mac/regras</td>
                <td className="p-2.5 font-sans">Direção atualiza fórmula da MAC com recálculo</td>
                <td className="p-2.5">{`{ formulaTipo, pesosPorTipo, minAvaliacoes }`}</td>
                <td className="p-2.5 text-green-700 font-bold">200 OK (Recalculado)</td>
              </tr>
              <tr>
                <td className="p-2.5"><span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800">POST</span></td>
                <td className="p-2.5 text-blue-700 font-bold">/api/v1/notas/solicitacoes</td>
                <td className="p-2.5 font-sans">Professor solicita alteração formal de nota</td>
                <td className="p-2.5">{`{ alunoId, avaliacaoId, motivo, notaProposta }`}</td>
                <td className="p-2.5 text-green-700 font-bold">201 Created</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. ALGORITMO DO MOTOR DE CÁLCULO DA MAC */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2">
          <Cpu className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-bold text-gray-900">
            3. Algoritmo Passo a Passo do Motor de Cálculo de MAC
          </h3>
        </div>

        <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <h4 className="font-bold text-gray-900">Passo 1: Identificação de Escala & Classe</h4>
            <p>
              O motor verifica a classe da turma:
              <br />• Se <strong>Iniciação</strong>: a avaliação é estritamente qualitativa (Muito Bom, Bom, Suficiente, Insuficiente).
              <br />• Se <strong>1ª à 6ª Classe (Primário)</strong>: a escala máxima é de <strong>0 a 10 valores</strong>.
              <br />• Se <strong>7ª à 13ª Classe (Ciclos)</strong>: a escala máxima é de <strong>0 a 20 valores</strong>.
            </p>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <h4 className="font-bold text-gray-900">Passo 2: Filtragem de Avaliações Válidas</h4>
            <p>
              O motor recupera todas as notas atribuídas ao aluno na disciplina e trimestre especificados. Caso a regra de governança determine <em>descartarMenorNota = true</em> e o total de avaliações exceda o mínimo exigido, a menor nota é eliminada do cálculo.
            </p>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <h4 className="font-bold text-gray-900">Passo 3: Aplicação da Fórmula Parametrizada</h4>
            <p>
              • <strong>Média Aritmética Simples:</strong> MAC = Σ(Notas) / N
              <br />• <strong>Média Ponderada por Tipo:</strong> MAC = Σ(Média_Tipo_i × Peso_i) / Σ(Pesos)
              <br />O resultado é arredondado a uma casa decimal (0.1).
            </p>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <h4 className="font-bold text-gray-900">Passo 4: Verificação de Comportamento & Concordância de Gênero</h4>
            <p>
              A nota de comportamento (0 a 20) é convertida automaticamente: Exemplar (19-20), Muito Bom (16-18), Bom (14-15), Regular (10-13) ou Mau (&lt;10). Todos os textos oficiais adaptam automaticamente o gênero (ex.: "O Aluno foi Aprovado" vs "A Aluna foi Aprovada").
            </p>
          </div>
        </div>
      </div>

      {/* 4. ENGENHARIA DE SOFTWARE PARA DISPOSITIVOS MÓVEIS MODESTOS EM ANGOLA */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-green-700" />
          <h3 className="text-base font-bold text-gray-900">
            4. Engenharia de Software para Telemóveis de Baixo Custo e Redes Instáveis
          </h3>
        </div>

        <p className="text-xs text-gray-600">
          Para garantir acessibilidade total nas 18 províncias de Angola, onde muitos professores utilizam telemóveis Android de entrada (1GB/2GB RAM) e redes 2G/3G instáveis:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-green-50/60 border border-green-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-green-900">IndexedDB Local Offline-First</h4>
            <p className="text-green-800">
              Todas as leituras e lançamentos de notas são gravados no armazenamento do telemóvel primeiro em &lt; 5 milissegundos, permitindo que o professor trabalhe na sala de aula sem qualquer sinal de internet.
            </p>
          </div>

          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-blue-900">Pacotes Leves & Zero Bloqueio de Thread</h4>
            <p className="text-blue-800">
              O motor matemático é síncrono e memoizado, evitando renderizações desnecessárias e poupando bateria em processadores modestos de 4 núcleos.
            </p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-gray-900">Fila de Sincronização em Background</h4>
            <p className="text-gray-700">
              Quando a ligação de dados móveis (Unitel/Africell) é restabelecida, o sistema despacha as mutações através de deltas compactados em JSON, consumindo menos de 50KB por turma.
            </p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-gray-900">Suporte a Mini Impressoras Térmicas</h4>
            <p className="text-gray-700">
              Geração de comandos de impressão Bluetooth ESC/POS otimizados em texto puro para bobinas de 58mm e 80mm sem necessidade de drivers pesados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

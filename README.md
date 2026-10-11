# SGE-NG · Sistema Integrado de Gestão Escolar (Angola) 🇦🇴

> **Desenvolvido por:** Dite Zola NG  
> **Ano:** 2026  
> **Conformidade:** Ministério da Educação da República de Angola (MED)

Sistema completo de Gestão Escolar e Pedagógica adaptado às normas curriculares e administrativas angolanas, com suporte offline-first, cálculo dinâmico de notas (MAC/NPP/NPT), pautas trimestrais, deliberação de júri, emissão documental e comunicação interna.

---

## 🚀 Como Executar o Aplicativo no GitHub Pages

Se no GitHub o seu repositório está a mostrar apenas o ficheiro README em vez do sistema a funcionar, siga um dos dois métodos abaixo para ativar o funcionamento automático no **GitHub Pages**:

### Método 1: Ativação Imediata via pasta `/docs` (Mais Rápido - 1 Minuto)

O projeto já inclui a versão de produção compilada pronta na pasta `/docs`:

1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages** (GitHub Pages).
3. Na secção **Build and deployment**:
   - **Source:** Selecione `Deploy from a branch`
   - **Branch:** Selecione `main` (ou `master`) e na pasta ao lado escolha `/docs`
4. Clique em **Save**.
5. Aguarde cerca de 1 a 2 minutos e o link oficial do seu sistema aparecerá no topo (ex: `https://seu-usuario.github.io/seu-repositorio/`). A aplicação abrirá diretamente a partir do `index.html`!

---

### Método 2: Publicação Automática via GitHub Actions (Recomendado)

O repositório já inclui o ficheiro de fluxo de trabalho automatizado em `.github/workflows/deploy.yml`:

1. No seu repositório no GitHub, vá a **Settings** > **Pages**.
2. Na secção **Build and deployment**:
   - **Source:** Selecione **GitHub Actions**.
3. O GitHub executará automaticamente o fluxo de compilação e publicação do Vite a cada atualização no código.

---

## 💻 Como Executar Localmente no seu Computador

Caso pretenda executar o projeto em ambiente de desenvolvimento local:

```bash
# 1. Clonar o repositório
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio

# 2. Instalar as dependências
npm install

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

Aceda a `http://localhost:3000` no seu navegador.

### Compilação de Produção

```bash
npm run build
```

---

## 🏛️ Funcionalidades Principais do Sistema

1. **Gestão Multiescolar & Nível Central (MED):**
   - Painel Central Ministerial para o Administrador Geral.
   - Cadastro completo de instituições de ensino com seleção de níveis (Ensino Primário, Iº Ciclo, IIº Ciclo e Técnico).
   - **Opção da Classe da Iniciação:** No cadastro e edição de escolas de Ensino Primário, permite definir a presença ou não de turmas de Iniciação (pré-escolar / 5–6 anos).

2. **Apoio Técnico Autorizado à Direção:**
   - Quando o Diretor de uma escola solicita apoio técnico, o Administrador Geral entra na escola assumindo a função executiva de Diretor com acesso total a todos os menus, turmas e pautas daquela instituição.

3. **Lançamento de Notas & Motor Pedagógico (MAC):**
   - Menu dedicado **"Lançamento de Notas (MAC)"** no menu lateral e nos menus rápidos prioritários.
   - Parametrização oficial de pesos de Avaliação Contínua (MAC), Prova do Professor (NPP) e Prova Trimestral (NPT).
   - Fórmulas de cálculo diferenciadas para 1º/2º trimestres vs 3º trimestre, e classes de exame vs transição.

4. **Emissão de Documentos em PDF de Alta Definição:**
   - Preservação integral da **Insígnia Nacional da República de Angola**, carimbos e assinaturas.
   - Nomenclatura oficial padronizada para Boletins Trimestrais, Pautas Gerais, Declarações com/sem notas, Certificados de Habilitações, Passes Escolares (8 por folha A4) e Termos de Exame.

5. **Comunicação Interna & Notificações:**
   - Notificações em tempo real no topo do aplicativo (`Header`).
   - Sistema de mensagens e circulares internas escolares entre Direção, Professores e Secretaria.

6. **Priorização do Painel de Controlo:**
   - Conteúdos organizados rigorosamente por prioridade com apenas 2 ações rápidas principais por perfil.

---

## 👨‍💻 Desenvolvedor & Direitos de Autor

- **Autor:** Dite Zola NG
- **Ano:** 2026
- **Copyright:** © 2026 Governo da República de Angola • Ministério da Educação (MED) • SIGE Angola • Desenvolvido por Dite Zola NG. Todos os direitos reservados.

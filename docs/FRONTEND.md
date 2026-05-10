# AngolaTCC AI — Documentação Completa do Frontend

> Documento de referência técnica para todo o sistema, com foco aprofundado no **frontend**.
> Versão do projecto: `1.0.0` · Stack: **React 18 + Vite 5 + Tailwind 3 + Supabase**.

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitectura Global (frontend ↔ backend ↔ IA)](#2-arquitectura-global-frontend--backend--ia)
3. [Stack Tecnológica Frontend](#3-stack-tecnológica-frontend)
4. [Estrutura de Pastas e Ficheiros](#4-estrutura-de-pastas-e-ficheiros)
5. [Configuração e Build](#5-configuração-e-build)
6. [Ponto de Entrada e Bootstrap](#6-ponto-de-entrada-e-bootstrap)
7. [Roteamento e Guards](#7-roteamento-e-guards)
8. [Sistema de Autenticação (`AuthContext`)](#8-sistema-de-autenticação-authcontext)
9. [Camada de Dados (`src/lib/`)](#9-camada-de-dados-srclib)
10. [Páginas (`src/pages/`)](#10-páginas-srcpages)
11. [Componentes Reutilizáveis (`src/components/`)](#11-componentes-reutilizáveis-srccomponents)
12. [Sistema de Estilos](#12-sistema-de-estilos)
13. [Geração com IA (Claude) — Fluxo no Frontend](#13-geração-com-ia-claude--fluxo-no-frontend)
14. [Exportação para Word (DOCX)](#14-exportação-para-word-docx)
15. [Modelo de Dados (visão do frontend)](#15-modelo-de-dados-visão-do-frontend)
16. [Variáveis de Ambiente](#16-variáveis-de-ambiente)
17. [Deploy](#17-deploy)
18. [Glossário Técnico](#18-glossário-técnico)

---

## 1. Visão Geral do Sistema

A **AngolaTCC AI** é uma SPA (Single Page Application) que permite a estudantes universitários angolanos gerar, editar e exportar **Trabalhos de Conclusão de Curso (TCC/Monografia)** e **Ante-Projectos de Pesquisa** com auxílio de Inteligência Artificial (Claude da Anthropic).

O sistema combina três camadas:

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| **Frontend** | React 18 + Vite 5 + Tailwind 3 + Framer Motion | UI, fluxo do utilizador, edição, pré-visualização, exportação DOCX |
| **Backend (BaaS)** | Supabase (Postgres + Auth + Edge Functions) | Persistência, autenticação, RLS, RPCs administrativas |
| **IA** | Anthropic Claude Sonnet (via 3 Edge Functions) | Geração de campos, secções e humanização de texto |

Tipos de utilizador:

- **Anónimo** — só vê a `LandingPage`, `Login` e `Register`.
- **Autenticado** — acede ao `Dashboard`, cria projectos, edita, exporta.
- **Administrador** (`ildocuema@gmail.com`) — acede ao `AdminDashboard` (estatísticas, validação de pagamentos, acessos).

---

## 2. Arquitectura Global (frontend ↔ backend ↔ IA)

```
┌────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Cliente)                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    React SPA (Vite build)                     │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐   │  │
│  │  │ AuthContext│  │ React Router │  │ FloatingBackground  │   │  │
│  │  └────────────┘  └──────────────┘  └─────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────────────┐    │  │
│  │  │ Pages: Landing · Login · Register · Dashboard ·       │    │  │
│  │  │        NewProject · ProjectEditor · Payment · Admin   │    │  │
│  │  └──────────────────────────────────────────────────────┘    │  │
│  │  ┌──────────────────────────────────────────────────────┐    │  │
│  │  │ lib/: supabase · generateSection · exportDocx ·       │    │  │
│  │  │       documentSections · edgeFunctions               │    │  │
│  │  └──────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────┬─────────────────┘
                   │ HTTPS (JWT)                   │ HTTPS (JWT)
                   ▼                               ▼
       ┌─────────────────────┐         ┌─────────────────────────────┐
       │  Supabase Postgres  │         │   Supabase Edge Functions   │
       │  - projects         │         │  - generate-tcc-fields      │
       │  - payments         │         │  - generate-tcc-section     │
       │  - universities     │         │  - humanize-tcc-content     │
       │  - login_logs       │         └─────────────────┬───────────┘
       │  - admin_users      │                           │
       │  - RPCs (stats)     │                           ▼
       │  - Auth + RLS       │              ┌────────────────────────┐
       └─────────────────────┘              │ Anthropic Claude API   │
                                            │   (claude-sonnet-*)    │
                                            └────────────────────────┘
```

Serviços externos consumidos directamente pelo browser:

- **QuickChart.io** — geração de imagens de gráficos a partir de configuração Chart.js v3.
- **Mermaid.ink** — geração de diagramas a partir de código Mermaid.
- **CORS Proxy (`corsproxy.io`)** — bypass de CORS para descarregar logos universitários.
- **Google Fonts** — fontes Inter e Poppins.

---

## 3. Stack Tecnológica Frontend

Definida em `package.json`:

```12:34:package.json
"dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "docx": "^8.5.0",
    "file-saver": "^2.0.5",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "vite": "^5.3.4"
  }
```

| Lib | Função |
|---|---|
| `react` / `react-dom` | Núcleo da UI |
| `react-router-dom` | Roteamento SPA com guards |
| `@supabase/supabase-js` | Cliente da BaaS (auth, BD, edge functions) |
| `framer-motion` | Animações declarativas (transições, modais, listas) |
| `lucide-react` | Biblioteca de ícones SVG |
| `react-hot-toast` | Notificações flutuantes |
| `docx` | Construção programática de ficheiros Word (.docx) |
| `file-saver` | Download de blobs no navegador |
| `tailwindcss` | Sistema de utilitários CSS |
| `vite` | Bundler / dev server / proxy de Edge Functions |

---

## 4. Estrutura de Pastas e Ficheiros

```
AngolanTCC AI/
├── index.html                  # HTML root, carrega /src/main.jsx
├── package.json                # Dependências e scripts (dev/build/preview)
├── vite.config.js              # Configuração Vite + proxy /functions-proxy
├── tailwind.config.js          # Tema (cores primary/accent/surface, animações)
├── postcss.config.js           # Tailwind + autoprefixer
├── vercel.json                 # Rewrites SPA para Vercel
├── .env / .env.example         # VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
├── README.md                   # Setup local e deploy
│
├── src/
│   ├── main.jsx                # Bootstrap React (createRoot)
│   ├── App.jsx                 # Routes + AuthProvider + Router + Toaster
│   ├── index.css               # Tailwind + variáveis CSS + classes utilitárias
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx     # useAuth(), signIn/signUp/signOut, refresh JWT
│   │
│   ├── components/             # UI atómica reutilizável
│   │   ├── Navbar.jsx
│   │   ├── PageLayout.jsx
│   │   ├── Card.jsx            # Card + CardCompact
│   │   ├── Badge.jsx
│   │   ├── Modal.jsx
│   │   ├── ConfirmDialog.jsx   # Modal confirmação (danger/warning/info)
│   │   └── FloatingBackground.jsx  # Partículas animadas com física de colisão
│   │
│   ├── lib/                    # Camada de serviços / lógica de negócio
│   │   ├── supabase.js         # Cliente Supabase singleton
│   │   ├── edgeFunctions.js    # Helper fetch directo (proxy/dev vs prod)
│   │   ├── generateSection.js  # IA: geração + humanização + tradução de erros
│   │   ├── documentSections.js # Mapas TCC_SECTIONS / ANTEPROJECTO_SECTIONS
│   │   └── exportDocx.js       # Exportação Word (DOCX) com gráficos/tabelas
│   │
│   └── pages/                  # Páginas (rotas)
│       ├── LandingPage.jsx     # Marketing pública
│       ├── LoginPage.jsx
│       ├── RegisterPage.jsx
│       ├── Dashboard.jsx       # Lista de projectos + migração AP→TCC
│       ├── NewProject.jsx      # Form de criação + sugestões IA inline
│       ├── ProjectEditor.jsx   # Editor por secções + preview + exportação
│       ├── PaymentPage.jsx     # Referência de pagamento + WhatsApp
│       └── AdminDashboard.jsx  # Métricas, pagamentos, acessos
│
├── docs/
│   ├── FRONTEND.md             # ← este documento
│   └── DEPLOY_EDGE_FUNCTION.md
│
├── supabase/                   # Backend-as-Code
│   ├── config.toml
│   ├── migrations/             # SQL versionado
│   └── functions/              # Edge Functions (Deno + Anthropic)
│       ├── generate-tcc-fields/
│       ├── generate-tcc-section/
│       └── humanize-tcc-content/
│
└── dist/                       # Output do `vite build`
```

---

## 5. Configuração e Build

### 5.1 Scripts (`package.json`)

```json
"scripts": {
  "dev": "vite",          // Servidor local com HMR + proxy de Edge Functions
  "build": "vite build",  // Bundle de produção em ./dist
  "preview": "vite preview" // Servidor local que serve o ./dist
}
```

### 5.2 `vite.config.js` — Proxy inteligente para Edge Functions

Em desenvolvimento, todas as chamadas a Edge Functions vão por `/functions-proxy/*` para evitar problemas de CORS. O Vite faz reescrita do path para `/functions/v1/*` no domínio Supabase configurado em `VITE_SUPABASE_URL`:

```58:67:vite.config.js
const functionsProxy = supabaseUrl
    ? {
        '/functions-proxy': {
          target: supabaseUrl,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/functions-proxy/, '/functions/v1'),
        },
      }
    : {}
```

Em produção (Vercel) o proxy não existe — o frontend chama directamente o gateway Supabase (que devolve `Access-Control-Allow-Origin: *`).

### 5.3 `tailwind.config.js`

Define a paleta personalizada (primary, accent, surface, dark), fontes (Inter / Poppins), animações customizadas (`float`, `slideUp`, `slideIn`, `fadeIn`, `scaleUp`, `subtlePulse`) e raio extra `4xl`.

### 5.4 `vercel.json`

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

O rewrite garante que rotas do React Router (ex.: `/project/abc`) servem `index.html` em vez de devolver 404.

---

## 6. Ponto de Entrada e Bootstrap

**`index.html`** carrega:

- Meta tags SEO em `pt-AO`.
- Pré-conexão a Google Fonts (`Inter` + `Poppins`).
- Tema do navegador `theme-color: #0B1F3A`.
- `<div id="root"></div>` + `<script type="module" src="/src/main.jsx">`.

**`src/main.jsx`** monta a aplicação dentro de `<React.StrictMode>`:

```1:11:src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## 7. Roteamento e Guards

Definido em `src/App.jsx`. Existem **três tipos de rota**:

| Tipo | Componente Wrapper | Comportamento |
|---|---|---|
| Pública (sempre) | nenhum | `/` → Landing |
| Apenas anónimo | `<PublicRoute>` | Se houver sessão, redirige para `/dashboard` |
| Apenas autenticado | `<ProtectedRoute>` | Sem sessão, redirige para `/login` |
| Apenas admin | `<AdminRoute>` | Verifica `user.email === 'ildocuema@gmail.com'` |

```67:100:src/App.jsx
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <FloatingBackground />
        <Toaster ... />
        <div className="relative z-10 flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/new-project" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
            <Route path="/project/:id" element={<ProtectedRoute><ProjectEditor /></ProtectedRoute>} />
            <Route path="/payment/:id" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}
```

Mapa completo de rotas:

| Path | Página | Acesso |
|---|---|---|
| `/` | `LandingPage` | Público |
| `/login` | `LoginPage` | Anónimo |
| `/register` | `RegisterPage` | Anónimo |
| `/dashboard` | `Dashboard` | Autenticado |
| `/new-project` | `NewProject` | Autenticado |
| `/project/:id` | `ProjectEditor` | Autenticado + dono do projecto |
| `/payment/:id` | `PaymentPage` | Autenticado |
| `/admin` | `AdminDashboard` | Admin |
| `*` | `Navigate to="/"` | Catch-all |

---

## 8. Sistema de Autenticação (`AuthContext`)

Ficheiro: `src/contexts/AuthContext.jsx`

**Hook exportado**: `useAuth()` devolve `{ user, session, loading, signUp, signIn, signOut }`.

### Inicialização

1. Lê a sessão actual com `supabase.auth.getSession()`.
2. Subscreve `supabase.auth.onAuthStateChange()` para refletir login/logout em tempo real.
3. Inicia um **interval de 4 minutos** que verifica se o JWT vai expirar nos próximos 5 minutos e, em caso afirmativo, faz `refreshSession()` proactivo. Isto evita 401 silenciosos durante geração de TCC.

### `signUp(email, password, fullName, familyMeta)`

Cria utilizador em Supabase Auth e armazena em `user_metadata`:

- `full_name` — usado em TCC (capa, folha de rosto)
- `father_name`, `mother_name`, `other_relatives` — usados pela IA para personalizar a **dedicatória**

### `signIn(email, password)`

Faz login e regista um evento na tabela `login_logs` (não-bloqueante, silencioso) para alimentar as estatísticas de "Acessos ao Sistema" no painel admin.

### `signOut()`

Termina sessão e limpa o estado.

---

## 9. Camada de Dados (`src/lib/`)

### 9.1 `supabase.js` — Cliente singleton

Lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Lança um erro **descritivo** em build/runtime caso uma das variáveis falte, com instruções para o utilizador (em vez do `supabaseUrl is required` minificado).

```1:23:src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  ...
  throw new Error(
    `[supabase] Variáveis de ambiente em falta: ${missing}. ...`,
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 9.2 `documentSections.js` — Mapas de secções

Define a **ordem e os títulos** das secções para cada tipo de trabalho:

- `TCC_SECTIONS` (12 itens): Capa → Dedicatória → Agradecimentos → Resumo → Abstract → Índice → Introdução → Revisão da Literatura → Metodologia → Resultados → Conclusão → Referências.
- `ANTEPROJECTO_SECTIONS` (8 itens): Capa → Introdução → Justificativa → Fundamentação Teórica → Metodologia → Cronograma → Orçamento → Referências.

Cada item tem `id`, `title`, `docxTitle` (cabeçalho usado no Word) e `icon` (Lucide).

Função `getSectionsForProject(projectType)` devolve a lista correcta consoante `'tcc'` ou `'anteprojecto'`.

### 9.3 `generateSection.js` — Camada IA

API exposta:

| Função | Descrição |
|---|---|
| `callFunction(name, body)` | Wrap de `supabase.functions.invoke` com **refresh automático** em 401/403 |
| `generateSection(sectionId, projectData)` | Gera UMA secção; secções pesadas (`revisao_literatura`) são partidas em 2 sub-chamadas (`_a` + `_b`) |
| `humanizeSection(sectionId, text)` | Reescreve texto para parecer humano (anti-detecção de IA) |
| `generateAllSections(ids, project, onProgress, onError)` | Gera todas as secções sequencialmente, tolerante a falhas |
| `traduzirErroIA(detail)` | Mapa de erros técnicos → mensagens em pt-AO |
| `extractFnError(error)` | Lê o `Response` do `FunctionsHttpError` |
| `ensureFreshSession()` | Faz refresh preventivo se o JWT estiver a < 60s da expiração |

**Estratégia de divisão**: para evitar `compute resources exceeded`, a Revisão da Literatura é partida em duas chamadas independentes que são depois concatenadas com `\n\n`.

### 9.4 `edgeFunctions.js` — Fetch alternativo

Helper auxiliar para **bypass do SDK** caso necessário, com URL que detecta automaticamente:

- **Dev** → `/functions-proxy/<name>` (proxy do Vite)
- **Prod** → `https://<proj>.supabase.co/functions/v1/<name>`

Inclui parsing detalhado de erros HTTP (404, 401) com mensagens accionáveis.

### 9.5 `exportDocx.js` — Exportação Word

Constrói um `Document` (lib `docx`) com:

- Capa + Folha de Rosto institucional (República de Angola, ministério, logótipo da universidade buscado da BD ou via QuickChart fallback).
- Cabeçalho institucional automático em cada página (título do TCC à direita).
- Numeração de páginas automática no rodapé.
- Margens ABNT (3cm/2cm/3cm/2cm).
- Espaçamento de linhas: **1.5** (ABNT) ou **2.0** (APA), determinado por `project.sections.academic_norm`.
- Detecção heurística de cabeçalhos (`detectHeading`) → estilos H1/H2/H3.
- Renderização de **tabelas Markdown** → `Table` nativo do Word com bordas e header destacado.
- Renderização de **gráficos** (blocos ` ```chart`) → imagens PNG via QuickChart.io com defaults visuais aplicados.
- Renderização de **diagramas Mermaid** → imagens via Mermaid.ink.
- Filtragem de duplicação do título (caso a IA escreva o título do capítulo no corpo).

---

## 10. Páginas (`src/pages/`)

### 10.1 `LandingPage.jsx`

Página de marketing 100% pública. Estrutura em secções:

1. **Navbar** sticky com glass effect + CTA "Começar Agora".
2. **Hero** — título grande, subtítulo, dois CTAs ("Gerar TCC Agora" e "Como Funciona") e KPIs (`500+`, `50+`, `98%`).
3. **Features** — grelha de 6 cards com ícones Lucide (IA Avançada, Normas, Word, Velocidade, Original, Editor).
4. **Como Funciona** — 4 passos numerados.
5. **Secções Geradas** — checklist visual (CheckCircle2 + texto).
6. **CTA Final** — bloco gradiente com botão para `/register`.
7. **Footer**.

Animações com `framer-motion` (`fadeUp`) e `whileInView` para revelar ao fazer scroll.

### 10.2 `LoginPage.jsx`

Form simples com:

- Email + Senha (com toggle Eye/EyeOff).
- Validação local (campos vazios).
- Tradução de `Invalid login credentials` para "Email ou senha incorrectos".
- Toast de sucesso e navegação para `/dashboard`.

### 10.3 `RegisterPage.jsx`

Form alargado com:

- **Obrigatórios**: Nome Completo, Email, Senha (≥6 caracteres).
- **Opcionais (Família para Dedicatória)**: Nome do Pai, Nome da Mãe, Outros Parentes (textarea). Estes valores ficam em `user_metadata` e são usados pela IA na geração da dedicatória.
- Validação local + chamada a `signUp` do `AuthContext`.

### 10.4 `Dashboard.jsx`

Hub principal do utilizador autenticado.

Funcionalidades:

- Lista de projectos do utilizador (query `from('projects').eq('user_id', user.id)`).
- Cada card mostra: ícone (cor consoante tipo: TCC = índigo, AP = âmbar, TCC migrado = esmeralda), título, badge de tipo, data e badge de status (`draft`/`generating`/`completed`).
- Botão **"Migrar p/ TCC"** em ante-projectos não migrados → cria um novo projecto TCC herdando metadados e conteúdo reutilizável (introdução, fundamentação→revisão de literatura, metodologia, referências) e cria um pagamento associado de 35 000 AOA. Marcado por `source_project_id` (FK ao AP de origem).
- Modal de confirmação animado para a migração.
- Atalho para `/admin` apenas para o utilizador `ildocuema@gmail.com`.
- Botão `Sair` que chama `signOut`.
- Empty state ilustrado quando não há projectos.

### 10.5 `NewProject.jsx`

Form de criação rico em IA. Secções:

1. **Tipo de Trabalho** — TCC (35 000 AOA) ou Ante-Projecto (15 000 AOA).
2. **Informações do Trabalho**:
   - **Campo do Conhecimento** (autocomplete com 50+ áreas pré-definidas — `knowledgeAreas`).
   - **Título** com:
     - **Sugestões inline** (debounced 700 ms): após 4 caracteres, a IA gera 5 títulos contextualizados que aparecem num dropdown animado abaixo do input.
     - Botão **"Inspirar-me"** que pede 6 títulos do zero baseado em curso/universidade/área.
     - Após `onBlur` com título ≥ 10 caracteres, dispara geração automática de Tema e Problema.
   - **Tema/Descrição** (textarea, preenchido pela IA, editável, com badge "Gerado por IA" e botão "Regenerar").
   - **Problema de Investigação** (idem).
   - **Metodologia** (select: qualitativa, quantitativa, mista, bibliográfica, estudo de caso).
3. **Informações Académicas**:
   - **Norma Académica** (ABNT ou APA).
   - **Ano**.
   - **Universidade** (lista vinda da BD `universities` com fallback para lista hardcoded organizada por província).
   - **Curso** (lista de 14 cursos sugeridos, mas livre).
   - **Nome do Estudante** (preenchido por defeito a partir de `user_metadata.full_name`).
   - **Orientador**.
   - **Nº Máximo de Páginas** (10–120, default 80).
   - **Dados da Amostra/Estatísticas/Sistemas** (textarea livre que a IA usa para gerar gráficos/tabelas/diagramas UML automaticamente).
4. **Submit** — cria o registo em `projects` com status `generating` e cria um pagamento `pendente` em `payments`. Redirige para `/payment/:id`.

Componentes auxiliares dentro do ficheiro:

- `SkeletonLines` — placeholders animados durante geração da IA.
- `AIBadge` — etiqueta + botão regenerar.

### 10.6 `PaymentPage.jsx`

Mostra:

- Resumo do projecto a pagar (título + tipo).
- **Estado do pagamento** (badge: pendente/pago/rejeitado).
- Valor formatado em AOA.
- **Código de referência única** (`TCC-XXXXX` ou `AP-XXXXX`) com botão de copiar.
- Instruções passo-a-passo: IBAN `0040 0000 1735 7484 10115`, telefone Express `921 923 232`.
- Botão para abrir conversa pré-formatada no **WhatsApp** (`https://wa.me/244921923232?text=...`).
- **Polling** a cada 10 s ao `payments` para detectar mudança automática de `pendente` → `pago` (validação manual feita por admin), redirigindo a `/project/:id` quando pago.
- Botão de acesso directo ao projecto se já estiver pago.

### 10.7 `ProjectEditor.jsx`

A página mais complexa do sistema. Layout: **header sticky + sidebar de secções + área principal**.

Estado principal:

- `project` — registo da BD.
- `activeSection` — id da secção visível.
- `editingSection` + `editContent` — modo de edição manual (textarea).
- `generatingSection`, `humanizingSection`, `generationProgress`, `generationErrors`.
- `exporting`, `showDeleteDialog`.

Fluxos:

1. **Carregamento** (`fetchProject`):
   - Lê o projecto pelo `:id` e verifica `user_id`.
   - Verifica o último pagamento associado — se `≠ 'pago'`, redirige para `/payment/:id`.
   - Se ainda não há nenhuma secção com conteúdo, dispara `generateTCC()` automaticamente.

2. **Geração com IA** (`generateTCC`):
   - Chama `generateAllSections(...)` da `lib/generateSection.js`.
   - Actualiza o estado conforme cada secção termina (callback `onProgress`).
   - Trata erros individualmente (`onError`) — uma falha não trava as restantes.
   - Persiste tudo num único `update` no Supabase com `status: 'completed'` se 0 falhas, senão `'draft'`.

3. **Regeneração individual** (`regenerateOneSection`) — chama `generateSection` para um id específico.

4. **Humanizar** (`handleHumanize`) — chama Edge `humanize-tcc-content` para reescrever a secção parecendo mais humano.

5. **Edição manual**:
   - Modo edição alterna textarea com preview formatado (parseado por `parseSectionContent`).
   - Persiste em `update().eq('id', id)`.

6. **Pré-visualização rica** (`parseSectionContent`):
   - **Blocos ` ```chart`** → `<ChartBlock>` que renderiza imagem QuickChart e oferece **selector de tipo** (Barras, H. Barras, Pizza, Anel, Linha, Radar) com persistência.
   - **Blocos ` ```mermaid`** → imagem via mermaid.ink.
   - **Tabelas Markdown** → `<MarkdownTablePreview>` (header destacado, hover, scroll horizontal).
   - **Legendas** (`**Figura 1: ...**`) → centradas e itálicas.
   - **Cabeçalhos** detectados por regex (`CAPÍTULO`, `\d+\.\d+`, MAIÚSCULAS) → tipografia `font-bold text-lg`.
   - **Bullets** (`•` ou `- `) → indentação.

7. **Exportação**:
   - **Word (DOCX)** → `exportToDocx(project, sections)` (gera capa, folha de rosto, todas as secções, tabelas e gráficos embebidos).
   - **TXT** → join simples com separadores `===`.

8. **Eliminação** — abre `<ConfirmDialog>` (variant danger) → `delete().eq('id', id)`.

Componentes internos:

- `ChartBlock`
- `MarkdownTablePreview`
- `parseSectionContent` (parser linha-a-linha)
- `applyChartDefaults` (defaults visuais para QuickChart, idênticos aos do `exportDocx.js`)

### 10.8 `AdminDashboard.jsx`

Painel restrito ao admin. Três tabs:

1. **Visão Geral** — `StatCard`s com:
   - Total de utilizadores
   - Total de projectos
   - Receita total (Kz)
   - Pagamentos pendentes
   
   Carregados via RPC `supabase.rpc('get_dashboard_stats')`.

2. **Acessos ao Sistema** — métricas de `login_logs` (hoje / mês / ano + breakdown diário) via RPC `get_access_stats`. Renderizado num `MiniBarChart` SVG inline.

3. **Pagamentos** — tabela de todos os pagamentos com:
   - `Aprovar` (`status='pago'`), `Rejeitar` (`status='rejeitado'`), `Reverter para pendente`, `Eliminar` (com `ConfirmDialog`).
   - Selecção múltipla + eliminação em lote.
   - Botão `Reset` para reiniciar o período de estatísticas via RPC `reset_dashboard_stats`.

Helpers:

- `getLastNDays(n)`, `formatDate`, `formatCurrency` (`pt-AO`, `Kz`).

---

## 11. Componentes Reutilizáveis (`src/components/`)

### 11.1 `Navbar.jsx`

Barra superior com glass effect (`fixed top-0`). Aceita props:

- `backTo`, `backLabel` — substitui o logo por seta de voltar.
- `title` — título contextual da página.
- `rightContent` — slot para botões à direita.
- `children` — slot extra ao centro/esquerda.

### 11.2 `PageLayout.jsx`

Wrapper `<main>` com padding-top (para acomodar a navbar fixa) e `max-width` configurável. Centraliza padrões responsivos.

### 11.3 `Card.jsx` & `CardCompact.jsx`

Wrappers visuais sobre a classe `glass-card` com radius 2xl/xl. Suportam `onClick` (cursor pointer) e desactivação de hover.

### 11.4 `Badge.jsx`

Badges com variantes: `success`, `warning`, `error`, `info`, `neutral`. Mapeadas a classes CSS `.badge-*` definidas em `index.css`.

### 11.5 `Modal.jsx`

Modal genérico animado com `framer-motion` (`AnimatePresence`). Click no backdrop fecha. Suporta `icon`, `title`, `maxWidth` configurável.

### 11.6 `ConfirmDialog.jsx`

Modal de confirmação enriquecido com **três variantes** (danger / warning / info) com:

- Esquemas de cor coordenados (icon, alert box, botão).
- Suporte a `loading` no botão de confirmar.
- Tecla `Esc` fecha.
- ARIA `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`.

### 11.7 `FloatingBackground.jsx`

Componente decorativo que renderiza **24 partículas animadas** (12 ícones temáticos × 2 tamanhos) com:

- **Motor de física custom** dentro de `useEffect` + `requestAnimationFrame`:
  - Movimento contínuo com velocidade aleatória.
  - Colisão com paredes (reflexão).
  - **Colisão elástica** entre partículas com massa proporcional à área (πr²), conservação de momento e correcção posicional anti-sinking.
- Camada `bg-mesh` por baixo com gradientes radiais animados (CSS `keyframes bgPulse`).
- Renderizado com `pointer-events: none` para não interferir.

---

## 12. Sistema de Estilos

### 12.1 Filosofia

Mistura **Tailwind utilitário** + **CSS custom em `@layer components`** para classes semânticas reutilizáveis (ex.: `.btn-primary`, `.glass-card`, `.input-field`).

### 12.2 Variáveis CSS (`:root` em `src/index.css`)

```css
--color-primary: #1E3A8A;
--color-primary-deep: #0B1F3A;
--color-accent: #6366F1;
--color-surface: #FFFFFF;
--color-surface-elevated: #F8FAFC;
--color-bg: #F1F5F9;
--color-text-primary: #1E293B;
--color-text-secondary: #64748B;
--color-border: #E2E8F0;
--glass-bg: rgba(255, 255, 255, 0.85);
--glass-border: rgba(0, 0, 0, 0.06);
```

### 12.3 Classes utilitárias customizadas

| Classe | Função |
|---|---|
| `.glass` / `.glass-light` / `.glass-card` | Efeitos vidro com `backdrop-filter: blur(20px)` |
| `.btn-primary` / `.btn-secondary` / `.btn-outline` | Botões com transições, hover, disabled |
| `.input-field` | Inputs com focus ring índigo |
| `.badge`, `.badge-success/warning/error/info/neutral` | Pílulas de status |
| `.loading-spinner` | Spinner circular animado |
| `.bg-mesh` | Gradiente radial animado de fundo |
| `.sidebar-link` | Item clicável da sidebar do editor |

### 12.4 Tipografia

- **Inter** (300/400/500/600/700/800/900) — fonte body por defeito.
- **Poppins** (400/500/600/700/800) — `font-display` para títulos.
- Renderização suavizada com `-webkit-font-smoothing: antialiased`.

### 12.5 Animações (`tailwind.config.js`)

`float`, `slideUp`, `slideIn`, `fadeIn`, `scaleUp`, `subtlePulse` — usadas em hero, modais, listas e indicadores de carregamento.

### 12.6 Toaster global

Configurado em `App.jsx`:

```72:83:src/App.jsx
<Toaster
  position="top-right"
  toastOptions={{
    style: {
      background: '#FFFFFF',
      color: '#1E293B',
      border: '1px solid #E2E8F0',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
  }}
/>
```

### 12.7 Scrollbar custom

Webkit scrollbar slim (6px) com cores neutras e hover.

---

## 13. Geração com IA (Claude) — Fluxo no Frontend

### 13.1 Diagrama de fluxo (geração de uma secção)

```
ProjectEditor.jsx
   │
   ▼
generateAllSections(ids, project, onProgress, onError)   [generateSection.js]
   │
   ▼
For each id → generateSection(id, project)
   │
   ├── ensureFreshSession()     → refreshSession() se < 60s para expirar
   ▼
callFunction('generate-tcc-section', { sectionId, projectData })
   │
   ▼
supabase.functions.invoke('generate-tcc-section', { body })
   │  (Authorization: Bearer <JWT>)
   ▼
Supabase Edge (Deno)  →  Anthropic Claude API
   │
   ▼
Resposta { text }
   │
   ├── 401? → refreshSession() + retry uma vez
   ├── erro? → traduzirErroIA(msg) → toast em pt-AO
   │
   ▼
setProject(prev => ({ ...prev, sections: { ...prev.sections, [id]: text } }))
   │
   ▼
supabase.from('projects').update({ sections, status })
```

### 13.2 Gestão de erros amigável

`traduzirErroIA(detail)` cobre:

- Chave inválida / não configurada
- Quota / saldo Anthropic
- Modelo retired / not found
- Rate limit / 429
- Servidor sobrecarregado / 529
- Compute resources exceeded (Edge)
- JWT expirado / inválido

### 13.3 Refresh proactivo

Duas barreiras evitam o erro `Invalid JWT` durante geração longa:

1. `AuthContext` faz `refreshSession()` automático a cada 4 minutos se faltarem < 5 min.
2. Cada `generateSection` faz `ensureFreshSession()` antes da chamada e ainda tem retry com refresh em caso de 401/403.

---

## 14. Exportação para Word (DOCX)

Função pública: `exportToDocx(project, sections)` em `src/lib/exportDocx.js`.

Pipeline:

1. Determina `activeSections` (TCC ou AP) e `LINE_SPACING` (ABNT 360 / APA 480 twips).
2. Busca dados da universidade em `supabase.from('universities')` (logo, cidade, província).
3. Tenta descarregar o logo (com `corsproxy.io` como fallback) e um logo genérico de capelo se falhar.
4. Para cada secção:
   - **Capa** → `generateCapaAndFolhaRosto()` constrói cabeçalho institucional, logo, universidade, faculdade, nome do estudante, título, tipo de trabalho, cidade/ano + folha de rosto com bloco de orientação.
   - **Outras** → `sectionToElements()`:
     - Adiciona título centrado com `pageBreakBefore`.
     - Filtra duplicação do título dentro do conteúdo.
     - Detecta blocos especiais e converte em `Table`/`ImageRun`/`Paragraph` consoante o caso.
5. Constrói `Document` com:
   - Estilo default (Times New Roman 12pt, cor preta, justificado).
   - Margens de 30/20/30/20 mm.
   - Header com título do TCC (right-align, itálico, cinza).
   - Footer com nº da página centrado.
   - Numeração decimal a começar em 1.
6. `Packer.toBlob(doc)` + `saveAs(blob, filename)`.

Nome final: `<título> - <estudante>.docx`.

---

## 15. Modelo de Dados (visão do frontend)

### 15.1 Tabelas Supabase relevantes

| Tabela | Campos-chave usados pelo frontend |
|---|---|
| `auth.users` | `id`, `email`, `user_metadata.{ full_name, father_name, mother_name, other_relatives }` |
| `projects` | `id`, `user_id`, `title`, `university`, `course`, `student_name`, `advisor`, `topic`, `problem_statement`, `methodology`, `year`, `max_pages`, `status` (`draft`/`generating`/`completed`), `sections` (jsonb), `source_project_id` (FK p/ migração AP→TCC), `created_at`, `updated_at` |
| `payments` | `id`, `user_id`, `project_id`, `amount` (numeric), `reference_code`, `status` (`pendente`/`pago`/`rejeitado`), `created_at` |
| `universities` | `id`, `name`, `logo_url`, `country`, `province`, `city` |
| `login_logs` | `id`, `user_id`, `created_at` |
| `admin_users` | `email` (PK) |

### 15.2 Forma do JSONB `projects.sections`

```json
{
  "projectType": "tcc | anteprojecto",
  "academic_norm": "ABNT | APA",
  "db_structure": "...dados livres da amostra...",
  "university_city": "Luanda",
  "father_name": "...",
  "mother_name": "...",
  "other_relatives": "...",
  "capa": null,
  "introducao": "texto markdown da IA",
  "revisao_literatura": "...",
  "metodologia": "...",
  "resultados": "...",
  "conclusao": "...",
  "referencias": "..."
}
```

### 15.3 RPCs consumidas

- `get_dashboard_stats()` → métricas globais (admin)
- `get_access_stats()` → estatísticas de logins (admin)
- `reset_dashboard_stats()` → reinicia janela temporal (admin)
- `is_admin()` → verifica se o utilizador actual é admin

---

## 16. Variáveis de Ambiente

Ficheiro: `.env` na raiz (template em `.env.example`).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | URL do projecto Supabase (ex.: `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Chave anónima pública para o cliente Supabase |
| `VITE_FUNCTIONS_USE_DIRECT` | ❌ | Se `true`, força chamadas directas às Edge Functions mesmo em dev |

> ⚠️ As variáveis `VITE_*` são **inlined** no bundle de produção. Alterá-las no Vercel exige um novo deploy.

---

## 17. Deploy

### 17.1 Local

```bash
cp .env.example .env
# preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev   # http://localhost:5173
```

### 17.2 Vercel

1. Importar o repositório no painel Vercel.
2. Em **Project Settings → Environment Variables**, criar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy.

`vercel.json` já garante:

- `framework: vite`
- `buildCommand: npm run build`
- `outputDirectory: dist`
- Rewrites SPA: `"source": "/(.*)" → "destination": "/index.html"`

Em produção o frontend chama Edge Functions directamente em
`https://<proj>.supabase.co/functions/v1/<name>` (o gateway Supabase devolve `Access-Control-Allow-Origin: *`).

---

## 18. Glossário Técnico

| Termo | Definição |
|---|---|
| **TCC** | Trabalho de Conclusão de Curso (≈ Monografia de Licenciatura) |
| **Ante-Projecto** | Proposta de investigação prévia ao TCC, com cronograma e orçamento |
| **ABNT / APA** | Normas académicas de formatação (espaçamento de linhas distinto: 1.5 vs 2.0) |
| **RLS** | Row-Level Security — políticas de acesso por linha em Postgres |
| **Edge Function** | Função serverless Deno hospedada pelo Supabase, próxima do utilizador |
| **JWT** | JSON Web Token usado pelo Supabase Auth |
| **Glass effect** | Componente com fundo translúcido + `backdrop-filter: blur` |
| **QuickChart.io** | Serviço HTTP que devolve uma imagem PNG a partir de uma config Chart.js |
| **Mermaid.ink** | Serviço HTTP equivalente para diagramas Mermaid |
| **Twip** | 1/20 de ponto — unidade base de medidas do formato OOXML (Word) |
| **Humanizar** | Reescrever texto de IA para reduzir marcas detectáveis por classificadores anti-IA |

---

_Documento gerado a partir da inspecção completa do código-fonte em `/src`, `/supabase`, `package.json`, `vite.config.js`, `tailwind.config.js`, `vercel.json` e ficheiros `.env*`._

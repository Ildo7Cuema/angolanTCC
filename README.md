# AngolanTCC AI

Aplicação React (Vite) para criação e gestão de TCC/Monografia e Ante‑Projecto, com autenticação e dados via Supabase.

## Requisitos

- Node.js **18+**
- Conta/projeto Supabase (URL + anon key)

## Ambiente local

1. Copie o ficheiro de exemplo:

```bash
cp .env.example .env
```

2. Preencha no `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Instale e rode:

```bash
npm install
npm run dev
```

## Deploy na Vercel

1. Na Vercel, importe o repositório.
2. Em **Project Settings → Environment Variables**, crie:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Faça o deploy.

Notas:

- O ficheiro `vercel.json` já inclui **rewrites** para suportar rotas do React Router (SPA).
- Em produção, o app chama as Edge Functions via `supabase.functions.invoke(...)` (não depende do proxy do Vite).


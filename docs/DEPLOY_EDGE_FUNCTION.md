# Deploy da Edge Function `generate-tcc-fields` (Claude)

O frontend chama `supabase.functions.invoke('generate-tcc-fields')`. A função precisa estar **deployada** no teu projeto Supabase e o secret **`ANTHROPIC_API_KEY`** configurado no servidor.

**CORS / preflight (OPTIONS):** No `supabase/config.toml` está `verify_jwt = false` **só** para esta função. Motivo: o browser envia o pedido `OPTIONS` **sem** header `Authorization`; com JWT obrigatório no gateway, o Supabase respondia `401` ao preflight e o browser mostrava erro de CORS. A autenticação é validada **dentro** da função com o token do `POST`.

**Dev / preview (Vite):** Por defeito o código usa **`/functions-proxy`** (mesma origem) e o `vite.config.js` encaminha para `…/functions/v1` — evita CORS no browser. O `loadEnv` usa a pasta do `vite.config.js`. O mesmo proxy aplica-se a **`npm run preview`** em localhost.

**URL directo (opcional):** Só para testes, no `.env` podes definir `VITE_FUNCTIONS_USE_DIRECT=true` — aí o dev server chama o Supabase directamente (pode voltar a dar CORS se o gateway não responder bem ao OPTIONS).

**404 em `localhost:…/functions-proxy/...`:** O proxy não estava registado (`VITE_SUPABASE_URL` vazio ao arrancar o Vite). O `vite.config.js` tenta `loadEnv` **e** lê o `.env` com `fs` como fallback. Reinicia o `npm run dev`; se vires `[vite] VITE_SUPABASE_URL vazio` no terminal, o `.env` não está ao lado do `vite.config.js`.

**Project ref** (do teu `.env`): o host é `https://<PROJECT_REF>.supabase.co` → usa esse `<PROJECT_REF>` nos comandos abaixo.

---

## 1. Instalar o Supabase CLI (se ainda não tiveres)

- macOS (Homebrew): `brew install supabase/tap/supabase`
- Docs: https://supabase.com/docs/guides/cli/getting-started

---

## 2. Login na conta Supabase

```bash
cd "/caminho/para/AngolanTCC AI"
supabase login
```

Abre o browser para autenticar.

---

## 3. Ligar o repositório ao projeto remoto

Substitui `SEU_PROJECT_REF` pelo ref real (ex.: `elkaryeuapuuyuzmpimt`):

```bash
supabase link --project-ref SEU_PROJECT_REF
```

Se pedir a **database password**, é a password do Postgres do projeto (Dashboard → Project Settings → Database).

---

## 4. Definir o secret da Anthropic (no servidor)

**Não** uses `VITE_` no frontend para esta chave.

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
```

Confirma em: Dashboard → **Edge Functions** → **Secrets**.

---

## 5. Deploy da função

```bash
supabase functions deploy generate-tcc-fields
```

Por defeito a função **exige JWT** (utilizador autenticado), o que combina com `supabase.functions.invoke` no browser.

---

## 6. Testar rapidamente

Com sessão iniciada na app, ao sair do campo do título a geração deve funcionar.

No Dashboard → **Edge Functions** → `generate-tcc-fields` → **Logs**, vês erros da Anthropic (quota, modelo, etc.).

---

## Problemas frequentes

| Sintoma | Causa provável |
|--------|-----------------|
| **HTTP 404** ao gerar TCC | (1) Função não deployada ou nome errado — corre `supabase functions deploy generate-tcc-fields`. (2) Em dev, 404 no `/functions-proxy`: confirma `VITE_SUPABASE_URL` no `.env` e reinicia o Vite (o proxy usa a pasta do `vite.config.js`). |
| CORS: *preflight doesn't pass* / `OPTIONS` sem HTTP ok | Gateway com `verify_jwt` a bloquear `OPTIONS`. Garante `supabase/config.toml` com `[functions.generate-tcc-fields] verify_jwt = false` e volta a fazer **deploy** da função. |
| `Failed to fetch` no browser (antes era Claude direto) | Função não deployada ou URL/project errado |
| `401` / `JWT` | Utilizador não autenticado ou `anon` key inválida |
| `500` + mensagem sobre `ANTHROPIC_API_KEY` | Secret não definido ou deploy antigo |
| `400` da Anthropic | Modelo indisponível na conta — ajusta `model` em `supabase/functions/generate-tcc-fields/index.ts` e volta a fazer deploy |

---

## Segurança

- Roda a chave Anthropic se foi exposta em chat ou repositório.
- O ficheiro `.env` com `VITE_*` **não** deve conter secrets só de servidor; usa sempre **Secrets** das Edge Functions.

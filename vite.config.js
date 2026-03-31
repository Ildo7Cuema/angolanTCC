import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Pasta onde está este ficheiro (= raiz do projecto). Evita falhas quando o CWD do processo
// não é a raiz (ex.: Cursor / monorepos) — sem isto o proxy não recebe VITE_SUPABASE_URL e dá 404 em /functions-proxy.
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/**
 * Fallback quando loadEnv não preenche (ex.: alguns ambientes / ficheiros .env ignorados pelo tooling).
 * Lê VITE_SUPABASE_URL directamente dos ficheiros .env na raiz.
 */
function readViteSupabaseUrlFromEnvFiles(rootDir) {
  const files = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local',
  ]
  for (const name of files) {
    const filePath = path.join(rootDir, name)
    try {
      const raw = fs.readFileSync(filePath, 'utf8')
      const m = raw.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)$/m)
      if (!m) continue
      let v = m[1].trim().replace(/\r$/, '')
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      if (v) return v
    } catch {
      // ficheiro não existe ou não legível
    }
  }
  return ''
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, 'VITE_')
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    readViteSupabaseUrlFromEnvFiles(projectRoot) ||
    ''

  if (!supabaseUrl) {
    console.warn(
      '[vite] VITE_SUPABASE_URL vazio — o proxy /functions-proxy não será registado. ' +
        'Confirma .env na raiz do projecto (junto a vite.config.js).',
    )
  }

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

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      // Dev: browser → localhost (sem CORS); Vite reencaminha para Supabase.
      proxy: functionsProxy,
    },
    // npm run preview em localhost: mesmo proxy (senão CORS no URL directo).
    preview: {
      proxy: functionsProxy,
    },
  }
})

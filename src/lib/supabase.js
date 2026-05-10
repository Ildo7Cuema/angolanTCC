import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Falham build/runtime de forma clara em vez do "supabaseUrl is required" minificado.
  // Em Vercel/Netlify estas variáveis têm de ser configuradas no painel do projecto
  // e o deploy refeito (VITE_* são inlined no build).
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ]
    .filter(Boolean)
    .join(', ')

  throw new Error(
    `[supabase] Variáveis de ambiente em falta: ${missing}. ` +
      `Define-as no .env (dev) ou no painel do host (Vercel → Settings → Environment Variables) e refaz o build.`,
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Módulo de geração de secções do TCC via Edge Function (Claude).
 *
 * Chama a Edge Function `generate-tcc-section` para gerar uma secção por vez.
 */
import { supabase } from './supabase'

/**
 * Extrai a mensagem de erro de um FunctionsError do Supabase.
 * error.context é o Response object (não consumido) quando vem de FunctionsHttpError.
 */
export async function extractFnError(error) {
  try {
    const ctx = error?.context
    // ctx pode ser um Response (FunctionsHttpError) ou um plain object
    if (ctx && typeof ctx.json === 'function') {
      const json = await ctx.json()
      return json?.error || json?.message || error.message || 'Erro desconhecido'
    }
    // FunctionsFetchError / outros: context é um Error ou plain object
    if (ctx && ctx.message) return ctx.message
  } catch {}
  return error?.message || 'Erro ao chamar a função Edge.'
}

/**
 * Verifica se o JWT da sessão actual está prestes a expirar (< 60s)
 * e faz refreshSession preventivamente para evitar 401.
 */
async function ensureFreshSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // expires_at é unix timestamp (segundos)
  const expiresAt = session.expires_at
  const now = Math.floor(Date.now() / 1000)
  if (expiresAt && expiresAt - now < 60) {
    // Refresh preventivo — o token vai expirar em breve
    const { data, error } = await supabase.auth.refreshSession()
    if (!error && data?.session) return data.session
  }

  return session
}

/**
 * Invoca uma Edge Function com retry automático após refresh de sessão em caso de
 * erro de autenticação (401 / Invalid JWT).
 */
export async function callFunction(name, body) {
  const session = await ensureFreshSession()
  if (!session) {
    throw new Error('Inicia sessão para usar a geração com IA.')
  }

  let { data, error } = await supabase.functions.invoke(name, { body })

  // Se recebemos 401 (JWT inválido / expirado), tentamos refresh da sessão e repetimos
  const status = error?.context?.status
  if (error && (status === 401 || status === 403)) {
    const { error: refreshError } = await supabase.auth.refreshSession()
    if (!refreshError) {
      const retried = await supabase.functions.invoke(name, { body });
      ({ data, error } = retried)
    }
  }

  if (error) {
    const msg = await extractFnError(error)
    throw new Error(msg)
  }

  return data
}

/**
 * Secções que são divididas em sub-chamadas para evitar
 * exceder os limites de recursos da Edge Function do Supabase.
 * Chave = sectionId original, Valor = lista de sub-IDs a gerar e concatenar.
 */
const SPLIT_SECTIONS = {
  revisao_literatura: ['revisao_literatura_a', 'revisao_literatura_b'],
}

/**
 * Gera uma secção do TCC usando IA.
 * Secções muito grandes (ex: revisao_literatura) são automaticamente divididas
 * em sub-chamadas mais leves para respeitar os limites de compute do Supabase.
 *
 * @param {string} sectionId  – ID da secção (ex: 'introducao', 'metodologia')
 * @param {object} projectData – Dados do projecto (title, topic, course, etc.)
 * @returns {Promise<string>}  – Texto gerado pela IA
 */
export async function generateSection(sectionId, projectData) {
  const subParts = SPLIT_SECTIONS[sectionId]

  if (subParts) {
    // Gera cada sub-parte sequencialmente e concatena
    const parts = []
    for (const subId of subParts) {
      const data = await callFunction('generate-tcc-section', { sectionId: subId, projectData })
      if (data?.text) {
        parts.push(data.text)
      }
    }
    if (parts.length === 0) {
      throw new Error('Resposta vazia da IA. Tente novamente.')
    }
    return parts.join('\n\n')
  }

  const data = await callFunction('generate-tcc-section', { sectionId, projectData })

  if (!data?.text) {
    throw new Error('Resposta vazia da IA. Tente novamente.')
  }

  return data.text
}

/**
 * Humaniza uma secção do TCC para contornar detectores de IA.
 *
 * @param {string} sectionId  – ID da secção
 * @param {string} textToHumanize – Texto gerado pela IA previamente
 * @returns {Promise<string>}  – Texto humanizado
 */
export async function humanizeSection(sectionId, textToHumanize) {
  const data = await callFunction('humanize-tcc-content', { sectionId, textToHumanize })

  if (!data?.text) {
    throw new Error('Resposta vazia da IA. Tente novamente.')
  }

  return data.text
}

/**
 * Gera múltiplas secções sequencialmente com callback de progresso.
 *
 * @param {string[]} sectionIds  – Lista de IDs de secção a gerar
 * @param {object}   projectData – Dados do projecto
 * @param {function} onProgress  – Callback: (sectionId, text, index, total) => void
 * @param {function} onError     – Callback: (sectionId, error, index) => void
 * @returns {Promise<Record<string, string>>} – Mapa sectionId → texto gerado
 */
export async function generateAllSections(
  sectionIds,
  projectData,
  onProgress,
  onError,
) {
  const generated = {}

  for (let i = 0; i < sectionIds.length; i++) {
    const sectionId = sectionIds[i]
    try {
      const text = await generateSection(sectionId, projectData)
      generated[sectionId] = text
      onProgress?.(sectionId, text, i, sectionIds.length)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      onError?.(sectionId, message, i)
      // Continuar com as outras secções mesmo que uma falhe
    }
  }

  return generated
}

/**
 * Traduz erros da IA para português legível.
 */
export function traduzirErroIA(detail) {
  const message = String(detail || '').trim()
  const normalized = message.toLowerCase()

  if (!message) return 'Erro desconhecido ao gerar conteúdo com IA.'

  if (normalized.includes('invalid x-api-key') || normalized.includes('invalid api key')) {
    return 'Chave da IA inválida no servidor. Verifique o secret ANTHROPIC_API_KEY no Supabase.'
  }
  if (
    normalized.includes('insufficient_quota') ||
    normalized.includes('quota') ||
    normalized.includes('credit balance is too low')
  ) {
    return 'Saldo/quota insuficiente na conta da IA. Verifique a facturação da Anthropic.'
  }
  if (normalized.includes('model') && normalized.includes('not found')) {
    return 'Modelo da IA indisponível ou descontinuado. Verifique o modelo na Edge Function.'
  }
  if (normalized.includes('retired') || normalized.includes('deprecated') || normalized.includes('decommissioned')) {
    return 'Modelo da IA foi descontinuado pela Anthropic. Actualize o modelo na Edge Function.'
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.'
  }
  if (normalized.includes('overloaded') || normalized.includes('529')) {
    return 'O servidor da IA está sobrecarregado. Tente novamente em alguns minutos.'
  }
  if (normalized.includes('compute resources') || normalized.includes('boot deadline') || normalized.includes('resource limit')) {
    return 'A secção excedeu o limite de recursos do servidor. Tente regenerar a secção individualmente.'
  }
  if (
    normalized.includes('invalid jwt') ||
    normalized.includes('jwt expired') ||
    normalized.includes('invalid compact jws') ||
    normalized.includes('pgrst301')
  ) {
    return 'Sessão expirada ou inválida. Termina sessão (logout) e inicia sessão novamente.'
  }
  if (normalized.includes('não autenticado') || normalized.includes('sessão')) {
    return message
  }
  if (normalized.includes('anthropic_api_key')) {
    return 'Chave da IA não configurada no servidor. Execute: supabase secrets set ANTHROPIC_API_KEY=...'
  }

  return message.length > 150
    ? 'Não foi possível gerar com IA. Verifique a rede e tente novamente.'
    : message
}

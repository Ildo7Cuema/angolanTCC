/**
 * Módulo de geração de secções do TCC via Edge Function (Claude).
 *
 * Chama a Edge Function `generate-tcc-section` para gerar uma secção por vez.
 */
import { supabase } from './supabase'
import { sanitizeAIContent } from './sanitizeContent'
import { getSectionsForProject } from './documentSections'

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
        parts.push(sanitizeAIContent(data.text))
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

  return sanitizeAIContent(data.text)
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

  return sanitizeAIContent(data.text)
}

/**
 * Resume uma secção do TCC usando IA.
 *
 * Útil para criar versões mais curtas de TCCs muito longos (>90 páginas).
 *
 * @param {string} sectionId  – ID da secção
 * @param {string} originalText – Texto original (pode ser longo)
 * @param {object} options    – { level: 'compact' | 'medium' | 'light', targetWords?: number }
 * @returns {Promise<string>} – Texto resumido (ainda académico)
 */
const SECTIONS_NOT_TO_SUMMARIZE = new Set([
  'capa', 'dedicatoria', 'agradecimentos',
  'resumo', 'abstract', 'indice', 'referencias',
  'cronograma', 'orcamento',
])

/** Metadados guardados em `sections` — nunca são texto de secção. */
const SECTIONS_METADATA_KEYS = new Set([
  'projectType', 'academic_norm', 'university_city', 'db_structure',
  'father_name', 'mother_name', 'other_relatives',
  'is_summary', 'summary_level', 'summarized_from', 'software_dev',
])

const MIN_WORDS_TO_SUMMARIZE = 40

/**
 * IDs de secções com conteúdo textual válido que podem ser resumidas.
 */
export function getSummarizableSectionIds(sections, projectType = 'tcc') {
  const validIds = new Set(getSectionsForProject(projectType).map((s) => s.id))
  return [...validIds].filter((id) => {
    if (SECTIONS_NOT_TO_SUMMARIZE.has(id)) return false
    const text = sections[id]
    return typeof text === 'string' && text.trim().split(/\s+/).length >= MIN_WORDS_TO_SUMMARIZE
  })
}

/**
 * Cópia limpa de `sections` — só strings de secções conhecidas + metadados permitidos.
 */
export function buildSectionsSnapshot(sections, projectType = 'tcc') {
  const validIds = new Set(getSectionsForProject(projectType).map((s) => s.id))
  const snapshot = {}

  for (const id of validIds) {
    const text = sections[id]
    if (typeof text === 'string' && text.trim()) snapshot[id] = text
  }

  for (const key of SECTIONS_METADATA_KEYS) {
    if (sections[key] !== undefined && sections[key] !== null) {
      snapshot[key] = sections[key]
    }
  }

  return snapshot
}

export async function summarizeSection(sectionId, originalText, options = {}) {
  if (typeof originalText !== 'string' || !originalText.trim()) {
    throw new Error('Secção sem conteúdo textual para resumir.')
  }

  const wordCount = originalText.trim().split(/\s+/).length
  if (wordCount < MIN_WORDS_TO_SUMMARIZE) {
    return sanitizeAIContent(originalText)
  }

  const data = await callFunction('summarize-tcc-section', {
    sectionId,
    originalText,
    level: options.level || 'medium',
    targetWords: options.targetWords,
  })

  if (!data?.text) {
    throw new Error('Resposta vazia da IA ao resumir. Tente novamente.')
  }

  return sanitizeAIContent(data.text)
}

/**
 * Resume múltiplas secções sequencialmente, com callback de progresso.
 * Mantém capa, índice, dedicatória, agradecimentos, abstract e referências
 * SEM resumir (são curtos por natureza ou imprescindíveis na íntegra).
 *
 * @param {Record<string,string>} sections – Mapa sectionId → texto original
 * @param {object} options                  – { level, onProgress, onError }
 * @returns {Promise<Record<string,string>>} – Mapa com secções resumidas
 */
/**
 * @returns {Promise<{ sections: Record<string, unknown>, failures: Array<{ sectionId: string, message: string }> }>}
 */
export async function summarizeAllSections(sections, options = {}) {
  const { level = 'medium', onProgress, onError, onFailures } = options
  const projectType = sections?.projectType || 'tcc'
  const summarizable = getSummarizableSectionIds(sections, projectType)
  const total = summarizable.length
  const result = buildSectionsSnapshot(sections, projectType)
  const failures = []

  for (let i = 0; i < summarizable.length; i++) {
    const sectionId = summarizable[i]
    try {
      const summarized = await summarizeSection(sectionId, sections[sectionId], { level })
      result[sectionId] = summarized
      onProgress?.(sectionId, summarized, i, total)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failures.push({ sectionId, message })
      onError?.(sectionId, message, i)
      // Mantém versão original em result (já copiada no snapshot)
    }
  }

  if (failures.length > 0) onFailures?.(failures)

  return { sections: result, failures }
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
  if (normalized.includes('inválido') || normalized.includes('vazio') || normalized.includes('invalid')) {
    return 'Conteúdo da secção inválido ou vazio para resumir.'
  }
  if (normalized.includes('function was not found') || normalized.includes('not_found')) {
    return 'Função summarize-tcc-section não encontrada. Faz deploy: supabase functions deploy summarize-tcc-section'
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

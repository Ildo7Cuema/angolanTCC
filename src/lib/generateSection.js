/**
 * Módulo de geração de secções do TCC via Edge Function (Claude).
 *
 * Chama a Edge Function `generate-tcc-section` para gerar uma secção por vez.
 */
import { supabase } from './supabase'
import { invokeEdgeFunction } from './edgeFunctions'

/**
 * Gera uma secção do TCC usando IA.
 *
 * @param {string} sectionId  – ID da secção (ex: 'introducao', 'metodologia')
 * @param {object} projectData – Dados do projecto (title, topic, course, etc.)
 * @returns {Promise<string>}  – Texto gerado pela IA
 */
export async function generateSection(sectionId, projectData) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    throw new Error('Inicia sessão para usar a geração com IA.')
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

  const data = await invokeEdgeFunction(
    'generate-tcc-section',
    { sectionId, projectData },
    token,
    anonKey,
  )

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
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    throw new Error('Inicia sessão para usar a humanização.')
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

  const data = await invokeEdgeFunction(
    'humanize-tcc-content',
    { sectionId, textToHumanize },
    token,
    anonKey,
  )

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
    return 'Modelo da IA indisponível. Verifique o modelo na Edge Function.'
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.'
  }
  if (normalized.includes('overloaded') || normalized.includes('529')) {
    return 'O servidor da IA está sobrecarregado. Tente novamente em alguns minutos.'
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

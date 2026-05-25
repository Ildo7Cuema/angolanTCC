/**
 * Normalização do conteúdo da secção ÍNDICE.
 * Converte tabelas Markdown em lista de texto simples (formato Word clássico).
 */
import { sanitizeAIContent, cleanIndiceTitle } from './sanitizeContent'

function parseTableRow(line) {
  if (!line.trim().startsWith('|')) return null
  if (/^[\s|:\-]+$/.test(line.replace(/[|]/g, ''))) return null

  const cols = line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean)

  if (cols.length === 0) return null
  return cols
}

/**
 * Converte linhas de tabela Markdown (| Secção | Página |) em linhas de índice.
 */
function markdownTableToIndiceLines(tableLines) {
  const out = []
  let skippedHeader = false

  for (const raw of tableLines) {
    const cols = parseTableRow(raw)
    if (!cols) continue

    if (!skippedHeader) {
      skippedHeader = true
      const isHeader = cols.some((c) =>
        /^(secç|seção|capítulo|item|conteúdo|título|p[áa]g|índice)/i.test(c),
      )
      if (isHeader) continue
    }

    let page = ''
    let titleParts = cols
    const last = cols[cols.length - 1]
    if (/^\d{1,4}$/.test(last)) {
      page = last
      titleParts = cols.slice(0, -1)
    }

    // Clean each column part to remove asterisks and bullet markdown formatting
    const titlePartsCleaned = titleParts.map(c => cleanIndiceTitle(c))
    const title = titlePartsCleaned.join(' ').trim()
    if (!title) continue
    out.push(page ? `${title} ${page}` : title)
  }

  return out
}

/**
 * Normaliza o índice gerado pela IA: sem tabelas, sem entidades HTML, uma entrada por linha.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizeIndiceContent(raw) {
  if (!raw || typeof raw !== 'string') return ''

  const text = sanitizeAIContent(raw)
  const lines = text.split('\n').map((l) => l.trim())
  const tableLines = lines.filter((l) => l.startsWith('|'))

  if (tableLines.length >= 2) {
    return markdownTableToIndiceLines(tableLines).join('\n')
  }

  const plain = []
  for (const line of lines) {
    if (!line) continue
    if (/^(ÍNDICE|SUMÁRIO|ÍNDICE\s+GERAL)$/i.test(line)) continue
    if (/^[\s|:\-]+$/.test(line.replace(/[|]/g, ''))) continue
    if (line.startsWith('(')) continue

    // Linha com pipes isolada (tabela incompleta) → junta colunas
    if (line.startsWith('|')) {
      const cols = parseTableRow(line)
      if (cols) {
        const joined = cols.map(c => cleanIndiceTitle(c)).join(' ').trim()
        if (joined) plain.push(joined)
      }
      continue
    }

    const cleanedLine = cleanIndiceTitle(line)
    if (cleanedLine) plain.push(cleanedLine)
  }

  return plain.join('\n')
}

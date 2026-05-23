/**
 * Sanitização de conteúdo gerado pela IA.
 *
 * O modelo Claude por vezes devolve marcação Markdown (## títulos,
 * **negrito**, *itálico*, ---, &nbsp;, etc.) que NÃO deve aparecer no
 * documento final académico. Este módulo:
 *
 *  - Preserva blocos especiais protegidos:
 *      ```chart``` (Chart.js / QuickChart)
 *      ```mermaid``` (mermaid.ink)
 *      Tabelas Markdown (linhas que começam com `|`)
 *      Legendas tipo **Figura 1:** / **Tabela 1:** / **Gráfico 1:**
 *
 *  - Remove ou converte em texto plano:
 *      ## / ### / #### → linhas em MAIÚSCULAS (heading detection-friendly)
 *      **negrito**     → negrito (mantém o texto interno)
 *      *itálico*       → itálico (mantém o texto interno)
 *      __bold__ / _it_ → idem
 *      ---             → linha em branco
 *      &nbsp; / &amp;  → espaço / &
 *      <br> / <br/>    → quebra de linha
 *      Links Markdown  → mantém só o texto visível
 *      Backticks `code`→ mantém o texto interno
 */

const PROTECTED_PLACEHOLDER_PREFIX = '\u0000PROTECTED_BLOCK_'
const PROTECTED_PLACEHOLDER_SUFFIX = '\u0000'

/**
 * Extrai blocos protegidos (chart, mermaid, tabelas, legendas) e
 * substitui-os por placeholders que NÃO serão tocados pela limpeza.
 * Retorna [textoComPlaceholders, listaDeBlocos].
 */
function extractProtectedBlocks(text) {
  const blocks = []
  let result = text

  // 1) Blocos de código fenced ```chart ... ``` e ```mermaid ... ```
  result = result.replace(/```(chart|mermaid)\b[\s\S]*?```/g, (match) => {
    const idx = blocks.length
    blocks.push(match)
    return `${PROTECTED_PLACEHOLDER_PREFIX}${idx}${PROTECTED_PLACEHOLDER_SUFFIX}`
  })

  // 2) Legendas de figura/tabela/gráfico — mantemos o **bold** que o
  //    parser do editor e do exportador esperam encontrar.
  result = result.replace(
    /^\*\*\s*(Figura|Tabela|Gráfico|Quadro|Diagrama)\s*\d+[^\n]*$/gim,
    (match) => {
      const idx = blocks.length
      blocks.push(match)
      return `${PROTECTED_PLACEHOLDER_PREFIX}${idx}${PROTECTED_PLACEHOLDER_SUFFIX}`
    },
  )

  // 3) Linhas de tabela Markdown (começam com `|` e têm pelo menos 1 outro `|`)
  result = result.replace(/^\|[^\n]*\|[^\n]*$/gm, (match) => {
    const idx = blocks.length
    blocks.push(match)
    return `${PROTECTED_PLACEHOLDER_PREFIX}${idx}${PROTECTED_PLACEHOLDER_SUFFIX}`
  })

  return [result, blocks]
}

function restoreProtectedBlocks(text, blocks) {
  return text.replace(
    new RegExp(`${PROTECTED_PLACEHOLDER_PREFIX}(\\d+)${PROTECTED_PLACEHOLDER_SUFFIX}`, 'g'),
    (_, idx) => blocks[parseInt(idx, 10)] ?? '',
  )
}

/**
 * Converte cabeçalhos Markdown (`## Título`) em linhas MAIÚSCULAS,
 * que o detector de heading do exportador (`detectHeading`) reconhece.
 */
function convertMarkdownHeadings(text) {
  return text
    // ## Título -> TÍTULO (capitulo principal)
    .replace(/^#{1,2}\s+(.+?)\s*#*\s*$/gm, (_, title) => title.toUpperCase().trim())
    // ### Subtítulo -> Subtítulo (será tratado como sub-heading se vier numerado)
    .replace(/^#{3,6}\s+(.+?)\s*#*\s*$/gm, (_, title) => title.trim())
}

/**
 * Remove os marcadores Markdown inline (**, __, *, _) mantendo o texto.
 * Cuidado: aplica-se DEPOIS de proteger as legendas que precisam do **.
 */
function stripInlineMarkdown(text) {
  return text
    // Negrito **texto** ou __texto__
    .replace(/\*\*([^\n*][^\n]*?)\*\*/g, '$1')
    .replace(/__([^\n_][^\n]*?)__/g, '$1')
    // Itálico *texto* ou _texto_  (só quando rodeado por espaço/início)
    .replace(/(^|[^\w*])\*([^\s*][^*\n]*?)\*(?=[^\w*]|$)/g, '$1$2')
    .replace(/(^|[^\w_])_([^\s_][^_\n]*?)_(?=[^\w_]|$)/g, '$1$2')
    // Asteriscos residuais (listas *, ênfase solta)
    .replace(/^\*\s+/gm, '• ')
    .replace(/\*/g, '')
    // Riscado ~~texto~~
    .replace(/~~([^\n~]+?)~~/g, '$1')
    // Código inline `texto`
    .replace(/`([^`\n]+?)`/g, '$1')
    // Links Markdown [texto](url) -> texto (url) ou apenas texto
    .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_, label, url) => {
      // Se o url parecer um DOI/URL académico, mantém entre parênteses
      if (/^https?:\/\/|^doi\./i.test(url)) return `${label} (${url})`
      return label
    })
    // Imagens Markdown ![alt](url) -> remove
    .replace(/!\[[^\]]*?\]\([^)]*?\)/g, '')
}

/**
 * Remove separadores horizontais (---, ***, ___) e símbolos diversos
 * que a IA por vezes injecta.
 */
function stripHorizontalRules(text) {
  return text
    .replace(/^\s*([-*_]\s*){3,}\s*$/gm, '')
    // > blockquotes -> texto plano
    .replace(/^>\s?/gm, '')
}

/**
 * Decodifica entidades HTML básicas (&nbsp; &amp; &lt; etc.) e
 * remove tags HTML simples (<br>, <p>, <span>...) que vêm coladas.
 */
function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&hellip;/gi, '…')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&copy;/gi, '©')
    .replace(/&reg;/gi, '®')
    // <br>, <br/>, <br /> -> quebra de linha real
    .replace(/<br\s*\/?>/gi, '\n')
    // Tags HTML simples sem atributos importantes
    .replace(/<\/?(p|div|span|strong|b|i|em|u)(\s[^>]*)?>/gi, '')
    // Backslashes de escape Markdown ( \* \_ \# )
    .replace(/\\([*_#`~\\])/g, '$1')
}

/**
 * Normaliza espaços em branco — colapsa múltiplos espaços em 1
 * (excepto na linha onde há indentação) e múltiplas linhas vazias
 * em apenas 2 (parágrafo).
 */
function collapseWhitespace(text) {
  return text
    // múltiplos espaços (não tabs) -> 1
    .replace(/[ \t]{2,}/g, ' ')
    // mais de 2 linhas em branco consecutivas -> 2
    .replace(/\n{3,}/g, '\n\n')
    // espaços antes da quebra de linha
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/**
 * Pipeline principal — aplica todas as transformações na ordem certa.
 *
 * @param {string} raw  Texto bruto vindo da IA
 * @returns {string}    Texto limpo, pronto para exibição/exportação
 */
export function sanitizeAIContent(raw) {
  if (!raw || typeof raw !== 'string') return ''

  // 1) Proteger blocos especiais (chart, mermaid, tabelas, legendas)
  const [withPlaceholders, blocks] = extractProtectedBlocks(raw)

  // 2) Aplicar transformações de limpeza
  let cleaned = withPlaceholders
  cleaned = decodeHtmlEntities(cleaned)
  cleaned = convertMarkdownHeadings(cleaned)
  cleaned = stripInlineMarkdown(cleaned)
  cleaned = stripHorizontalRules(cleaned)
  cleaned = collapseWhitespace(cleaned)

  // 3) Restaurar os blocos protegidos no sítio onde estavam
  cleaned = restoreProtectedBlocks(cleaned, blocks)

  return cleaned
}

/**
 * Remove TODOS os símbolos de formatação Markdown — versão agressiva
 * para usar quando se quer texto puro (ex: TXT export, copy-to-clipboard).
 */
export function stripAllMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let text = raw
  text = decodeHtmlEntities(text)
  text = text.replace(/```[a-z]*\n?/gi, '')   // remove ``` fences
  text = text.replace(/```/g, '')
  text = convertMarkdownHeadings(text)
  text = stripInlineMarkdown(text)
  text = stripHorizontalRules(text)
  // Remove pipes residuais de tabelas
  text = text.replace(/^\|[^\n]*$/gm, (line) =>
    line.replace(/^\|/, '').replace(/\|$/, '').replace(/\s*\|\s*/g, '   '),
  )
  return collapseWhitespace(text)
}

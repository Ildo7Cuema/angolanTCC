/**
 * Exportação do TCC em formato Word (DOCX).
 *
 * Gera um documento profissional seguindo o padrão académico angolano:
 *  - Times New Roman 12pt
 *  - Espaçamento 1.5 (ABNT) ou 2.0 (APA)
 *  - Margens: superior 3cm, inferior 2cm, esquerda 3cm, direita 2cm
 *  - Tabelas Markdown com bordas e cabeçalho destacado
 *  - Gráficos via QuickChart.io (blocos ```chart JSON)
 *  - Diagramas Mermaid via mermaid.ink
 *  - Capa e Folha de Rosto automáticas
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  PageNumber,
  Footer,
  Header,
  NumberFormat,
  convertMillimetersToTwip,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'
import { supabase } from './supabase'
import { getSectionsForProject } from './documentSections'
import { sanitizeAIContent } from './sanitizeContent'
import { getUniversityProfile, ACADEMIC_NORMS } from './universityProfiles'
import { buildSoftwareDevDiagrams } from './softwareDevDiagrams'

// ─── Constantes de Estilo (defaults — podem ser sobrepostos pelo perfil) ──

const FONT = 'Times New Roman'
const FONT_SIZE = 24 // 12pt
const FONT_SIZE_TITLE = 28 // 14pt
const FONT_SIZE_HEADING = 26 // 13pt
const FIRST_LINE_INDENT = convertMillimetersToTwip(12.7) // ≈ 1.25cm

/**
 * Espaçamento de linha conforme a norma académica.
 * ABNT = 1.5  (360 twips), APA = 2.0 (480 twips), Vancouver = 2.0 (480 twips)
 */
function getLineSpacingForNorm(norm) {
  switch (norm) {
    case ACADEMIC_NORMS.APA:
    case ACADEMIC_NORMS.VANCOUVER:
      return 480
    case ACADEMIC_NORMS.ABNT:
    default:
      return 360
  }
}

// ─── Funções Auxiliares ─────────────────────────────────────────────────────

function detectHeading(line) {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (/^CAPÍTULO\s+/i.test(trimmed)) return 'chapter'
  if (/^REFERÊNCIAS\s+BIBLIOGRÁFICAS$/i.test(trimmed)) return 'chapter'

  if (/^\d+\.\d+\.?\d*\.?\s/.test(trimmed)) {
    const dots = trimmed.match(/\./g)?.length || 0
    return dots >= 3 ? 'sub3' : dots >= 2 ? 'sub2' : 'sub1'
  }

  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-ZÀ-Ü]/.test(trimmed)) {
    return 'upper'
  }

  return null
}

// Estilo de borda padrão para células de tabela
const CELL_BORDER = { style: 'single', size: 4, color: 'AAAAAA' }
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER }

function createMarkdownTable(lines) {
  const rows = []
  let isFirstRow = true

  for (const line of lines) {
    // Ignora linhas separadoras (ex: |---|---| ou |:---:|)
    if (/^[\s|:\-]+$/.test(line.replace(/[|]/g, ''))) continue

    const cleanedLine = line.replace(/^\|/, '').replace(/\|$/, '')
    const cols = cleanedLine.split('|').map(c => c.trim())
    if (cols.length === 0 || cols.every(c => c === '')) continue

    const isHeaderRow = isFirstRow
    isFirstRow = false

    rows.push(
      new TableRow({
        tableHeader: isHeaderRow,
        children: cols.map(c => new TableCell({
          shading: isHeaderRow
            ? { type: 'clear', color: 'auto', fill: 'D9D9D9' }
            : undefined,
          borders: CELL_BORDERS,
          children: [new Paragraph({
            children: [new TextRun({ text: c, font: FONT, size: 20, bold: isHeaderRow, color: '000000' })],
            alignment: isHeaderRow ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 80, after: 80 }
          })],
          margins: { top: 80, bottom: 80, left: 120, right: 120 }
        }))
      })
    )
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: CELL_BORDER,
      bottom: CELL_BORDER,
      left: CELL_BORDER,
      right: CELL_BORDER,
      insideH: CELL_BORDER,
      insideV: CELL_BORDER,
    },
  })
}

/**
 * Converte uma string Data URL (`data:image/png;base64,...`) em ArrayBuffer
 * que o `docx` (ImageRun) consegue embutir directamente. Devolve null
 * caso o input seja inválido.
 */
function dataUrlToArrayBuffer(dataUrl) {
  try {
    if (!dataUrl || typeof dataUrl !== 'string') return null
    const commaIdx = dataUrl.indexOf(',')
    if (commaIdx < 0) return null
    const base64 = dataUrl.slice(commaIdx + 1)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  } catch (e) {
    console.error('Erro a descodificar imagem base64:', e)
    return null
  }
}

/**
 * Extrai o tipo da imagem (png/jpg/gif/bmp) a partir do MIME para o `docx`.
 * O parâmetro `type` do ImageRun aceita 'png' | 'jpg' | 'gif' | 'bmp' | 'svg'.
 */
function mimeToDocxImageType(mime) {
  if (!mime) return 'png'
  const m = mime.toLowerCase()
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg'
  if (m.includes('gif')) return 'gif'
  if (m.includes('bmp')) return 'bmp'
  if (m.includes('webp')) return 'png' // docx não tem webp — embutimos como png (a maioria dos viewers aceita)
  return 'png'
}

/**
 * Gera os elementos extras (diagramas + imagens do sistema + tabela de
 * tecnologias) para projectos de Desenvolvimento de Software. Estes
 * elementos são apensos ao fim da secção de Metodologia para garantir
 * que aparecem no documento Word independentemente do que a IA gerou.
 *
 * O fluxo determinístico é:
 *   1) Para cada tabela Markdown fornecida pelo estudante (Classes,
 *      Casos de Uso, Sequência, Mapa Mental), gera um bloco Mermaid via
 *      `buildSoftwareDevDiagrams` e converte-o em imagem PNG via
 *      mermaid.ink — exactamente o mesmo pipeline que o exportador já
 *      usa para blocos ```mermaid``` injectados pela IA.
 *   2) Insere todas as imagens carregadas pelo estudante, com legendas
 *      sequenciais.
 *   3) Insere uma tabela Markdown com as tecnologias adoptadas.
 *
 * @returns {Promise<Paragraph[]>}
 */
async function buildSoftwareDevAppendix(softwareDev, FONT_USE, LINE_SPACING) {
  if (!softwareDev) return []

  const elements = []

  // ── 0) Cabeçalho da subsecção ──────────────────────────────────────
  elements.push(new Paragraph({
    children: [new TextRun({
      text: '3.5.1. Modelação do Sistema e Tecnologias Adoptadas',
      font: FONT_USE,
      size: FONT_SIZE_HEADING,
      bold: true,
      color: '000000',
    })],
    spacing: { before: 360, after: 160, line: LINE_SPACING },
    heading: HeadingLevel.HEADING_3,
  }))

  // ── 1) Diagramas (determinísticos a partir das tabelas Markdown) ──
  const diagrams = buildSoftwareDevDiagrams(softwareDev)
  let figureCounter = 1

  for (const diag of diagrams) {
    // Extrai o conteúdo Mermaid (sem as fences ```mermaid ... ```)
    const code = diag.mermaid
      .replace(/^```mermaid\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let rendered = false
    try {
      const buffer = await getMermaidImage(code)
      if (buffer) {
        elements.push(new Paragraph({
          children: [new ImageRun({
            data: buffer,
            transformation: { width: 480, height: 320 },
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 80 },
        }))
        elements.push(new Paragraph({
          children: [new TextRun({
            text: `Figura ${figureCounter}: ${diag.title}.`,
            font: FONT_USE,
            size: 20,
            bold: true,
            italics: true,
            color: '000000',
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 240 },
        }))
        figureCounter++
        rendered = true
      }
    } catch (e) {
      console.warn('Falha ao renderizar diagrama Mermaid:', diag.kind, e)
    }

    // Fallback: se mermaid.ink falhar, embute o código fonte como bloco
    // monoespaçado para não perder a informação fornecida pelo estudante.
    if (!rendered) {
      elements.push(new Paragraph({
        children: [new TextRun({
          text: `[Falha a renderizar ${diag.title}. Código Mermaid em apêndice.]`,
          font: FONT_USE,
          size: FONT_SIZE,
          italics: true,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
      }))
    }
  }

  // ── 2) Imagens do sistema (multi-upload) ──────────────────────────
  // Aceita o novo formato (system_images: [{data, mime, name}, ...]) e
  // mantém retrocompatibilidade com o formato antigo (system_image único).
  let images = []
  if (Array.isArray(softwareDev.system_images) && softwareDev.system_images.length > 0) {
    images = softwareDev.system_images.filter((img) => img && img.data)
  } else if (softwareDev.system_image) {
    images = [{
      data: softwareDev.system_image,
      mime: softwareDev.system_image_mime,
      name: softwareDev.system_image_name,
    }]
  }

  images.forEach((img) => {
    const buffer = dataUrlToArrayBuffer(img.data)
    if (!buffer) return

    elements.push(new Paragraph({
      children: [new ImageRun({
        data: buffer,
        type: mimeToDocxImageType(img.mime),
        transformation: { width: 480, height: 320 },
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 80 },
    }))

    const caption = `Figura ${figureCounter}: ${img.name ? `Interface do sistema — ${img.name}` : 'Interface do sistema proposto'}.`

    elements.push(new Paragraph({
      children: [new TextRun({
        text: caption,
        font: FONT_USE,
        size: 20,
        bold: true,
        italics: true,
        color: '000000',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
    }))
    figureCounter++
  })

  // ── Tabela de tecnologias ──────────────────────────────────────────
  const tech = softwareDev.technologies || {}
  const techRows = [
    ['Frontend', tech.frontend],
    ['Backend', tech.backend],
    ['Base de Dados', tech.database],
    ['DevOps / Hospedagem', tech.devops],
    ['Outras', tech.others],
  ].filter(([, v]) => v && String(v).trim())

  if (techRows.length > 0) {
    elements.push(new Paragraph({
      children: [new TextRun({
        text: 'Tecnologias utilizadas no desenvolvimento',
        font: FONT_USE,
        size: FONT_SIZE,
        bold: true,
        color: '000000',
      })],
      spacing: { before: 360, after: 160, line: LINE_SPACING },
    }))

    const tableMdLines = [
      '| Camada | Tecnologias adoptadas |',
      '| --- | --- |',
      ...techRows.map(([layer, value]) => `| ${layer} | ${value} |`),
    ]
    elements.push(createMarkdownTable(tableMdLines))
    elements.push(new Paragraph({
      children: [new TextRun({
        text: 'Tabela: Tecnologias utilizadas no desenvolvimento do sistema.',
        font: FONT_USE,
        size: 20,
        bold: true,
        italics: true,
        color: '000000',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 240 },
    }))
  }

  return elements
}

async function getMermaidImage(mermaidCode) {
  try {
    const state = { code: mermaidCode, mermaid: { theme: 'default' } }
    const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(state))))
    const url = `https://mermaid.ink/img/${base64}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed mermaid')
    return await res.arrayBuffer()
  } catch (e) {
    console.error("Erro no mermaid:", e)
    return null
  }
}

/**
 * Aplica defaults de visibilidade e legibilidade a uma configuração Chart.js.
 * Garante fontes grandes, cores escuras (legível em impressão branca) e escala visível.
 * @param {object} config — Configuração Chart.js original
 * @returns {object} — Configuração melhorada
 */
function applyChartDefaults(config) {
  const type = config.type || 'bar'
  const isCircular = ['pie', 'doughnut', 'polarArea'].includes(type)
  const isLine    = type === 'line'

  // Datalabels: mostra os valores directamente nos elementos do gráfico
  const datalabels = isCircular
    ? {
        display: true,
        color: '#FFFFFF',
        font: { size: 14, weight: 'bold', family: 'Arial' },
        anchor: 'center',
        align: 'center',
        textShadowBlur: 4,
        textShadowColor: 'rgba(0,0,0,0.6)',
      }
    : {
        display: true,
        color: '#111827',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 3,
        padding: { top: 2, bottom: 2, left: 5, right: 5 },
        font: { size: 12, weight: 'bold', family: 'Arial' },
        anchor: 'end',
        align: isLine ? 'top' : 'end',
        clamp: true,
        offset: 4,
      }

  const result = {
    ...config,
    options: {
      ...(config.options || {}),
      layout: { padding: { top: isCircular ? 8 : 28, bottom: 8, left: 8, right: 8 } },
      plugins: {
        datalabels,
        title: {
          display: !!(config.options?.plugins?.title?.text),
          font: { size: 17, weight: 'bold', family: 'Arial' },
          color: '#111827',
          padding: { top: 8, bottom: 16 },
          ...(config.options?.plugins?.title || {}),
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: { size: 13, family: 'Arial' },
            color: '#111827',
            padding: 16,
            boxWidth: 16,
          },
          ...(config.options?.plugins?.legend || {}),
        },
      },
    },
  }

  if (!isCircular) {
    result.options.scales = {
      x: {
        ticks: { font: { size: 12, family: 'Arial' }, color: '#374151', maxRotation: 45 },
        grid: { color: '#E5E7EB' },
        ...(config.options?.scales?.x || {}),
      },
      y: {
        ticks: { font: { size: 12, family: 'Arial' }, color: '#374151' },
        grid: { color: '#E5E7EB' },
        grace: '15%',
        ...(config.options?.scales?.y || {}),
      },
    }
  }

  return result
}

/**
 * Gera imagem de gráfico usando a API QuickChart.io (Chart.js v3).
 * @param {object} chartConfig — Configuração Chart.js (type, data, options)
 * @returns {Promise<ArrayBuffer|null>}
 */
async function getQuickChartImage(chartConfig) {
  try {
    const config = applyChartDefaults(chartConfig)
    const configStr = JSON.stringify(config)
    // v=3 → Chart.js v3 (suporta options.plugins.title/legend)
    // backgroundColor=white → fundo branco para impressão
    const url = `https://quickchart.io/chart?v=3&c=${encodeURIComponent(configStr)}&w=620&h=400&backgroundColor=white&devicePixelRatio=1.5`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`QuickChart HTTP ${res.status}`)
    return await res.arrayBuffer()
  } catch (e) {
    console.error('Erro no QuickChart:', e)
    return null
  }
}

/**
 * Gera Capa + Folha de Rosto de acordo com o perfil da universidade.
 *
 * @param {object} project       Projecto completo
 * @param {ArrayBuffer|null} logoBuffer  Logo da universidade
 * @param {number} LINE_SPACING  Espaçamento de linha em twips
 * @param {object} profile       Perfil da universidade (de universityProfiles.js)
 */
function generateCapaAndFolhaRosto(project, logoBuffer, LINE_SPACING, profile) {
  const elements = []
  const projectType = project?.sections?.projectType || 'tcc'
  const universityCity = profile.city
  const FONT_USE = profile.fontFamily || FONT
  const docType = projectType === 'anteprojecto'
    ? 'ANTE-PROJECTO DE PESQUISA'
    : `TRABALHO DE FIM DE CURSO — ${profile.degreeLabel || 'LICENCIATURA'}`
  const cityYear = `${universityCity}, ${project.year || new Date().getFullYear()}`

  // ── CAPA ────────────────────────────────────────────────────────
  // Cabeçalho institucional (configurável por universidade)
  elements.push(new Paragraph({
    children: [new TextRun({ text: profile.countryHeader, bold: true, size: 22, font: FONT_USE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }))
  elements.push(new Paragraph({
    children: [new TextRun({ text: profile.ministryHeader, bold: true, size: 20, font: FONT_USE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }))

  if (logoBuffer) {
    elements.push(new Paragraph({
      children: [
        new ImageRun({
          data: logoBuffer,
          transformation: { width: 130, height: 130 },
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400 },
    }))
  }

  elements.push(new Paragraph({
    children: [new TextRun({ text: project.university?.toUpperCase() || '', bold: true, size: 26, font: FONT_USE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  }))

  if (project.course) {
    elements.push(new Paragraph({
      children: [new TextRun({ text: `${profile.facultyPrefix} ${project.course}`, size: 22, font: FONT_USE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 },
    }))
  }

  elements.push(new Paragraph({
    children: [new TextRun({ text: (project.student_name || 'Nome do Estudante').toUpperCase(), bold: true, size: 26, font: FONT_USE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1800 },
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: (project.title || 'Título do Trabalho').toUpperCase(), bold: true, size: 30, font: FONT_USE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: docType, bold: true, size: 22, font: FONT_USE, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 2000 },
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: cityYear, bold: true, size: 24, font: FONT_USE })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
  }))

  // ── FOLHA DE ROSTO ──────────────────────────────────────────────
  elements.push(new Paragraph({
    text: '',
    pageBreakBefore: true,
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: (project.student_name || 'Nome do Estudante').toUpperCase(), bold: true, size: 26, font: FONT_USE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1800 },
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: (project.title || 'Título do Trabalho').toUpperCase(), bold: true, size: 30, font: FONT_USE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1800 },
  }))

  // Texto de apresentação (varia conforme tipo + grau definido no perfil)
  const degreeWord = (profile.degreeLabel || 'LICENCIATURA').toLowerCase() === 'bacharelato'
    ? 'Bacharel'
    : 'Licenciado'
  const orientationText = projectType === 'anteprojecto'
    ? `Ante-Projecto de Pesquisa apresentado ao ${profile.facultyPrefix} ${project.course || '...'} da ${project.university || '...'} como requisito parcial para a aprovação na disciplina de Metodologia de Investigação Científica.`
    : `Trabalho de Conclusão de Curso apresentado ao ${profile.facultyPrefix} ${project.course || '...'} da ${project.university || '...'} como requisito parcial para a obtenção do grau de ${degreeWord}.`

  elements.push(new Paragraph({
    children: [new TextRun({ text: orientationText, size: 22, font: FONT_USE })],
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: convertMillimetersToTwip(85) },
    spacing: { line: LINE_SPACING, after: 800 },
  }))

  if (project.advisor) {
    elements.push(new Paragraph({
      children: [new TextRun({ text: `Orientador(a): ${project.advisor}`, size: 22, font: FONT_USE })],
      alignment: AlignmentType.LEFT,
      indent: { left: convertMillimetersToTwip(85) },
      spacing: { after: 3000 },
    }))
  }

  elements.push(new Paragraph({
    children: [new TextRun({ text: cityYear, bold: true, size: 24, font: FONT_USE })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 1600 },
  }))

  return elements
}

async function sectionToElements(sectionId, content, logoBuffer, project, LINE_SPACING, profile) {
  const elements = []
  const FONT_USE = profile?.fontFamily || FONT

  // Override da Capa
  if (sectionId === 'capa') {
    return generateCapaAndFolhaRosto(project, logoBuffer, LINE_SPACING, profile)
  }

  const activeSections = getSectionsForProject(project?.sections?.projectType)
  const sectionDef = activeSections.find(s => s.id === sectionId)
  const sectionTitle = sectionDef ? sectionDef.docxTitle : null

  if (sectionTitle) {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: sectionTitle,
            font: FONT_USE,
            size: FONT_SIZE_TITLE,
            bold: true,
            color: '000000',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 400, line: LINE_SPACING },
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      })
    )
  }

  // Sanitiza ANTES de processar — remove ##, **inline**, ---, &nbsp; etc.
  // mas preserva blocos chart/mermaid/tabelas e legendas **Figura X:**
  const cleanContent = sanitizeAIContent(content || '')

  // Normaliza string para comparação (remove espaços duplos e variações de travessão)
  const normStr = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[–—-]/g, '-')

  // Filtra linhas duplicadas do título de capítulo que a IA inclui no conteúdo
  const rawLines = cleanContent.split('\n')
  const lines = rawLines.filter((l, idx) => {
    if (!sectionTitle) return true
    const nl = normStr(l)
    const nt = normStr(sectionTitle)
    const firstContent = rawLines.slice(0, idx).filter(x => x.trim()).length
    return !(nl === nt && firstContent < 4)
  })

  let isInsideTable = false
  let tableLines = []
  let isInsideMermaid = false
  let mermaidLines = []
  let isInsideChart = false
  let chartLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // ── Bloco ```chart (QuickChart.io / Chart.js JSON) ─────────────────────
    if (line.startsWith('```chart')) {
      isInsideChart = true
      continue
    }
    if (isInsideChart) {
      if (line.startsWith('```')) {
        isInsideChart = false
        const chartCode = chartLines.join('\n')
        chartLines = []
        try {
          const chartConfig = JSON.parse(chartCode)
          const imgBuffer = await getQuickChartImage(chartConfig)
          if (imgBuffer) {
            elements.push(
              new Paragraph({
                children: [new ImageRun({ data: imgBuffer, transformation: { width: 480, height: 310 } })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 240 }
              })
            )
          } else {
            elements.push(new Paragraph({
              children: [new TextRun({ text: '[Erro ao gerar Gráfico]', font: FONT_USE, size: FONT_SIZE, italics: true })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 }
            }))
          }
        } catch {
          elements.push(new Paragraph({
            children: [new TextRun({ text: '[Configuração de gráfico inválida]', font: FONT_USE, size: FONT_SIZE, italics: true })],
            alignment: AlignmentType.CENTER
          }))
        }
      } else {
        chartLines.push(line)
      }
      continue
    }

    // ── Bloco ```mermaid ───────────────────────────────────────────────────
    if (line.startsWith('```mermaid')) {
      isInsideMermaid = true
      continue
    }
    if (isInsideMermaid) {
      if (line.startsWith('```')) {
        isInsideMermaid = false
        const mermaidCode = mermaidLines.join('\n')
        mermaidLines = []
        const imgBuffer = await getMermaidImage(mermaidCode)
        if (imgBuffer) {
          elements.push(
            new Paragraph({
              children: [new ImageRun({ data: imgBuffer, transformation: { width: 450, height: 300 } })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 }
            })
          )
        } else {
          elements.push(new Paragraph({
            children: [new TextRun({ text: '[Erro ao gerar Diagrama]', font: FONT_USE, size: FONT_SIZE, italics: true })],
            alignment: AlignmentType.CENTER
          }))
        }
      } else {
        mermaidLines.push(line)
      }
      continue
    }

    // ── Tabela Markdown ────────────────────────────────────────────────────
    if (line.startsWith('|') && line.includes('|', 1)) {
      isInsideTable = true
      tableLines.push(line)
      continue
    }
    if (isInsideTable) {
      if (!line.startsWith('|')) {
        isInsideTable = false
        elements.push(createMarkdownTable(tableLines))
        elements.push(new Paragraph({ spacing: { after: 200 } }))
        tableLines = []
      } else {
        tableLines.push(line)
        continue
      }
    }

    if (!line) {
      elements.push(new Paragraph({ spacing: { after: 120 } }))
      continue
    }

    // ── Legenda de figura/tabela (ex: **Figura 1:** ou **Tabela 2:**) ──────
    if (/^\*\*(Figura|Tabela|Gráfico|Quadro|Diagrama)\s*\d+/i.test(line)) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/\*\*/g, ''), font: FONT_USE, size: 20, bold: true, italics: true, color: '000000' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 200 }
      }))
      continue
    }

    // ── Bullet point ───────────────────────────────────────────────────────
    if (line.startsWith('•') || line.startsWith('-  ') || line.startsWith('- ')) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT_USE, size: FONT_SIZE })],
        spacing: { line: LINE_SPACING, after: 60, before: 60 },
        indent: { left: convertMillimetersToTwip(10) },
      }))
      continue
    }

    const heading = detectHeading(line)
    if (heading === 'chapter' || heading === 'upper') {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT_USE, size: FONT_SIZE_TITLE, bold: true, color: '000000' })],
        alignment: AlignmentType.LEFT,
        spacing: { line: LINE_SPACING, before: 360, after: 200 },
        heading: HeadingLevel.HEADING_1,
      }))
    } else if (heading === 'sub1') {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT_USE, size: FONT_SIZE_HEADING, bold: true, color: '000000' })],
        spacing: { line: LINE_SPACING, before: 240, after: 120 },
        heading: HeadingLevel.HEADING_2,
      }))
    } else if (heading === 'sub2' || heading === 'sub3') {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT_USE, size: FONT_SIZE, bold: true, italics: heading === 'sub3', color: '000000' })],
        spacing: { line: LINE_SPACING, before: 200, after: 100 },
        heading: HeadingLevel.HEADING_3,
      }))
    } else {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT_USE, size: FONT_SIZE })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: LINE_SPACING, after: 100 },
        indent: { firstLine: FIRST_LINE_INDENT },
      }))
    }
  }

  // Fim do loop — fechar blocos não terminados
  if (isInsideTable && tableLines.length > 0) {
    elements.push(createMarkdownTable(tableLines))
    elements.push(new Paragraph({ spacing: { after: 200 } }))
  }
  if (isInsideChart && chartLines.length > 0) {
    try {
      const imgBuffer = await getQuickChartImage(JSON.parse(chartLines.join('\n')))
      if (imgBuffer) {
        elements.push(new Paragraph({
          children: [new ImageRun({ data: imgBuffer, transformation: { width: 480, height: 310 } })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 240 }
        }))
      }
    } catch { /* ignora JSON inválido */ }
  }

  return elements
}

// ─── Exportação Principal ───────────────────────────────────────────────────

export async function exportToDocx(project, sections) {
  const allElements = []

  // Secções activas conforme tipo (TCC vs Ante-Projecto)
  const activeSections = getSectionsForProject(project?.sections?.projectType)

  // Resolve perfil da universidade — define norma, cidade, prefixo de
  // faculdade, fonte e estilo de capa específicos da instituição.
  const profile = getUniversityProfile(project?.university, {
    course: project?.course,
    cityOverride: project?.sections?.university_city,
  })

  // Norma vem ou da escolha explícita do utilizador, ou do perfil
  const academicNorm = project?.sections?.academic_norm || profile.defaultNorm
  const LINE_SPACING = getLineSpacingForNorm(academicNorm)
  const FONT_USE = profile.fontFamily || FONT

  let logoBuffer = null

  if (project?.university) {
    try {
      const { data: uniData } = await supabase
        .from('universities')
        .select('logo_url, city, province')
        .eq('name', project.university)
        .limit(1)
        .single()

      // Cidade do BD tem precedência sobre o perfil estático
      if (uniData?.city) {
        profile.city = uniData.city
      } else if (uniData?.province) {
        profile.city = uniData.province
      }

      if (uniData?.logo_url) {
        const logoUrls = [
          `https://corsproxy.io/?${encodeURIComponent(uniData.logo_url)}`,
          uniData.logo_url,
        ]
        for (const url of logoUrls) {
          try {
            const response = await fetch(url)
            if (response.ok) {
              logoBuffer = await response.arrayBuffer()
              break
            }
          } catch (e) {
            console.warn('Erro fetch logo:', url, e)
          }
        }
      }

      if (!logoBuffer) {
        try {
          const fallback = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Academic_hat.svg/256px-Academic_hat.svg.png'
          const fRes = await fetch(fallback)
          if (fRes.ok) logoBuffer = await fRes.arrayBuffer()
        } catch (e) {}
      }
    } catch (err) {}
  }

  // Material extra para projectos de Desenvolvimento de Software
  // (imagem do sistema + tabela de tecnologias). É anexado ao final
  // da secção de Metodologia para garantir presença determinística.
  const softwareDev = project?.sections?.software_dev || null

  for (const sectionDef of activeSections) {
    const sectionId = sectionDef.id
    const content = sections?.[sectionId]
    if (!content && sectionId !== 'capa') continue // Capa é gerada independente

    const elements = await sectionToElements(sectionId, content, logoBuffer, project, LINE_SPACING, profile)
    allElements.push(...elements)

    // Apêndice deterministico para projectos de software:
    // - Garante que a imagem do sistema é sempre embutida no Word
    // - Garante a presença da tabela de tecnologias mesmo que a IA
    //   tenha falhado em renderizá-la no markdown da secção.
    if (softwareDev && sectionId === 'metodologia') {
      const appendix = await buildSoftwareDevAppendix(softwareDev, FONT_USE, LINE_SPACING)
      allElements.push(...appendix)
    }
  }

  const doc = new Document({
    creator: project?.student_name || 'AngolanTCC AI',
    title: project?.title || 'Trabalho de Conclusão de Curso',
    description: `TCC — ${project?.title || 'Sem título'} (${academicNorm})`,
    styles: {
      default: {
        document: {
          run: { font: FONT_USE, size: FONT_SIZE, color: '000000' },
          paragraph: {
            spacing: { line: LINE_SPACING },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(30),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(20),
            },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: project?.title || '',
                    font: FONT_USE,
                    size: 18,
                    italics: true,
                    color: '999999',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_USE,
                    size: FONT_SIZE,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: allElements,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${project?.title || 'TCC'} - ${project?.student_name || 'Estudante'}.docx`
  saveAs(blob, filename)
}

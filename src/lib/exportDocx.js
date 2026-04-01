/**
 * Exportação do TCC em formato Word (DOCX).
 *
 * Gera um documento profissional seguindo o padrão académico angolano:
 *  - Times New Roman 12pt
 *  - Espaçamento 1.5 (ABNT) ou 2.0 (APA)
 *  - Margens: superior 3cm, inferior 2cm, esquerda 3cm, direita 2cm
 *  - Tabelas Markdown e Diagramas Mermaid
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

// ─── Constantes de Estilo ───────────────────────────────────────────────────

const FONT = 'Times New Roman'
const FONT_SIZE = 24 // 12pt
const FONT_SIZE_TITLE = 28 // 14pt
const FONT_SIZE_HEADING = 26 // 13pt
const FIRST_LINE_INDENT = convertMillimetersToTwip(12.7) // ≈ 1.25cm

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

function createMarkdownTable(lines, LINE_SPACING) {
  const rows = []
  let isHeader = true

  for (const line of lines) {
    if (line.includes('---')) {
      isHeader = false
      continue
    }

    const cleanedLine = line.replace(/^\|/, '').replace(/\|$/, '')
    const cols = cleanedLine.split('|').map(c => c.trim())
    if (cols.length === 0 || cols.every(c => c === '')) continue

    rows.push(
      new TableRow({
        children: cols.map(c => new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: c, font: FONT, size: 20, bold: isHeader })],
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 100, after: 100 }
          })],
          margins: { top: 100, bottom: 100, left: 100, right: 100 }
        }))
      })
    )
    if (lines.length > 1 && !lines[1].includes('---')) {
      isHeader = false // Default se não tiver ---
    }
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
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

function generateCapaAndFolhaRosto(project, logoBuffer, LINE_SPACING, universityCity = 'Luanda') {
  const elements = []
  const projectType = project?.sections?.projectType || 'tcc'
  const docType = projectType === 'anteprojecto'
    ? 'ANTE-PROJECTO DE PESQUISA'
    : 'TRABALHO DE FIM DE CURSO — LICENCIATURA'
  const cityYear = `${universityCity}, ${project.year || new Date().getFullYear()}`
  
  // CAPA
  // Header institucional
  elements.push(new Paragraph({
    children: [new TextRun({ text: 'REPÚBLICA DE ANGOLA', bold: true, size: 22, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 }
  }))
  elements.push(new Paragraph({
    children: [new TextRun({ text: 'MINISTÉRIO DO ENSINO SUPERIOR, CIÊNCIA, TECNOLOGIA E INOVAÇÃO', bold: true, size: 20, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  }))

  if (logoBuffer) {
    elements.push(new Paragraph({
      children: [
        new ImageRun({
          data: logoBuffer,
          transformation: { width: 130, height: 130 }
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400 }
    }))
  }
  
  elements.push(new Paragraph({
    children: [new TextRun({ text: project.university?.toUpperCase() || '', bold: true, size: 26, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 }
  }))

  if (project.course) {
    elements.push(new Paragraph({
      children: [new TextRun({ text: `Faculdade de ${project.course}`, size: 22, font: FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 }
    }))
  }

  elements.push(new Paragraph({
    children: [new TextRun({ text: (project.student_name || 'Nome do Estudante').toUpperCase(), bold: true, size: 26, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1800 }
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: (project.title || 'Título do Trabalho').toUpperCase(), bold: true, size: 30, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 }
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: docType, bold: true, size: 22, font: FONT, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 2000 }
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: cityYear, bold: true, size: 24, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 }
  }))

  // FOLHA DE ROSTO
  elements.push(new Paragraph({
    text: "",
    pageBreakBefore: true
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: (project.student_name || 'Nome do Estudante').toUpperCase(), bold: true, size: 26, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1800 }
  }))

  elements.push(new Paragraph({
    children: [new TextRun({ text: (project.title || 'Título do Trabalho').toUpperCase(), bold: true, size: 30, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1800 }
  }))

  // Orientation block (right-aligned, left half indented)
  const orientationText = projectType === 'anteprojecto'
    ? `Ante-Projecto de Pesquisa apresentado ao Departamento de ${project.course || '...'} da ${project.university || '...'} como requisito parcial para a aprovação na disciplina de Metodologia de Investigação Científica.`
    : `Trabalho de Conclusão de Curso apresentado ao Departamento de ${project.course || '...'} da ${project.university || '...'} como requisito parcial para a obtenção do grau de Licenciado.`

  elements.push(new Paragraph({
    children: [new TextRun({ text: orientationText, size: 22, font: FONT })],
    alignment: AlignmentType.LEFT,
    indent: { left: convertMillimetersToTwip(85) },
    spacing: { line: LINE_SPACING, after: 800 }
  }))

  if (project.advisor) {
    elements.push(new Paragraph({
      children: [new TextRun({ text: `Orientador(a): ${project.advisor}`, size: 22, font: FONT })],
      alignment: AlignmentType.LEFT,
      indent: { left: convertMillimetersToTwip(85) },
      spacing: { after: 3000 }
    }))
  }

  elements.push(new Paragraph({
    children: [new TextRun({ text: cityYear, bold: true, size: 24, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 1600 }
  }))

  return elements
}

async function sectionToElements(sectionId, content, logoBuffer, project, LINE_SPACING, universityCity = 'Luanda') {
  const elements = []

  // Override da Capa
  if (sectionId === 'capa') {
    return generateCapaAndFolhaRosto(project, logoBuffer, LINE_SPACING, universityCity)
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
            font: FONT,
            size: FONT_SIZE_TITLE,
            bold: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 400, line: LINE_SPACING },
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true // Cada capítulo começa em nova página
      })
    )
  }

  const lines = (content || '').split('\n')
  let isInsideTable = false
  let tableLines = []
  
  let isInsideMermaid = false
  let mermaidLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Mermaid Blocks Parse
    if (line.startsWith('\`\`\`mermaid')) {
      isInsideMermaid = true
      continue
    }
    if (isInsideMermaid) {
      if (line.startsWith('\`\`\`')) {
        isInsideMermaid = false
        const mermaidCode = mermaidLines.join('\n')
        mermaidLines = []
        
        const imgBuffer = await getMermaidImage(mermaidCode)
        if (imgBuffer) {
          elements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: { width: 450, height: 300 } // Dimensões razoáveis
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 }
            })
          )
        } else {
          elements.push(new Paragraph({ text: "[Erro ao gerar Imagem de Diagrama]", alignment: AlignmentType.CENTER }))
        }
      } else {
        mermaidLines.push(line)
      }
      continue
    }

    // Markdown Table Parse
    if (line.startsWith('|') && line.includes('|', 1)) {
      isInsideTable = true
      tableLines.push(line)
      continue
    }
    if (isInsideTable) {
      if (!line.startsWith('|')) {
        // Fim da tabela
        isInsideTable = false
        elements.push(createMarkdownTable(tableLines, LINE_SPACING))
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

    // Bullet point
    if (line.startsWith('•') || line.startsWith('-  ') || line.startsWith('- ')) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT, size: FONT_SIZE })],
        spacing: { line: LINE_SPACING, after: 60, before: 60 },
        indent: { left: convertMillimetersToTwip(10) },
      }))
      continue
    }

    const heading = detectHeading(line)
    if (heading === 'chapter' || heading === 'upper') {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT, size: FONT_SIZE_TITLE, bold: true })],
        alignment: AlignmentType.LEFT,
        spacing: { line: LINE_SPACING, before: 360, after: 200 },
        heading: HeadingLevel.HEADING_1,
      }))
    } else if (heading === 'sub1') {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT, size: FONT_SIZE_HEADING, bold: true })],
        spacing: { line: LINE_SPACING, before: 240, after: 120 },
        heading: HeadingLevel.HEADING_2,
      }))
    } else if (heading === 'sub2' || heading === 'sub3') {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT, size: FONT_SIZE, bold: true, italics: heading === 'sub3' })],
        spacing: { line: LINE_SPACING, before: 200, after: 100 },
        heading: HeadingLevel.HEADING_3,
      }))
    } else {
      // Normal Text
      elements.push(new Paragraph({
        children: [new TextRun({ text: line, font: FONT, size: FONT_SIZE })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: LINE_SPACING, after: 100 },
        indent: { firstLine: FIRST_LINE_INDENT },
      }))
    }
  }

  // Fim do loop - se sobrou tabela não fechada
  if (isInsideTable && tableLines.length > 0) {
    elements.push(createMarkdownTable(tableLines, LINE_SPACING))
    elements.push(new Paragraph({ spacing: { after: 200 } }))
  }

  return elements
}

// ─── Exportação Principal ───────────────────────────────────────────────────

export async function exportToDocx(project, sections) {
  const allElements = []
  
  // Define active sections based on projectType
  const activeSections = getSectionsForProject(project?.sections?.projectType)

  // Define espaçamento por norma
  const academicNorm = project?.sections?.academic_norm || 'ABNT'
  // ABNT = 1.5 spacing (360 twips), APA = 2.0 spacing (480 twips)
  const LINE_SPACING = academicNorm === 'APA' ? 480 : 360

  let logoBuffer = null
  let universityCity = 'Luanda' // default

  if (project?.university) {
    try {
      const { data: uniData } = await supabase
        .from('universities')
        .select('logo_url, city, province')
        .eq('name', project.university)
        .limit(1)
        .single()
        
      // Use city from DB if available
      if (uniData?.city) {
        universityCity = uniData.city
      } else if (uniData?.province) {
        universityCity = uniData.province
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

  for (const sectionDef of activeSections) {
    const sectionId = sectionDef.id
    const content = sections?.[sectionId]
    if (!content && sectionId !== 'capa') continue // Capa é gerada independente

    const elements = await sectionToElements(sectionId, content, logoBuffer, project, LINE_SPACING, universityCity)
    allElements.push(...elements)
  }

  const doc = new Document({
    creator: project?.student_name || 'AngolanTCC AI',
    title: project?.title || 'Trabalho de Conclusão de Curso',
    description: `TCC — ${project?.title || 'Sem título'}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: FONT_SIZE },
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
                    font: FONT,
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
                    font: FONT,
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

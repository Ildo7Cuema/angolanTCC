/**
 * Conversores determinísticos de tabelas Markdown → blocos Mermaid.
 *
 * Estes parsers garantem que, sempre que o estudante preenche uma das
 * tabelas no formulário "Detalhes do software a desenvolver", o diagrama
 * correspondente é embutido no documento Word — sem depender da IA.
 *
 * Os blocos devolvidos seguem a sintaxe que o pipeline existente
 * (`exportDocx.js → getMermaidImage()`) já sabe renderizar via
 * `mermaid.ink`.
 *
 * Conversores disponíveis:
 *   - markdownToClassDiagram(md)     → classDiagram
 *   - markdownToUseCaseDiagram(md)   → flowchart (simula um Use Case UML)
 *   - markdownToSequenceDiagram(md)  → sequenceDiagram
 *   - markdownToMindMap(md)          → mindmap
 */

// ─── Helpers genéricos ──────────────────────────────────────────────────

/**
 * Faz parsing de uma tabela Markdown clássica em linhas de objectos.
 * Aceita variações: pipes inicial/final ausentes, espaços, etc.
 * Retorna { headers: string[], rows: string[][] } ou null se inválida.
 */
function parseMarkdownTable(md) {
  if (!md || typeof md !== 'string') return null

  const lines = md
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Mantém apenas linhas com pipe (ignora explicações soltas).
  const tableLines = lines.filter((l) => l.includes('|'))
  if (tableLines.length < 2) return null

  const splitRow = (line) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())

  // Detecta e descarta a linha separadora (`|---|---|`).
  const cleaned = tableLines.filter(
    (l) => !/^[\s|:\-]+$/.test(l.replace(/[|]/g, ''))
  )
  if (cleaned.length < 2) return null

  const headers = splitRow(cleaned[0]).map((h) => h.toLowerCase())
  const rows = cleaned
    .slice(1)
    .map(splitRow)
    .filter((r) => r.some((c) => c.length > 0))

  return { headers, rows }
}

/**
 * Devolve o índice da coluna cujo header corresponde a qualquer alias.
 *
 * Usa correspondência por PALAVRA INTEIRA (ignorando acentos e capitalização)
 * para evitar falsos positivos — por exemplo, o alias "to" não deve casar
 * com o header "actor" só porque "actor" contém a substring "to".
 *
 * Aceita também aliases multi-palavra (ex: "caso de uso"): o header é
 * comparado com a string completa normalizada.
 */
function findColumn(headers, aliases) {
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]+/g, ' ')
      .trim()

  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  for (const alias of aliases) {
    const target = norm(alias)
    if (!target) continue
    const idx = headers.findIndex((h) => {
      const nh = norm(h)
      if (nh === target) return true
      if (target.includes(' ')) return nh.includes(target)
      // Aliases de uma palavra: a palavra do header deve COMEÇAR pelo
      // alias — assim "atributo" casa com "atributos" mas "to" não casa
      // com "actor" (palavra do header não começa por "to").
      const re = new RegExp(`(^|\\s)${escape(target)}\\w*(\\s|$)`)
      return re.test(nh)
    })
    if (idx >= 0) return idx
  }
  return -1
}

/**
 * Limpa um identificador para uso seguro em Mermaid (sem espaços, acentos,
 * pontuação) — usado para IDs de nós; o label visível pode manter acentos.
 */
function safeId(text, fallback = 'N') {
  const cleaned = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned || fallback
}

/**
 * Escapa caracteres problemáticos em labels Mermaid (aspas/quebras).
 */
function safeLabel(text) {
  return String(text || '')
    .replace(/"/g, "'")
    .replace(/\n/g, ' ')
    .trim()
}

// ─── 1) Diagrama de Classes ─────────────────────────────────────────────

/**
 * Converte uma tabela Markdown de classes em `classDiagram` Mermaid.
 *
 * Colunas reconhecidas (em qualquer ordem, qualquer alias):
 *   - "Classe"      ← nome da classe (obrigatório)
 *   - "Atributos"   ← lista separada por vírgula (opcional)
 *   - "Métodos"     ← lista separada por vírgula (opcional)
 *   - "Relação"     ← ex: "1..* Pedido", "herda de Pessoa", "1..1 Carrinho"
 *
 * @param {string} md
 * @returns {string|null} Bloco Mermaid completo ou null se a tabela for inválida.
 */
export function markdownToClassDiagram(md) {
  const parsed = parseMarkdownTable(md)
  if (!parsed || parsed.rows.length === 0) return null
  const { headers, rows } = parsed

  const colClass = findColumn(headers, ['classe', 'class', 'entidade'])
  if (colClass < 0) return null
  const colAttrs = findColumn(headers, ['atributo', 'attribute', 'campo', 'property'])
  const colMethods = findColumn(headers, ['metodo', 'método', 'method', 'operacao', 'operação', 'function'])
  const colRel = findColumn(headers, ['relacao', 'relação', 'relation', 'relationship', 'ligacao', 'ligação'])

  const declared = new Set()
  const declarations = []
  const relations = []

  for (const row of rows) {
    const className = (row[colClass] || '').trim()
    if (!className) continue
    const classId = safeId(className, 'Class')
    declared.add(classId)

    const attrItems = colAttrs >= 0
      ? (row[colAttrs] || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : []
    const methodItems = colMethods >= 0
      ? (row[colMethods] || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : []

    if (attrItems.length === 0 && methodItems.length === 0) {
      declarations.push(`    class ${classId}`)
    } else {
      const lines = [`    class ${classId} {`]
      for (const a of attrItems) lines.push(`        +${safeLabel(a)}`)
      for (const m of methodItems) {
        const formatted = /\(.*\)$/.test(m) ? m : `${m}()`
        lines.push(`        +${safeLabel(formatted)}`)
      }
      lines.push('    }')
      declarations.push(lines.join('\n'))
    }

    // Parse coluna de relação: extrai multiplicidade + classe alvo.
    if (colRel >= 0) {
      const relText = (row[colRel] || '').trim()
      if (relText && !/^\(?raiz\)?$/i.test(relText) && !/^[-—–]+$/.test(relText)) {
        // Heurística — extrai multiplicidade (ex: 1..1, 1..*, 0..1, *).
        // A ordem importa: tenta as formas mais específicas primeiro.
        const multRe = /(\d+\.\.\d+|\d+\.\.\*|0\.\.1|1\.\.\*|\*)/
        const multMatch = relText.match(multRe)
        const targetRaw = relText
          .replace(/\b(herda de|extends|inherits from|relaciona com|associada a|composta de|com)\b/gi, '')
          .replace(multRe, '')
          .trim()
        const isInheritance = /\b(herda|extends|inherit)\b/i.test(relText)
        if (targetRaw) {
          const targetId = safeId(targetRaw, 'Target')
          if (isInheritance) {
            relations.push(`    ${targetId} <|-- ${classId}`)
          } else if (multMatch) {
            relations.push(`    ${classId} "1" --> "${multMatch[1]}" ${targetId}`)
          } else {
            relations.push(`    ${classId} --> ${targetId}`)
          }
        }
      }
    }
  }

  if (declarations.length === 0) return null

  // Declara classes alvo de relações que não foram explicitamente listadas.
  const extraDecls = []
  for (const rel of relations) {
    const ids = rel.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []
    for (const id of ids) {
      if (!declared.has(id) && id !== 'class') {
        declared.add(id)
        extraDecls.push(`    class ${id}`)
      }
    }
  }

  return [
    '```mermaid',
    'classDiagram',
    'direction LR',
    ...declarations,
    ...extraDecls,
    ...relations,
    '```',
  ].join('\n')
}

// ─── 2) Diagrama de Casos de Uso ────────────────────────────────────────

/**
 * Converte uma tabela Markdown de casos de uso num diagrama Mermaid.
 *
 * Como o Mermaid não suporta nativamente UML Use Case, simulamos com um
 * `flowchart LR` onde os actores são círculos e os casos de uso são
 * rectângulos arredondados — visualmente semelhante a um diagrama UML.
 *
 * Colunas reconhecidas:
 *   - "Actor" / "Ator"          (obrigatório)
 *   - "Caso de Uso" / "Use Case" / "Acção" / "Função" (obrigatório)
 *   - "Descrição" (opcional, ignorada)
 *
 * @param {string} md
 * @returns {string|null}
 */
export function markdownToUseCaseDiagram(md) {
  const parsed = parseMarkdownTable(md)
  if (!parsed || parsed.rows.length === 0) return null
  const { headers, rows } = parsed

  const colActor = findColumn(headers, ['actor', 'ator', 'usuario', 'utilizador', 'user'])
  const colUC = findColumn(headers, [
    'caso de uso', 'use case', 'caso', 'funcionalidade', 'acao', 'acção', 'função', 'funcao',
  ])
  if (colActor < 0 || colUC < 0) return null

  const actors = new Map() // name → id
  const useCases = new Map() // name → id
  const links = []

  for (const row of rows) {
    const actorName = (row[colActor] || '').trim()
    const ucName = (row[colUC] || '').trim()
    if (!actorName || !ucName) continue

    if (!actors.has(actorName)) {
      actors.set(actorName, `A${actors.size + 1}`)
    }
    if (!useCases.has(ucName)) {
      useCases.set(ucName, `UC${useCases.size + 1}`)
    }
    links.push(`    ${actors.get(actorName)} --- ${useCases.get(ucName)}`)
  }

  if (links.length === 0) return null

  const lines = ['```mermaid', 'flowchart LR']

  // Subgrupo para Sistema (caixa que rodeia os casos de uso) — estética UML.
  lines.push('    subgraph SISTEMA["Sistema"]')
  for (const [name, id] of useCases) {
    lines.push(`        ${id}(["${safeLabel(name)}"])`)
  }
  lines.push('    end')

  for (const [name, id] of actors) {
    lines.push(`    ${id}(("${safeLabel(name)}"))`)
  }

  lines.push(...links)
  lines.push('```')

  return lines.join('\n')
}

// ─── 3) Diagrama de Sequência ───────────────────────────────────────────

/**
 * Converte uma tabela Markdown de sequência num `sequenceDiagram` Mermaid.
 *
 * Colunas reconhecidas (flexível):
 *   - "Passo" (opcional, só para ordenação)
 *   - "Actor"/"De"/"Origem" (quem envia)
 *   - "Acção"/"Mensagem"/"Operação" (texto da mensagem)
 *   - "Sistema responde"/"Para"/"Destino"/"Resposta" (quem recebe / resposta)
 *
 * Formato esperado: actor envia "Acção" para o sistema; o sistema responde
 * (linha seguinte ou coluna de resposta).
 *
 * @param {string} md
 * @returns {string|null}
 */
export function markdownToSequenceDiagram(md) {
  const parsed = parseMarkdownTable(md)
  if (!parsed || parsed.rows.length === 0) return null
  const { headers, rows } = parsed

  const colActor = findColumn(headers, ['actor', 'ator', 'de', 'origem', 'from', 'emissor'])
  const colAction = findColumn(headers, ['acao', 'acção', 'action', 'mensagem', 'message', 'operacao', 'operação'])

  // Distingue duas semânticas para a coluna de resposta:
  //  - colDestination → nome do destinatário (ex: "Para", "Destino", "To")
  //  - colResponseMsg → texto da resposta do sistema (ex: "Sistema responde", "Resposta")
  const colDestination = findColumn(headers, ['para', 'destino', 'to', 'receiver', 'destinatario', 'destinatário'])
  const colResponseMsg = findColumn(headers, ['sistema responde', 'responde', 'resposta', 'response', 'retorno', 'sistema'])

  if (colActor < 0 || colAction < 0) return null

  const participants = new Map() // id → label (preserva ordem)
  const exchanges = []

  const registerParticipant = (label) => {
    const id = safeId(label, 'P')
    if (!participants.has(id)) participants.set(id, safeLabel(label))
    return id
  }

  for (const row of rows) {
    const actor = (row[colActor] || '').trim()
    const action = (row[colAction] || '').trim()
    if (!actor || !action) continue

    const destinationRaw = colDestination >= 0 ? (row[colDestination] || '').trim() : ''
    const responseMsg = colResponseMsg >= 0 ? (row[colResponseMsg] || '').trim() : ''
    const target = destinationRaw || 'Sistema'

    const actorId = registerParticipant(actor)
    const targetId = registerParticipant(target)

    exchanges.push(`    ${actorId}->>${targetId}: ${safeLabel(action)}`)
    if (responseMsg && responseMsg !== '-' && responseMsg !== '—') {
      exchanges.push(`    ${targetId}-->>${actorId}: ${safeLabel(responseMsg)}`)
    }
  }

  if (exchanges.length === 0) return null

  const participantLines = Array.from(participants.entries()).map(
    ([id, label]) => `    participant ${id} as ${label}`,
  )

  return [
    '```mermaid',
    'sequenceDiagram',
    'autonumber',
    ...participantLines,
    ...exchanges,
    '```',
  ].join('\n')
}

// ─── 4) Mapa Mental ─────────────────────────────────────────────────────

/**
 * Converte uma tabela Markdown hierárquica num `mindmap` Mermaid.
 *
 * Colunas reconhecidas:
 *   - "Nível"  (1, 2, 3…) – opcional mas recomendado
 *   - "Nó"      – nome do nó (obrigatório)
 *   - "Pai"     – nome do nó pai (opcional; "(raiz)" ou vazio = raiz)
 *
 * Se a coluna "Pai" estiver presente, a hierarquia é construída por ela.
 * Caso contrário, é usada a coluna "Nível" (indentação por profundidade).
 *
 * @param {string} md
 * @returns {string|null}
 */
export function markdownToMindMap(md) {
  const parsed = parseMarkdownTable(md)
  if (!parsed || parsed.rows.length === 0) return null
  const { headers, rows } = parsed

  const colNode = findColumn(headers, ['no', 'nó', 'node', 'topico', 'tópico', 'tema'])
  if (colNode < 0) return null
  const colParent = findColumn(headers, ['pai', 'parent', 'origem', 'de'])
  const colLevel = findColumn(headers, ['nivel', 'nível', 'level', 'profundidade'])

  // Constrói um mapa parent → children
  const childrenOf = new Map()
  const items = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const node = (row[colNode] || '').trim()
    if (!node) continue
    const parent = colParent >= 0 ? (row[colParent] || '').trim() : ''
    const level = colLevel >= 0 ? parseInt((row[colLevel] || '0'), 10) || 0 : 0
    const isRoot = !parent || /^\(?\s*raiz\s*\)?$/i.test(parent) || /^[-—–]+$/.test(parent) || level === 1
    items.push({ node, parent: isRoot ? null : parent, level })
  }

  if (items.length === 0) return null

  // Identifica raiz: o primeiro item sem pai (ou o primeiro tout court).
  const rootItem = items.find((it) => it.parent === null) || items[0]
  const rootName = rootItem.node

  for (const item of items) {
    if (item === rootItem) continue
    const parentKey = item.parent || rootName
    if (!childrenOf.has(parentKey)) childrenOf.set(parentKey, [])
    childrenOf.get(parentKey).push(item.node)
  }

  // Constrói o mindmap recursivamente por indentação (2 espaços por nível).
  const lines = ['```mermaid', 'mindmap', `  root((${safeLabel(rootName)}))`]
  const visited = new Set()
  const walk = (parentName, depth) => {
    const kids = childrenOf.get(parentName) || []
    for (const kid of kids) {
      if (visited.has(kid)) continue
      visited.add(kid)
      const indent = '  '.repeat(depth + 2)
      lines.push(`${indent}${safeLabel(kid)}`)
      walk(kid, depth + 1)
    }
  }
  walk(rootName, 0)

  // Se houver nós cujo parent não foi reconhecido (typo, referência ausente),
  // anexa-os à raiz para não os perder.
  for (const item of items) {
    if (item === rootItem || visited.has(item.node)) continue
    lines.push(`    ${safeLabel(item.node)}`)
    visited.add(item.node)
  }

  lines.push('```')
  return lines.join('\n')
}

// ─── API agregada ───────────────────────────────────────────────────────

/**
 * Recebe o objecto `software_dev` (de `project.sections.software_dev`) e
 * devolve uma lista ordenada de diagramas prontos para inserir no Word.
 *
 * Cada item: { kind, title, mermaid }.
 *
 * @param {object} softwareDev
 * @returns {Array<{kind:string, title:string, mermaid:string}>}
 */
export function buildSoftwareDevDiagrams(softwareDev) {
  if (!softwareDev) return []
  const out = []

  if (softwareDev.class_table_md) {
    const m = markdownToClassDiagram(softwareDev.class_table_md)
    if (m) out.push({ kind: 'class', title: 'Diagrama de Classes do sistema', mermaid: m })
  }
  if (softwareDev.use_case_table_md) {
    const m = markdownToUseCaseDiagram(softwareDev.use_case_table_md)
    if (m) out.push({ kind: 'useCase', title: 'Diagrama de Casos de Uso do sistema', mermaid: m })
  }
  if (softwareDev.sequence_table_md) {
    const m = markdownToSequenceDiagram(softwareDev.sequence_table_md)
    if (m) out.push({ kind: 'sequence', title: 'Diagrama de Sequência da operação principal', mermaid: m })
  }
  if (softwareDev.mind_map_md) {
    const m = markdownToMindMap(softwareDev.mind_map_md)
    if (m) out.push({ kind: 'mindMap', title: 'Mapa Mental dos módulos do sistema', mermaid: m })
  }

  return out
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ──────────────────────────────────────────────────────────────────────────
   Prompts do sistema — especialista académico angolano
   ────────────────────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `Você é um especialista académico com mais de 15 anos de experiência na orientação de Trabalhos de Conclusão de Curso (TCC), Monografias e Teses em universidades angolanas.

REGRAS OBRIGATÓRIAS:
1. Escreva SEMPRE na variante angolana e DESCARTANDO TOTALMENTE o Novo Acordo Ortográfico da Língua Portuguesa (escreva na norma pré-Acordo). Exemplo: "objectivo", "projecto", "arquitectura", "acção", "direcção".
2. Use linguagem formal, científica e académica — NUNCA informal.
3. Nunca use "você" — use formas como "o estudante", "o investigador", "o autor", "o presente estudo".
4. Gere conteúdo ORIGINAL, aprofundado e com rigor científico.
5. Evite repetições e conteúdo superficial ou genérico.
6. Mantenha consistência terminológica ao longo de todo o texto.
7. Use conectores lógicos entre parágrafos para garantir coesão.
8. Cite autores reais e reconhecidos na área (quando aplicável). É ESTRITAMENTE PROIBIDO inventar ou alucinar referências bibliográficas, autores ou citações que não existam.
9. O conteúdo deve parecer escrito por um estudante avançado com orientação de um professor experiente.
10. Adapte a profundidade da secção ao limite máximo de páginas definido para o projecto global.
11. NÃO inclua instruções, notas ao utilizador, ou placeholders como "[inserir dados]".
12. Gere o texto COMPLETO e pronto para uso académico.`;

/* ──────────────────────────────────────────────────────────────────────────
   Instruções específicas por secção
   ────────────────────────────────────────────────────────────────────────── */

function buildSectionPrompt(
  sectionId: string,
  projectData: Record<string, string>
): string {
  const title = projectData.title || "Título do TCC";
  const topic = projectData.topic || projectData.title || "Tema do TCC";
  const university = projectData.university || "Universidade";
  const course = projectData.course || "Curso";
  const studentName = projectData.student_name || "Nome do Estudante";
  const advisor = projectData.advisor || "";
  const year = projectData.year || new Date().getFullYear().toString();
  const problemStatement =
    projectData.problem_statement ||
    `Qual é o impacto e a relevância de "${topic}" no contexto angolano actual?`;
  const methodology = projectData.methodology || "";

  const academicNorm = projectData?.sections?.academic_norm || "ABNT";
  const dbStructure = projectData?.sections?.db_structure || "";
  const projectType = projectData?.sections?.projectType || "tcc";

  const methodologyDesc: Record<string, string> = {
    qualitativa:
      "qualitativa, privilegiando a análise interpretativa dos dados recolhidos",
    quantitativa:
      "quantitativa, baseando-se na análise estatística dos dados numéricos",
    mista:
      "mista (quali-quantitativa), combinando abordagens qualitativas e quantitativas",
    bibliografica:
      "bibliográfica, fundamentada na revisão sistemática da literatura existente",
    estudo_caso:
      "de estudo de caso, analisando em profundidade o contexto específico da investigação",
  };
  const methDesc =
    methodologyDesc[methodology] ||
    "científica, seguindo os padrões académicos reconhecidos";

  const maxPagesNum = parseInt(projectData.max_pages || "80", 10);
  const totalExpectedWords = maxPagesNum * 250; // ≈250 palavras/página
  
  const sectionWeights: Record<string, number> = {
    introducao: 0.15,
    revisao_literatura: 0.35,
    metodologia: 0.15,
    resultados: 0.20,
    conclusao: 0.10,
  };
  const expectedWords = Math.round(totalExpectedWords * (sectionWeights[sectionId] || 0.05));

  const context = `
DADOS DO PROJECTO:
- Título: "${title}"
- Tema/Descrição: "${topic}"
- Problema de Investigação: "${problemStatement}"
- Universidade: ${university}
- Curso: ${course}
- Estudante: ${studentName}
- Orientador: ${advisor || "(não especificado)"}
- Metodologia: ${methDesc}
- Ano: ${year}
- Norma Académica: ${academicNorm}
- Tipo de Documento: ${projectType === "anteprojecto" ? "ANTE-PROJECTO DE PESQUISA (Escrito no tempo futuro, sem resultados reais)" : "TRABALHO DE FIM DE CURSO (TCC concluído)"}
${dbStructure ? `- Dados Complementares/Amostra/Estatísticas/BD fornecidos pelo utilizador: ${dbStructure}` : ""}

INSTRUÇÕES SOBRE TABELAS E GRÁFICOS:
${dbStructure ? `O UTILIZADOR FORNECEU INFORMAÇÕES QUANTITATIVAS OU ESTRUTURAIS EXTRAS. Quando for adequado na actual secção (ex: Metodologia, Revisão ou Resultados), você DEVE OBRIGATORIAMENTE gerar gráficos utilizando blocos de código \`\`\`mermaid (por exemplo gráficos tipo 'pie' para estatísticas, ou fluxogramas/UML para processos e bases de dados). Explique os gráficos no texto.` : ""}
- Crie tabelas formatadas em formato Markdown clássico (\`| --- |\`) sempre que precisar representar estatísticas, resultados, cronogramas ou dados comparativos.
- O documento final usará as formatações textuais das normas ${academicNorm}. Adapte o estilo dos títulos e linguajar a esta norma.

!!! INSTRUÇÃO DE VOLUME EXTREMAMENTE RIGOROSA !!!
O estudante seleccionou um TCC total de ${maxPagesNum} páginas.
Para que o rácio total seja cumprido, a secção "${sectionId}" ACTUAL precisa de atingir um volume robusto:
=> MÍNIMO DE ${expectedWords} PALAVRAS.
Escreva exaustivamente. Aprofunde debates, junte inúmeros autores na literatura (ex: Lakatos, Gil, Sousa), pormenorize a aplicação prática em Angola, adicione exemplos textuais teóricos sem alucinar, varie as métricas dos parágrafos, evite sumarizações. Entregue um texto LONGO, denso e verdadeiramente extenso em concordância com a meta da secção.`;

  const prompts: Record<string, string> = {
    capa: `${context}

Gere o texto da CAPA do TCC com a seguinte estrutura (centrado):
- REPÚBLICA DE ANGOLA
- MINISTÉRIO DA EDUCAÇÃO
- Nome da Universidade
- Faculdade/Departamento
- Título do trabalho (em maiúsculas)
- Tipo de trabalho (TCC para Licenciatura)
- Nome do autor
- Nome do orientador (se existir)
- Cidade, Ano

O texto deve seguir o padrão formal das universidades angolanas.`,

    dedicatoria: `${context}

Gere uma DEDICATÓRIA autêntica e emotiva para um TCC angolano. Deve:
- Ser dirigida aos pais/família como é tradição em Angola
- Mencionar o sacrifício e apoio da família
- Ter 2-3 parágrafos sentidos mas formais
- Referir o contexto angolano e o valor da educação
- NÃO ser genérica — deve sentir-se pessoal e angolana`,

    agradecimentos: `${context}

Gere os AGRADECIMENTOS completos para um TCC angolano. Deve incluir:
- Agradecimento a Deus (tradição angolana)
- Ao orientador (${advisor || "Professor(a) orientador(a)"}) com detalhes da orientação
- À universidade (${university}) e corpo docente
- Aos colegas de curso pela camaradagem
- À família pelo apoio incondicional
- 4-5 parágrafos bem desenvolvidos`,

    resumo: `${context}

Gere o RESUMO ACADÉMICO completo do TCC. Deve:
- Ter entre 200-300 palavras
- Começar com "O presente trabalho de conclusão de curso..."
- Descrever o objectivo do estudo
- Mencionar a metodologia adoptada (${methDesc})
- Apresentar os principais resultados esperados
- Terminar com a relevância para o contexto angolano
- Incluir 5-6 palavras-chave relevantes no final (Palavras-chave: ...)`,

    abstract: `${context}

Gere o ABSTRACT (versão em inglês do resumo) do TCC. Deve:
- Ser a tradução académica fiel do resumo
- Ter entre 200-300 palavras em inglês formal
- Começar com "This final thesis..."
- Manter a mesma estrutura e informação do resumo
- Incluir Keywords no final (Keywords: ...)`,

    indice: `${context}

Gere o ÍNDICE/SUMÁRIO completo e detalhado do TCC com a seguinte estrutura:

CAPA
DEDICATÓRIA
AGRADECIMENTOS
RESUMO
ABSTRACT
ÍNDICE
LISTA DE FIGURAS
LISTA DE TABELAS
LISTA DE ABREVIATURAS

CAPÍTULO I – INTRODUÇÃO
  1.1. Contextualização do Tema
  1.2. Justificação da Escolha do Tema
  1.3. Problema de Investigação
  1.4. Objectivos da Investigação
    1.4.1. Objectivo Geral
    1.4.2. Objectivos Específicos
  1.5. Hipóteses
  1.6. Delimitação do Estudo
  1.7. Estrutura do Trabalho

CAPÍTULO II – REVISÃO DA LITERATURA
  (gere sub-secções relevantes para o tema "${topic}")

CAPÍTULO III – METODOLOGIA
  3.1. Tipo de Investigação
  3.2. Métodos e Técnicas de Investigação
  3.3. População e Amostra
  3.4. Instrumentos de Recolha de Dados
  3.5. Tratamento e Análise dos Dados
  3.6. Limitações do Estudo

CAPÍTULO IV – RESULTADOS E DISCUSSÃO
  4.1. Apresentação dos Resultados
  4.2. Análise e Interpretação dos Dados
  4.3. Discussão dos Resultados

CAPÍTULO V – CONCLUSÃO
  5.1. Considerações Finais
  5.2. Recomendações
  5.3. Sugestões para Futuras Investigações

REFERÊNCIAS BIBLIOGRÁFICAS
APÊNDICES
ANEXOS`,

    introducao: `${context}

Gere o CAPÍTULO I – INTRODUÇÃO completo e aprofundado do TCC. Deve incluir OBRIGATORIAMENTE:

1.1. Contextualização do Tema (3-4 parágrafos)
- Situar o tema no contexto angolano e internacional
- Explicar a relevância actual e a evolução histórica

1.2. Justificação da Escolha do Tema (2-3 parágrafos)
- Explicar porque este tema é importante para Angola
- Identificar lacunas na investigação existente

1.3. Problema de Investigação (1-2 parágrafos)
- Problema: ${problemStatement}
- Formular como pergunta de investigação clara

1.4. Objectivos da Investigação
  1.4.1. Objectivo Geral (1 objectivo abrangente)
  1.4.2. Objectivos Específicos (3-4 objectivos concretos e mensuráveis)

1.5. Hipóteses (2-3 hipóteses alternativas e nulas)

1.6. Delimitação do Estudo (1-2 parágrafos — temporal, espacial e temática)

${projectType === 'anteprojecto' ? '' : '1.7. Estrutura do Trabalho (1 parágrafo descrevendo os capítulos)'}

O capítulo deve ter profundidade real, com parágrafos substanciais e referências a autores quando relevante.`,

    revisao_literatura: `${context}

Gere o CAPÍTULO II – REVISÃO DA LITERATURA completo e extenso do TCC. Este é o capítulo mais importante e deve ter:

2.1. Enquadramento Teórico (4-5 parágrafos)
- Situar o tema no quadro teórico existente
- Citar autores reconhecidos (Gil, Lakatos, Yin, etc.)

2.2. Conceitos Fundamentais (3-4 parágrafos por conceito)
- Definir pelo menos 3-4 conceitos-chave relacionados com "${topic}"
- Usar definições de múltiplos autores para cada conceito

2.3. Estado da Arte / Estudos Anteriores (4-5 parágrafos)
- Apresentar investigações relevantes nesta área
- Comparar abordagens nacionais e internacionais
- Identificar tendências e lacunas na literatura

2.4. Quadro Normativo e Legal (2-3 parágrafos)
- Legislação angolana relevante
- Referência à Constituição de Angola quando aplicável
- Regulamentos institucionais pertinentes

O capítulo deve citar autores reais, usar citações no formato APA, e ter conectores lógicos entre secções.`,

    metodologia: `${context}

Gere o CAPÍTULO DE METODOLOGIA completo e detalhado. 
${projectType === 'anteprojecto' ? 'COMO ESTE DOCUMENTO É UM ANTE-PROJECTO, USE OS VERBOS DE ACÇÃO METODOLÓGICA NO FUTURO DO PRESENTE OU PRETÉRITO (O estudo "será" realizado, "aplicar-se-á", "prevemos", etc).' : 'COMO ESTE DOCUMENTO É UM TCC, USE VERBOS NO PASSADO (O estudo "foi" realizado, etc).'}

Deve incluir:

3.1. Tipo de Investigação (2-3 parágrafos)
- Classificar como ${methDesc}
- Justificar a escolha desta abordagem com referências a autores de metodologia

3.2. Métodos e Técnicas de Investigação (2-3 parágrafos)
- Método bibliográfico
- Método indutivo-dedutivo
- Outros métodos específicos da área

3.3. População e Amostra (2-3 parágrafos)
- Definir a população-alvo
- Descrever a técnica de amostragem
- Justificar a dimensão da amostra

3.4. Instrumentos de Recolha de Dados (2-3 parágrafos)
- Descrever cada instrumento (questionário, entrevista, observação, etc.)
- Justificar a escolha de cada instrumento

3.5. Tratamento e Análise dos Dados (2 parágrafos)
- Descrever as técnicas de análise usadas
- Referenciar software ou metodologias de análise

3.6. Limitações do Estudo (1-2 parágrafos)
- Identificar limitações de forma honesta e académica

Citar autores de metodologia científica (Gil, Marconi, Lakatos, Prodanov, Severino).`,

    resultados: `${context}

Gere o CAPÍTULO IV – RESULTADOS E DISCUSSÃO do TCC. Como se trata de um trabalho académico, apresente resultados simulados mas realistas:

4.1. Apresentação dos Resultados (4-5 parágrafos)
- Descrever os dados recolhidos de forma objectiva
- Usar linguagem descritiva e precisa
- Referenciar tabelas e gráficos hipotéticos (ex: "Conforme ilustrado na Tabela 1...")

4.2. Análise e Interpretação dos Dados (3-4 parágrafos)
- Interpretar os dados apresentados
- Identificar padrões e tendências
- Relacionar com os objectivos definidos

4.3. Discussão dos Resultados (4-5 parágrafos)
- Comparar com investigações anteriores citadas na revisão da literatura
- Confirmar ou refutar as hipóteses formuladas
- Destacar contribuições originais do estudo
- Contextualizar no âmbito angolano

IMPORTANTE: Os resultados devem ser coerentes com a metodologia e os objectivos definidos.`,

    conclusao: `${context}

Gere o CAPÍTULO V – CONCLUSÃO completo do TCC. Deve:

5.1. Considerações Finais (3-4 parágrafos)
- Retomar o problema de investigação e demonstrar que foi respondido
- Resumir as principais descobertas
- Confirmar o alcance dos objectivos (geral e específicos)
- Reflectir sobre a contribuição do estudo

5.2. Recomendações (4-5 pontos em parágrafos)
- Recomendações práticas fundamentadas nos resultados
- Dirigidas a instituições, profissionais e decisores

5.3. Sugestões para Futuras Investigações (2-3 parágrafos)
- Propor linhas de investigação complementares
- Sugerir abordagens metodológicas alternativas
- Identificar áreas que merecem aprofundamento

A conclusão deve fechar o ciclo aberto na introdução e responder ao problema de investigação.`,

    referencias: `${context}

Gere uma lista de REFERÊNCIAS BIBLIOGRÁFICAS completa e realista para o TCC sobre "${topic}". Deve incluir:

- Mínimo 15-20 referências
- Formato APA (American Psychological Association)
- Mix de: livros, artigos científicos, teses/dissertações, legislação
- Autores angolanos e internacionais
- Referências de metodologia conhecidas (Gil, Lakatos, Marconi, Prodanov, Severino, Yin, etc.)
- Referências específicas e REAIS da área de ${course}
- Datas variadas (2005-2024) com predominância de fontes recentes
- Referências da Constituição da República de Angola (2010), se aplicável
- Legislação angolana relevante
- REGRA DE OURO (MANDATÓRIA): NUNCA invente fontes, livros, ou autores. Utilize estritamente referências que existem no mundo real e que possam ser verificadas (com ISBN ou DOI reconhecidos na comunidade académica).

Cada referência deve ser completa: Autor, Data, Título, Editora/Revista, Local.
Ordenar alfabeticamente pelo apelido do primeiro autor.`,
    fundamentacao_teorica: `${context}

Gere o CAPÍTULO DE FUNDAMENTAÇÃO TEÓRICA completo para este Ante-projecto.
Aborde conceitos vitais para a problematização do tema ${topic}. Apresente as principais correntes de pensamento e cite teorias relevantes.

1. Conceitos Fundamentais (3-4 parágrafos)
2. Estado Actual e Estudos Relevantes (3-4 parágrafos)
3. Quadro Legal/Normativo em Angola se aplicável (2 parágrafos)`,

    justificativa: `${context}

Gere o CAPÍTULO DA JUSTIFICATIVA para este Ante-projecto.
Explique de forma académica as razões para a escolha do tema de investigação, a importância do mesmo, a viabilidade de executá-lo, o impacto académico/científico e prático/social da futura pesquisa no contexto de Angola (e global). (Mínimo 5 parágrafos).`,

    cronograma: `${context}

Gere O CRONOGRAMA DE ACTIVIDADES para este Ante-projecto.
CRIE OBRIGATORIAMENTE UMA TABELA MARKDOWN CLÁSSICA (\`| --- |\`) com os meses de duração projetados para o estudo versus as Actividades (ex: Levantamento bibliográfico, Colecta de dados, Análise, Escrita do relatório final, Defesa).
Depois da tabela, explique textualmente o prazo em 2 ou 3 parágrafos.`,

    orcamento: `${context}

Gere O ORÇAMENTO para este Ante-projecto.
CRIE OBRIGATORIAMENTE UMA TABELA MARKDOWN FINANCEIRA (\`| --- |\`) detalhando os recursos materiais, despesas de transporte, consumíveis e eventuais honorários necessários para realizar a pesquisa, usando a moeda Kwanza (AOA) como referência.
Abaixo da tabela, inclua uma descrição explicando quem assumirá os encargos e eventuais parcerias.`,
  };

  return prompts[sectionId] || `${context}\n\nGere conteúdo académico para a secção "${sectionId}" do TCC.`;
}

/* ──────────────────────────────────────────────────────────────────────────
   Handler principal
   ────────────────────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ── Verificar autenticação ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("Não autenticado. Inicia sessão e tenta novamente.", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError("Sessão inválida ou expirada.", 401);
    }

    // ── Verificar chave da API ──
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return jsonError(
        "ANTHROPIC_API_KEY não configurada nos secrets da função. Executa: supabase secrets set ANTHROPIC_API_KEY=...",
        500
      );
    }

    // ── Ler corpo do pedido ──
    const body = await req.json();
    const { sectionId, projectData } = body;

    if (!sectionId || typeof sectionId !== "string") {
      return jsonError("Campo 'sectionId' é obrigatório (ex: 'introducao').", 400);
    }
    if (!projectData || typeof projectData !== "object") {
      return jsonError("Campo 'projectData' é obrigatório (dados do projecto).", 400);
    }

    // ── Construir prompt ──
    const sectionPrompt = buildSectionPrompt(sectionId, projectData);

    // ── Chamar Claude Sonnet ──
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: sectionPrompt }],
      }),
    });

    const payload = await anthropicRes.json().catch(() => ({}));

    if (!anthropicRes.ok) {
      const msg =
        payload?.error?.message || `Erro da IA (HTTP ${anthropicRes.status})`;
      return jsonError(msg, anthropicRes.status);
    }

    const text = payload?.content?.[0]?.text || "";

    return new Response(JSON.stringify({ text, sectionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    return jsonError(msg, 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

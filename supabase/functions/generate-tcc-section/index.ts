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

const SYSTEM_PROMPT = `Você é um especialista académico com mais de 20 anos de experiência na orientação de Trabalhos de Conclusão de Curso (TCC), Ante-Projectos, Monografias e Teses em universidades angolanas.

REGRAS OBRIGATÓRIAS — QUALIDADE ACADÉMICA:
1. Escreva SEMPRE na variante angolana, DESCARTANDO TOTALMENTE o Novo Acordo Ortográfico da Língua Portuguesa. Use a norma pré-Acordo. Exemplos: "objectivo", "projecto", "arquitectura", "acção", "direcção", "baptismo", "óptimo", "óptica", "efeito" (NÃO "efeto"), "facto" (NÃO "fato").
2. Use linguagem formal, científica e académica — NUNCA informal.
3. Nunca use "você" — use formas como "o estudante", "o investigador", "o autor", "o presente estudo".
4. Gere conteúdo ORIGINAL, aprofundado e com rigor científico.
5. Evite repetições, conteúdo superficial ou genérico.
6. Mantenha consistência terminológica ao longo de todo o texto.
7. Use conectores lógicos entre parágrafos para garantir coesão.
8. Cite autores reais e reconhecidos na área. É ESTRITAMENTE PROIBIDO inventar ou alucinar referências bibliográficas, autores ou citações inexistentes.
9. O conteúdo deve parecer escrito por um estudante avançado com orientação de um professor experiente.
10. Adapte a profundidade da secção ao limite máximo de páginas definido para o projecto global.
11. NÃO inclua instruções, notas ao utilizador, ou placeholders como "[inserir dados]".
12. Gere o texto COMPLETO e pronto para uso académico.
13. ESTRITAMENTE PROIBIDO: NUNCA use entidades HTML de espaço como "&nbsp;" ou "&amp;nbsp;". Use apenas formatação Markdown pura com espaços normais.

REGRAS ANTI-PLÁGIO — ORIGINALIDADE GARANTIDA:
14. Cada secção gerada deve conter análise PRÓPRIA e pensamento CRÍTICO — não apenas resumo de fontes.
14. Quando citar autores, SEMPRE parafraseie as ideias em vez de copiar literalmente. Use frases como "Na perspectiva de [Autor] ([Ano])...", "Segundo [Autor] ([Ano]), este fenómeno..." 
15. Combine MÚLTIPLAS perspectivas teóricas para criar sínteses originais — isto é o que diferencia um bom académico.
16. Inclua SEMPRE contextualização para Angola: como o fenómeno se manifesta especificamente no contexto angolano, quais as particularidades locais, que implicações práticas existem para a realidade angolana.
17. Use terminologia variada para os mesmos conceitos (sinónimos académicos) — evite repetição de frases-tipo.
18. A estrutura dos argumentos deve fluir de forma única: premissa → evidência → análise crítica → implicação para Angola.

REGRAS DE HUMANIZAÇÃO — TEXTO QUE SOA HUMANO, NÃO ROBÓTICO:
19. Varie RADICALMENTE o ritmo das frases: alterne entre frases curtas (5–9 palavras) para criar enfâse, frases médias (15–22 palavras), e frases longas e densas (30–48 palavras). NUNCA dois parágrafos seguidos com o mesmo ritmo frásico.
20. Use vocabulário imprevisível — em vez de "importante" escreva "fulcral", "de peso", "que não pode ser ignorado"; em vez de "utilizar", "recorrer a", "lançar mão de"; em vez de "analisar", "debruçar-se sobre", "escrutinar", "examinar de perto".
21. PALAVRAS BANIDAS que denunciam texto de IA: "notavelmente", "crucial", "fundamental", "em conclusão", "em resumo", "por conseguinte", "além disso", "adicionalmente", "é importante notar", "em última análise", "vale ressaltar", "é de salientar", "é importante destacar", "em suma", "desta forma", "deste modo", "abrangente", "robusto", "certamente", "cabe destacar", "diante do exposto". Nunca use estas expressões.
22. Use conectores orgânicos e humanos: "Daí que", "Posto isto", "Ora bem", "O que quer dizer que", "Dito isto", "Voltando ao ponto central", "Não é por acaso que", "Acontece que", "O curioso é que", "Convém não esquecer que". Evite "Além disso", "Adicionalmente", "Por conseguinte".
23. Introduza a voz do investigador — transforme passiva em activa. Use: "O que este estudo pôs a descoberto foi...", "Ao cruzar os dados, tornou-se evidente que...", "O investigador deparou-se com...".
24. Inclua imperfeições humanas calibradas: reformulações espontâneas ("— ou melhor, —"), qualificações honestas ("Salvo melhor interpretação..."), transições reflexivas ("E aqui reside, talvez, o contributo mais relevante deste trabalho.").
25. Use pontuação expressiva: travessão (—) para inserções laterais, parênteses para comentários do investigador, ponto-e-vírgula para ligar ideias. Comece ALGUNS parágrafos com conjunções ("E o que os dados mostram...", "Mas há um aspecto...", "Ora, o problema...").
26. Prefira parágrafos corridos a listas. A estrutura deve fluir organicamente — como alguém que constrói um argumento, não que preenche um formulário. Nunca comece parágrafos consecutivos da mesma forma.`;

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
  
  // Family names for dedication
  const fatherName = projectData?.sections?.father_name || "";
  const motherName = projectData?.sections?.mother_name || "";
  const otherRelatives = projectData?.sections?.other_relatives || "";

  // Province/city from university data (stored in sections or derive from university name)
  const universityCity = projectData?.sections?.university_city || "Luanda";

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
  const totalExpectedWords = maxPagesNum * 250;
  
  const sectionWeights: Record<string, number> = {
    introducao: 0.15,
    revisao_literatura: 0.30,
    revisao_literatura_a: 0.16,
    revisao_literatura_b: 0.14,
    metodologia: 0.15,
    resultados: 0.20,
    conclusao: 0.10,
    fundamentacao_teorica: 0.25,
    justificativa: 0.10,
  };
  // Cap expected words to avoid exceeding Edge Function compute limits
  const rawExpected = Math.round(totalExpectedWords * (sectionWeights[sectionId] || 0.05));
  const expectedWords = Math.min(rawExpected, 3500);

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
- Tipo de Documento: ${projectType === "anteprojecto" ? "ANTE-PROJECTO DE PESQUISA (Escrito no tempo futuro/condicional, sem resultados reais)" : "TRABALHO DE FIM DE CURSO (TCC concluído)"}
${dbStructure ? `- Dados Complementares/Amostra/Estatísticas/BD fornecidos pelo utilizador: ${dbStructure}` : ""}

INSTRUÇÕES SOBRE TABELAS E GRÁFICOS:
${dbStructure ? `O UTILIZADOR FORNECEU INFORMAÇÕES QUANTITATIVAS OU ESTRUTURAIS EXTRAS. Quando for adequado na actual secção (ex: Metodologia, Revisão ou Resultados), DEVE OBRIGATORIAMENTE gerar gráficos usando blocos \`\`\`chart (para dados estatísticos como distribuições, comparações e tendências) OU blocos \`\`\`mermaid (para fluxogramas/UML/processos). Explique cada gráfico/diagrama no texto antes e depois.` : ""}
- Crie tabelas formatadas em formato Markdown clássico (\`| --- |\`) sempre que precisar representar estatísticas, resultados, cronogramas ou dados comparativos.
- Para GRÁFICOS ESTATÍSTICOS (barras, pizza, linha, doughnut) use blocos \`\`\`chart com JSON Chart.js. Exemplos:
  Gráfico de barras: {"type":"bar","data":{"labels":["A","B","C"],"datasets":[{"label":"Frequência (%)","backgroundColor":["#4F46E5","#7C3AED","#2563EB"],"data":[35,45,20]}]},"options":{"plugins":{"title":{"display":true,"text":"Título"}}}}
  Gráfico de pizza: {"type":"pie","data":{"labels":["G1","G2","G3"],"datasets":[{"data":[40,35,25],"backgroundColor":["#4F46E5","#7C3AED","#10B981"]}]},"options":{"plugins":{"title":{"display":true,"text":"Distribuição"}}}}
- Após cada gráfico ou tabela, adicione legenda no formato: **Figura 1:** Descrição. OU **Tabela 1:** Descrição.
- O documento final usará as formatações das normas ${academicNorm}. Adapte o estilo dos títulos a esta norma.

!!! INSTRUÇÃO DE VOLUME E ORIGINALIDADE !!!
O estudante seleccionou um trabalho total de ${maxPagesNum} páginas.
A secção "${sectionId}" DEVE atingir: => MÍNIMO DE ${expectedWords} PALAVRAS.
Escreva exaustivamente. Aprofunde debates com múltiplos autores na literatura (Lakatos, Gil, Sousa, Prodanov, Yin, etc.), pormenorize a aplicação prática no contexto angolano, adicione análise crítica própria, varie as métricas dos parágrafos, evite sumarizações. Entregue um texto LONGO, denso e verdadeiramente extenso.

INSTRUÇÃO ANTI-PLÁGIO: Cada parágrafo deve conter UMA ideia central desenvolvida em 4-6 frases com análise original. Não resuma — ANALISE. Não descreva — INTERPRETE. Não liste — ARGUMENTE.`;

  const prompts: Record<string, string> = {
    capa: `${context}

Gere o texto da CAPA do ${projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'} com a seguinte estrutura (centrado):
- REPÚBLICA DE ANGOLA
- MINISTÉRIO DO ENSINO SUPERIOR, CIÊNCIA, TECNOLOGIA E INOVAÇÃO
- Nome da Universidade: ${university}
- Faculdade/Departamento (inferir do curso: ${course})
- Título do trabalho em maiúsculas: "${title}"
- Tipo de trabalho: ${projectType === 'anteprojecto' ? 'ANTE-PROJECTO DE PESQUISA' : 'TRABALHO DE FIM DE CURSO — LICENCIATURA'}
- Autor: ${studentName}
${advisor ? `- Orientador(a): ${advisor}` : ''}
- ${universityCity}, ${year}

O texto deve seguir o padrão formal das universidades angolanas.`,

    dedicatoria: `${context}

Gere uma DEDICATÓRIA autêntica, emotiva e PROFUNDAMENTE PESSOAL para este TCC angolano.

${(fatherName || motherName || otherRelatives) ? `
INFORMAÇÕES REAIS DO ESTUDANTE PARA A DEDICATÓRIA (use estes nomes reais):
${fatherName ? `- Nome do Pai: ${fatherName}` : ''}
${motherName ? `- Nome da Mãe: ${motherName}` : ''}
${otherRelatives ? `- Outros parentes/dedicatárias especiais: ${otherRelatives}` : ''}

INSTRUÇÃO CRÍTICA: Use os nomes acima de forma natural e emotiva na dedicatória. Não use nomes genéricos.` : `
Nota: o estudante não forneceu nomes de família. Crie uma dedicatória angolana sentida dirigida aos pais/família de forma genérica mas profundamente emotiva.`}

A dedicatória deve:
- Mencionar explicitamente os nomes fornecidos de forma emotiva e respeitosa
- Referenciar o sacrifício, os ensinamentos e o apoio incondicional da família
- Ter 3-4 parágrafos sentidos mas formais, no estilo angolano
- Reflectir o valor da educação na cultura angolana
- Terminar com uma frase de gratidão profunda e poética
- NÃO ser genérica — deve sentir-se genuinamente pessoal`,

    agradecimentos: `${context}

Gere os AGRADECIMENTOS completos para este ${projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'} angolano. Deve incluir:
- Agradecimento a Deus (tradição angolana forte)
- Ao orientador (${advisor || "Professor(a) orientador(a)"}) com menção específica à qualidade da orientação
- À ${university} e ao corpo docente do curso de ${course}
- Aos colegas de curso pela camaradagem e suporte académico
- À família pelo apoio incondicional${fatherName || motherName ? ` (menciona especificamente: ${[fatherName, motherName].filter(Boolean).join(' e ')})` : ''}
${otherRelatives ? `- Menção especial a: ${otherRelatives}` : ''}
- 4-5 parágrafos bem desenvolvidos, calorosos e genuínos`,

    resumo: `${context}

Gere o RESUMO ACADÉMICO completo do TCC. Deve:
- Ter entre 200-300 palavras
- Começar com "O presente trabalho de ${projectType === 'anteprojecto' ? 'ante-projecto de pesquisa' : 'conclusão de curso'}..."
- Descrever o objectivo do estudo
- Mencionar a metodologia adoptada (${methDesc})
- Apresentar os principais ${projectType === 'anteprojecto' ? 'objectivos e resultados esperados' : 'resultados obtidos'}
- Terminar com a relevância para o contexto angolano
- Incluir 5-6 palavras-chave relevantes no final (Palavras-chave: ...)`,

    abstract: `${context}

Gere o ABSTRACT (versão em inglês do resumo) do TCC. Deve:
- Ser a tradução académica fiel do resumo
- Ter entre 200-300 palavras em inglês formal
- Começar com "This ${projectType === 'anteprojecto' ? 'research proposal' : 'final thesis'}..."
- Manter a mesma estrutura e informação do resumo
- Incluir Keywords no final (Keywords: ...)`,

    indice: `${context}

Gere o ÍNDICE/SUMÁRIO completo e detalhado do ${projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'} com a seguinte estrutura:

${projectType === 'anteprojecto' ? `
CAPA
ÍNDICE
1. INTRODUÇÃO
  1.1. Contextualização do Tema
  1.2. Problema de Investigação
  1.3. Objectivos da Investigação
    1.3.1. Objectivo Geral
    1.3.2. Objectivos Específicos
  1.4. Hipóteses
  1.5. Delimitação do Estudo
2. JUSTIFICATIVA
  2.1. Relevância Científica e Académica
  2.2. Relevância Social e Prática
  2.3. Viabilidade da Investigação
3. FUNDAMENTAÇÃO TEÓRICA
  (gere sub-secções relevantes para o tema "${topic}")
4. METODOLOGIA
  4.1. Tipo de Investigação
  4.2. Métodos e Técnicas
  4.3. População e Amostra
  4.4. Instrumentos de Recolha de Dados
5. CRONOGRAMA
6. ORÇAMENTO
REFERÊNCIAS BIBLIOGRÁFICAS` : `
CAPA
FOLHA DE ROSTO
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
ANEXOS`}`,

    introducao: `${context}

Gere o ${projectType === 'anteprojecto' ? 'CAPÍTULO 1 – INTRODUÇÃO' : 'CAPÍTULO I – INTRODUÇÃO'} completo e aprofundado. Deve incluir OBRIGATORIAMENTE:

1.1. Contextualização do Tema (3-4 parágrafos)
- Situar o tema no contexto angolano e internacional
- Explicar a relevância actual e a evolução histórica
- Demonstrar análise crítica própria sobre o estado do tema

1.2. ${projectType === 'anteprojecto' ? 'Problema de Investigação' : 'Justificação da Escolha do Tema'} (2-3 parágrafos)
- Explicar porque este tema é importante para Angola
- Identificar lacunas na investigação existente

1.3. Problema de Investigação (1-2 parágrafos)
- Problema: ${problemStatement}
- Formular como pergunta de investigação clara e fundamentada

1.4. Objectivos da Investigação
  1.4.1. Objectivo Geral (1 objectivo abrangente e mensurável)
  1.4.2. Objectivos Específicos (3-4 objectivos concretos, mensuráveis e realistas)

1.5. Hipóteses (2-3 hipóteses alternativas e nulas bem fundamentadas)

1.6. Delimitação do Estudo (1-2 parágrafos — temporal, espacial e temática)

${projectType === 'anteprojecto' ? '' : '1.7. Estrutura do Trabalho (1 parágrafo descrevendo os capítulos)'}

ANTI-PLÁGIO: Cada subsecção deve conter análise original contextualizada para Angola. Argumente, não apenas descreva.`,

    revisao_literatura: `${context}

Gere o CAPÍTULO II – REVISÃO DA LITERATURA. Inclua as seguintes subsecções:

2.1. Enquadramento Teórico (3-4 parágrafos) — situe o tema no quadro teórico, cite autores como Gil, Lakatos, Yin com análise crítica.

2.2. Conceitos Fundamentais (2-3 parágrafos por conceito) — defina 3-4 conceitos-chave de "${topic}" com múltiplos autores.

2.3. Estado da Arte (3-4 parágrafos) — investigações nacionais e internacionais, tendências e lacunas.

2.4. Quadro Normativo em Angola (2 parágrafos) — legislação e políticas públicas relevantes.

ANTI-PLÁGIO: Cada referência a autores deve ser seguida de análise própria contextualizada para Angola.`,

    revisao_literatura_a: `${context}

Gere a PRIMEIRA PARTE do CAPÍTULO II – REVISÃO DA LITERATURA. Escreva APENAS:

2.1. Enquadramento Teórico (4-5 parágrafos)
- Situar o tema "${topic}" no quadro teórico existente
- Citar autores reconhecidos (Gil, Lakatos, Yin, etc.) com análise crítica
- Demonstrar como as teorias se aplicam ao contexto angolano

2.2. Conceitos Fundamentais (3-4 parágrafos por conceito)
- Definir pelo menos 3-4 conceitos-chave de "${topic}"
- Usar definições de múltiplos autores para cada conceito
- Apresentar análise comparativa das definições

ANTI-PLÁGIO: Cada referência a autores deve ser seguida de análise PRÓPRIA.`,

    revisao_literatura_b: `${context}

Gere a SEGUNDA PARTE do CAPÍTULO II – REVISÃO DA LITERATURA. A primeira parte (2.1 e 2.2) já foi escrita. Escreva APENAS:

2.3. Estado da Arte / Estudos Anteriores (4-5 parágrafos)
- Investigações relevantes nacionais e internacionais
- Comparar criticamente abordagens metodológicas
- Identificar tendências, convergências e lacunas
- Contextualizar Angola vs. panorama internacional

2.4. Quadro Normativo e Legal em Angola (2-3 parágrafos)
- Legislação angolana relevante para o tema
- Constituição da República de Angola (2010)
- Políticas públicas e regulamentos pertinentes

ANTI-PLÁGIO: Cada referência deve ser seguida de análise própria contextualizada para Angola.`,

    metodologia: `${context}

Gere o CAPÍTULO DE METODOLOGIA completo e detalhado. 
${projectType === 'anteprojecto' ? 'COMO ESTE DOCUMENTO É UM ANTE-PROJECTO, USE OS VERBOS NO FUTURO DO PRESENTE (O estudo "será" realizado, "aplicar-se-á", "prevê-se", "utilizará", etc).' : 'COMO ESTE DOCUMENTO É UM TCC, USE VERBOS NO PASSADO (O estudo "foi" realizado, "utilizou-se", "procedeu-se a", etc).'}

Deve incluir:

3.1. Tipo de Investigação (2-3 parágrafos)
- Classificar como ${methDesc}
- Justificar a escolha desta abordagem com referências a autores de metodologia (Gil, Prodanov, Severino, Marconi & Lakatos)
- Explicar as vantagens desta abordagem para o tema específico

3.2. Métodos e Técnicas de Investigação (2-3 parágrafos)
- Método bibliográfico
- Método indutivo-dedutivo
- Outros métodos específicos da área de ${course}

3.3. População e Amostra (2-3 parágrafos)
- Definir a população-alvo com precisão
- Descrever a técnica de amostragem (probabilística vs. não probabilística)
- Justificar a dimensão da amostra com critérios científicos

3.4. Instrumentos de Recolha de Dados (2-3 parágrafos)
- Descrever cada instrumento (questionário, entrevista, observação, análise documental)
- Justificar a escolha de cada instrumento para este estudo específico
- Mencionar procedimentos de validação dos instrumentos

3.5. Tratamento e Análise dos Dados (2 parágrafos)
- Descrever as técnicas estatísticas ou qualitativas de análise
- Referenciar software utilizado (SPSS, Atlas.ti, NVivo, Excel, etc.)
${methodology === 'quantitativa' || methodology === 'mista' ? `
INSTRUÇÃO — GRÁFICO DE AMOSTRA: Gera OBRIGATORIAMENTE uma tabela Markdown com a caracterização da amostra (ex: distribuição por género, faixa etária ou outra variável relevante) E um gráfico \`\`\`chart "bar" ou "doughnut" ilustrando essa distribuição. Inclui legenda **Figura 1:** após o gráfico.
` : ''}
3.6. Limitações do Estudo (1-2 parágrafos)
- Identificar limitações metodológicas de forma honesta e académica

Citar obrigatoriamente: Gil (2002, 2008), Marconi & Lakatos (2003, 2010), Prodanov & Freitas (2013), Severino (2007).`,

    resultados: `${context}

Gere o CAPÍTULO IV – RESULTADOS E DISCUSSÃO do TCC. Como se trata de um trabalho académico, apresente resultados simulados mas realistas e contextualmente coerentes para o tema "${topic}":

4.1. Apresentação dos Resultados (4-5 parágrafos)
- Descrever os dados recolhidos de forma objectiva e organizada
- Usar linguagem descritiva e precisa: "Conforme ilustrado na Tabela 1...", "O Gráfico 1 demonstra..."
- Apresentar dados percentuais e numéricos REALISTAS e COERENTES com o tema

INSTRUÇÃO OBRIGATÓRIA — GRÁFICOS E TABELAS NESTA SECÇÃO:
Deves gerar PELO MENOS:
a) UMA tabela Markdown (| --- |) com dados estatísticos (ex: distribuição da amostra por género, idade, habilitações ou variáveis do tema)
b) UM gráfico \`\`\`chart com dados estatísticos relevantes ao tema. Use "bar" para comparações, "pie" ou "doughnut" para proporções, "line" para evolução temporal. Os dados devem ser plausíveis e contextualizados para Angola.
c) Se aplicável, um segundo gráfico ou diagrama \`\`\`mermaid para processos ou fluxos.

Exemplo de sequência para esta secção:
[texto introdutório] → [Tabela 1 markdown] → **Tabela 1:** legenda → [análise da tabela] → [\`\`\`chart JSON\`\`\`] → **Figura 1:** legenda → [análise do gráfico]

4.2. Análise e Interpretação dos Dados (3-4 parágrafos)
- Interpretar criticamente os dados apresentados
- Identificar padrões, tendências e relações entre variáveis
- Relacionar explicitamente com os objectivos definidos na introdução

4.3. Discussão dos Resultados (4-5 parágrafos)
- Comparar com investigações anteriores citadas na revisão da literatura
- Confirmar ou refutar fundamentadamente as hipóteses formuladas
- Destacar contribuições ORIGINAIS deste estudo para a área
- Contextualizar os resultados no âmbito angolano

ANTI-PLÁGIO: Os resultados devem conter análise crítica e interpretação PRÓPRIA. Os dados numéricos simulados devem ser coerentes, variados e contextualmente válidos para Angola.`,

    conclusao: `${context}

Gere o CAPÍTULO V – CONCLUSÃO completo do TCC. Deve:

5.1. Considerações Finais (3-4 parágrafos)
- Retomar o problema de investigação e demonstrar que foi respondido
- Resumir as principais descobertas com análise crítica própria
- Confirmar o alcance dos objectivos (geral e específicos) — verificar cada um
- Reflectir sobre a contribuição original deste estudo para o conhecimento científico em Angola

5.2. Recomendações (4-5 pontos em parágrafos desenvolvidos)
- Recomendações práticas e concretas fundamentadas nos resultados
- Dirigidas a instituições, profissionais, decisores políticos e à comunidade académica angolana
- Cada recomendação deve ser justificada pelos resultados do estudo

5.3. Sugestões para Futuras Investigações (2-3 parágrafos)
- Propor linhas de investigação complementares e pertinentes para Angola
- Sugerir abordagens metodológicas alternativas para aprofundar o tema
- Identificar áreas que carecem de investigação no contexto angolano

A conclusão deve fechar o ciclo aberto na introdução, responder ao problema de investigação e demonstrar o valor académico e prático do estudo.`,

    referencias: `${context}

Gere uma lista de REFERÊNCIAS BIBLIOGRÁFICAS completa e rigorosa para o trabalho sobre "${topic}". Deve incluir:

- Mínimo 18-25 referências variadas
- Formato ${academicNorm} rigoroso e consistente
- Mix equilibrado: livros, artigos científicos indexados, teses/dissertações, legislação angolana, relatórios institucionais
- Autores angolanos (quando existem publicações na área) e internacionais
- Referências obrigatórias de metodologia: Gil (2002), Lakatos & Marconi (2003), Prodanov & Freitas (2013), Severino (2007), Yin (2015)
- Referências específicas e REAIS da área de ${course}
- Datas variadas (2005-2024) com predominância de fontes dos últimos 10 anos
- Constituição da República de Angola (2010) se aplicável ao tema
- Legislação angolana relevante (Lei n.º X/XXXX, Decreto n.º X/XXXX)

REGRA DE OURO MANDATÓRIA: NUNCA invente fontes, livros, autores ou DOIs. Utilize ESTRITAMENTE referências que existem no mundo real e que podem ser verificadas. Se não tiver certeza de uma referência específica, use referências gerais da área que certamente existem.

Ordenar alfabeticamente pelo apelido do primeiro autor.`,

    fundamentacao_teorica: `${context}

Gere o CAPÍTULO 3 – FUNDAMENTAÇÃO TEÓRICA completo para este Ante-projecto sobre "${topic}".

3.1. Conceitos Fundamentais (3-4 parágrafos por conceito)
- Definir os conceitos-chave do tema com múltiplos autores
- Apresentar análise comparativa das definições

3.2. Principais Correntes Teóricas (3-4 parágrafos)
- Apresentar as teorias mais relevantes para o tema
- Analisar criticamente as contribuições de cada corrente

3.3. Estado Actual e Estudos Relevantes (3-4 parágrafos)
- Investigações nacionais e internacionais relevantes
- Tendências e lacunas na literatura

3.4. Quadro Legal/Normativo em Angola (2 parágrafos)
- Legislação e políticas públicas relevantes ao tema em Angola

ANTI-PLÁGIO: Cada referência a autores deve ser seguida de análise própria contextualizada para Angola.`,

    justificativa: `${context}

Gere o CAPÍTULO 2 – JUSTIFICATIVA completo para este Ante-projecto.

2.1. Relevância Científica e Académica (2-3 parágrafos)
- Contribuição desta investigação para o campo científico de ${course}
- Lacunas que o estudo vai preencher na literatura existente

2.2. Relevância Social e Prática para Angola (2-3 parágrafos)
- Como os resultados beneficiarão concretamente a sociedade angolana
- Impacto prático esperado em instituições, políticas ou práticas profissionais

2.3. Relevância Pessoal e Institucional (1-2 parágrafos)
- Motivação académica e profissional para a escolha do tema
- Contribuição para a ${university}

2.4. Viabilidade da Investigação (1-2 parágrafos)
- Demonstrar que a investigação é exequível no prazo e com os recursos disponíveis
- Acesso aos dados, participantes e literatura necessários

Mínimo 5-6 parágrafos. Escreva com convicção académica e contextualização angolana forte.`,

    cronograma: `${context}

Gere O CRONOGRAMA DE ACTIVIDADES para este Ante-projecto.
CRIE OBRIGATORIAMENTE UMA TABELA MARKDOWN CLÁSSICA (\`| --- |\`) com os meses de duração projectados para o estudo (normalmente 6-12 meses) versus as Actividades principais:
- Levantamento e revisão bibliográfica
- Elaboração dos instrumentos de recolha de dados
- Validação dos instrumentos
- Recolha de dados no campo
- Tratamento e análise dos dados
- Redacção do relatório final
- Revisão e formatação
- Defesa pública

Depois da tabela, explique textualmente o cronograma em 3-4 parágrafos, justificando os prazos e a sequência lógica das actividades.`,

    orcamento: `${context}

Gere O ORÇAMENTO DETALHADO para este Ante-projecto.
CRIE OBRIGATORIAMENTE UMA TABELA MARKDOWN FINANCEIRA (\`| --- |\`) com colunas: Descrição | Quantidade | Valor Unitário (AOA) | Total (AOA).
Inclua categorias:
- Material de escritório (papel, canetas, pastas, impressão)
- Transporte e deslocações para recolha de dados
- Comunicações (internet, chamadas telefónicas)
- Serviços de impressão e encadernação do relatório final
- Imprevistos (10% do total)

Depois da tabela, inclua um parágrafo com o TOTAL GERAL em Kwanzas (AOA) e outro descrevendo quem assumirá os encargos (estudante, universidade, bolsa, parceria).`,
  };

  return prompts[sectionId] || `${context}\n\nGere conteúdo académico original e aprofundado para a secção "${sectionId}" do ${projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'} sobre "${topic}", respeitando as regras anti-plágio e contextualizando para Angola.`;
}

/* ──────────────────────────────────────────────────────────────────────────
   Handler principal
   ────────────────────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return jsonError(
        "ANTHROPIC_API_KEY não configurada nos secrets da função. Executa: supabase secrets set ANTHROPIC_API_KEY=...",
        500
      );
    }

    const body = await req.json();
    const { sectionId, projectData } = body;

    if (!sectionId || typeof sectionId !== "string") {
      return jsonError("Campo 'sectionId' é obrigatório (ex: 'introducao').", 400);
    }
    if (!projectData || typeof projectData !== "object") {
      return jsonError("Campo 'projectData' é obrigatório (dados do projecto).", 400);
    }

    const sectionPrompt = buildSectionPrompt(sectionId, projectData);

    // Section-specific token limits to stay within Edge Function compute budget
    const SECTION_TOKEN_CAPS: Record<string, number> = {
      revisao_literatura: 6000,
      revisao_literatura_a: 6000,
      revisao_literatura_b: 6000,
      fundamentacao_teorica: 6000,
      resultados: 6000,
      introducao: 6000,
      metodologia: 5000,
      conclusao: 4000,
      referencias: 4000,
      justificativa: 4000,
      cronograma: 3000,
      orcamento: 3000,
    };
    const sectionTokenCap = SECTION_TOKEN_CAPS[sectionId] || 4096;

    // Model fallback chain: try current models in order
    const MODELS = [
      { id: "claude-sonnet-4-6",  maxTokens: sectionTokenCap },
      { id: "claude-haiku-4-5",   maxTokens: Math.min(sectionTokenCap, 8192) },
    ];

    let payload: Record<string, unknown> = {};
    let success = false;
    let lastError = "";

    for (const model of MODELS) {
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model.id,
          max_tokens: model.maxTokens,
          temperature: 0.75,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: sectionPrompt }],
        }),
      });

      payload = await anthropicRes.json().catch(() => ({}));

      if (anthropicRes.ok) {
        success = true;
        break;
      }

      lastError = (payload as Record<string, any>)?.error?.message || `Erro da IA (HTTP ${anthropicRes.status})`;

      // For auth/rate-limit errors, stop immediately (no point trying other models)
      if (anthropicRes.status === 401 || anthropicRes.status === 403 || anthropicRes.status === 429) {
        return jsonError(lastError, anthropicRes.status);
      }
      // For 404/400 (model not found), try next model
      // For 5xx (server error), also try next model
    }

    if (!success) {
      return jsonError(lastError || "Nenhum modelo de IA disponível. Tente novamente mais tarde.", 502);
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

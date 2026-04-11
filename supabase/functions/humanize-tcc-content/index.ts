import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `És um estudante universitário angolano a rever o rascunho do teu TCC antes de o entregar. Já sabes que os professores — e os sistemas de detecção — conseguem identificar texto gerado automaticamente pela sua uniformidade, pelos conectores robóticos e pela ausência de personalidade. Vais reescrever o texto de forma a que soe genuinamente humano, mantendo todo o conteúdo académico intacto.

O teu objectivo é duplo: que o texto passe 100% nos detectores (GPTZero, ZeroGPT, Turnitin, Copyleaks) E que o orientador o leia e sinta que foi escrito por um estudante inteligente e comprometido.

════════════════════════════════════════════════
AS 7 TÉCNICAS — APLICA TODAS, SEM EXCEPÇÃO
════════════════════════════════════════════════

TÉCNICA 1 — BURSTINESS REAL (frases de comprimentos radicalmente diferentes):
O maior sinal de texto artificial é a uniformidade do comprimento das frases.
- Intercala frases ultra-curtas (5–9 palavras) que criam ritmo e enfâse.
- Com frases médias que avançam o argumento (15–22 palavras).
- E frases longas e densas (30–48 palavras) para desenvolver ideias, citar, contextualizar.
- NUNCA dois parágrafos seguidos com o mesmo ritmo frásico.
Modelo de ritmo humano: "Há aqui um problema real. A realidade angolana — marcada por uma transição económica e institucional ainda em curso, que poucos estudos nacionais têm sabido capturar com a devida profundidade — exige que qualquer investigação neste domínio parta de pressupostos adaptados ao contexto local. Ignorar isso é cometer o erro mais frequente na literatura importada. Mas voltemos ao argumento central."

TÉCNICA 2 — VOCABULÁRIO IMPREVISÍVEL (perplexidade lexical alta):
Os detectores medem a previsibilidade da próxima palavra. Surpreende-os.
Substituições obrigatórias:
"mostrar" → "pôr a descoberto", "deixar ver", "evidenciar"
"importante" → "fulcral", "de peso", "que não pode ser ignorado", "significativo"
"utilizar" → "recorrer a", "lançar mão de", "servir-se de"
"verificar" → "apurar", "constatar", "perceber com clareza"
"analisar" → "debruçar-se sobre", "escrutinar", "dissecar", "examinar de perto"
"demonstrar" → "pôr em evidência", "revelar", "deixar claro"

PALAVRAS BANIDAS (típicas de IA — nunca as uses):
"notavelmente", "crucial", "fundamental", "em conclusão", "em resumo", "neste contexto", "por conseguinte", "além disso", "adicionalmente", "é importante notar", "em última análise", "vale ressaltar", "é de salientar", "tendo em conta" (em excesso), "é importante destacar", "em suma", "desta forma", "deste modo", "assim sendo" (em excesso), "por outro lado" (em excesso), "no entanto" (em excesso).

TÉCNICA 3 — PONTUAÇÃO COM CARÁCTER:
- Travessão (—) para inserções laterais espontâneas, reformulações, esclarecimentos: "O método — ou melhor, a abordagem adoptada — revelou-se adequado ao contexto."
- Parênteses para comentários do investigador: "(algo que, diga-se, raramente aparece na literatura angolana sobre o tema)"
- Ponto-e-vírgula para ligar ideias que se pertencem mas não se fundem.
- Reticências (...) com parcimónia — só quando há genuína pausa reflexiva.
- Começa ALGUNS parágrafos com conjunções — é completamente natural em português culto:
  "E o que os dados mostram é precisamente isso.", "Mas há um aspecto que não pode ser ignorado.", "Ora, o problema manifesta-se de outra forma.", "E aqui reside, talvez, a questão mais pertinente."

TÉCNICA 4 — VOZ DO INVESTIGADOR:
Transforma a voz passiva em activa. Introduz o ponto de vista do estudante-investigador:
"O que este estudo pôs a descoberto foi...", "Ao cruzar os dados recolhidos, tornou-se evidente que...", "O investigador deparou-se com uma realidade que...", "Dificilmente se poderia chegar a outra conclusão: ...", "O que ficou claro, ao longo da investigação, foi que..."
Nunca listas de pontos — transforma em texto corrido com conectores naturais.

TÉCNICA 5 — CONECTORES QUE SOAM HUMANOS:
PROIBIDOS: "Além disso", "Adicionalmente", "Por conseguinte", "Em conclusão", "Em síntese", "De facto", "Efectivamente" (em excesso)
PERMITIDOS e RECOMENDADOS: "E o que é mais", "Daí que", "Posto isto", "Ora bem", "O que quer dizer que", "E assim sendo", "Dito isto", "Voltando ao ponto central", "O que não é pouco", "Há ainda outro aspecto", "Não é por acaso que", "O que ficou demonstrado é que", "E não foi só isso"

TÉCNICA 6 — IMPERFEIÇÕES HUMANAS CALIBRADAS:
- Reformulações espontâneas: "O estudo — ou melhor, a investigação de campo que o sustenta — revelou algo que não estava previsto."
- Qualificações: "Salvo melhor interpretação...", "Na perspectiva do investigador, sem pretensão de ser definitivo...", "Ressalvando as limitações que o próprio estudo reconhece..."
- Transições reflexivas entre parágrafos: "E aqui reside, talvez, o contributo mais relevante deste trabalho.", "O que não é um resultado menor, considerando o contexto."
- Pequenas redundâncias naturais que mostram que o autor está a pensar enquanto escreve — não como erro, mas como autenticidade.

TÉCNICA 7 — ANGOLA COMO REALIDADE VIVA (não como etiqueta):
Não te limitas a mencionar Angola. Integras o contexto angolano como parte do argumento:
- Contexto pós-guerra e processo de reconstrução nacional; crescimento económico com desigualdades persistentes; desafios do ensino superior em fase de consolidação.
- "Como é próprio do ambiente académico angolano nesta fase de afirmação institucional..."
- "A juventude angolana, crescentemente consciente das suas responsabilidades..."
- Legislação, planos nacionais e políticas públicas — integrados organicamente, não listados.

════════════════════════════════════════════════
REGRAS ABSOLUTAS — SEM EXCEPÇÃO
════════════════════════════════════════════════

1. Mantém a norma pré-Acordo Ortográfico angolano: "objectivo", "projecto", "acção", "direcção", "efeito", "facto", "óptimo", "arquitectura" — NUNCA o novo acordo.
2. Preserva INTEGRALMENTE todas as citações de autores reais e referências bibliográficas — não alteras uma vírgula.
3. Preserva tabelas, dados numéricos, fórmulas, gráficos e estrutura de capítulos.
4. NÃO reduz o conteúdo académico — reformulas a expressão, não o conteúdo.
5. Nunca dois parágrafos seguidos com estrutura sintáctica idêntica.
6. Nunca começas parágrafos consecutivos da mesma forma.
7. Devolves APENAS o texto reescrito — sem saudações, notas explicativas, comentários sobre o processo ou prefácios.`;

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
      return jsonError("ANTHROPIC_API_KEY falhou. Configure as variáveis.", 500);
    }

    const body = await req.json();
    const { sectionId, textToHumanize } = body;

    if (!textToHumanize || typeof textToHumanize !== "string") {
      return jsonError("O texto para humanizar é inválido ou encontra-se vazio.", 400);
    }

    // Split long texts to avoid token limits — process in chunks if needed
    const wordCount = textToHumanize.split(/\s+/).length;
    const isLongText = wordCount > 1200;

    const userMessage = isLongText
      ? `Reescreve o seguinte texto da secção "${sectionId || 'do TCC'}" aplicando TODAS as 7 técnicas de humanização sem excepção. O texto é extenso — mantém absolutamente toda a substância académica, todas as citações e todos os dados numéricos. Apenas transforma a expressão: ritmo das frases, conectores, vocabulário, voz do investigador, microimperfeições naturais. NÃO cortes conteúdo. NÃO reduzes o texto:\n\n${textToHumanize}`
      : `Reescreve o seguinte texto da secção "${sectionId || 'do TCC'}" aplicando as 7 técnicas de humanização com rigor máximo. Garante burstiness real (frases de comprimentos muito variados), vocabulário imprevisível, conectores orgânicos, voz do investigador e contextualização angolana viva. O resultado deve soar escrito por um estudante angolano inteligente — não por uma máquina:\n\n${textToHumanize}`;

    const MODELS = ["claude-sonnet-4-6", "claude-haiku-4-5"];

    let text = "";
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
          model,
          max_tokens: model.includes("4-6") ? 16000 : 8192,
          temperature: 1,
          top_p: 0.95,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      const payload = await anthropicRes.json().catch(() => ({}));

      if (anthropicRes.ok) {
        text = payload?.content?.[0]?.text || "";
        break;
      }

      lastError = payload?.error?.message || `Erro da IA (HTTP ${anthropicRes.status})`;

      if (anthropicRes.status === 401 || anthropicRes.status === 403 || anthropicRes.status === 429) {
        return jsonError(lastError, anthropicRes.status);
      }
    }

    if (!text) {
      return jsonError(lastError || "Não foi possível obter resposta da IA.", 500);
    }

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

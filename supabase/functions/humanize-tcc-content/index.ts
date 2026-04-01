import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `És um estudante universitário angolano experiente a rever e melhorar o primeiro rascunho do teu TCC. O teu objectivo é reescrever o texto fornecido de forma a que:
1. Pareça escrito genuinamente por um ser humano
2. Passe 100% nos detectores de IA (GPTZero, ZeroGPT, Turnitin, TextGuard, Copyleaks)
3. Mantenha o rigor académico e a língua portuguesa angolana (pré-Acordo Ortográfico)
4. Não seja detectado como plágio — o conteúdo deve ser reformulado e originalizado

== TÉCNICAS AVANÇADAS DE HUMANIZAÇÃO (aplica TODAS) ==

TÉCNICA 1 — VARIAÇÃO DE BURSTINESS (variação de comprimento de frases):
Os detectores de IA identificam texto artificial pela uniformidade do comprimento das frases. Quebre isso:
- Mistura insanamente frases curtas (5-8 palavras) com frases longas e densas (30-45 palavras).
- Exemplo de ritmo humano: "Ora, o problema é claro. A realidade angolana, marcada por décadas de transformações sociopolíticas que ainda hoje moldam o tecido institucional do país, exige abordagens metodológicas que transcendam os modelos importados acriticamente da literatura europeia — algo que, reconheça-se, não tem sido suficientemente debatido. Mas voltemos ao essencial."

TÉCNICA 2 — PERPLEXIDADE LEXICAL (vocabulário inesperado):
Os detectores medem quão "previsível" é a próxima palavra. Usa vocabulário menos esperado:
- Substitui palavras genéricas por sinónimos menos frequentes: "mostrar" → "evidenciar", "importante" → "fulcral", "estudar" → "debruçar-se sobre", "usar" → "recorrer a", "ver" → "constatar".
- Evita COMPLETAMENTE estas palavras de IA: "notavelmente", "crucial", "fundamental", "em conclusão", "em resumo", "neste contexto", "por conseguinte", "além disso", "adicionalmente", "é importante notar", "em última análise", "vale ressaltar".

TÉCNICA 3 — PADRÕES DE PONTUAÇÃO HUMANA:
- Usa travessões (—) para inserções laterais inesperadas.
- Usa parênteses para comentários do tipo "aqui o investigador nota que...".
- Usa reticências (...) com moderação para efeito reflexivo.
- Usa ponto-e-vírgula para ligar ideias relacionadas sem as separar completamente.
- Começa ALGUNS parágrafos com conjunções: "E neste ponto...", "Mas é preciso reconhecer que...", "Ora, o que os dados revelam é..."

TÉCNICA 4 — VOZ ACTIVA E PERSPECTIVA PESSOAL DO INVESTIGADOR:
- Transforma voz passiva em activa sempre que possível.
- Introduz o ponto de vista do investigador: "O que o presente estudo identificou foi...", "O investigador constatou que...", "Ao analisar os dados, tornou-se evidente que..."
- Evita estruturas de lista perfeita — converte listas em texto corrido natural.

TÉCNICA 5 — CONECTORES ORGÂNICOS (não robóticos):
Substitui conectores típicos de IA por conectores humanos:
- NÃO: "Além disso", "Adicionalmente", "Por conseguinte", "Em conclusão"
- SIM: "E o que é mais", "Daí que", "Posto isto", "Ora bem", "O que quer dizer que", "Neste sentido", "E assim sendo", "Dito isto", "Voltando ao ponto central"

TÉCNICA 6 — MICROIMPERFEIÇÕES ORGÂNICAS:
- Inclui ocasionalmente uma reformulação dentro da frase: "O estudo — ou melhor, a investigação de campo — revelou..."
- Adiciona qualificações humanas: "Salvo melhor opinião...", "Na perspectiva do investigador...", "Ressalvando as limitações já mencionadas..."
- Inclui uma ou duas frases de transição reflexiva entre parágrafos: "E aqui reside, talvez, a questão mais pertinente desta investigação."

TÉCNICA 7 — CONTEXTUALIZAÇÃO ANGOLANA ESPECÍFICA:
- Insere referências à realidade angolana concreta: contexto pós-guerra, crescimento económico, desafios institucionais, dinamismo da juventude angolana, especificidades culturais.
- Usa expressões do ambiente universitário angolano: "como é comum nas instituições de ensino superior angolanas", "no contexto da realidade socioeconómica do país".

REGRAS ABSOLUTAS:
- Mantém a norma pré-Acordo Ortográfico angolano (objectivo, projecto, acção, etc.)
- Preserva TODAS as citações de autores reais e referências bibliográficas sem alteração
- Preserva tabelas, dados numéricos e estrutura de capítulos
- NÃO reduz o conteúdo académico — apenas reformula a expressão
- Devolve APENAS o texto reescrito, sem saudações, prefácios ou notas explicativas`;

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
      ? `Reescreve o seguinte texto da secção "${sectionId || 'do TCC'}" aplicando TODAS as 7 técnicas de humanização. O texto é longo — mantém TODA a substância académica, apenas melhora a naturalidade e variação de estilo. Não cortes conteúdo:\n\n${textToHumanize}`
      : `Reescreve o seguinte texto da secção "${sectionId || 'do TCC'}" aplicando TODAS as 7 técnicas de humanização rigorosamente. Garante burstiness máxima, vocabulário variado e conectores orgânicos:\n\n${textToHumanize}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 8192,
        temperature: 1.0,
        top_p: 0.95,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const payload = await anthropicRes.json().catch(() => ({}));

    if (!anthropicRes.ok) {
      // Fallback to haiku
      if (anthropicRes.status === 404 || anthropicRes.status === 400) {
        const fallbackRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 4096,
            temperature: 1.0,
            top_p: 0.95,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userMessage }],
          }),
        });
        const fallbackPayload = await fallbackRes.json().catch(() => ({}));
        if (!fallbackRes.ok) {
          const msg = fallbackPayload?.error?.message || `Erro da IA (HTTP ${fallbackRes.status})`;
          return jsonError(msg, fallbackRes.status);
        }
        const text = fallbackPayload?.content?.[0]?.text || "";
        return new Response(JSON.stringify({ text, sectionId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const msg = payload?.error?.message || `Erro da IA (HTTP ${anthropicRes.status})`;
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

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Edge Function — Resumir uma secção do TCC.
 *
 * Recebe o texto integral de uma secção e devolve uma versão resumida,
 * mantendo a estrutura académica, a norma pré-Acordo Ortográfico
 * angolana, todas as citações de autores reais e os blocos especiais
 * (tabelas, gráficos, diagramas).
 *
 * Níveis de resumo (parâmetro `level`):
 *   - 'compact' → ~30% do tamanho original (resumo agressivo)
 *   - 'medium'  → ~50% do tamanho original (recomendado)
 *   - 'light'   → ~70% do tamanho original (resumo suave)
 */

const SYSTEM_PROMPT = `Você é um editor académico angolano com mais de 15 anos de experiência em condensação de textos científicos. A sua tarefa é REDUZIR a extensão de uma secção de TCC mantendo intacto o rigor académico, a estrutura argumentativa e todas as citações de autores reais.

REGRAS ABSOLUTAS DE RESUMO:
1. PRESERVAR INTEGRALMENTE: todas as citações de autores reais (ex: "Segundo Gil (2002)..."), todas as referências bibliográficas, todos os números, datas, percentagens e dados estatísticos, todos os blocos \`\`\`chart e \`\`\`mermaid, todas as tabelas em pipes Markdown, e todas as legendas no formato **Figura N:** ou **Tabela N:**.
2. MANTER A ESTRUTURA: as subsecções numeradas (ex: "1.1.", "2.3.4.") devem permanecer com os mesmos títulos. Não eliminar subsecções inteiras.
3. CONDENSAR a redacção: combinar parágrafos longos em parágrafos mais curtos, eliminar redundâncias, reformular frases verbosas em frases concisas. UMA ideia por parágrafo, sem perder a profundidade analítica.
4. NORMA pré-Acordo Ortográfico angolano: "objectivo", "projecto", "acção", "direcção", "efeito", "facto", "óptimo", "arquitectura". NUNCA o novo acordo.
5. NÃO inventar conteúdo novo nem citações novas.
6. NÃO usar "você" — manter "o estudante", "o investigador", "o presente estudo".

REGRAS CRÍTICAS DE FORMATAÇÃO — TEXTO LIMPO (LEIA COM ATENÇÃO):
O texto vai directamente para um documento Word académico. PROIBIDO usar marcação Markdown ornamental:
7. NUNCA cabeçalhos com cardinal "##", "###". Títulos em MAIÚSCULAS na própria linha (ex: "1.1. CONTEXTUALIZAÇÃO DO TEMA").
8. NUNCA negrito **texto** ou itálico *texto* ou __texto__ ou ~~texto~~ no meio do texto. ÚNICA EXCEPÇÃO: **Figura N:** e **Tabela N:** nas legendas.
9. NUNCA linhas de separação "---", "***", "___".
10. NUNCA entidades HTML "&nbsp;", "&amp;", nem tags HTML <br>, <p>, <strong>.
11. NUNCA backticks \`texto\` para código inline.
12. NUNCA links Markdown [texto](url).
13. PERMITIDO: tabelas em pipes Markdown, blocos \`\`\`chart, blocos \`\`\`mermaid, legendas **Figura N:** / **Tabela N:**.

DEVOLVER apenas o texto resumido, sem comentários, prefácios ou notas explicativas.`;

function buildLevelInstruction(level: string, originalWordCount: number): string {
  const ratios: Record<string, number> = {
    compact: 0.30,
    medium:  0.50,
    light:   0.70,
  };
  const ratio = ratios[level] ?? 0.50;
  const targetWords = Math.max(150, Math.round(originalWordCount * ratio));
  const levelLabel: Record<string, string> = {
    compact: "AGRESSIVO (resumo muito condensado, ~30% do tamanho)",
    medium:  "MÉDIO (resumo equilibrado, ~50% do tamanho)",
    light:   "SUAVE (resumo ligeiro, ~70% do tamanho — apenas remove redundâncias)",
  };
  return `Nível de resumo solicitado: ${levelLabel[level] ?? levelLabel.medium}.
Texto original tem aproximadamente ${originalWordCount} palavras.
Texto resumido deve ter aproximadamente ${targetWords} palavras (com tolerância de ±15%).
Mantém a profundidade académica — condensa a forma, não o conteúdo essencial.`;
}

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
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError("Sessão inválida ou expirada.", 401);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return jsonError(
        "ANTHROPIC_API_KEY não configurada nos secrets da função. Executa: supabase secrets set ANTHROPIC_API_KEY=...",
        500,
      );
    }

    const body = await req.json();
    const { sectionId, originalText, level = "medium", targetWords } = body;

    if (!originalText || typeof originalText !== "string") {
      return jsonError("O texto a resumir é inválido ou encontra-se vazio.", 400);
    }
    if (!["compact", "medium", "light"].includes(level)) {
      return jsonError("O nível de resumo deve ser 'compact', 'medium' ou 'light'.", 400);
    }

    const wordCount = originalText.trim().split(/\s+/).length;
    const levelInstruction = targetWords
      ? `Nível de resumo solicitado: PERSONALIZADO. Texto original tem aproximadamente ${wordCount} palavras. Texto resumido deve ter aproximadamente ${targetWords} palavras (com tolerância de ±15%). Mantém a profundidade académica — condensa a forma, não o conteúdo essencial.`
      : buildLevelInstruction(level, wordCount);

    const userMessage = `Resume o seguinte texto da secção "${sectionId || 'do TCC'}" aplicando todas as regras absolutas e de formatação definidas no system prompt.

${levelInstruction}

Texto original:

${originalText}`;

    // Limites de tokens generosos — o output será mais curto que o input
    // mas precisa folga para textos muito longos.
    const MODELS = [
      { id: "claude-sonnet-4-6", maxTokens: 8000 },
      { id: "claude-haiku-4-5",  maxTokens: 8000 },
    ];

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
          model: model.id,
          max_tokens: model.maxTokens,
          temperature: 0.5, // baixa criatividade — queremos fidelidade ao original
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      const payload = await anthropicRes.json().catch(() => ({}));

      if (anthropicRes.ok) {
        text = payload?.content?.[0]?.text || "";
        if (text) break;
      }

      lastError = payload?.error?.message || `Erro da IA (HTTP ${anthropicRes.status})`;

      if (anthropicRes.status === 401 || anthropicRes.status === 403 || anthropicRes.status === 429) {
        return jsonError(lastError, anthropicRes.status);
      }
    }

    if (!text) {
      return jsonError(lastError || "Não foi possível obter resposta da IA.", 500);
    }

    return new Response(JSON.stringify({ text, sectionId, level }), {
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

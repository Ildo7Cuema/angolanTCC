import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

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

const SYSTEM_PROMPT = `/GHOST

Você é um editor académico angolano com mais de 15 anos de experiência em condensação de textos científicos. A sua tarefa é REDUZIR a extensão de uma secção de TCC mantendo intacto o rigor académico, a estrutura argumentativa e todas as citações de autores reais.

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
8. NUNCA negrito, itálico ou outra marcação Markdown no meio do texto. Legendas: Figura N: ou Tabela N: (sem asteriscos).
9. NUNCA use o símbolo asterisco (*) em qualquer parte do documento.
10. NUNCA linhas de separação com hífens, asteriscos ou underscores.
11. NUNCA entidades HTML "&nbsp;", "&amp;", nem tags HTML <br>, <p>, <strong>.
12. NUNCA backticks \`texto\` para código inline.
13. NUNCA links Markdown [texto](url).
14. PERMITIDO: tabelas em pipes Markdown, blocos \`\`\`chart, blocos \`\`\`mermaid, legendas Figura N: / Tabela N:.

DEVOLVER apenas o texto resumido, sem comentários, prefácios ou notas explicativas.`;

const MIN_WORDS_TO_SUMMARIZE = 40;
const MAX_WORDS_PER_CHUNK = 3500;

function splitForSummarization(text: string): string[] {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= MAX_WORDS_PER_CHUNK) return [trimmed];

  const chunks: string[] = [];
  const paragraphs = trimmed.split(/\n\n+/);
  let current = "";
  let currentWords = 0;

  for (const para of paragraphs) {
    const paraWords = para.trim() ? para.trim().split(/\s+/).length : 0;
    if (currentWords > 0 && currentWords + paraWords > MAX_WORDS_PER_CHUNK) {
      chunks.push(current.trim());
      current = para;
      currentWords = paraWords;
    } else {
      current = current ? `${current}\n\n${para}` : para;
      currentWords += paraWords;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [trimmed];
}

async function callAnthropicSummarize(
  apiKey: string,
  system: string,
  userMessage: string,
): Promise<{ text: string; error?: string; status?: number }> {
  const MODELS = [
    { id: "claude-sonnet-4-6", maxTokens: 8000 },
    { id: "claude-haiku-4-5", maxTokens: 8000 },
  ];

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
        temperature: 0.5,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const payload = await anthropicRes.json().catch(() => ({}));
    if (anthropicRes.ok) {
      const text = payload?.content?.[0]?.text || "";
      if (text) return { text };
    }

    lastError = payload?.error?.message || `Erro da IA (HTTP ${anthropicRes.status})`;
    if (anthropicRes.status === 401 || anthropicRes.status === 403 || anthropicRes.status === 429) {
      return { text: "", error: lastError, status: anthropicRes.status };
    }
  }

  return { text: "", error: lastError || "Não foi possível obter resposta da IA." };
}

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

    const trimmedText = originalText.trim();
    const wordCount = trimmedText.split(/\s+/).length;

    if (wordCount < MIN_WORDS_TO_SUMMARIZE) {
      return new Response(JSON.stringify({ text: trimmedText, sectionId, level, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunks = splitForSummarization(trimmedText);
    const summarizedParts: string[] = [];

    for (let c = 0; c < chunks.length; c++) {
      const chunk = chunks[c];
      const chunkWords = chunk.split(/\s+/).length;
      const levelInstruction = targetWords
        ? `Nível de resumo solicitado: PERSONALIZADO. Este fragmento tem ~${chunkWords} palavras. Texto resumido ~${Math.max(80, Math.round(targetWords / chunks.length))} palavras (±15%).`
        : buildLevelInstruction(level, chunkWords);

      const partLabel = chunks.length > 1
        ? ` (parte ${c + 1} de ${chunks.length})`
        : "";

      const userMessage = `Resume o seguinte texto da secção "${sectionId || "do TCC"}"${partLabel}, aplicando todas as regras absolutas e de formatação definidas no system prompt.

${levelInstruction}

Texto original:

${chunk}`;

      const { text: partText, error, status } = await callAnthropicSummarize(
        apiKey,
        SYSTEM_PROMPT,
        userMessage,
      );

      if (status === 401 || status === 403 || status === 429) {
        return jsonError(error || "Erro de autenticação ou quota da IA.", status);
      }
      if (!partText) {
        return jsonError(error || "Não foi possível obter resposta da IA.", 500);
      }

      summarizedParts.push(partText.trim());
    }

    const text = summarizedParts.join("\n\n");

    return new Response(JSON.stringify({ text, sectionId, level, chunks: chunks.length }), {
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

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Você é um estudante universitário angolano a escrever o primeiro rascunho do seu TCC. O seu objectivo é reescrever o texto fornecido para que ele passe em 0% nos detectores de IA (como TextGuard.AI, JustDone, GPTZero). DEVE PARECER 100% HUMANO E ZERO MÁQUINA.

INSTRUÇÕES EXTREMAS (SE FALHAR, ESTÁ REPROVADO):
1. **Caos Estrutural (Burstiness):** A máquina escreve com frases de tamanho igual. Você não! Escreva frases de 3 palavras. Logo a seguir, escreva um parágrafo denso de 40 palavras sem ponto final. Alterne insanamente entre frases ultra-curtas e frases longuíssimas.
2. **Tom Rascunho Académico:** Escreva de forma um pouco "apressada". A gramática deve ser boa, mas a fluidez deve ter aquele aspecto orgânico e ligeiramente imperfeito de quem está a pensar enquanto digita. Evite a voz passiva.
3. **Morte às Transições de IA:** É estritamente proibido usar estruturas robóticas. NUNCA use: "É importante notar", "notavelmente", "em conclusão", "em resumo", "neste contexto", "por conseguinte", "além disso", "fundamental", "crucial", "em suma", "adicionalmente". Comece parágrafos e frases do nada, de rompante, ou use conjunções casuais ("E no caso de...", "Mas percebe-se que...").
4. **Variante Angolana Pura:** Use a norma pré-acordo de Angola ("projecto", "objectivo", "óptica", "acção", "direcção"). Use jargão universitário angolano e vocabulário simples do dia-a-dia para explicar conceitos difíceis.
5. **Formatações Caóticas:** Evite listas com pontos (bullet points) perfeitinhos. Transforme listas num único parágrafo corrido onde explica as coisas de seguida.
6. Apenas devolva o texto. Sem saudações. Sem introduções. Sem texto extra.`;

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

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307", // Downgrade to haiku to prevent billing/tier model availability errors
        max_tokens: 4096,
        temperature: 1.0, // Maximum temperature for chaos
        top_p: 0.95,
        system: SYSTEM_PROMPT,
        messages: [
          { 
            role: "user", 
            content: `Reescreve o seguinte texto da secção "${sectionId}" garantindo que parece ter sido escrito por um humano. Aplica as tuas regras antidetecção rigorosamente:\n\n${textToHumanize}` 
          }
        ],
      }),
    });

    const payload = await anthropicRes.json().catch(() => ({}));

    if (!anthropicRes.ok) {
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

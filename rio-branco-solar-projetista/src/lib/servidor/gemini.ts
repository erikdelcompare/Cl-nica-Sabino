import "server-only";
import { esquemaJsonAnalise, instrucoesAnalise, lerAnalise, type AnaliseLocal } from "@/lib/dominio/analise";
import type { Medidas, TipoProjeto } from "@/lib/dominio/tipos";

// Análise de fotos com o Gemini (API Interactions, saída estruturada em JSON).
// A chave e o modelo ficam somente no servidor. Nenhuma chamada é feita pelo cliente da proposta.

export const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
export const GEMINI_API_REVISAO = "2026-05-20";
/** Modelo com entrada de imagem e saída de texto, disponível na cota gratuita (conferido na documentação em 14/11/2026). */
export const MODELO_PADRAO = "gemini-3.8-flash";

export const geminiConfigurado = () => Boolean(process.env.GEMINI_API_KEY?.trim());
export const modeloGemini = () => process.env.GEMINI_MODEL?.trim() || MODELO_PADRAO;

export type CodigoErroIA = "sem_chave" | "cota" | "indisponivel" | "recusada" | "invalido" | "rede";

export interface ErroIA {
  codigo: CodigoErroIA;
  mensagem: string;
  status: number;
}

export type ResultadoIA = { ok: true; analise: AnaliseLocal; modelo: string } | { ok: false; erro: ErroIA };

export interface FotoParaIA {
  mime: string;
  dados: Buffer;
}

const MENSAGENS: Record<CodigoErroIA, { mensagem: string; status: number }> = {
  sem_chave: {
    mensagem: "A análise por foto não está configurada (GEMINI_API_KEY ausente). Use o editor manual ou a importação pelo ChatGPT.",
    status: 503,
  },
  cota: {
    mensagem: "O limite gratuito da API Gemini foi atingido por enquanto. Tente mais tarde, use o editor manual ou importe a análise pelo ChatGPT.",
    status: 429,
  },
  indisponivel: {
    mensagem: "O serviço de análise está indisponível agora. Tente de novo em instantes ou use o editor manual.",
    status: 503,
  },
  recusada: {
    mensagem: "O projeto Gemini não tem permissão para esta análise (verificação ou restrição da conta). Confira o AI Studio.",
    status: 403,
  },
  invalido: {
    mensagem: "A resposta da IA não veio no formato esperado. Tente outra foto ou preencha as medidas manualmente.",
    status: 502,
  },
  rede: {
    mensagem: "Não foi possível falar com o serviço de análise. Verifique a conexão e tente de novo.",
    status: 502,
  },
};

function erro(codigo: CodigoErroIA): ErroIA {
  return { codigo, ...MENSAGENS[codigo] };
}

function classificarFalha(status: number, corpo: unknown): CodigoErroIA {
  const code = String((corpo as { error?: { code?: unknown } })?.error?.code ?? "").toLowerCase();
  if (status === 401 || code === "authentication") return "sem_chave";
  if (status === 429 || code.includes("rate_limit") || code.includes("quota") || code === "too_many_requests") return "cota";
  if (status === 403 || code === "permission_denied") return "recusada";
  if (status === 404 || code === "model_not_found") return "invalido";
  if (status >= 500 || code === "service_unavailable" || code === "api_error") return "indisponivel";
  return "invalido";
}

/** Extrai o texto gerado. A API devolve os passos da interação; o texto final está nos model_output. */
export function textoDaResposta(corpo: unknown): string | null {
  const c = corpo as { output_text?: unknown; steps?: unknown };
  if (typeof c?.output_text === "string" && c.output_text.trim()) return c.output_text;
  if (!Array.isArray(c?.steps)) return null;
  const partes: string[] = [];
  for (const passo of c.steps as { type?: string; content?: { type?: string; text?: string }[] }[]) {
    if (passo.type !== "model_output" || !Array.isArray(passo.content)) continue;
    for (const item of passo.content) if (item.type === "text" && typeof item.text === "string") partes.push(item.text);
  }
  return partes.length > 0 ? partes.join("") : null;
}

export async function analisarComGemini(fotos: FotoParaIA[], tipo: TipoProjeto, medidas: Medidas): Promise<ResultadoIA> {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) return { ok: false, erro: erro("sem_chave") };
  if (fotos.length === 0) return { ok: false, erro: erro("invalido") };

  const modelo = modeloGemini();
  const corpo = {
    model: modelo,
    input: [
      { type: "text", text: instrucoesAnalise(tipo, medidas) },
      ...fotos.map((f) => ({ type: "image", data: f.dados.toString("base64"), mime_type: f.mime })),
    ],
    // Não guardar a interação no servidor do fornecedor (store=false).
    store: false,
    response_format: { type: "text", mime_type: "application/json", schema: esquemaJsonAnalise },
  };

  let resposta: Response;
  try {
    resposta = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "x-goog-api-key": chave, "Content-Type": "application/json", "Api-Revision": GEMINI_API_REVISAO },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return { ok: false, erro: erro("rede") };
  }

  const json: unknown = await resposta.json().catch(() => null);
  if (!resposta.ok) return { ok: false, erro: erro(classificarFalha(resposta.status, json)) };

  const texto = textoDaResposta(json);
  if (!texto) return { ok: false, erro: erro("invalido") };
  const lido = lerAnalise(texto);
  if (!lido.ok) return { ok: false, erro: erro("invalido") };
  return { ok: true, analise: lido.analise, modelo };
}

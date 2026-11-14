import { NextResponse } from "next/server";
import { z } from "zod";
import { analisarComGemini, geminiConfigurado, type FotoParaIA } from "@/lib/servidor/gemini";
import { naoAutorizado, proprietarioDaApi } from "@/lib/servidor/auth";

// Análise de fotos pelo Gemini. Só o proprietário chama esta rota, e só depois de aceitar
// o aviso sobre o uso dos dados no nível gratuito. Nunca é chamada pela página da proposta.

export const maxDuration = 90;

const corpo = z.object({
  caminhos: z.array(z.string().min(5).max(300)).min(1).max(4),
  tipo: z.enum(["telhado", "solo"]),
  medidas: z
    .object({
      largura: z.number().nullable().optional(),
      comprimento: z.number().nullable().optional(),
      altura: z.number().nullable().optional(),
      desnivel: z.number().nullable().optional(),
      inclinacao: z.number().nullable().optional(),
      observacoes: z.string().nullable().optional(),
    })
    .default({}),
  consentimento: z.literal(true),
});

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" };

export async function POST(req: Request) {
  const sessao = await proprietarioDaApi();
  if (!sessao) return naoAutorizado();
  let entrada: z.infer<typeof corpo>;
  try {
    entrada = corpo.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, codigo: "invalido", mensagem: "Confirme o aviso de uso dos dados antes de enviar a foto." }, { status: 400 });
  }

  if (!geminiConfigurado()) {
    return NextResponse.json(
      { ok: false, codigo: "sem_chave", mensagem: "A análise por foto não está configurada neste ambiente (GEMINI_API_KEY ausente). Use o editor manual ou a importação pelo ChatGPT." },
      { status: 503 },
    );
  }

  const fotos: FotoParaIA[] = [];
  for (const caminho of entrada.caminhos) {
    const ext = caminho.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME[ext];
    if (!mime) return NextResponse.json({ ok: false, codigo: "invalido", mensagem: "Formato de foto não suportado." }, { status: 415 });
    const baixado = await sessao.supabase.storage.from("fotos").download(caminho);
    if (baixado.error || !baixado.data) {
      return NextResponse.json({ ok: false, codigo: "invalido", mensagem: "Não encontrei uma das fotos. Envie de novo." }, { status: 404 });
    }
    fotos.push({ mime, dados: Buffer.from(await baixado.data.arrayBuffer()) });
  }

  const resultado = await analisarComGemini(fotos, entrada.tipo, entrada.medidas);
  if (!resultado.ok) {
    return NextResponse.json({ ok: false, codigo: resultado.erro.codigo, mensagem: resultado.erro.mensagem }, { status: resultado.erro.status });
  }
  return NextResponse.json({ ok: true, analise: resultado.analise, modelo: resultado.modelo });
}

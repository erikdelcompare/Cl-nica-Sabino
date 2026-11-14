import { NextResponse } from "next/server";
import { gerarPdfProposta } from "@/lib/pdf/proposta";
import { buscarVersao, baixarCapa } from "@/lib/servidor/publica";
import { desbloqueioValido, nomeCookieSessao } from "@/lib/servidor/sessao-proposta";

// PDF comercial: tem preços, então segue a mesma regra do PIN.

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SEM_CACHE = { "Cache-Control": "private, no-store" };

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { estado, versao } = await buscarVersao(token);
  if (!versao || (estado !== "ok" && estado !== "vencida")) {
    return NextResponse.json({ ok: false }, { status: 404, headers: SEM_CACHE });
  }
  const nome = nomeCookieSessao(versao.id);
  const valor = (req.headers.get("cookie") ?? "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${nome}=`))
    ?.slice(nome.length + 1);
  if (!desbloqueioValido(valor ? decodeURIComponent(valor) : undefined, versao)) {
    return NextResponse.json({ ok: false, mensagem: "Informe o PIN para baixar o PDF com valores." }, { status: 401, headers: SEM_CACHE });
  }
  const capa = versao.snapshot_publico.temCapa && versao.capa_caminho ? await baixarCapa(versao.capa_caminho) : null;
  const bytes = await gerarPdfProposta({
    numero: `${versao.orcamento_id.slice(0, 8).toUpperCase()}-v${versao.versao}`,
    versao: versao.versao,
    publico: versao.snapshot_publico,
    comercial: versao.snapshot_comercial,
    validade: versao.validade,
    capa,
  });
  const arquivo = `proposta-rio-branco-solar-v${versao.versao}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

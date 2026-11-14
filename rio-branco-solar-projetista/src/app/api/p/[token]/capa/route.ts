import { NextResponse } from "next/server";
import { baixarCapa, buscarVersao } from "@/lib/servidor/publica";

// Capa da proposta: não contém valores, então pode ser vista antes do PIN.

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { estado, versao } = await buscarVersao(token);
  if (!versao || estado === "inexistente" || estado === "revogada" || !versao.capa_caminho) {
    return NextResponse.json({ ok: false }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const imagem = await baixarCapa(versao.capa_caminho);
  if (!imagem) return NextResponse.json({ ok: false }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return new Response(Buffer.from(imagem), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" },
  });
}

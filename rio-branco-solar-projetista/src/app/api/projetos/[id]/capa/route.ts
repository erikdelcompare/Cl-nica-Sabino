import { NextResponse } from "next/server";
import { naoAutorizado, proprietarioDaApi } from "@/lib/servidor/auth";

// Capa da proposta: imagem capturada da própria cena 3D (JPEG), guardada no bucket privado de capas.

const LIMITE = 5 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await proprietarioDaApi();
  if (!sessao) return naoAutorizado();
  const { id } = await params;
  const tipo = req.headers.get("content-type") ?? "";
  if (!tipo.startsWith("image/jpeg")) return NextResponse.json({ erro: "A capa deve ser uma imagem JPEG." }, { status: 415 });
  const corpo = Buffer.from(await req.arrayBuffer());
  if (corpo.length === 0 || corpo.length > LIMITE) {
    return NextResponse.json({ erro: "Imagem vazia ou grande demais (limite de 5 MB)." }, { status: 413 });
  }
  const caminho = `projetos/${id}/capa.jpg`;
  const envio = await sessao.supabase.storage.from("capas").upload(caminho, corpo, { contentType: "image/jpeg", upsert: true });
  if (envio.error) return NextResponse.json({ erro: `Não foi possível salvar a capa: ${envio.error.message}` }, { status: 500 });
  const atualiza = await sessao.supabase.from("projetos").update({ capa_caminho: caminho }).eq("id", id);
  if (atualiza.error) return NextResponse.json({ erro: atualiza.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, caminho });
}

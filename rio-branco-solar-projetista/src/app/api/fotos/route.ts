import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { naoAutorizado, proprietarioDaApi } from "@/lib/servidor/auth";
import { tipar } from "@/lib/servidor/dados";

// Upload de fotos do telhado ou terreno. Ficam em um bucket privado.
// Sem projetoId, a foto vai para uma pasta temporária e é movida quando o projeto for criado.

const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
const LIMITE = 20 * 1024 * 1024;
const MAXIMO_POR_ENVIO = 12;

export const maxDuration = 60;

export async function POST(req: Request) {
  const sessao = await proprietarioDaApi();
  if (!sessao) return naoAutorizado();
  const { supabase, usuario } = sessao;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ erro: "Envio inválido." }, { status: 400 });
  }
  const projetoId = String(form.get("projetoId") ?? "").trim() || null;
  const arquivos = form.getAll("fotos").filter((x): x is File => x instanceof File);
  if (arquivos.length === 0) return NextResponse.json({ erro: "Nenhuma foto recebida." }, { status: 400 });
  if (arquivos.length > MAXIMO_POR_ENVIO) {
    return NextResponse.json({ erro: `Envie até ${MAXIMO_POR_ENVIO} fotos por vez.` }, { status: 400 });
  }

  const enviadas: { caminho: string; nome: string; mime: string }[] = [];
  for (const arquivo of arquivos) {
    const ext = TIPOS[arquivo.type];
    if (!ext) {
      return NextResponse.json({ erro: `Formato não aceito (${arquivo.type || "desconhecido"}). Use JPG, PNG, WEBP ou HEIC.` }, { status: 415 });
    }
    if (arquivo.size > LIMITE) {
      return NextResponse.json({ erro: `"${arquivo.name}" passa de 20 MB. Envie uma foto menor.` }, { status: 413 });
    }
    const caminho = projetoId ? `projetos/${projetoId}/${randomUUID()}.${ext}` : `temp/${usuario.id}/${randomUUID()}.${ext}`;
    const envio = await supabase.storage.from("fotos").upload(caminho, Buffer.from(await arquivo.arrayBuffer()), {
      contentType: arquivo.type,
      upsert: false,
    });
    if (envio.error) return NextResponse.json({ erro: `Não foi possível guardar a foto: ${envio.error.message}` }, { status: 500 });
    const nome = arquivo.name.slice(0, 120) || caminho.split("/").pop()!;
    if (projetoId) {
      await supabase.from("projeto_fotos").insert({
        projeto_id: projetoId,
        caminho,
        nome_original: nome,
        tipo_mime: arquivo.type,
        tamanho_bytes: arquivo.size,
      });
    }
    enviadas.push({ caminho, nome, mime: arquivo.type });
  }
  void tipar;
  return NextResponse.json({ fotos: enviadas });
}

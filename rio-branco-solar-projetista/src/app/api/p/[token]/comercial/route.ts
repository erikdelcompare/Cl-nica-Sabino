import { NextResponse } from "next/server";
import { buscarVersao } from "@/lib/servidor/publica";
import { desbloqueioValido, nomeCookieSessao } from "@/lib/servidor/sessao-proposta";

// Valores autorizados. Só responde com o desbloqueio válido para esta versão.

export const dynamic = "force-dynamic";
const SEM_CACHE = { "Cache-Control": "private, no-store" };

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { estado, versao } = await buscarVersao(token);
  if (!versao || (estado !== "ok" && estado !== "vencida")) {
    return NextResponse.json({ ok: false, mensagem: "Proposta indisponível." }, { status: 404, headers: SEM_CACHE });
  }
  const cookie = req.headers.get("cookie") ?? "";
  const valor = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${nomeCookieSessao(versao.id)}=`))
    ?.slice(nomeCookieSessao(versao.id).length + 1);
  if (!desbloqueioValido(valor ? decodeURIComponent(valor) : undefined, versao)) {
    return NextResponse.json({ ok: false, mensagem: "Informe o PIN para ver os valores." }, { status: 401, headers: SEM_CACHE });
  }
  return NextResponse.json(
    {
      ok: true,
      versao: versao.versao,
      validade: versao.validade,
      comercial: versao.snapshot_comercial,
    },
    { headers: SEM_CACHE },
  );
}

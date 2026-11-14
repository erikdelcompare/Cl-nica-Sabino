import { NextResponse } from "next/server";
import { conferirPin, assinarSessao, hashToken, nomeCookieSessao, pinValido } from "@/lib/seguranca/cripto";
import { buscarVersao } from "@/lib/servidor/publica";
import { clienteAdmin } from "@/lib/servidor/supabase";

// Desbloqueio dos valores por PIN. O servidor conta a tentativa antes de conferir o PIN,
// com a linha travada no banco, e bloqueia por tempo crescente após 5 erros seguidos.

export const dynamic = "force-dynamic";

const MAX_TENTATIVAS = 5;
const SEM_CACHE = { "Cache-Control": "private, no-store" };

type LinhaTentativa = {
  resultado: string;
  id: string | null;
  pin_hash: string | null;
  pin_versao: number | null;
  bloqueado_ate: string | null;
  restantes: number | null;
};

const mensagemEstado: Record<string, { status: number; mensagem: string }> = {
  inexistente: { status: 404, mensagem: "Link não encontrado. Confira o endereço recebido." },
  revogada: { status: 410, mensagem: "Esta proposta foi revogada. Peça uma nova ao vendedor." },
  expirada: { status: 410, mensagem: "Este link venceu. Peça uma nova proposta ao vendedor." },
  vencida: { status: 410, mensagem: "O prazo desta proposta terminou. Peça uma nova ao vendedor." },
};

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const corpo = (await req.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = String(corpo?.pin ?? "").replace(/\s/g, "");
  if (!pinValido(pin)) {
    return NextResponse.json({ ok: false, mensagem: "Digite os 6 números do PIN." }, { status: 400, headers: SEM_CACHE });
  }

  const { estado, versao } = await buscarVersao(token);
  if (estado !== "ok" || !versao) {
    const m = mensagemEstado[estado] ?? mensagemEstado.inexistente;
    return NextResponse.json({ ok: false, estado, mensagem: m.mensagem }, { status: m.status, headers: SEM_CACHE });
  }

  const admin = clienteAdmin();
  const inicio = await admin.rpc("proposta_iniciar_tentativa", { p_token_hash: hashToken(token), p_max: MAX_TENTATIVAS });
  const linha = ((inicio.data as LinhaTentativa[] | null) ?? [])[0];
  if (inicio.error || !linha) {
    return NextResponse.json({ ok: false, mensagem: "Não foi possível verificar agora. Tente de novo." }, { status: 503, headers: SEM_CACHE });
  }
  if (linha.resultado === "bloqueada") {
    return NextResponse.json(
      { ok: false, bloqueadaAte: linha.bloqueado_ate, mensagem: "Muitas tentativas com PIN incorreto. Aguarde para tentar de novo." },
      { status: 429, headers: SEM_CACHE },
    );
  }
  if (linha.resultado !== "ok" || !linha.id || !linha.pin_hash || linha.pin_versao == null) {
    const m = mensagemEstado[linha.resultado] ?? mensagemEstado.inexistente;
    return NextResponse.json({ ok: false, mensagem: m.mensagem }, { status: m.status, headers: SEM_CACHE });
  }

  if (conferirPin(pin, linha.id, linha.pin_hash)) {
    await admin.rpc("proposta_concluir_tentativa", { p_id: linha.id, p_sucesso: true, p_max: MAX_TENTATIVAS });
    const sessao = assinarSessao(linha.id, linha.pin_versao);
    const resposta = NextResponse.json({ ok: true }, { headers: SEM_CACHE });
    resposta.cookies.set({
      name: nomeCookieSessao(linha.id),
      value: sessao.valor,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: sessao.expiraEm,
    });
    return resposta;
  }

  const bloqueio = await admin.rpc("proposta_concluir_tentativa", { p_id: linha.id, p_sucesso: false, p_max: MAX_TENTATIVAS });
  if (bloqueio.data) {
    return NextResponse.json(
      { ok: false, bloqueadaAte: bloqueio.data, mensagem: "Muitas tentativas com PIN incorreto. Aguarde para tentar de novo." },
      { status: 429, headers: SEM_CACHE },
    );
  }
  return NextResponse.json(
    { ok: false, restantes: linha.restantes ?? 0, mensagem: `PIN incorreto. Restam ${linha.restantes ?? 0} tentativa(s).` },
    { status: 401, headers: SEM_CACHE },
  );
}

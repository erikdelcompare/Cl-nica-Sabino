import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Proxy (antigo middleware): renova a sessão do Supabase e faz a checagem otimista de login.
// A autorização de verdade acontece em cada página, ação e rota (exigirProprietario) e no banco (RLS).

const ROTAS_ABERTAS = ["/login", "/p/", "/api/p/"];

export async function proxy(request: NextRequest) {
  const rota = request.nextUrl.pathname;
  const aberta = ROTAS_ABERTAS.some((r) => rota === r || rota.startsWith(r));
  // Propostas públicas não usam a sessão do painel.
  if (rota.startsWith("/p/") || rota.startsWith("/api/p/")) return NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) {
    // Sem configuração: só a tela de login (que explica o que falta) fica acessível.
    return aberta ? NextResponse.next({ request }) : NextResponse.redirect(new URL("/login", request.url));
  }

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();

  if (!data.user && !aberta) {
    if (rota.startsWith("/api/")) {
      return NextResponse.json({ erro: "nao_autorizado", mensagem: "Sessão expirada. Entre novamente." }, { status: 401 });
    }
    const destino = new URL("/login", request.url);
    if (rota !== "/") destino.searchParams.set("voltar", rota);
    return NextResponse.redirect(destino);
  }
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

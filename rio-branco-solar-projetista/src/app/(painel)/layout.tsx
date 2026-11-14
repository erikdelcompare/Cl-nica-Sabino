import Link from "next/link";
import { Logo } from "@/components/ui";
import { sair } from "@/lib/acoes/sessao";
import { exigirProprietario } from "@/lib/servidor/auth";
import { Navegacao } from "./navegacao";

export default async function LayoutPainel({ children }: LayoutProps<"/">) {
  // Toda página do painel exige o proprietário, validado no servidor.
  const { usuario } = await exigirProprietario();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="nao-imprimir sticky top-0 z-30 border-b border-linha bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3">
          <Link href="/clientes" aria-label="Início">
            <Logo />
          </Link>
          <Navegacao variante="topo" />
          <form action={sair} className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-xs text-cinza lg:inline" title={usuario.email ?? ""}>
              {usuario.email}
            </span>
            <button type="submit" className="min-h-9 rounded-lg px-3 text-sm font-medium text-azul hover:bg-azul-claro">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 pb-20 md:pb-6">{children}</main>
      <Navegacao variante="rodape" />
    </div>
  );
}

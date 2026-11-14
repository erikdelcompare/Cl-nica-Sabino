"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const ITENS = [
  { href: "/clientes", rotulo: "Clientes", prefixos: ["/clientes", "/projetos"], icone: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a8 8 0 0 1 16 0" },
  { href: "/orcamentos", rotulo: "Orçamentos", prefixos: ["/orcamentos", "/propostas"], icone: "M7 3h8l4 4v14H7ZM10 12h6M10 16h6M10 8h3" },
  { href: "/catalogo", rotulo: "Catálogo", prefixos: ["/catalogo"], icone: "M4 5h16v5H4ZM4 14h7v5H4ZM14 14h6v5h-6Z" },
  { href: "/modelos", rotulo: "Modelos", prefixos: ["/modelos"], icone: "M12 3 3 8l9 5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" },
];

export function Navegacao({ variante }: { variante: "topo" | "rodape" }) {
  const caminho = usePathname();
  const ativo = (prefixos: string[]) => prefixos.some((p) => caminho === p || caminho.startsWith(`${p}/`));

  if (variante === "topo") {
    return (
      <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
        {ITENS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={ativo(i.prefixos) ? "page" : undefined}
            className={cx(
              "min-h-9 rounded-lg px-3 py-2 text-sm font-medium",
              ativo(i.prefixos) ? "bg-azul text-white" : "text-azul hover:bg-azul-claro",
            )}
          >
            {i.rotulo}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav
      aria-label="Principal"
      className="nao-imprimir fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-linha bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITENS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={ativo(i.prefixos) ? "page" : undefined}
          className={cx("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", ativo(i.prefixos) ? "text-azul" : "text-cinza")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={ativo(i.prefixos) ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={i.icone} />
          </svg>
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}

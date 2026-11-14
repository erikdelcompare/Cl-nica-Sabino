import type { Metadata } from "next";
import Link from "next/link";
import { LinkBotao, Selo, TituloPagina } from "@/components/ui";
import { formatarBRL, formatarData } from "@/lib/dominio/dinheiro";
import { exigirProprietario } from "@/lib/servidor/auth";
import { listarCatalogo } from "@/lib/servidor/dados";
import { BotaoAtivar } from "./botao-ativar";

export const metadata: Metadata = { title: "Catálogo" };

const TIPOS: Record<string, string> = {
  modulo: "Módulos fotovoltaicos",
  inversor: "Inversores",
  perfil: "Perfis e trilhos",
  estrutura: "Estrutura de solo",
  fixacao: "Fixações e grampos",
  acessorio: "Acessórios e materiais elétricos",
  servico: "Serviços",
};

const STATUS: Record<string, { rotulo: string; cor: "verde" | "sol" | "neutro" }> = {
  confirmado: { rotulo: "Confirmado", cor: "verde" },
  pendente: { rotulo: "Pendente", cor: "sol" },
  demonstrativo: { rotulo: "Demonstrativo", cor: "neutro" },
};

export default async function PaginaCatalogo() {
  const { supabase } = await exigirProprietario();
  const itens = await listarCatalogo(supabase);
  const grupos = Object.keys(TIPOS).map((t) => ({ tipo: t, itens: itens.filter((i) => i.tipo === t) })).filter((g) => g.itens.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <TituloPagina
        titulo="Catálogo"
        descricao="Módulos, inversores, estruturas e acessórios. Itens desativados saem das escolhas, mas continuam nos projetos que já os usam."
        acoes={<LinkBotao href="/catalogo/novo" variante="primario">+ Novo item</LinkBotao>}
      />
      <div className="space-y-6">
        {grupos.map((g) => (
          <section key={g.tipo} aria-labelledby={`g-${g.tipo}`}>
            <h2 id={`g-${g.tipo}`} className="mb-2 text-sm font-semibold uppercase tracking-wide text-cinza">
              {TIPOS[g.tipo]}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {g.itens.map((i) => (
                <li key={i.id} className={`rounded-2xl border border-linha bg-white p-4 ${i.ativo ? "" : "opacity-60"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{`${i.fabricante} ${i.modelo}`.trim()}</p>
                      <p className="text-xs text-cinza">
                        {i.specs.potenciaWp ? `${i.specs.potenciaWp} Wp` : ""}
                        {i.specs.potenciaKw ? `${String(i.specs.potenciaKw).replace(".", ",")} kW` : ""}
                        {i.specs.larguraMm && i.specs.comprimentoMm ? ` · ${i.specs.comprimentoMm}×${i.specs.larguraMm} mm` : ""}
                        {i.specs.funcao ? ` · ${String(i.specs.funcao)}` : ""}
                      </p>
                    </div>
                    <Selo cor={STATUS[i.status_dados]?.cor ?? "neutro"}>{STATUS[i.status_dados]?.rotulo ?? i.status_dados}</Selo>
                  </div>
                  <p className="mt-2 text-sm text-cinza line-clamp-2">{i.descricao}</p>
                  <p className="mt-2 text-sm tabular-nums">
                    Custo {formatarBRL(i.custo_centavos)} · Preço {formatarBRL(i.preco_centavos)} / {i.unidade}
                    {i.preco_demonstrativo && <span className="ml-1 text-xs text-sol">(demonstrativo)</span>}
                  </p>
                  {i.fonte_titulo && (
                    <p className="mt-1 text-xs text-cinza">
                      Fonte:{" "}
                      {i.fonte_url ? (
                        <a href={i.fonte_url} target="_blank" rel="noopener noreferrer" className="underline">{i.fonte_titulo}</a>
                      ) : (
                        i.fonte_titulo
                      )}
                      {i.fonte_consultada_em && ` · consultada em ${formatarData(i.fonte_consultada_em)}`}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/catalogo/${i.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-linha px-3 text-sm font-medium text-azul">
                      Editar
                    </Link>
                    <BotaoAtivar id={i.id} ativo={i.ativo} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

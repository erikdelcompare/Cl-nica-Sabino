import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, Selo, TituloPagina, Vazio, COR_STATUS, ROTULO_STATUS_PT } from "@/components/ui";
import { formatarBRL, formatarData } from "@/lib/dominio/dinheiro";
import { exigirProprietario } from "@/lib/servidor/auth";
import { limparFiltro, normalizarBusca, tipar, type OrcamentoResumo } from "@/lib/servidor/dados";

export const metadata: Metadata = { title: "Orçamentos" };

const STATUS = ["rascunho", "publicada", "aceita", "recusada", "vencida", "arquivada"] as const;

function dataValida(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export default async function PaginaOrcamentos({ searchParams }: PageProps<"/orcamentos">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? limparFiltro(sp.q) : "";
  const status = typeof sp.status === "string" && (STATUS as readonly string[]).includes(sp.status) ? sp.status : "";
  const de = dataValida(sp.de);
  const ate = dataValida(sp.ate);
  const { supabase } = await exigirProprietario();

  let consulta = supabase.from("orcamentos_resumo").select("*").order("criado_em", { ascending: false }).limit(150);
  if (q) {
    const digitos = q.replace(/\D/g, "");
    const filtros = [`cliente_nome_busca.ilike.%${normalizarBusca(q)}%`, `numero.ilike.%${q}%`];
    if (digitos.length >= 3) filtros.push(`cliente_telefone_digitos.ilike.%${digitos}%`);
    consulta = consulta.or(filtros.join(","));
  }
  if (status) consulta = consulta.eq("status", status);
  if (de) consulta = consulta.gte("criado_em", `${de}T00:00:00-03:00`);
  if (ate) consulta = consulta.lte("criado_em", `${ate}T23:59:59-03:00`);
  const lista = tipar<OrcamentoResumo[]>(await consulta).data ?? [];

  const link = (params: Record<string, string>) => {
    const s = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(de ? { de } : {}), ...(ate ? { ate } : {}), ...params });
    const t = s.toString();
    return t ? `/orcamentos?${t}` : "/orcamentos";
  };

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <TituloPagina titulo="Orçamentos" descricao={`${lista.length} resultado(s)`} />
      <form action="/orcamentos" className="mb-4 grid gap-2 rounded-2xl border border-linha bg-white p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" role="search">
        <label className="flex flex-col gap-1 text-xs text-cinza">
          Cliente, telefone ou número
          <input name="q" defaultValue={q} className="min-h-11 rounded-lg border border-linha px-3 text-base text-tinta" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-cinza">
          Status
          <select name="status" defaultValue={status} className="min-h-11 rounded-lg border border-linha bg-white px-2 text-base text-tinta">
            <option value="">Todos</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>{ROTULO_STATUS_PT[s]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-cinza">
          De
          <input type="date" name="de" defaultValue={de ?? ""} className="min-h-11 rounded-lg border border-linha px-2 text-base text-tinta" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-cinza">
          Até
          <input type="date" name="ate" defaultValue={ate ?? ""} className="min-h-11 rounded-lg border border-linha px-2 text-base text-tinta" />
        </label>
        <div className="flex items-end gap-2">
          <button className="min-h-11 flex-1 rounded-lg bg-azul px-4 text-sm font-medium text-white sm:flex-none">Filtrar</button>
          <Link href="/orcamentos" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-azul hover:bg-azul-claro">Limpar</Link>
        </div>
      </form>

      {lista.length === 0 ? (
        <Vazio titulo="Nenhum orçamento encontrado.">Ajuste os filtros ou crie um orçamento a partir de um projeto.</Vazio>
      ) : (
        <Cartao className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-linha text-xs uppercase tracking-wide text-cinza">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Projeto</th>
                  <th className="px-3 py-2 font-medium">Versão</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2"><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {lista.map((o) => (
                  <tr key={o.id} className={o.arquivado_em ? "text-cinza" : ""}>
                    <td className="whitespace-nowrap px-3 py-2">{formatarData(o.criado_em)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/clientes/${o.cliente_id}`} className="font-medium text-azul hover:underline">{o.cliente_nome}</Link>
                      <div className="text-xs text-cinza">{o.numero}</div>
                    </td>
                    <td className="px-3 py-2">{o.projeto_nome}</td>
                    <td className="px-3 py-2">{o.ultima_versao ? `v${o.ultima_versao}` : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatarBRL(o.ultima_versao_total ?? o.total_centavos)}</td>
                    <td className="px-3 py-2">
                      <Selo cor={COR_STATUS[o.status] ?? "neutro"}>{ROTULO_STATUS_PT[o.status] ?? o.status}</Selo>
                      {o.rascunho_alterado && <span className="ml-1 text-xs text-sol">alterado</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/orcamentos/${o.id}`} className="inline-flex min-h-9 items-center rounded-lg px-3 font-medium text-azul hover:bg-azul-claro">Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}
      <p className="mt-3 text-xs text-cinza">
        <Link href={link({ status: "arquivada" })} className="underline">Ver arquivados</Link>
      </p>
    </div>
  );
}

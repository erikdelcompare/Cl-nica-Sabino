import type { Metadata } from "next";
import Link from "next/link";
import { LinkBotao, Selo, TituloPagina, Vazio } from "@/components/ui";
import { exigirProprietario } from "@/lib/servidor/auth";
import { formatarData } from "@/lib/dominio/dinheiro";
import { limparFiltro, normalizarBusca, tipar } from "@/lib/servidor/dados";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes({ searchParams }: PageProps<"/clientes">) {
  const { q } = await searchParams;
  const { supabase } = await exigirProprietario();
  const termo = typeof q === "string" ? limparFiltro(q) : "";

  let consulta = supabase
    .from("clientes")
    .select("id, nome, telefone, cidade, demonstracao, atualizado_em")
    .is("arquivado_em", null)
    .order("atualizado_em", { ascending: false })
    .limit(100);
  if (termo) {
    const digitos = termo.replace(/\D/g, "");
    const nome = normalizarBusca(termo);
    const filtros = [`nome_busca.ilike.%${nome}%`];
    if (digitos.length >= 3) filtros.push(`telefone_digitos.ilike.%${digitos}%`);
    consulta = consulta.or(filtros.join(","));
  }
  const clientes = tipar<
    { id: string; nome: string; telefone: string | null; cidade: string | null; demonstracao: boolean; atualizado_em: string }[]
  >(await consulta).data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <TituloPagina
        titulo="Clientes"
        descricao={`${clientes.length} cliente(s)${termo ? ` para "${termo}"` : ""}`}
        acoes={<LinkBotao href="/clientes/novo" variante="primario">+ Novo cliente</LinkBotao>}
      />
      <form action="/clientes" className="mb-4 flex gap-2" role="search">
        <label className="sr-only" htmlFor="busca">Buscar por nome ou telefone</label>
        <input
          id="busca"
          name="q"
          defaultValue={termo}
          placeholder="Buscar por nome ou telefone"
          inputMode="search"
          enterKeyHint="search"
          className="min-h-11 flex-1 rounded-lg border border-linha bg-white px-3"
        />
        <button className="min-h-11 rounded-lg bg-azul px-4 text-sm font-medium text-white">Buscar</button>
        {termo && (
          <Link href="/clientes" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-azul hover:bg-azul-claro">
            Limpar
          </Link>
        )}
      </form>

      {clientes.length === 0 ? (
        <Vazio titulo={termo ? "Nenhum cliente encontrado." : "Ainda não há clientes cadastrados."}>
          {termo ? "Confira a grafia ou procure pelo telefone." : "Cadastre o primeiro cliente para começar um projeto."}
        </Vazio>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="block rounded-2xl border border-linha bg-white p-4 hover:border-azul/40">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-tinta">{c.nome}</p>
                  {c.demonstracao && <Selo cor="sol">Demo</Selo>}
                </div>
                <p className="mt-1 text-sm text-cinza">{c.telefone ?? "Sem telefone"}</p>
                <p className="text-sm text-cinza">{c.cidade ?? "Cidade não informada"}</p>
                <p className="mt-2 text-xs text-cinza">Atualizado em {formatarData(c.atualizado_em)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Cartao, LinkBotao, Selo, TituloPagina, Vazio, COR_STATUS, ROTULO_STATUS_PT } from "@/components/ui";
import { formatarBRL, formatarData } from "@/lib/dominio/dinheiro";
import { exigirProprietario } from "@/lib/servidor/auth";
import { tipar, type Cliente, type OrcamentoResumo, type VersaoResumo } from "@/lib/servidor/dados";
import { FormularioCliente } from "../novo/formulario";
import { ArquivarBotao, CriarOrcamentoBotao, DuplicarBotao, FormularioLocal } from "./acoes";

export const metadata: Metadata = { title: "Cliente" };

interface Projeto {
  id: string;
  nome: string;
  tipo: "telhado" | "solo";
  local_id: string | null;
  atualizado_em: string;
  arquivado_em: string | null;
}

export default async function PaginaCliente({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProprietario();
  const cliente = tipar<Cliente>(await supabase.from("clientes").select("*").eq("id", id).maybeSingle()).data;
  if (!cliente) notFound();
  const locais = tipar<{ id: string; nome: string; tipo: string; cidade: string | null }[]>(
    await supabase.from("locais").select("id, nome, tipo, cidade").eq("cliente_id", id).order("criado_em"),
  ).data ?? [];
  const projetos = tipar<Projeto[]>(
    await supabase.from("projetos").select("id, nome, tipo, local_id, atualizado_em, arquivado_em").eq("cliente_id", id).order("atualizado_em", { ascending: false }),
  ).data ?? [];
  const orcamentos = tipar<OrcamentoResumo[]>(
    await supabase.from("orcamentos_resumo").select("*").eq("cliente_id", id).order("criado_em", { ascending: false }),
  ).data ?? [];
  const versoes = tipar<VersaoResumo[]>(
    await supabase.from("versoes_resumo").select("*").eq("cliente_id", id).order("publicado_em", { ascending: false }),
  ).data ?? [];
  const nomeProjeto = new Map(projetos.map((p) => [p.id, p.nome]));

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-4">
      <TituloPagina
        voltar={{ href: "/clientes", rotulo: "Clientes" }}
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {cliente.nome}
            {cliente.demonstracao && <Selo cor="sol">Demonstração</Selo>}
          </span>
        }
        descricao={[cliente.telefone, cliente.cidade].filter(Boolean).join(" · ") || "Sem telefone ou cidade"}
        acoes={<LinkBotao href={`/clientes/${id}/projetos/novo`} variante="destaque">+ Novo projeto</LinkBotao>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <Cartao titulo="Dados do cliente">
            <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-cinza">Telefone</dt>
              <dd>{cliente.telefone ? <a className="text-azul underline" href={`tel:${cliente.telefone.replace(/\D/g, "")}`}>{cliente.telefone}</a> : "—"}</dd>
              <dt className="text-cinza">E-mail</dt>
              <dd className="break-all">{cliente.email ?? "—"}</dd>
              <dt className="text-cinza">Cidade</dt>
              <dd>{cliente.cidade ?? "—"}</dd>
              <dt className="text-cinza">Endereço</dt>
              <dd>{cliente.endereco ?? "—"}</dd>
              {cliente.observacoes && (
                <>
                  <dt className="text-cinza">Observações</dt>
                  <dd className="whitespace-pre-line">{cliente.observacoes}</dd>
                </>
              )}
            </dl>
            <details className="rounded-xl border border-linha p-3">
              <summary className="min-h-10 cursor-pointer text-sm font-medium text-azul">Editar cadastro</summary>
              <div className="mt-3">
                <FormularioCliente id={id} valores={cliente} />
              </div>
            </details>
          </Cartao>

          <Cartao titulo="Locais de instalação" descricao="Um cliente pode ter vários locais, projetos e orçamentos.">
            {locais.length === 0 ? (
              <p className="mb-3 text-sm text-cinza">Nenhum local cadastrado ainda.</p>
            ) : (
              <ul className="mb-4 divide-y divide-linha">
                {locais.map((l) => (
                  <li key={l.id} className="py-2 text-sm">
                    <span className="font-medium">{l.nome}</span>
                    <span className="text-cinza"> · {l.tipo === "solo" ? "Solo" : "Telhado"}{l.cidade ? ` · ${l.cidade}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
            <details className="rounded-xl border border-linha p-3">
              <summary className="min-h-10 cursor-pointer text-sm font-medium text-azul">+ Adicionar local</summary>
              <div className="mt-3">
                <FormularioLocal clienteId={id} />
              </div>
            </details>
          </Cartao>
        </div>

        <div className="space-y-4">
          <Cartao titulo="Projetos" descricao="Cada projeto tem seu desenho, kit e lista de materiais.">
            {projetos.length === 0 ? (
              <Vazio titulo="Nenhum projeto ainda.">Crie um projeto pelas medidas, por foto ou pela análise do ChatGPT.</Vazio>
            ) : (
              <ul className="divide-y divide-linha">
                {projetos.map((p) => {
                  const orcs = orcamentos.filter((o) => o.projeto_id === p.id && !o.arquivado_em);
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link href={`/projetos/${p.id}`} className="font-medium text-azul underline-offset-2 hover:underline">
                          {p.nome}
                        </Link>
                        <p className="text-xs text-cinza">
                          {p.tipo === "telhado" ? "Telhado" : "Solo"} · atualizado em {formatarData(p.atualizado_em)} · {orcs.length} orçamento(s) ativo(s)
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/projetos/${p.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-linha px-3 text-sm text-azul">
                          Abrir desenho
                        </Link>
                        <CriarOrcamentoBotao projetoId={p.id} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>

          <Cartao titulo="Histórico de orçamentos" descricao="Data, projeto, versão, valor e status de cada proposta.">
            {orcamentos.length === 0 ? (
              <Vazio titulo="Nenhum orçamento ainda." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-cinza">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Data</th>
                      <th className="py-2 pr-3 font-medium">Projeto</th>
                      <th className="py-2 pr-3 font-medium">Versão</th>
                      <th className="py-2 pr-3 text-right font-medium">Valor</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linha">
                    {orcamentos.map((o) => (
                      <tr key={o.id} className={o.arquivado_em ? "text-cinza" : ""}>
                        <td className="whitespace-nowrap py-2 pr-3">{formatarData(o.criado_em)}</td>
                        <td className="py-2 pr-3">{o.projeto_nome}</td>
                        <td className="py-2 pr-3">{o.ultima_versao ? `v${o.ultima_versao}` : "rascunho"}</td>
                        <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatarBRL(o.ultima_versao_total ?? o.total_centavos)}</td>
                        <td className="py-2 pr-3"><Selo cor={COR_STATUS[o.status] ?? "neutro"}>{ROTULO_STATUS_PT[o.status] ?? o.status}</Selo></td>
                        <td className="py-2">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Link href={`/orcamentos/${o.id}`} className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-azul hover:bg-azul-claro">
                              {o.status === "rascunho" ? "Continuar" : "Abrir"}
                            </Link>
                            <DuplicarBotao orcamentoId={o.id} />
                            <ArquivarBotao orcamentoId={o.id} arquivado={Boolean(o.arquivado_em)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Cartao>

          <Cartao titulo="Propostas publicadas" descricao="Cada versão mostra exatamente o que foi apresentado ao cliente.">
            {versoes.length === 0 ? (
              <Aviso tipo="info">Nenhuma proposta publicada ainda.</Aviso>
            ) : (
              <ul className="divide-y divide-linha">
                {versoes.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {nomeProjeto.get(v.projeto_id) ?? "Projeto"} · v{v.versao}
                      </p>
                      <p className="text-xs text-cinza">
                        Publicada em {formatarData(v.publicado_em)} · {formatarBRL(v.total_centavos)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Selo cor={COR_STATUS[v.status] ?? "neutro"}>{ROTULO_STATUS_PT[v.status] ?? v.status}</Selo>
                      <Link href={`/orcamentos/${v.orcamento_id}/versoes/${v.id}`} className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-azul hover:bg-azul-claro">
                        Ver o que foi enviado
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>
    </div>
  );
}

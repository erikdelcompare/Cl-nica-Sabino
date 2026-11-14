import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { Cartao, Botao, TituloPagina } from "@/components/ui";
import { criarOrcamento } from "@/lib/acoes/orcamentos";
import { exigirProprietario } from "@/lib/servidor/auth";
import { carregarProjeto, tipar } from "@/lib/servidor/dados";

export const metadata: Metadata = { title: "Orçamento do projeto" };

export default async function OrcamentoDoProjeto({ params }: PageProps<"/projetos/[id]/orcamento">) {
  const { id } = await params;
  const { supabase } = await exigirProprietario();
  const projeto = await carregarProjeto(supabase, id);
  if (!projeto) notFound();
  const ativo = tipar<{ id: string }>(
    await supabase
      .from("orcamentos")
      .select("id")
      .eq("projeto_id", id)
      .is("arquivado_em", null)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ).data;
  if (ativo) redirect(`/orcamentos/${ativo.id}`);

  async function criar() {
    "use server";
    await criarOrcamento(id);
  }

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <TituloPagina voltar={{ href: `/projetos/${id}`, rotulo: "Desenho" }} titulo="Orçamento" descricao="Ainda não há orçamento para este projeto." />
      <Cartao>
        <p className="text-sm text-cinza">
          O orçamento começa com a lista de materiais do desenho e do kit. Você ajusta preços, inclui cabos, proteções e serviços e, depois, publica.
        </p>
        <form action={criar} className="mt-4">
          <Botao type="submit" tamanho="g">
            Criar orçamento deste projeto
          </Botao>
        </form>
      </Cartao>
    </div>
  );
}

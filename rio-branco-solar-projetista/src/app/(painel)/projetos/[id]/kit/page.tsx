import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TituloPagina } from "@/components/ui";
import { exigirProprietario } from "@/lib/servidor/auth";
import { carregarProjeto, listarCatalogo } from "@/lib/servidor/dados";
import { KitForm } from "./formulario";

export const metadata: Metadata = { title: "Kit do projeto" };

export default async function PaginaKit({ params }: PageProps<"/projetos/[id]/kit">) {
  const { id } = await params;
  const { supabase } = await exigirProprietario();
  const projeto = await carregarProjeto(supabase, id);
  if (!projeto) notFound();
  const catalogo = await listarCatalogo(supabase);
  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4">
      <TituloPagina
        voltar={{ href: `/projetos/${id}`, rotulo: "Desenho" }}
        titulo="Kit e verificação elétrica"
        descricao={`${projeto.nome}. Escolha os modelos, informe a geração e confira os arranjos.`}
        acoes={<Link href={`/projetos/${id}/orcamento`} className="inline-flex min-h-11 items-center rounded-lg bg-azul px-4 text-sm font-medium text-white">Orçamento</Link>}
      />
      <KitForm projetoId={id} revisao={projeto.revisao} cena={projeto.cena} kitInicial={projeto.kit} catalogo={catalogo} />
    </div>
  );
}

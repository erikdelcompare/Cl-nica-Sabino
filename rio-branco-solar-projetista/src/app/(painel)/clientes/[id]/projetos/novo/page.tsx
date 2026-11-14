import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TituloPagina } from "@/components/ui";
import { exigirProprietario } from "@/lib/servidor/auth";
import { listarCatalogo, tipar } from "@/lib/servidor/dados";
import { NovoProjetoForm } from "./formulario";

export const metadata: Metadata = { title: "Novo projeto" };

export default async function NovoProjeto({ params }: PageProps<"/clientes/[id]/projetos/novo">) {
  const { id } = await params;
  const { supabase } = await exigirProprietario();
  const cliente = tipar<{ nome: string }>(await supabase.from("clientes").select("nome").eq("id", id).maybeSingle()).data;
  if (!cliente) notFound();
  const locais = tipar<{ id: string; nome: string; tipo: string }[]>(
    await supabase.from("locais").select("id, nome, tipo").eq("cliente_id", id).order("criado_em"),
  ).data ?? [];
  const catalogo = await listarCatalogo(supabase, { somenteAtivos: true });
  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4">
      <TituloPagina
        voltar={{ href: `/clientes/${id}`, rotulo: cliente.nome }}
        titulo="Novo projeto"
        descricao="Escolha como começar. Em qualquer caso, você ajusta tudo no desenho."
      />
      <NovoProjetoForm clienteId={id} clienteNome={cliente.nome} locais={locais} catalogo={catalogo} />
    </div>
  );
}

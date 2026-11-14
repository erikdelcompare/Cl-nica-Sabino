import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TituloPagina } from "@/components/ui";
import { exigirProprietario } from "@/lib/servidor/auth";
import { listarCatalogo } from "@/lib/servidor/dados";
import { FormularioItem } from "../formulario";

export const metadata: Metadata = { title: "Editar item do catálogo" };

export default async function EditarItem({ params }: PageProps<"/catalogo/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProprietario();
  const item = (await listarCatalogo(supabase)).find((i) => i.id === id);
  if (!item) notFound();
  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4">
      <TituloPagina voltar={{ href: "/catalogo", rotulo: "Catálogo" }} titulo={`${item.fabricante} ${item.modelo}`.trim()} descricao="Edite preços, dados técnicos e a fonte. Propostas já publicadas não mudam." />
      <FormularioItem item={item} />
    </div>
  );
}

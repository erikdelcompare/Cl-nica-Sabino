import type { Metadata } from "next";
import { TituloPagina } from "@/components/ui";
import { exigirProprietario } from "@/lib/servidor/auth";
import { FormularioItem } from "../formulario";

export const metadata: Metadata = { title: "Novo item do catálogo" };

export default async function NovoItem() {
  await exigirProprietario();
  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4">
      <TituloPagina voltar={{ href: "/catalogo", rotulo: "Catálogo" }} titulo="Novo item do catálogo" descricao="Cadastre módulos, inversores, estruturas e acessórios com a fonte dos dados." />
      <FormularioItem />
    </div>
  );
}

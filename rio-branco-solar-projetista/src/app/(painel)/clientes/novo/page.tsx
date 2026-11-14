import type { Metadata } from "next";
import { TituloPagina } from "@/components/ui";
import { exigirProprietario } from "@/lib/servidor/auth";
import { FormularioCliente } from "./formulario";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NovoCliente() {
  await exigirProprietario();
  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4">
      <TituloPagina voltar={{ href: "/clientes", rotulo: "Clientes" }} titulo="Novo cliente" descricao="Nome e telefone são o suficiente para começar. O restante pode ser preenchido depois." />
      <div className="rounded-2xl border border-linha bg-white p-4 sm:p-6">
        <FormularioCliente />
      </div>
    </div>
  );
}

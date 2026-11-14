"use client";

import { useActionState } from "react";
import { atualizarCliente, criarCliente, type EstadoForm } from "@/lib/acoes/clientes";
import { Aviso, Botao, Campo, Entrada, AreaTexto } from "@/components/ui";

export interface DadosClienteForm {
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  cidade?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
}

export function FormularioCliente({ id, valores }: { id?: string; valores?: DadosClienteForm }) {
  const acao = id ? atualizarCliente.bind(null, id) : criarCliente;
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(acao, {});
  return (
    <form action={enviar} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome completo" className="sm:col-span-2">
        <Entrada name="nome" required defaultValue={valores?.nome ?? ""} autoComplete="name" />
      </Campo>
      <Campo rotulo="Telefone / WhatsApp" dica="Com DDD. Usado na busca.">
        <Entrada name="telefone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={valores?.telefone ?? ""} />
      </Campo>
      <Campo rotulo="E-mail" opcional>
        <Entrada name="email" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" defaultValue={valores?.email ?? ""} />
      </Campo>
      <Campo rotulo="Cidade" opcional>
        <Entrada name="cidade" autoComplete="address-level2" defaultValue={valores?.cidade ?? ""} />
      </Campo>
      <Campo rotulo="Endereço" opcional>
        <Entrada name="endereco" autoComplete="street-address" defaultValue={valores?.endereco ?? ""} />
      </Campo>
      <Campo rotulo="Observações" opcional className="sm:col-span-2">
        <AreaTexto name="observacoes" defaultValue={valores?.observacoes ?? ""} />
      </Campo>
      {estado.erro && <Aviso tipo="erro" className="sm:col-span-2">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="ok" className="sm:col-span-2">{estado.sucesso}</Aviso>}
      <div className="sm:col-span-2 flex justify-end">
        <Botao type="submit" tamanho="g" disabled={enviando}>
          {enviando ? "Salvando…" : id ? "Salvar alterações" : "Cadastrar cliente"}
        </Botao>
      </div>
    </form>
  );
}

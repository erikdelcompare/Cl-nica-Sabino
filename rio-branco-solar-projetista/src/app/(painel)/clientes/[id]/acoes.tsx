"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { arquivarOrcamento, criarOrcamento, duplicarOrcamento } from "@/lib/acoes/orcamentos";
import { criarLocal, type EstadoForm } from "@/lib/acoes/clientes";
import { Aviso, Botao, Campo, Entrada, Selecao } from "@/components/ui";

export function CriarOrcamentoBotao({ projetoId }: { projetoId: string }) {
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div>
      <Botao
        variante="secundario"
        tamanho="p"
        disabled={pendente}
        onClick={async () => {
          setPendente(true);
          const r = await criarOrcamento(projetoId);
          if (r?.erro) {
            setErro(r.erro);
            setPendente(false);
          }
        }}
      >
        {pendente ? "Criando…" : "Criar orçamento"}
      </Botao>
      {erro && <Aviso tipo="erro" className="mt-2">{erro}</Aviso>}
    </div>
  );
}

export function DuplicarBotao({ orcamentoId }: { orcamentoId: string }) {
  const [pendente, setPendente] = useState(false);
  return (
    <Botao
      variante="secundario"
      tamanho="p"
      disabled={pendente}
      onClick={async () => {
        setPendente(true);
        await duplicarOrcamento(orcamentoId);
        setPendente(false);
      }}
    >
      Duplicar
    </Botao>
  );
}

export function ArquivarBotao({ orcamentoId, arquivado }: { orcamentoId: string; arquivado: boolean }) {
  const router = useRouter();
  const [pendente, setPendente] = useState(false);
  return (
    <Botao
      variante="sutil"
      tamanho="p"
      disabled={pendente}
      onClick={async () => {
        if (!arquivado && !window.confirm("Arquivar esta proposta? Ela sai das listas, mas o histórico fica guardado.")) return;
        setPendente(true);
        await arquivarOrcamento(orcamentoId, !arquivado);
        setPendente(false);
        router.refresh();
      }}
    >
      {arquivado ? "Reativar" : "Arquivar"}
    </Botao>
  );
}

export function FormularioLocal({ clienteId }: { clienteId: string }) {
  const acao = criarLocal.bind(null, clienteId);
  const [estado, enviar, enviando] = useActionState<EstadoForm, FormData>(acao, {});
  return (
    <form action={enviar} className="grid gap-3 sm:grid-cols-2">
      <Campo rotulo="Nome do local" className="sm:col-span-2" dica="Ex.: Casa, telhado dos fundos, galpão">
        <Entrada name="nome" required />
      </Campo>
      <Campo rotulo="Tipo de instalação">
        <Selecao name="tipo" defaultValue="telhado">
          <option value="telhado">Telhado</option>
          <option value="solo">Solo</option>
        </Selecao>
      </Campo>
      <Campo rotulo="Cidade" opcional>
        <Entrada name="cidade" />
      </Campo>
      <Campo rotulo="Endereço do local" opcional className="sm:col-span-2">
        <Entrada name="endereco" />
      </Campo>
      {estado.erro && <Aviso tipo="erro" className="sm:col-span-2">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="ok" className="sm:col-span-2">{estado.sucesso}</Aviso>}
      <div className="sm:col-span-2">
        <Botao type="submit" variante="secundario" disabled={enviando}>
          {enviando ? "Salvando…" : "Adicionar local"}
        </Botao>
      </div>
    </form>
  );
}

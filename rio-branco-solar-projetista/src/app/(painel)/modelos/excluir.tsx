"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { excluirModelo } from "@/lib/acoes/projetos";
import { Botao } from "@/components/ui";

export function BotaoExcluirModelo({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [pendente, setPendente] = useState(false);
  return (
    <Botao
      variante="perigo"
      tamanho="p"
      disabled={pendente}
      onClick={async () => {
        if (!window.confirm(`Excluir o modelo "${nome}"? Projetos que já o usaram não mudam.`)) return;
        setPendente(true);
        await excluirModelo(id);
        router.refresh();
      }}
    >
      Excluir
    </Botao>
  );
}

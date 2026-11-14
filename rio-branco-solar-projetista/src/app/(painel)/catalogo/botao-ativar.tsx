"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ativarItemCatalogo } from "@/lib/acoes/orcamentos";
import { Botao } from "@/components/ui";

export function BotaoAtivar({ id, ativo }: { id: string; ativo: boolean }) {
  const router = useRouter();
  const [pendente, setPendente] = useState(false);
  return (
    <Botao
      variante="sutil"
      tamanho="p"
      disabled={pendente}
      onClick={async () => {
        setPendente(true);
        await ativarItemCatalogo(id, !ativo);
        setPendente(false);
        router.refresh();
      }}
    >
      {ativo ? "Desativar" : "Reativar"}
    </Botao>
  );
}

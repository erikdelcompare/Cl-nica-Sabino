import type { Metadata } from "next";
import { Cartao, Selo, TituloPagina, Vazio } from "@/components/ui";
import { formatarData } from "@/lib/dominio/dinheiro";
import { exigirProprietario } from "@/lib/servidor/auth";
import { tipar } from "@/lib/servidor/dados";
import { BotaoExcluirModelo } from "./excluir";

export const metadata: Metadata = { title: "Modelos" };

export default async function PaginaModelos() {
  const { supabase } = await exigirProprietario();
  const modelos = tipar<{ id: string; nome: string; tipo: string; descricao: string; criado_em: string; demonstracao: boolean }[]>(
    await supabase.from("modelos").select("id, nome, tipo, descricao, criado_em, demonstracao").order("nome"),
  ).data ?? [];
  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4">
      <TituloPagina
        titulo="Modelos reutilizáveis"
        descricao="Uma cobertura ou mesa de solo salva como modelo. Ao inserir num projeto, a cópia é independente: ajustes nela valem só para aquele projeto."
      />
      <Cartao>
        {modelos.length === 0 ? (
          <Vazio titulo="Nenhum modelo ainda.">Abra um projeto, selecione a cobertura ou mesa e use &quot;Salvar como modelo&quot;.</Vazio>
        ) : (
          <ul className="divide-y divide-linha">
            {modelos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{m.nome}</p>
                  <p className="text-xs text-cinza">
                    {m.tipo === "solo" ? "Solo" : "Telhado"} · criado em {formatarData(m.criado_em)}
                  </p>
                  {m.descricao && <p className="text-sm text-cinza">{m.descricao}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {m.demonstracao && <Selo cor="sol">Demo</Selo>}
                  <BotaoExcluirModelo id={m.id} nome={m.nome} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

"use client";

import { aplicarAnalise, ROTULO_ORIGEM, type AnaliseLocal } from "@/lib/dominio/analise";
import type { EspecModulo, Medidas, TipoProjeto } from "@/lib/dominio/tipos";
import { Selo } from "./ui";

/** Mostra o que veio da análise, o que é medida informada e o que ainda precisa de confirmação. */
export function PreviaAnalise({ analise, medidas, tipo, modulo }: { analise: AnaliseLocal; medidas: Medidas; tipo: TipoProjeto; modulo: EspecModulo | null }) {
  const { pendencias } = aplicarAnalise(analise, medidas, tipo, modulo);
  return (
    <div className="space-y-3 rounded-xl border border-linha bg-white p-3 text-sm">
      <p className="font-semibold text-tinta">Prévia da análise</p>
      <ul className="space-y-1 text-cinza">
        <li>
          Cobertura: {analise.cobertura ? `${analise.cobertura.material} sobre ${analise.cobertura.estrutura}` : "não identificada"}
        </li>
        <li>Águas identificadas: {analise.aguas.length}</li>
        <li>Obstáculos: {analise.obstaculos.length > 0 ? analise.obstaculos.map((o) => o.nome ?? o.tipo).join(", ") : "nenhum"}</li>
        {analise.elementos_visiveis.length > 0 && <li>Visto na foto: {analise.elementos_visiveis.join(", ")}</li>}
        {analise.observacoes && <li>Observações da IA: {analise.observacoes}</li>}
      </ul>
      <div>
        <p className="mb-1 font-medium text-tinta">Para confirmar</p>
        <ul className="space-y-1">
          {pendencias.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {p.rotulo}: <span className="text-tinta">{p.valor}</span>
              </span>
              <Selo cor={p.origem === "informado" ? "verde" : p.origem === "foto" ? "azul" : "sol"}>{ROTULO_ORIGEM[p.origem]}</Selo>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-cinza">As medidas que você informou têm prioridade. Tudo pode ser ajustado no editor.</p>
      </div>
    </div>
  );
}

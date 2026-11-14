"use client";

import { useState } from "react";
import { centavosParaCampo, formatarNumero, lerBRL, lerNumero } from "@/lib/dominio/dinheiro";
import { CLASSE_ENTRADA, cx } from "./ui";

// Campos numéricos pensados para o celular: teclado decimal, vírgula ou ponto, e botões − / +.

interface PropsNumero {
  valor: number | null;
  aoMudar: (valor: number) => void;
  passo?: number;
  min?: number;
  max?: number;
  casas?: number;
  sufixo?: string;
  rotulo?: string;
  /** Mostra os botões − e +. */
  botoes?: boolean;
  className?: string;
  desabilitado?: boolean;
  id?: string;
  nomeTeste?: string;
}

export function CampoNumero({
  valor,
  aoMudar,
  passo = 0.1,
  min = -Infinity,
  max = Infinity,
  casas = 2,
  sufixo,
  rotulo,
  botoes = true,
  className,
  desabilitado,
  id,
  nomeTeste,
}: PropsNumero) {
  const formatado = valor == null ? "" : formatarNumero(valor, casas);
  const [texto, setTexto] = useState(formatado);
  const [base, setBase] = useState(formatado);
  const [foco, setFoco] = useState(false);
  // Valor mudou por fora (outra vista, desfazer, recálculo): acompanha, salvo durante a digitação.
  if (base !== formatado) {
    setBase(formatado);
    if (!foco) setTexto(formatado);
  }

  const limitar = (n: number) => Math.min(max, Math.max(min, Math.round(n * 10 ** casas) / 10 ** casas));
  const confirmar = (t: string) => {
    const n = lerNumero(t);
    if (n == null) {
      setTexto(formatado);
      return;
    }
    const final = limitar(n);
    setTexto(formatarNumero(final, casas));
    if (final !== valor) aoMudar(final);
  };
  const somar = (d: number) => {
    const final = limitar((valor ?? 0) + d);
    setTexto(formatarNumero(final, casas));
    aoMudar(final);
  };

  const entrada = (
    <div className="flex min-w-0 items-stretch">
      {botoes && (
        <button
          type="button"
          aria-label={`Diminuir ${rotulo ?? ""}`}
          disabled={desabilitado}
          onClick={() => somar(-passo)}
          className="min-h-11 w-10 shrink-0 rounded-l-lg border border-r-0 border-linha bg-papel text-lg font-semibold text-azul active:bg-azul-claro disabled:opacity-40"
        >
          −
        </button>
      )}
      <div className="relative min-w-0 flex-1">
        <input
          id={id}
          data-testid={nomeTeste}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          disabled={desabilitado}
          value={texto}
          aria-label={rotulo}
          onFocus={(e) => {
            setFoco(true);
            e.currentTarget.select();
          }}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={(e) => {
            setFoco(false);
            confirmar(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={cx(CLASSE_ENTRADA, "text-center tabular-nums", botoes && "rounded-none", sufixo && "pr-9")}
        />
        {sufixo && <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-cinza">{sufixo}</span>}
      </div>
      {botoes && (
        <button
          type="button"
          aria-label={`Aumentar ${rotulo ?? ""}`}
          disabled={desabilitado}
          onClick={() => somar(passo)}
          className="min-h-11 w-10 shrink-0 rounded-r-lg border border-l-0 border-linha bg-papel text-lg font-semibold text-azul active:bg-azul-claro disabled:opacity-40"
        >
          +
        </button>
      )}
    </div>
  );

  if (!rotulo) return <div className={className}>{entrada}</div>;
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-medium text-cinza">{rotulo}</span>
      {entrada}
    </label>
  );
}

/** Valor em reais, guardado em centavos. */
export function CampoDinheiro({
  centavos,
  aoMudar,
  rotulo,
  className,
  desabilitado,
  nomeTeste,
  compacto,
}: {
  centavos: number;
  aoMudar: (centavos: number) => void;
  rotulo?: string;
  className?: string;
  desabilitado?: boolean;
  nomeTeste?: string;
  compacto?: boolean;
}) {
  const formatado = centavosParaCampo(centavos);
  const [texto, setTexto] = useState(formatado);
  const [base, setBase] = useState(formatado);
  const [foco, setFoco] = useState(false);
  if (base !== formatado) {
    setBase(formatado);
    if (!foco) setTexto(formatado);
  }

  const entrada = (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-cinza">R$</span>
      <input
        data-testid={nomeTeste}
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        disabled={desabilitado}
        value={texto}
        aria-label={rotulo}
        onFocus={(e) => {
          setFoco(true);
          e.currentTarget.select();
        }}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={(e) => {
          setFoco(false);
          const lido = lerBRL(e.target.value);
          if (lido == null || lido < 0) {
            setTexto(formatado);
            return;
          }
          setTexto(centavosParaCampo(lido));
          if (lido !== centavos) aoMudar(lido);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={cx(CLASSE_ENTRADA, "pl-9 text-right tabular-nums", compacto && "min-h-10 py-1.5")}
      />
    </div>
  );
  if (!rotulo || compacto) return <div className={className}>{entrada}</div>;
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-medium text-cinza">{rotulo}</span>
      {entrada}
    </label>
  );
}

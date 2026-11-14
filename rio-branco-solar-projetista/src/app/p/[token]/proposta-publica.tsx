"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { LimiteCena3D, webglDisponivel, type Camadas } from "@/components/cena3d";
import { Aviso, Botao, Cartao, Logo, Selo } from "@/components/ui";
import { formatarBRL, formatarData, formatarQtd, formatarNumero } from "@/lib/dominio/dinheiro";
import type { SnapshotComercial, EquipamentoPublico } from "@/lib/dominio/orcamento";
import type { Cena, MapaModulos } from "@/lib/dominio/tipos";

const Cena3D = dynamic(() => import("@/components/cena3d").then((m) => m.Cena3D), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-cinza">Carregando a vista 3D…</p>,
});

interface Props {
  token: string;
  estado: "ok" | "vencida";
  versao: number;
  validade: string | null;
  titulo: string;
  empresa: { nome: string; contato: string; cidade: string };
  cliente: { nome: string; cidade: string };
  projeto: { nome: string; tipo: "telhado" | "solo"; local: string };
  temCapa: boolean;
  avisoTecnico: string;
  cena: Cena;
  specs: MapaModulos;
  kit: {
    equipamentos: EquipamentoPublico[];
    potenciaKwp: number;
    potenciaInversoresKw: number;
    totalModulos: number;
    geracaoMensalKwh: number | null;
    origemGeracao: string;
  };
  materiais: { grupo: string; descricao: string; quantidade: number; unidade: string }[];
  planta: ReactNode;
}

const CAMADAS: Camadas = { modulos: true, estrutura: true, cobertura: true, obstaculos: true, terreno: true };

export function PropostaPublica(p: Props) {
  const [visao, setVisao] = useState<"3d" | "2d">("2d");
  const [temWebgl, setTemWebgl] = useState<boolean | null>(null);
  const [comercial, setComercial] = useState<SnapshotComercial | null>(null);
  const [pinAberto, setPinAberto] = useState(false);
  const [pin, setPin] = useState("");
  const [erroPin, setErroPin] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [versaoPin, setVersaoPin] = useState<number | null>(null);

  useEffect(() => {
    const webgl = webglDisponivel();
    // Atualiza o estado do aparelho uma única vez, ao montar.
    queueMicrotask(() => {
      setTemWebgl(webgl);
      if (webgl) setVisao("3d");
    });
    // Se o aparelho já desbloqueou esta proposta antes, os valores aparecem direto.
    fetch(`/api/p/${p.token}/comercial`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; comercial?: SnapshotComercial } | null) => {
        if (j?.ok && j.comercial) setComercial(j.comercial);
      })
      .catch(() => undefined);
  }, [p.token]);

  const desbloquear = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroPin(null);
    if (!/^\d{6}$/.test(pin)) return setErroPin("Digite os 6 números do PIN.");
    setEnviando(true);
    try {
      const r = await fetch(`/api/p/${p.token}/desbloquear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; mensagem?: string };
      if (!r.ok || !j.ok) {
        setErroPin(j.mensagem ?? "Não foi possível verificar o PIN.");
        setPin("");
        return;
      }
      const c = await fetch(`/api/p/${p.token}/comercial`, { cache: "no-store" });
      const cj = (await c.json().catch(() => ({}))) as { ok?: boolean; comercial?: SnapshotComercial; versao?: number };
      if (!c.ok || !cj.comercial) return setErroPin("Não foi possível abrir os valores. Tente novamente.");
      setComercial(cj.comercial);
      setVersaoPin(cj.versao ?? null);
      setPinAberto(false);
      setPin("");
    } catch {
      setErroPin("Sem conexão. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  };

  const data = (iso: string | null) => (iso ? formatarData(iso) : null);

  return (
    <main className="min-h-screen bg-papel pb-12">
      <header className="nao-imprimir bg-azul text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Logo claro compacto={false} />
          <span className="text-xs text-white/70">Proposta v{p.versao}</span>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-azul via-azul to-azul-escuro text-white">
        {p.temCapa && (
          // Capa capturada da própria cena 3D (não contém valores).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/p/${p.token}/capa`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-sol">Proposta comercial</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{p.projeto.nome}</h1>
          <p className="mt-2 text-white/85">
            Para {p.cliente.nome}
            {p.cliente.cidade ? ` · ${p.cliente.cidade}` : ""}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {p.projeto.tipo === "telhado" ? "Sistema sobre telhado" : "Estrutura de solo"}
            {p.projeto.local ? ` · ${p.projeto.local}` : ""}
          </p>
          {data(p.validade) && <p className="mt-3 text-sm text-sol">Válida até {data(p.validade)}</p>}
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {p.estado === "vencida" && (
          <Aviso tipo="atencao">O prazo desta proposta terminou. Os valores não podem mais ser desbloqueados. Peça uma nova proposta ao vendedor.</Aviso>
        )}

        <Cartao titulo="Projeto" descricao="Planta e visão 3D da montagem prevista.">
          <div className="mb-3 inline-flex rounded-lg border border-linha p-0.5" role="tablist" aria-label="Visualização do projeto">
            {(["2d", "3d"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={visao === v}
                disabled={v === "3d" && temWebgl === false}
                onClick={() => setVisao(v)}
                className={`min-h-10 rounded-md px-4 text-sm font-medium disabled:opacity-40 ${visao === v ? "bg-azul text-white" : "text-azul"}`}
              >
                {v === "2d" ? "Planta 2D" : "Vista 3D"}
              </button>
            ))}
          </div>
          {visao === "3d" && temWebgl ? (
            <LimiteCena3D fallback={<div>{p.planta}</div>}>
              <Cena3D
                cena={p.cena}
                specs={p.specs}
                camadas={CAMADAS}
                visao="livre"
                registrar={() => undefined}
                altura={340}
              />
            </LimiteCena3D>
          ) : (
            <div className="rounded-xl border border-linha bg-white p-3">{p.planta}</div>
          )}
          <p className="mt-3 text-xs text-cinza">{p.avisoTecnico}</p>
        </Cartao>

        <Cartao titulo="Sistema proposto">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Dado valor={formatarNumero(p.kit.potenciaKwp, 2)} rotulo="kWp de módulos" />
            <Dado valor={formatarNumero(p.kit.potenciaInversoresKw, 2)} rotulo="kW de inversor" />
            <Dado valor={String(p.kit.totalModulos)} rotulo="módulos" />
          </div>
          {p.kit.geracaoMensalKwh ? (
            <p className="mt-3 text-sm">
              Geração mensal estimada: <strong>{formatarQtd(p.kit.geracaoMensalKwh)} kWh/mês</strong>
              <span className="block text-xs text-cinza">{p.kit.origemGeracao}</span>
            </p>
          ) : null}
          <ul className="mt-4 divide-y divide-linha text-sm">
            {p.kit.equipamentos.map((e, i) => (
              <li key={i} className="py-2">
                <p className="font-medium">{e.quantidade} × {e.descricao}</p>
                {e.detalhes.length > 0 && <p className="text-xs text-cinza">{e.detalhes.join(" · ")}</p>}
              </li>
            ))}
          </ul>
        </Cartao>

        {p.materiais.length > 0 && (
          <Cartao titulo="Materiais e serviços incluídos">
            <ul className="space-y-1 text-sm">
              {p.materiais.map((m, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{m.descricao}</span>
                  <span className="shrink-0 tabular-nums text-cinza">{formatarQtd(m.quantidade)} {m.unidade}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        )}

        <Cartao titulo="Orçamento" descricao="Os valores ficam protegidos. Informe o PIN que o vendedor enviou separadamente.">
          {!comercial ? (
            <div className="space-y-3">
              {!pinAberto ? (
                <Botao tamanho="g" className="w-full" onClick={() => setPinAberto(true)} disabled={p.estado === "vencida"}>
                  Ver orçamento
                </Botao>
              ) : (
                <form onSubmit={desbloquear} className="space-y-3 rounded-xl border border-linha p-4">
                  <label htmlFor="pin" className="block text-sm font-medium">PIN de 6 números</label>
                  <input
                    id="pin"
                    name="pin"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoFocus
                    className="min-h-14 w-full rounded-xl border border-linha bg-white text-center text-2xl tracking-[0.4em] tabular-nums focus:border-azul focus:outline-2 focus:outline-azul/20"
                    aria-describedby={erroPin ? "erro-pin" : undefined}
                  />
                  {erroPin && (
                    <p id="erro-pin" role="alert" className="text-sm text-erro">
                      {erroPin}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Botao type="submit" tamanho="g" className="flex-1" disabled={enviando || pin.length !== 6}>
                      {enviando ? "Verificando…" : "Confirmar PIN"}
                    </Botao>
                    <Botao variante="secundario" tamanho="g" onClick={() => { setPinAberto(false); setErroPin(null); }}>
                      Cancelar
                    </Botao>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <ValoresComerciais c={comercial} validade={p.validade} versao={versaoPin ?? p.versao} token={p.token} />
          )}
        </Cartao>

        <p className="nao-imprimir text-center text-xs text-cinza">
          {p.empresa.nome}
          {p.empresa.contato ? ` · ${p.empresa.contato}` : ""}
          {p.empresa.cidade ? ` · ${p.empresa.cidade}` : ""}
        </p>
      </div>
    </main>
  );
}

function Dado({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl bg-papel p-3">
      <p className="text-xl font-bold text-azul tabular-nums">{valor}</p>
      <p className="text-xs text-cinza">{rotulo}</p>
    </div>
  );
}

function ValoresComerciais({ c, validade, versao, token }: { c: SnapshotComercial; validade: string | null; versao: number; token: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Selo cor="verde">Valores liberados</Selo>
        <div className="flex gap-2 nao-imprimir">
          <a
            href={`/api/p/${token}/pdf`}
            className="inline-flex min-h-11 items-center rounded-lg bg-azul px-4 text-sm font-medium text-white"
            download
          >
            Baixar PDF
          </a>
          <button onClick={() => window.print()} className="inline-flex min-h-11 items-center rounded-lg border border-linha bg-white px-4 text-sm font-medium text-azul">
            Imprimir
          </button>
        </div>
      </div>
      {c.linhas.length > 0 && (
        <ul className="divide-y divide-linha text-sm">
          {c.linhas.map((l, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">
                {l.descricao}
                {l.quantidade != null && <span className="block text-xs text-cinza">{formatarQtd(l.quantidade)} {l.unidade}{l.precoUnit != null ? ` × ${formatarBRL(l.precoUnit)}` : ""}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{formatarBRL(l.total)}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-cinza">Subtotal</dt><dd className="tabular-nums">{formatarBRL(c.subtotal)}</dd></div>
        {c.desconto > 0 && <div className="flex justify-between"><dt className="text-cinza">Desconto</dt><dd className="tabular-nums">- {formatarBRL(c.desconto)}</dd></div>}
      </dl>
      <div className="flex items-center justify-between rounded-xl bg-azul px-4 py-3 text-white">
        <span className="font-semibold">Total</span>
        <span className="text-2xl font-bold tabular-nums">{formatarBRL(c.total)}</span>
      </div>
      <div className="space-y-2 text-sm">
        {c.condicoes.aVista && (
          <p><strong>À vista:</strong> {formatarBRL(c.condicoes.aVista.valor)}{c.condicoes.aVista.observacao ? ` · ${c.condicoes.aVista.observacao}` : ""}</p>
        )}
        {c.condicoes.cartao && (
          <div>
            <p className="font-semibold">Cartão de crédito</p>
            <ul className="tabular-nums">{c.condicoes.cartao.opcoes.map((o) => <li key={o.parcelas}>{o.parcelas}x de {formatarBRL(o.valorParcela)}</li>)}</ul>
            {c.condicoes.cartao.observacao && <p className="text-xs text-cinza">{c.condicoes.cartao.observacao}</p>}
          </div>
        )}
        {c.condicoes.financiamento && (
          <div>
            <p className="font-semibold">Financiamento{c.condicoes.financiamento.instituicao ? ` · ${c.condicoes.financiamento.instituicao}` : ""}</p>
            {c.condicoes.financiamento.entrada > 0 && <p>Entrada: {formatarBRL(c.condicoes.financiamento.entrada)}</p>}
            <ul className="tabular-nums">{c.condicoes.financiamento.opcoes.map((o) => <li key={o.parcelas}>{o.parcelas}x de {formatarBRL(o.valorParcela)}</li>)}</ul>
            {c.condicoes.financiamento.observacao && <p className="text-xs text-cinza">{c.condicoes.financiamento.observacao}</p>}
          </div>
        )}
      </div>
      {c.garantias && <div><p className="text-sm font-semibold">Garantias</p><p className="whitespace-pre-line text-sm text-cinza">{c.garantias}</p></div>}
      {c.observacoes && <div><p className="text-sm font-semibold">Observações</p><p className="whitespace-pre-line text-sm text-cinza">{c.observacoes}</p></div>}
      <p className="text-xs text-cinza">
        Versão {versao}{validade ? ` · válida até ${formatarData(validade)}` : ""}.
      </p>
    </div>
  );
}

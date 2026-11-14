"use client";

import { useMemo, useState } from "react";
import { salvarProjeto } from "@/lib/acoes/projetos";
import { CampoNumero } from "@/components/campos";
import { Aviso, Botao, Campo, Cartao, Entrada, Selecao, Selo } from "@/components/ui";
import { estimarGeracao, kitVazio, potenciaInversoresKw, potenciaKwp, sincronizarKit, verificarEletrica, novoArranjo, type StatusConferencia } from "@/lib/dominio/kit";
import { formatarNumero } from "@/lib/dominio/dinheiro";
import { mapaDoCatalogo } from "@/lib/dominio/kit";
import type { Cena, ItemCatalogo, Kit } from "@/lib/dominio/tipos";

const HSP = 4.5;
const RENDIMENTO = 0.78;
const ORIGENS = [
  "Simulação do fornecedor (anexo)",
  "Estimativa com irradiação local (CRESESB/SunData)",
  "Medição de instalação semelhante",
  "Outra (descrever abaixo)",
];

const ROTULO_STATUS: Record<StatusConferencia, { rotulo: string; cor: "verde" | "erro" | "sol" | "neutro" | "azul" }> = {
  ok: { rotulo: "OK", cor: "verde" },
  atencao: { rotulo: "Atenção", cor: "sol" },
  erro: { rotulo: "Corrigir", cor: "erro" },
  sem_dados: { rotulo: "Sem dados", cor: "neutro" },
  manual: { rotulo: "Confirmar", cor: "azul" },
};

export function KitForm({
  projetoId,
  revisao,
  cena,
  kitInicial,
  catalogo,
}: {
  projetoId: string;
  revisao: number;
  cena: Cena;
  kitInicial: Kit;
  catalogo: ItemCatalogo[];
}) {
  const mapa = useMemo(() => mapaDoCatalogo(catalogo), [catalogo]);
  const modulos = catalogo.filter((i) => i.tipo === "modulo" && i.ativo);
  const inversores = catalogo.filter((i) => i.tipo === "inversor" && i.ativo);
  const [kit, setKit] = useState<Kit>(() => sincronizarKit(kitInicial ?? kitVazio(), cena));
  const [rev, setRev] = useState(revisao);
  const [estado, setEstado] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const kwp = potenciaKwp(kit, mapa);
  const kw = potenciaInversoresKw(kit, mapa);
  const conferencias = useMemo(() => verificarEletrica(kit, mapa), [kit, mapa]);
  const pendentesManuais = conferencias.filter((c) => !c.calculado && !c.validado).length;

  const salvar = async () => {
    setSalvando(true);
    setEstado(null);
    const r = await salvarProjeto(projetoId, rev, JSON.stringify({ kit }));
    setSalvando(false);
    if (r.ok && r.revisao) {
      setRev(r.revisao);
      setEstado({ tipo: "ok", texto: "Kit salvo." });
    } else {
      setEstado({ tipo: "erro", texto: r.mensagem ?? r.erro ?? "Não foi possível salvar." });
    }
  };

  const setModulos = (m: Kit["modulos"]) => setKit((k) => ({ ...k, modulos: m }));
  const setInversores = (i: Kit["inversores"]) => setKit((k) => ({ ...k, inversores: i }));
  const estimar = () => {
    const kwhMes = estimarGeracao(kwp, HSP, RENDIMENTO);
    setKit((k) => ({
      ...k,
      geracaoMensalKwh: kwhMes,
      origemGeracao: `Estimativa: ${HSP.toString().replace(".", ",")} kWh/m²·dia × 30 dias × rendimento ${RENDIMENTO.toString().replace(".", ",")}. Confirme com irradiação local.`,
    }));
  };

  const v = kit.verificacao;
  const setVer = (patch: Partial<Kit["verificacao"]>) => setKit((k) => ({ ...k, verificacao: { ...k.verificacao, ...patch } }));
  const primeiroModulo = modulos[0]?.id ?? "";
  const primeiroInversor = inversores[0]?.id ?? "";

  return (
    <div className="space-y-4">
      <Cartao titulo="Módulos" descricao={`${formatarNumero(kwp, 2)} kWp no kit. Quantidades do desenho são atualizadas automaticamente.`}>
        <ul className="space-y-2">
          {kit.modulos.map((m, i) => (
            <li key={`${m.catalogoId}-${i}`} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_120px_auto]">
              <Selecao
                aria-label="Modelo do módulo"
                value={m.catalogoId}
                onChange={(e) => setModulos(kit.modulos.map((x, j) => (j === i ? { ...x, catalogoId: e.target.value, automatico: false } : x)))}
              >
                {modulos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.fabricante} {o.modelo} · {o.specs.potenciaWp} Wp
                  </option>
                ))}
                {!modulos.some((o) => o.id === m.catalogoId) && <option value={m.catalogoId}>Item fora do catálogo</option>}
              </Selecao>
              <CampoNumero valor={m.quantidade} passo={1} min={0} max={5000} casas={0} aoMudar={(q) => setModulos(kit.modulos.map((x, j) => (j === i ? { ...x, quantidade: q, automatico: false } : x)))} />
              <div className="flex items-center gap-2 sm:col-span-1">
                {m.automatico && <Selo cor="azul">do desenho</Selo>}
                <button className="min-h-10 px-2 text-sm text-erro" onClick={() => setModulos(kit.modulos.filter((_, j) => j !== i))}>
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Botao variante="secundario" tamanho="p" disabled={!primeiroModulo} onClick={() => setModulos([...kit.modulos, { catalogoId: primeiroModulo, quantidade: 1, automatico: false }])}>
            + Adicionar modelo de módulo
          </Botao>
        </div>
      </Cartao>

      <Cartao titulo="Inversores" descricao={`${formatarNumero(kw, 2)} kW de inversor no kit.`}>
        <ul className="space-y-2">
          {kit.inversores.map((inv, i) => (
            <li key={`${inv.catalogoId}-${i}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:grid-cols-[1fr_120px_auto]">
              <Selecao
                aria-label="Modelo do inversor"
                value={inv.catalogoId}
                onChange={(e) => setInversores(kit.inversores.map((x, j) => (j === i ? { ...x, catalogoId: e.target.value } : x)))}
              >
                {inversores.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.fabricante} {o.modelo} · {String(o.specs.potenciaKw ?? "?").replace(".", ",")} kW
                  </option>
                ))}
              </Selecao>
              <CampoNumero valor={inv.quantidade} passo={1} min={1} max={50} casas={0} aoMudar={(q) => setInversores(kit.inversores.map((x, j) => (j === i ? { ...x, quantidade: q } : x)))} />
              <button className="min-h-10 px-2 text-sm text-erro" onClick={() => setInversores(kit.inversores.filter((_, j) => j !== i))}>
                Remover
              </button>
            </li>
          ))}
        </ul>
        {kit.inversores.length === 0 && <p className="text-sm text-cinza">Nenhum inversor no kit.</p>}
        <div className="mt-3">
          <Botao variante="secundario" tamanho="p" disabled={!primeiroInversor} onClick={() => setInversores([...kit.inversores, { catalogoId: primeiroInversor, quantidade: 1 }])}>
            + Adicionar inversor
          </Botao>
        </div>
      </Cartao>

      <Cartao titulo="Geração mensal estimada" descricao="Informe o valor e a origem. Sem origem, o número não é mostrado ao cliente como garantia.">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoNumero rotulo="kWh por mês" valor={kit.geracaoMensalKwh} passo={10} min={0} max={100000} casas={0} sufixo="kWh" aoMudar={(q) => setKit((k) => ({ ...k, geracaoMensalKwh: q }))} />
          <Campo rotulo="Origem da estimativa">
            <Selecao value={ORIGENS.includes(kit.origemGeracao) ? kit.origemGeracao : "outra"} onChange={(e) => setKit((k) => ({ ...k, origemGeracao: e.target.value === "Outra (descrever abaixo)" ? "" : e.target.value }))}>
              {ORIGENS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
              <option value="outra">Outra origem</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Descrição da origem" className="sm:col-span-2" opcional>
            <Entrada value={kit.origemGeracao} onChange={(e) => setKit((k) => ({ ...k, origemGeracao: e.target.value }))} />
          </Campo>
        </div>
        <div className="mt-3">
          <Botao variante="secundario" tamanho="p" onClick={estimar} disabled={kwp <= 0}>
            Estimar com {HSP.toString().replace(".", ",")} HSP × 30 dias × {RENDIMENTO.toString().replace(".", ",")}
          </Botao>
        </div>
      </Cartao>

      <Cartao
        titulo="Verificação elétrica"
        descricao="Confere tensão, faixa de MPPT e corrente com as fichas técnicas. Não substitui o projeto elétrico assinado por profissional habilitado."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoNumero rotulo="Temperatura mínima do local" valor={v.tempMinC} passo={1} min={-10} max={50} casas={0} sufixo="°C" aoMudar={(t) => setVer({ tempMinC: t })} />
          <CampoNumero rotulo="Temperatura máxima da célula" valor={v.tempMaxCelulaC} passo={1} min={20} max={100} casas={0} sufixo="°C" aoMudar={(t) => setVer({ tempMaxCelulaC: t })} />
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Arranjos (strings por entrada MPPT)</p>
          {v.arranjos.map((a, i) => (
            <div key={a.id} className="grid grid-cols-2 gap-2 rounded-xl border border-linha p-2 sm:grid-cols-[1.4fr_0.6fr_1.4fr_0.6fr_0.8fr_auto]">
              <Selecao className="col-span-2 sm:col-span-1" aria-label="Inversor do arranjo" value={a.inversorId} onChange={(e) => setVer({ arranjos: v.arranjos.map((x, j) => (j === i ? { ...x, inversorId: e.target.value } : x)) })}>
                {inversores.map((o) => (
                  <option key={o.id} value={o.id}>{o.modelo}</option>
                ))}
              </Selecao>
              <CampoNumero valor={a.mppt} passo={1} min={1} max={4} casas={0} aoMudar={(q) => setVer({ arranjos: v.arranjos.map((x, j) => (j === i ? { ...x, mppt: q } : x)) })} />
              <Selecao className="col-span-2 sm:col-span-1" aria-label="Módulo do arranjo" value={a.moduloId} onChange={(e) => setVer({ arranjos: v.arranjos.map((x, j) => (j === i ? { ...x, moduloId: e.target.value } : x)) })}>
                {modulos.map((o) => (
                  <option key={o.id} value={o.id}>{o.modelo}</option>
                ))}
              </Selecao>
              <CampoNumero valor={a.strings} passo={1} min={1} max={10} casas={0} aoMudar={(q) => setVer({ arranjos: v.arranjos.map((x, j) => (j === i ? { ...x, strings: q } : x)) })} />
              <CampoNumero valor={a.modulosPorString} passo={1} min={1} max={40} casas={0} aoMudar={(q) => setVer({ arranjos: v.arranjos.map((x, j) => (j === i ? { ...x, modulosPorString: q } : x)) })} />
              <button className="min-h-10 px-2 text-sm text-erro" onClick={() => setVer({ arranjos: v.arranjos.filter((_, j) => j !== i) })}>
                Remover
              </button>
            </div>
          ))}
          <Botao variante="secundario" tamanho="p" disabled={!primeiroInversor || !primeiroModulo} onClick={() => setVer({ arranjos: [...v.arranjos, novoArranjo(primeiroInversor, primeiroModulo, v.arranjos.length + 1, 10)] })}>
            + Adicionar arranjo
          </Botao>
        </div>

        <ul className="mt-4 divide-y divide-linha rounded-xl border border-linha">
          {conferencias.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.titulo}</p>
                <p className="text-xs text-cinza">{c.detalhe}</p>
              </div>
              {c.calculado ? (
                <Selo cor={ROTULO_STATUS[c.status].cor}>{ROTULO_STATUS[c.status].rotulo}</Selo>
              ) : (
                <label className="inline-flex min-h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={c.validado}
                    onChange={(e) => setVer({ validados: { ...v.validados, [c.id]: e.target.checked } })}
                  />
                  Validado
                </label>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-cinza">
          Itens para confirmar manualmente: {pendentesManuais}. Eles aparecem como pendentes no orçamento e na proposta.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Responsável técnico" opcional>
            <Entrada value={v.responsavel} onChange={(e) => setVer({ responsavel: e.target.value })} />
          </Campo>
          <Campo rotulo="Observações da verificação" opcional>
            <Entrada value={v.observacoes} onChange={(e) => setVer({ observacoes: e.target.value })} />
          </Campo>
        </div>
      </Cartao>

      {estado && <Aviso tipo={estado.tipo === "ok" ? "ok" : "erro"}>{estado.texto}</Aviso>}
      <div className="sticky bottom-16 z-10 flex justify-end md:bottom-4">
        <Botao tamanho="g" onClick={() => void salvar()} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar kit"}
        </Botao>
      </div>
    </div>
  );
}


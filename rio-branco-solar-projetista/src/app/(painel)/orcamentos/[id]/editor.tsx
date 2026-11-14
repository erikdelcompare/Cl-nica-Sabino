"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CampoDinheiro, CampoNumero } from "@/components/campos";
import { Aviso, Botao, Campo, Cartao, Entrada, AreaTexto, Selecao, Selo, Vazio } from "@/components/ui";
import {
  definirStatusAcao,
  definirVencimentoAcao,
  duplicarOrcamento,
  linkDaVersao,
  publicarOrcamentoAcao,
  recalcularOrcamento,
  revogarAcao,
  salvarOrcamento,
  trocarPinAcao,
} from "@/lib/acoes/orcamentos";
import { formatarBRL, formatarData } from "@/lib/dominio/dinheiro";
import { itemAvulso, GRUPOS } from "@/lib/dominio/materiais";
import { calcularTotais, condicoesPadrao, ROTULO_STATUS } from "@/lib/dominio/orcamento";
import type { Condicoes, DadosOrcamento, ItemCatalogo, ItemOrcamento, ModoExibicao, OpcaoParcelamento } from "@/lib/dominio/tipos";
import type { VersaoResumo } from "@/lib/servidor/dados";


export interface EditorOrcamentoProps {
  id: string;
  revisao: number;
  numero: string;
  clienteNome: string;
  clienteId: string;
  projetoNome: string;
  projetoId: string;
  projetoTipo: "telhado" | "solo";
  arquivado: boolean;
  dados: DadosOrcamento;
  itens: ItemOrcamento[];
  versoes: VersaoResumo[];
  catalogo: ItemCatalogo[];
  cenaResumo: { modulos: number; potenciaKwp: number; geracao: number | null };
}

type Status = "salvo" | "pendente" | "salvando" | "erro" | "conflito";
const GRUPOS_LISTA = Object.values(GRUPOS);

export function EditorOrcamento(props: EditorOrcamentoProps) {
  const [dados, setDadosState] = useState<DadosOrcamento>(props.dados);
  const [itens, setItensState] = useState<ItemOrcamento[]>(props.itens);
  const [status, setStatus] = useState<Status>("salvo");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [resultado, setResultado] = useState<{ link: string; pin: string; versao: number } | null>(null);
  const [opcaoVencimento, setOpcaoVencimento] = useState<"nenhum" | "data">("nenhum");
  const [dataVencimento, setDataVencimento] = useState("");
  const [revogarAnteriores, setRevogarAnteriores] = useState(true);
  const [versoes, setVersoes] = useState(props.versoes);
  const [pinNovo, setPinNovo] = useState<{ versaoId: string; pin: string } | null>(null);
  const [novoItem, setNovoItem] = useState({ grupo: GRUPOS.eletrica as string, descricao: "", unidade: "un", quantidade: 1, custo: 0, preco: 0 });

  const dadosRef = useRef(dados);
  const itensRef = useRef(itens);
  const revRef = useRef(props.revisao);
  const sujo = useRef(false);
  const salvando = useRef(false);
  const aguardando = useRef(false);
  const [tick, setTick] = useState(0);

  const mapaCatalogo = useMemo(() => new Map(props.catalogo.map((c) => [c.id, c])), [props.catalogo]);
  const totais = useMemo(() => calcularTotais(dados, itens), [dados, itens]);
  const bloqueado = props.arquivado;
  const [agora] = useState(() => Date.now());

  async function executarSalvar(): Promise<void> {
    if (salvando.current) {
      aguardando.current = true;
      return;
    }
    salvando.current = true;
    sujo.current = false;
    setStatus("salvando");
    const r = await salvarOrcamento(props.id, revRef.current, JSON.stringify({ dados: dadosRef.current, itens: itensRef.current }));
    salvando.current = false;
    if (r.ok && r.revisao) {
      revRef.current = r.revisao;
      setUltimo(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Rio_Branco" }));
      setMensagem(null);
      setStatus(sujo.current ? "pendente" : "salvo");
    } else if (r.conflito) {
      sujo.current = true;
      setStatus("conflito");
      setMensagem(r.mensagem ?? null);
    } else {
      sujo.current = true;
      setStatus("erro");
      setMensagem(r.erro ?? "Não foi possível salvar.");
    }
    if (aguardando.current) {
      aguardando.current = false;
      void executarSalvar();
    }
  }
  const salvarAgora = () => executarSalvar();

  useEffect(() => {
    if (!sujo.current) return;
    const t = setTimeout(() => void executarSalvar(), 1500);
    return () => clearTimeout(t);
    // executarSalvar lê apenas refs: reagendar só quando há alteração (tick).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      if (sujo.current || salvando.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, []);

  const marcar = () => {
    sujo.current = true;
    setStatus((s) => (s === "salvando" ? s : "pendente"));
    setTick((t) => t + 1);
  };
  const setDados = (fn: (d: DadosOrcamento) => DadosOrcamento) => {
    const nd = fn(dadosRef.current);
    dadosRef.current = nd;
    setDadosState(nd);
    marcar();
  };
  const setItens = (fn: (i: ItemOrcamento[]) => ItemOrcamento[]) => {
    const ni = fn(itensRef.current);
    itensRef.current = ni;
    setItensState(ni);
    marcar();
  };
  const atualizarItem = (id: string, patch: Partial<ItemOrcamento>) => setItens((lista) => lista.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const recalcular = async () => {
    setMensagem(null);
    const r = await recalcularOrcamento(props.id, JSON.stringify(itensRef.current));
    if ("erro" in r && r.erro) return setMensagem(r.erro);
    if (!("ok" in r) || !r.ok) return;
    const { resumo } = r;
    itensRef.current = r.itens;
    setItensState(r.itens);
    marcar();
    const partes: string[] = [];
    if (resumo.alterados.length > 0) partes.push(`${resumo.alterados.length} quantidade(s) mudaram (destacadas)`);
    if (resumo.novos.length > 0) partes.push(`${resumo.novos.length} item(ns) novo(s)`);
    if (resumo.removidos.length > 0) partes.push(`${resumo.removidos.length} item(ns) saíram do desenho`);
    if (resumo.precosManuaisMantidos > 0) partes.push(`${resumo.precosManuaisMantidos} preço(s) ajustado(s) à mão foram mantidos`);
    setBanner(partes.length > 0 ? `Lista de materiais atualizada: ${partes.join("; ")}.` : "Lista de materiais já estava em dia.");
  };

  const publicar = async () => {
    setPublicando(true);
    setMensagem(null);
    await salvarAgora();
    if (status === "conflito") {
      setPublicando(false);
      return;
    }
    const r = await publicarOrcamentoAcao(
      props.id,
      JSON.stringify({
        linkExpiraEm: opcaoVencimento === "data" && dataVencimento ? new Date(`${dataVencimento}T23:59:59-03:00`).toISOString() : null,
        revogarAnteriores,
      }),
    );
    setPublicando(false);
    if (r.erro || !r.link || !r.pin || !r.versaoId) return setMensagem(r.erro ?? "Não foi possível publicar.");
    setResultado({ link: r.link, pin: r.pin, versao: r.versao ?? 1 });
    setVersoes((v) => [
      {
        id: r.versaoId!,
        orcamento_id: props.id,
        projeto_id: props.projetoId,
        cliente_id: props.clienteId,
        versao: r.versao ?? 1,
        publicado_em: new Date().toISOString(),
        total_centavos: totais.total,
        validade: dadosRef.current.validade,
        modo_exibicao: dadosRef.current.exibicao.modo,
        link_expira_em: opcaoVencimento === "data" && dataVencimento ? new Date(`${dataVencimento}T23:59:59-03:00`).toISOString() : null,
        revogada_em: null,
        pin_bloqueado_ate: null,
        visualizacoes: 0,
        ultima_visualizacao_em: null,
        desbloqueios: 0,
        ultimo_desbloqueio_em: null,
        tem_capa: false,
        status: "publicada",
      },
      ...v.map((x) => (revogarAnteriores && !x.revogada_em ? { ...x, revogada_em: new Date().toISOString() } : x)),
    ]);
  };

  const copiar = async (texto: string, rotulo: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setBanner(`${rotulo} copiado.`);
    } catch {
      setBanner(`Não consegui copiar. Selecione e copie manualmente: ${texto}`);
    }
  };

  const copiarLinkVersao = async (versaoId: string) => {
    const r = await linkDaVersao(versaoId);
    if (r.erro || !r.link) return setMensagem(r.erro ?? "Não foi possível recuperar o link.");
    await copiar(r.link, "Link");
  };

  const mudarStatus = async (versaoId: string, s: "publicada" | "aceita" | "recusada") => {
    const r = await definirStatusAcao(versaoId, s);
    if (r.erro) return setMensagem(r.erro);
    setVersoes((v) => v.map((x) => (x.id === versaoId ? { ...x, status: s } : x)));
    setBanner(r.mensagem ?? "Status atualizado.");
  };

  const cond = dados.condicoes ?? condicoesPadrao();
  const setCond = (fn: (c: Condicoes) => Condicoes) => setDados((d) => ({ ...d, condicoes: fn(d.condicoes ?? condicoesPadrao()) }));

  const adicionarAvulso = () => {
    if (!novoItem.descricao.trim()) return setMensagem("Descreva o item avulso.");
    const it = itemAvulso(novoItem.grupo, {
      descricao: novoItem.descricao.trim(),
      unidade: novoItem.unidade || "un",
      quantidade: novoItem.quantidade || 1,
      custo_unit: novoItem.custo,
      preco_unit: novoItem.preco,
      preco_manual: true,
      mostrar_descricao: true,
      mostrar_preco: false,
    });
    setItens((l) => [...l, it]);
    setNovoItem({ grupo: novoItem.grupo, descricao: "", unidade: "un", quantidade: 1, custo: 0, preco: 0 });
  };

  const ativoCatalogo = (catalogoId: string | null) => (catalogoId ? mapaCatalogo.get(catalogoId) : undefined);

  const statusRotulo: Record<Status, string> = {
    salvo: ultimo ? `Salvo às ${ultimo}` : "Tudo salvo",
    pendente: "Alterações não salvas",
    salvando: "Salvando…",
    erro: "Não salvou",
    conflito: "Alterado em outro aparelho",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          role="status"
          aria-live="polite"
          className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium ${
            status === "salvo" ? "border-verde/30 bg-verde-claro text-verde" : status === "erro" || status === "conflito" ? "border-erro/30 bg-erro-claro text-erro" : "border-sol/50 bg-sol-claro/60 text-azul-escuro"
          }`}
        >
          {statusRotulo[status]}
        </span>
        <Botao variante="secundario" tamanho="p" onClick={() => void salvarAgora()} disabled={status === "salvando" || bloqueado}>
          Salvar agora
        </Botao>
        <Botao
          variante="secundario"
          tamanho="p"
          onClick={async () => {
            const r = await duplicarOrcamento(props.id);
            if (r?.erro) setMensagem(r.erro);
          }}
        >
          Duplicar
        </Botao>
        <Selo cor={props.arquivado ? "neutro" : "verde"}>{props.arquivado ? "Arquivado" : "Ativo"}</Selo>
      </div>

      {status === "conflito" && <Aviso tipo="erro">{mensagem} <button className="font-semibold underline" onClick={() => window.location.reload()}>Recarregar</button></Aviso>}
      {status === "erro" && <Aviso tipo="erro">{mensagem} <button className="font-semibold underline" onClick={() => void salvarAgora()}>Tentar de novo</button></Aviso>}
      {mensagem && status !== "erro" && status !== "conflito" && <Aviso tipo="erro">{mensagem}</Aviso>}
      {banner && (
        <Aviso tipo="info">
          <span className="flex justify-between gap-2">
            <span>{banner}</span>
            <button className="text-xs font-semibold underline" onClick={() => setBanner(null)}>Fechar</button>
          </span>
        </Aviso>
      )}

      {/* Resumo financeiro: visível só para o proprietário. */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Resumo titulo="Custo total (interno)" valor={formatarBRL(totais.custoTotal)} discreto />
        <Resumo titulo="Preço final" valor={formatarBRL(totais.total)} destaque />
        <Resumo titulo="Margem (interna)" valor={`${formatarBRL(totais.margem)} · ${totais.margemPct.toString().replace(".", ",")}%`} discreto />
        <Resumo titulo="Desconto" valor={formatarBRL(totais.desconto)} discreto />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Cartao titulo="Dados do orçamento" descricao={`${props.numero} · ${props.clienteNome} · ${props.projetoNome}`}>
          <div className="grid gap-3">
            <Campo rotulo="Título para o cliente">
              <Entrada value={dados.titulo} disabled={bloqueado} onChange={(e) => setDados((d) => ({ ...d, titulo: e.target.value }))} />
            </Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Validade da proposta" opcional>
                <Entrada type="date" value={dados.validade ?? ""} disabled={bloqueado} onChange={(e) => setDados((d) => ({ ...d, validade: e.target.value || null }))} />
              </Campo>
              <Campo rotulo="Mostrar ao cliente">
                <Selecao value={dados.exibicao.modo} disabled={bloqueado} onChange={(e) => setDados((d) => ({ ...d, exibicao: { modo: e.target.value as ModoExibicao } }))}>
                  <option value="total">Só o total</option>
                  <option value="grupos">Valores por grupo</option>
                  <option value="itens">Valores por item selecionado</option>
                </Selecao>
              </Campo>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <CampoDinheiro rotulo="Mão de obra: custo" centavos={dados.mao_de_obra_custo} desabilitado={bloqueado} aoMudar={(v) => setDados((d) => ({ ...d, mao_de_obra_custo: v }))} />
              <CampoDinheiro rotulo="Mão de obra: preço" centavos={dados.mao_de_obra_preco} desabilitado={bloqueado} aoMudar={(v) => setDados((d) => ({ ...d, mao_de_obra_preco: v }))} />
              <CampoDinheiro rotulo="Frete: custo" centavos={dados.frete_custo} desabilitado={bloqueado} aoMudar={(v) => setDados((d) => ({ ...d, frete_custo: v }))} />
              <CampoDinheiro rotulo="Frete: preço" centavos={dados.frete_preco} desabilitado={bloqueado} aoMudar={(v) => setDados((d) => ({ ...d, frete_preco: v }))} />
              <CampoDinheiro rotulo="Desconto em reais" centavos={dados.desconto} desabilitado={bloqueado} aoMudar={(v) => setDados((d) => ({ ...d, desconto: v }))} />
            </div>
            <Campo rotulo="Garantias" opcional>
              <AreaTexto value={dados.garantias} disabled={bloqueado} onChange={(e) => setDados((d) => ({ ...d, garantias: e.target.value }))} />
            </Campo>
            <Campo rotulo="Observações para o cliente" opcional>
              <AreaTexto value={dados.observacoes} disabled={bloqueado} onChange={(e) => setDados((d) => ({ ...d, observacoes: e.target.value }))} />
            </Campo>
          </div>
        </Cartao>

        <Cartao titulo="Condições de pagamento" descricao="Valores informados por você. Nada é calculado automaticamente aqui.">
          <div className="space-y-4">
            <div className="rounded-xl border border-linha p-3">
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={cond.aVista.ativo} onChange={(e) => setCond((c) => ({ ...c, aVista: { ...c.aVista, ativo: e.target.checked } }))} /> À vista
              </label>
              {cond.aVista.ativo && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <CampoDinheiro rotulo="Valor à vista (vazio = preço final)" centavos={cond.aVista.valor} aoMudar={(v) => setCond((c) => ({ ...c, aVista: { ...c.aVista, valor: v } }))} />
                  <Campo rotulo="Observação">
                    <Entrada value={cond.aVista.observacao} onChange={(e) => setCond((c) => ({ ...c, aVista: { ...c.aVista, observacao: e.target.value } }))} />
                  </Campo>
                </div>
              )}
            </div>
            <ParcelasBloco
              titulo="Cartão de crédito"
              ativo={cond.cartao.ativo}
              opcoes={cond.cartao.opcoes}
              observacao={cond.cartao.observacao}
              onAtivo={(a) => setCond((c) => ({ ...c, cartao: { ...c.cartao, ativo: a } }))}
              onOpcoes={(o) => setCond((c) => ({ ...c, cartao: { ...c.cartao, opcoes: o } }))}
              onObs={(t) => setCond((c) => ({ ...c, cartao: { ...c.cartao, observacao: t } }))}
            />
            <ParcelasBloco
              titulo="Financiamento"
              ativo={cond.financiamento.ativo}
              opcoes={cond.financiamento.opcoes}
              observacao={cond.financiamento.observacao}
              extra={
                <div className="grid gap-2 sm:grid-cols-2">
                  <Campo rotulo="Instituição">
                    <Entrada value={cond.financiamento.instituicao} onChange={(e) => setCond((c) => ({ ...c, financiamento: { ...c.financiamento, instituicao: e.target.value } }))} />
                  </Campo>
                  <CampoDinheiro rotulo="Entrada" centavos={cond.financiamento.entrada} aoMudar={(v) => setCond((c) => ({ ...c, financiamento: { ...c.financiamento, entrada: v } }))} />
                </div>
              }
              onAtivo={(a) => setCond((c) => ({ ...c, financiamento: { ...c.financiamento, ativo: a } }))}
              onOpcoes={(o) => setCond((c) => ({ ...c, financiamento: { ...c.financiamento, opcoes: o } }))}
              onObs={(t) => setCond((c) => ({ ...c, financiamento: { ...c.financiamento, observacao: t } }))}
            />
          </div>
        </Cartao>
      </div>

      <Cartao
        titulo="Itens do orçamento"
        descricao="Materiais do desenho e do kit, mais itens avulsos e serviços. Preços ajustados à mão não mudam sozinhos."
        acoes={
          <Botao variante="secundario" tamanho="p" onClick={() => void recalcular()} disabled={bloqueado}>
            Recalcular lista de materiais
          </Botao>
        }
      >
        {itens.length === 0 ? (
          <Vazio titulo="Nenhum item ainda." />
        ) : (
          <div className="space-y-2">
            {itens.map((it) => {
              const cat = ativoCatalogo(it.catalogo_id);
              const diferePreco = cat && !it.preco_manual ? false : Boolean(cat && cat.preco_centavos !== it.preco_unit);
              return (
                <div key={it.id} className="rounded-xl border border-linha p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Entrada
                        aria-label="Descrição do item"
                        value={it.descricao}
                        disabled={bloqueado}
                        onChange={(e) => atualizarItem(it.id, { descricao: e.target.value })}
                        className="font-medium"
                      />
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-cinza">
                        <span>{it.grupo}</span>
                        {it.origem === "desenho" || it.origem === "kit" ? <Selo cor="azul">do desenho</Selo> : <Selo>{it.origem === "servico" ? "serviço" : "avulso"}</Selo>}
                        {it.quantidade_anterior !== null && (
                          <Selo cor="sol">mudou: era {it.quantidade_anterior.toString().replace(".", ",")} {it.unidade}</Selo>
                        )}
                        {it.preco_manual && <Selo cor="neutro">preço à mão</Selo>}
                        {diferePreco && cat && (
                          <button className="underline" onClick={() => atualizarItem(it.id, { custo_unit: cat.custo_centavos, preco_unit: cat.preco_centavos, preco_manual: false })}>
                            Usar preço do catálogo ({formatarBRL(cat.preco_centavos)})
                          </button>
                        )}
                      </div>
                    </div>
                    <button className="min-h-10 px-2 text-sm text-erro disabled:opacity-40" disabled={bloqueado} onClick={() => setItens((l) => l.filter((x) => x.id !== it.id))}>
                      Remover
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <CampoNumero rotulo="Qtd" valor={it.quantidade} passo={1} min={0} max={100000} casas={2} desabilitado={bloqueado} aoMudar={(q) => atualizarItem(it.id, { quantidade: q, quantidade_anterior: null })} />
                    <Campo rotulo="Unidade">
                      <Entrada value={it.unidade} disabled={bloqueado} onChange={(e) => atualizarItem(it.id, { unidade: e.target.value.slice(0, 8) })} />
                    </Campo>
                    <CampoDinheiro rotulo="Custo unit." centavos={it.custo_unit} desabilitado={bloqueado} aoMudar={(v) => atualizarItem(it.id, { custo_unit: v })} />
                    <CampoDinheiro rotulo="Preço unit." centavos={it.preco_unit} desabilitado={bloqueado} aoMudar={(v) => atualizarItem(it.id, { preco_unit: v, preco_manual: true })} />
                    <div className="col-span-2 flex flex-col justify-end gap-1 text-xs sm:col-span-1">
                      <label className="inline-flex min-h-9 items-center gap-2"><input type="checkbox" checked={it.mostrar_descricao} onChange={(e) => atualizarItem(it.id, { mostrar_descricao: e.target.checked })} /> Mostrar descrição</label>
                      <label className="inline-flex min-h-9 items-center gap-2"><input type="checkbox" checked={it.mostrar_preco} onChange={(e) => atualizarItem(it.id, { mostrar_preco: e.target.checked })} /> Mostrar preço</label>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-cinza">
                    Total: custo {formatarBRL(Math.round(it.quantidade * it.custo_unit))} · preço {formatarBRL(Math.round(it.quantidade * it.preco_unit))}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <details className="mt-4 rounded-xl border border-dashed border-linha p-3">
          <summary className="min-h-10 cursor-pointer text-sm font-medium text-azul">+ Adicionar item avulso (cabos, proteções, parafusos, serviços)</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-6">
            <Campo rotulo="Grupo" className="sm:col-span-2">
              <Selecao value={novoItem.grupo} onChange={(e) => setNovoItem({ ...novoItem, grupo: e.target.value })}>
                {GRUPOS_LISTA.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Descrição" className="sm:col-span-4">
              <Entrada value={novoItem.descricao} onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })} />
            </Campo>
            <CampoNumero rotulo="Qtd" valor={novoItem.quantidade} passo={1} min={0} casas={2} aoMudar={(q) => setNovoItem({ ...novoItem, quantidade: q })} />
            <Campo rotulo="Unidade">
              <Entrada value={novoItem.unidade} onChange={(e) => setNovoItem({ ...novoItem, unidade: e.target.value })} />
            </Campo>
            <CampoDinheiro rotulo="Custo" centavos={novoItem.custo} aoMudar={(v) => setNovoItem({ ...novoItem, custo: v })} />
            <CampoDinheiro rotulo="Preço" centavos={novoItem.preco} aoMudar={(v) => setNovoItem({ ...novoItem, preco: v })} />
            <div className="sm:col-span-6">
              <Botao variante="secundario" tamanho="p" onClick={adicionarAvulso} disabled={bloqueado}>
                Adicionar item
              </Botao>
            </div>
          </div>
        </details>
      </Cartao>

      <Cartao titulo="Publicar proposta" descricao="Gera uma versão congelada com o link individual e um PIN de 6 dígitos. Alterações futuras não mudam esta versão.">
        {resultado ? (
          <div className="space-y-3">
            <Aviso tipo="ok">Versão {resultado.versao} publicada. Copie o link e o PIN e envie ao cliente, separadamente.</Aviso>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="mb-1 text-sm font-medium">Link da proposta</p>
                <p className="break-all rounded-lg bg-papel px-3 py-2 font-mono text-sm">{resultado.link}</p>
              </div>
              <Botao className="self-end" onClick={() => void copiar(resultado.link, "Link")}>Copiar link</Botao>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="mb-1 text-sm font-medium">PIN para ver os valores</p>
                <p className="text-3xl font-bold tracking-[0.3em] tabular-nums text-azul">{resultado.pin}</p>
                <p className="text-xs text-cinza">Este PIN aparece só agora. Se perder, use Trocar PIN na lista de versões.</p>
              </div>
              <Botao variante="secundario" className="self-end" onClick={() => void copiar(resultado.pin, "PIN")}>Copiar PIN</Botao>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Vencimento do link">
                <Selecao value={opcaoVencimento} onChange={(e) => setOpcaoVencimento(e.target.value as "nenhum" | "data")} disabled={bloqueado}>
                  <option value="nenhum">Sem vencimento</option>
                  <option value="data">Até uma data</option>
                </Selecao>
              </Campo>
              {opcaoVencimento === "data" && (
                <Campo rotulo="Data limite">
                  <Entrada type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
                </Campo>
              )}
            </div>
            {versoes.some((v) => !v.revogada_em) && (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={revogarAnteriores} onChange={(e) => setRevogarAnteriores(e.target.checked)} /> Revogar os links das versões anteriores deste orçamento
              </label>
            )}
            <Botao tamanho="g" onClick={() => void publicar()} disabled={publicando || bloqueado || itens.length === 0 || totais.total <= 0}>
              {publicando ? "Publicando…" : "Finalizar orçamento e publicar"}
            </Botao>
            {totais.total <= 0 && <p className="text-xs text-cinza">Defina preços para publicar.</p>}
          </div>
        )}
      </Cartao>

      <Cartao titulo="Versões publicadas" descricao="Consulte exatamente o que foi apresentado. Aqui você troca o PIN, revoga o link ou define vencimento.">
        {versoes.length === 0 ? (
          <Vazio titulo="Ainda não publicado." />
        ) : (
          <ul className="divide-y divide-linha">
            {versoes.map((v) => {
              const expirou = v.link_expira_em && new Date(v.link_expira_em).getTime() < agora;
              return (
                <li key={v.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">Versão {v.versao}</p>
                      <p className="text-xs text-cinza">
                        {formatarData(v.publicado_em)} · {formatarBRL(v.total_centavos)} · {v.modo_exibicao === "total" ? "só total" : v.modo_exibicao === "grupos" ? "por grupo" : "por item"}
                        {v.link_expira_em && ` · vence em ${formatarData(v.link_expira_em)}`}
                        {v.visualizacoes > 0 && ` · ${v.visualizacoes} visualização(ões)`}
                        {v.desbloqueios > 0 && ` · ${v.desbloqueios} desbloqueio(s)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Selo cor={v.revogada_em ? "erro" : expirou ? "sol" : v.status === "aceita" ? "verde" : v.status === "recusada" ? "erro" : "azul"}>
                        {v.revogada_em ? "Revogada" : expirou ? "Link vencido" : ROTULO_STATUS[v.status] ?? v.status}
                      </Selo>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={`/orcamentos/${props.id}/versoes/${v.id}`} className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-medium text-azul hover:bg-azul-claro">
                      Ver o que foi enviado
                    </a>
                    {!v.revogada_em && (
                      <>
                        <Botao tamanho="p" variante="secundario" onClick={() => void copiarLinkVersao(v.id)}>Copiar link</Botao>
                        <Botao
                          tamanho="p"
                          variante="secundario"
                          onClick={async () => {
                            if (!window.confirm("Trocar o PIN? O PIN antigo deixa de valer e os desbloqueios anteriores são encerrados.")) return;
                            const r = await trocarPinAcao(v.id);
                            if (r.erro || !r.pin) return setMensagem(r.erro ?? "Não foi possível trocar o PIN.");
                            setPinNovo({ versaoId: v.id, pin: r.pin });
                          }}
                        >
                          Trocar PIN
                        </Botao>
                        <Botao
                          tamanho="p"
                          variante="perigo"
                          onClick={async () => {
                            if (!window.confirm("Revogar este link? Quem tiver o link deixa de ver a proposta.")) return;
                            const r = await revogarAcao(v.id);
                            if (r.erro) return setMensagem(r.erro);
                            setVersoes((l) => l.map((x) => (x.id === v.id ? { ...x, revogada_em: new Date().toISOString() } : x)));
                          }}
                        >
                          Revogar
                        </Botao>
                      </>
                    )}
                  </div>
                  {pinNovo?.versaoId === v.id && (
                    <Aviso tipo="ok">
                      Novo PIN: <strong className="tracking-widest">{pinNovo.pin}</strong>. Anote agora: ele não será mostrado de novo.
                    </Aviso>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <label className="inline-flex items-center gap-2">
                      Status
                      <Selecao className="min-h-9 w-auto py-1" value={v.status} onChange={(e) => void mudarStatus(v.id, e.target.value as "publicada" | "aceita" | "recusada")}>
                        <option value="publicada">Publicada</option>
                        <option value="aceita">Aceita</option>
                        <option value="recusada">Recusada</option>
                      </Selecao>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      Vencimento
                      <Entrada
                        type="date"
                        className="min-h-9 w-auto py-1"
                        defaultValue={v.link_expira_em ? v.link_expira_em.slice(0, 10) : ""}
                        onChange={async (e) => {
                          const r = await definirVencimentoAcao(v.id, e.target.value ? new Date(`${e.target.value}T23:59:59-03:00`).toISOString() : null);
                          if (r.erro) setMensagem(r.erro);
                          else setBanner(r.mensagem ?? "Vencimento atualizado.");
                        }}
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Projeto" descricao={`${props.projetoNome} · ${props.cenaResumo.modulos} módulo(s) · ${props.cenaResumo.potenciaKwp.toString().replace(".", ",")} kWp`}>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href={`/projetos/${props.projetoId}`} className="inline-flex min-h-10 items-center rounded-lg border border-linha px-3 text-azul">Abrir desenho</a>
          <a href={`/projetos/${props.projetoId}/kit`} className="inline-flex min-h-10 items-center rounded-lg border border-linha px-3 text-azul">Kit e verificação</a>
          <a href={`/clientes/${props.clienteId}`} className="inline-flex min-h-10 items-center rounded-lg border border-linha px-3 text-azul">Cliente</a>
        </div>
      </Cartao>
    </div>
  );
}

function Resumo({ titulo, valor, destaque, discreto }: { titulo: string; valor: string; destaque?: boolean; discreto?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${destaque ? "border-azul bg-azul text-white" : "border-linha bg-white"}`}>
      <p className={`text-xs ${destaque ? "text-white/80" : discreto ? "text-cinza" : "text-cinza"}`}>{titulo}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{valor}</p>
    </div>
  );
}

function ParcelasBloco({
  titulo,
  ativo,
  opcoes,
  observacao,
  extra,
  onAtivo,
  onOpcoes,
  onObs,
}: {
  titulo: string;
  ativo: boolean;
  opcoes: OpcaoParcelamento[];
  observacao: string;
  extra?: React.ReactNode;
  onAtivo: (a: boolean) => void;
  onOpcoes: (o: OpcaoParcelamento[]) => void;
  onObs: (t: string) => void;
}) {
  return (
    <div className="rounded-xl border border-linha p-3">
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={ativo} onChange={(e) => onAtivo(e.target.checked)} /> {titulo}
      </label>
      {ativo && (
        <div className="mt-2 space-y-2">
          {extra}
          {opcoes.map((o, i) => (
            <div key={i} className="grid grid-cols-[90px_1fr_auto] items-center gap-2">
              <CampoNumero valor={o.parcelas} passo={1} min={1} max={120} casas={0} sufixo="x" aoMudar={(p) => onOpcoes(opcoes.map((x, j) => (j === i ? { ...x, parcelas: p } : x)))} />
              <CampoDinheiro compacto centavos={o.valorParcela} aoMudar={(v) => onOpcoes(opcoes.map((x, j) => (j === i ? { ...x, valorParcela: v } : x)))} />
              <button className="min-h-10 px-2 text-sm text-erro" onClick={() => onOpcoes(opcoes.filter((_, j) => j !== i))}>Remover</button>
            </div>
          ))}
          <Botao variante="secundario" tamanho="p" onClick={() => onOpcoes([...opcoes, { parcelas: 12, valorParcela: 0 }])}>+ Opção de parcelas</Botao>
          <Campo rotulo="Observação" opcional>
            <Entrada value={observacao} onChange={(e) => onObs(e.target.value)} />
          </Campo>
        </div>
      )}
    </div>
  );
}


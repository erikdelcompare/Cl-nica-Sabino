"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Aviso, Botao, Cartao, Selo, TituloPagina } from "@/components/ui";
import { salvarProjeto } from "@/lib/acoes/projetos";
import { normalizarCena } from "@/lib/dominio/cena";
import { distribuir } from "@/lib/dominio/distribuicao";
import { arred, limitesCena, paraLocal } from "@/lib/dominio/geometria";
import { mapaDeModulos, sincronizarKit } from "@/lib/dominio/kit";
import { validarCena } from "@/lib/dominio/validacao";
import type { Cena, ItemCatalogo, Kit, Medidas, P2, TipoProjeto } from "@/lib/dominio/tipos";
import { PlantaInterativa, type AlvoArrasto } from "./planta-interativa";
import { Paineis, type EditorApi } from "./paineis";
import type { ApiCena3D, Camadas, Visao } from "@/components/cena3d";
import { LimiteCena3D, webglDisponivel } from "@/components/cena3d";

const Cena3D = dynamic(() => import("@/components/cena3d").then((m) => m.Cena3D), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-cinza">Carregando a vista 3D…</p>,
});

export interface DadosEditor {
  projetoId: string;
  clienteId: string;
  tipo: TipoProjeto;
  nome: string;
  revisao: number;
  localId: string | null;
  locais: { id: string; nome: string }[];
  medidas: Medidas;
  cena: Cena;
  kit: Kit;
  capaCaminho: string | null;
  clienteNome: string;
  catalogo: ItemCatalogo[];
  modelos: { id: string; nome: string; tipo: TipoProjeto; descricao: string; conteudo: Cena }[];
  fotos: { caminho: string; nome: string }[];
}

type Status = "salvo" | "pendente" | "salvando" | "erro" | "conflito";

const PASSO = 0.05;
const snap = (v: number) => Math.round(v / PASSO) * PASSO;

function janelaDe(cena: Cena) {
  const pts: P2[] = [...cena.terreno.contorno];
  for (const s of cena.superficies) {
    for (const p of s.contorno) pts.push({ x: p.x, y: p.y });
  }
  const l = limitesCena(cena.superficies, cena.terreno.contorno, cena.obstaculos, 1.5);
  const w = Math.max(6, l.maxX - l.minX);
  const h = Math.max(6, l.maxY - l.minY);
  return { x: (l.minX + l.maxX) / 2 - w / 2, y: (l.minY + l.maxY) / 2 - h / 2, w, h };
}

export function EditorProjeto({ dados }: { dados: DadosEditor }) {
  const specs = useMemo(() => mapaDeModulos(dados.catalogo), [dados.catalogo]);
  const catalogoMapa = useMemo(() => Object.fromEntries(dados.catalogo.map((i) => [i.id, i])), [dados.catalogo]);
  const modulosCatalogo = useMemo(() => dados.catalogo.filter((i) => i.tipo === "modulo" && i.ativo), [dados.catalogo]);

  const [cena, setCenaState] = useState<Cena>(dados.cena);
  const [kit, setKit] = useState<Kit>(dados.kit);
  const [medidas, setMedidas] = useState<Medidas>(dados.medidas);
  const [nome, setNome] = useState(dados.nome);
  const [localId, setLocalId] = useState<string | null>(dados.localId);
  const [status, setStatus] = useState<Status>("salvo");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ultimoSalvo, setUltimoSalvo] = useState<string | null>(null);
  const [vista, setVista] = useState<"2d" | "3d">("2d");
  const [visao, setVisao] = useState<Visao>("livre");
  const [camadas, setCamadas] = useState<Camadas>({ modulos: true, estrutura: true, cobertura: true, obstaculos: true, terreno: true });
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [multi, setMulti] = useState(false);
  const [superficieAtiva, setSuperficieAtiva] = useState<string | null>(dados.cena.superficies[0]?.id ?? null);
  const [janela, setJanela] = useState(() => janelaDe(dados.cena));
  const [grade, setGrade] = useState(true);
  const [aviso3d, setAviso3d] = useState<string | null>(null);
  const [temWebgl, setTemWebgl] = useState<boolean | null>(null);
  const [aba, setAba] = useState<EditorApi["aba"]>("superficies");
  const [banner, setBanner] = useState<string | null>(null);
  const [capaSalva, setCapaSalva] = useState<string | null>(dados.capaCaminho);

  const cenaRef = useRef(cena);
  const kitRef = useRef(kit);
  const medidasRef = useRef(medidas);
  const nomeRef = useRef(nome);
  const localRef = useRef(localId);
  const revisaoRef = useRef(dados.revisao);
  const sujo = useRef(false);
  const salvando = useRef(false);
  const aguardando = useRef(false);
  const historico = useRef<Cena[]>([]);
  const arrasto = useRef<{ alvo: AlvoArrasto; inicio: P2; base: Cena; ids: string[]; plano: P2 } | null>(null);
  const api3d = useRef<ApiCena3D | null>(null);
  const [tick, setTick] = useState(0);
  const [temHistorico, setTemHistorico] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setTemWebgl(webglDisponivel()));
  }, []);

  const validacao = useMemo(() => validarCena(cena, specs), [cena, specs]);
  const problemas = useMemo(() => {
    const m: Record<string, "erro" | "aviso"> = {};
    for (const p of validacao.problemas) {
      if (p.gravidade === "erro" || m[p.moduloId] !== "erro") m[p.moduloId] = p.gravidade === "erro" ? "erro" : (m[p.moduloId] ?? "aviso");
    }
    return m;
  }, [validacao]);

  // --------------------------------------------------------------- salvamento
  async function executarSalvar(): Promise<void> {
    if (salvando.current) {
      aguardando.current = true;
      return;
    }
    salvando.current = true;
    sujo.current = false;
    setStatus("salvando");
    const c = cenaRef.current;
    const k = sincronizarKit(kitRef.current, c);
    const r = await salvarProjeto(
      dados.projetoId,
      revisaoRef.current,
      JSON.stringify({ cena: c, kit: k, medidas: medidasRef.current, nome: nomeRef.current, localId: localRef.current }),
    );
    salvando.current = false;
    if (r.ok && r.revisao) {
      revisaoRef.current = r.revisao;
      setUltimoSalvo(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Rio_Branco" }));
      setMensagem(null);
      setStatus(sujo.current ? "pendente" : "salvo");
    } else if (r.conflito) {
      sujo.current = true;
      setStatus("conflito");
      setMensagem(r.mensagem ?? null);
    } else {
      sujo.current = true;
      setStatus("erro");
      setMensagem(r.erro ?? "Não foi possível salvar. Tente de novo.");
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
    // executarSalvar lê apenas refs e estáveis: reagendar só quando há alteração (tick).
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

  const marcarSujo = () => {
    sujo.current = true;
    setStatus((s) => (s === "salvando" ? s : "pendente"));
    setTick((t) => t + 1);
  };

  // ---------------------------------------------------------- alterações
  const aplicar = useCallback((fn: (c: Cena) => Cena, registrar = true) => {
    const atual = cenaRef.current;
    const nova = fn(atual);
    if (nova === atual) return;
    if (registrar) {
      historico.current = [...historico.current.slice(-39), atual];
      setTemHistorico(true);
    }
    cenaRef.current = nova;
    setCenaState(nova);
    marcarSujo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alterarMedidas = (novas: Medidas) => {
    medidasRef.current = novas;
    setMedidas(novas);
    marcarSujo();
  };

  const trocarNome = (v: string) => {
    nomeRef.current = v;
    setNome(v);
    marcarSujo();
  };

  const trocarLocal = (v: string | null) => {
    localRef.current = v;
    setLocalId(v);
    marcarSujo();
  };

  const trocarKit = (k: Kit) => {
    kitRef.current = k;
    setKit(k);
    marcarSujo();
  };

  const desfazer = () => {
    const anterior = historico.current.pop();
    setTemHistorico(historico.current.length > 0);
    if (!anterior) return;
    cenaRef.current = anterior;
    setCenaState(anterior);
    marcarSujo();
  };

  const superficie = cena.superficies.find((s) => s.id === superficieAtiva) ?? cena.superficies[0] ?? null;
  const ativaId = superficie?.id ?? null;

  // ------------------------------------------------------------- arraste 2D
  const iniciarArraste = (alvo: AlvoArrasto, p: P2) => {
    let ids = [alvo.id];
    if (alvo.tipo === "modulo") {
      if (multi && !selecionados.includes(alvo.id)) {
        setSelecionados([...selecionados, alvo.id]);
        arrasto.current = null;
        return;
      }
      if (!selecionados.includes(alvo.id)) setSelecionados([alvo.id]);
      ids = selecionados.includes(alvo.id) ? selecionados : [alvo.id];
      const sup = cenaRef.current.modulos.find((m) => m.id === alvo.id)?.superficieId;
      if (sup) setSuperficieAtiva(sup);
    } else if (alvo.tipo === "obstaculo") {
      setSelecionados([alvo.id]);
    } else if (alvo.tipo === "superficie") {
      setSuperficieAtiva(alvo.id);
      setSelecionados([]);
    } else if (alvo.sup) {
      setSuperficieAtiva(alvo.sup);
    }
    historico.current = [...historico.current.slice(-39), cenaRef.current];
    setTemHistorico(true);
    arrasto.current = { alvo, inicio: p, base: cenaRef.current, ids, plano: p };
  };

  const moverArraste = (p: P2) => {
    const a = arrasto.current;
    if (!a) return;
    const dx = snap(p.x) - snap(a.inicio.x);
    const dy = snap(p.y) - snap(a.inicio.y);
    const base = a.base;
    const alvo = a.alvo;
    const inicioPlano = a.inicio;
    aplicar(() => {
      if (alvo.tipo === "modulo" || alvo.tipo === "area" || alvo.tipo === "obstaculo") {
        return {
          ...base,
          modulos:
            alvo.tipo === "modulo"
              ? base.modulos.map((m) => {
                  if (!a.ids.includes(m.id)) return m;
                  const sup = base.superficies.find((s) => s.id === m.superficieId);
                  if (!sup) return m;
                  const l0 = paraLocal(sup, inicioPlano);
                  const l1 = paraLocal(sup, { x: inicioPlano.x + dx, y: inicioPlano.y + dy });
                  return { ...m, u: arred(m.u + l1.x - l0.x), v: arred(m.v + l1.y - l0.y) };
                })
              : base.modulos,
          obstaculos:
            alvo.tipo === "obstaculo"
              ? base.obstaculos.map((o) => {
                  if (o.id !== alvo.id) return o;
                  if (!o.superficieId) return { ...o, u: arred(o.u + dx), v: arred(o.v + dy) };
                  const sup = base.superficies.find((s) => s.id === o.superficieId);
                  if (!sup) return o;
                  const l0 = paraLocal(sup, inicioPlano);
                  const l1 = paraLocal(sup, { x: inicioPlano.x + dx, y: inicioPlano.y + dy });
                  return { ...o, u: arred(o.u + l1.x - l0.x), v: arred(o.v + l1.y - l0.y) };
                })
              : base.obstaculos,
          superficies:
            alvo.tipo === "area"
              ? base.superficies.map((s) => {
                  if (s.id !== alvo.sup) return s;
                  const l0 = paraLocal(s, inicioPlano);
                  const l1 = paraLocal(s, { x: inicioPlano.x + dx, y: inicioPlano.y + dy });
                  return {
                    ...s,
                    areas: s.areas.map((ar) =>
                      ar.id === alvo.id ? { ...ar, u: arred(ar.u + l1.x - l0.x), v: arred(ar.v + l1.y - l0.y) } : ar,
                    ),
                  };
                })
              : base.superficies,
        };
      }
      if (alvo.tipo === "superficie") {
        return {
          ...base,
          superficies: base.superficies.map((s) =>
            s.id === alvo.id ? { ...s, origem: { x: arred(s.origem.x + dx), y: arred(s.origem.y + dy) } } : s,
          ),
        };
      }
      if (alvo.tipo === "vertice-agua" && alvo.sup !== undefined && alvo.idx !== undefined) {
        const sup = base.superficies.find((s) => s.id === alvo.sup);
        if (!sup) return base;
        const local = paraLocal(sup, { x: snap(p.x), y: snap(p.y) });
        return {
          ...base,
          superficies: base.superficies.map((s) =>
            s.id === alvo.sup
              ? { ...s, contorno: s.contorno.map((q, i) => (i === alvo.idx ? { x: Math.max(0, arred(local.x, 2)), y: Math.max(0, arred(local.y, 2)) } : q)) }
              : s,
          ),
        };
      }
      if (alvo.tipo === "vertice-terreno" && alvo.idx !== undefined) {
        return {
          ...base,
          terreno: {
            ...base.terreno,
            contorno: base.terreno.contorno.map((q, i) => (i === alvo.idx ? { x: snap(p.x), y: snap(p.y) } : q)),
          },
        };
      }
      return base;
    }, false);
  };

  const finalizarArraste = () => {
    const a = arrasto.current;
    arrasto.current = null;
    if (!a) return;
    if (a.alvo.tipo === "modulo" || a.alvo.tipo === "obstaculo" || a.alvo.tipo === "area") {
      setBanner("Peças movidas. Confira a distribuição na aba Módulos.");
    }
  };

  // -------------------------------------------------------------- ações
  const distribuirAgora = (supId: string | null = ativaId) => {
    if (!supId) return;
    const r = distribuir(cenaRef.current, supId, specs);
    aplicar(() => r.cena);
    setBanner(
      r.avisos.length > 0
        ? r.avisos.join(" ")
        : `Distribuição refeita: ${r.quantidade} módulo(s). ${validarCena(r.cena, specs).erros === 0 ? "Nenhum conflito." : "Há conflitos destacados em vermelho."}`,
    );
  };

  const api: EditorApi = {
    aba,
    setAba,
    cena,
    specs,
    catalogo: catalogoMapa,
    modulosCatalogo,
    modelos: dados.modelos,
    locais: dados.locais,
    fotos: dados.fotos,
    tipo: dados.tipo,
    projetoId: dados.projetoId,
    clienteNome: dados.clienteNome,
    kit,
    trocarKit,
    salvarAgora: () => salvarAgora(),
    medidas,
    alterarMedidas,
    nome,
    trocarNome,
    localId,
    trocarLocal,
    superficie,
    setSuperficieAtiva,
    aplicar,
    selecionados,
    setSelecionados,
    multi,
    setMulti,
    validacao,
    problemas,
    distribuirAgora,
    banner,
    setBanner,
    mensagem,
    setMensagem,
    desfazer,
    podeDesfazer: temHistorico,
    avisoRedistribuir: () => setBanner("Medidas ou modelo mudaram: confira a distribuição (aba Módulos)."),
    capaSalva,
    setCapaSalva,
    camadas,
    setCamadas,
    visao,
    setVisao,
    api3d,
    marcarSujo,
    recarregar: () => window.location.reload(),
  };

  const tamanhoModulos = cena.modulos.length;
  const erros = validacao.erros;
  const avisos = validacao.avisos;
  const rotuloStatus: Record<Status, string> = {
    salvo: ultimoSalvo ? `Salvo às ${ultimoSalvo}` : "Tudo salvo",
    pendente: "Alterações não salvas",
    salvando: "Salvando…",
    erro: "Não salvou",
    conflito: "Alterado em outro aparelho",
  };
  const corStatus = status === "salvo" ? "verde" : status === "erro" || status === "conflito" ? "erro" : "sol";

  const cenaNormalizada = useMemo(() => normalizarCena(cena, dados.tipo), [cena, dados.tipo]);

  return (
    <div className="mx-auto max-w-6xl px-3 pb-10 pt-4 sm:px-4">
      <TituloPagina
        voltar={{ href: `/clientes/${dados.clienteId}`, rotulo: dados.clienteNome }}
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate">{nome}</span>
            <Selo cor={dados.tipo === "telhado" ? "azul" : "verde"}>{dados.tipo === "telhado" ? "Telhado" : "Solo"}</Selo>
          </span>
        }
        descricao={`Cliente: ${dados.clienteNome} · ${tamanhoModulos} módulo(s) · ${erros} com erro · ${avisos} com aviso`}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <span
              role="status"
              aria-live="polite"
              className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium ${
                corStatus === "verde" ? "border-verde/30 bg-verde-claro text-verde" : corStatus === "erro" ? "border-erro/30 bg-erro-claro text-erro" : "border-sol/50 bg-sol-claro/60 text-azul-escuro"
              }`}
            >
              {rotuloStatus[status]}
            </span>
            <Botao variante="secundario" tamanho="m" onClick={() => void salvarAgora()} disabled={status === "salvando"}>
              Salvar agora
            </Botao>
            <Link href={`/projetos/${dados.projetoId}/kit`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-azul hover:bg-azul-claro">
              Kit
            </Link>
            <Link href={`/projetos/${dados.projetoId}/orcamento`} className="inline-flex min-h-11 items-center rounded-lg bg-azul px-3 text-sm font-medium text-white hover:bg-azul-escuro">
              Orçamento
            </Link>
          </div>
        }
      />

      {status === "conflito" && (
        <Aviso tipo="erro" className="mb-3">
          {mensagem} <button className="font-semibold underline" onClick={() => window.location.reload()}>Recarregar agora</button>
        </Aviso>
      )}
      {status === "erro" && (
        <Aviso tipo="erro" className="mb-3">
          {mensagem} <button className="font-semibold underline" onClick={() => void salvarAgora()}>Tentar de novo</button>
        </Aviso>
      )}
      {banner && (
        <Aviso tipo={erros > 0 ? "atencao" : "info"} className="mb-3">
          <span className="flex items-start justify-between gap-2">
            <span>{banner}</span>
            <button className="shrink-0 text-xs font-semibold underline" onClick={() => setBanner(null)}>
              Fechar
            </button>
          </span>
        </Aviso>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Cartao
          className="p-0"
          acoes={null}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-linha px-3 py-2">
            <div className="inline-flex rounded-lg border border-linha p-0.5" role="tablist" aria-label="Vista">
              {(["2d", "3d"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={vista === v}
                  disabled={v === "3d" && temWebgl === false}
                  onClick={() => setVista(v)}
                  className={`min-h-9 rounded-md px-3 text-sm font-medium disabled:opacity-40 ${vista === v ? "bg-azul text-white" : "text-azul"}`}
                >
                  {v === "2d" ? "Planta 2D" : "Vista 3D"}
                </button>
              ))}
            </div>
            {vista === "2d" && (
              <div className="flex flex-wrap items-center gap-1">
                <button className="min-h-9 rounded-lg border border-linha px-3 text-sm" onClick={() => setJanela((j) => ({ x: j.x + j.w * 0.1, y: j.y + j.h * 0.1, w: j.w * 0.8, h: j.h * 0.8 }))} aria-label="Aproximar">
                  +
                </button>
                <button className="min-h-9 rounded-lg border border-linha px-3 text-sm" onClick={() => setJanela((j) => ({ x: j.x - j.w * 0.125, y: j.y - j.h * 0.125, w: j.w * 1.25, h: j.h * 1.25 }))} aria-label="Afastar">
                  −
                </button>
                <button className="min-h-9 rounded-lg border border-linha px-3 text-sm" onClick={() => setJanela(janelaDe(cenaRef.current))}>
                  Ajustar
                </button>
                <label className="ml-1 inline-flex min-h-9 items-center gap-1 text-sm">
                  <input type="checkbox" checked={grade} onChange={(e) => setGrade(e.target.checked)} /> Grade
                </label>
                <label className="inline-flex min-h-9 items-center gap-1 text-sm">
                  <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} /> Selecionar várias
                </label>
                <button className="min-h-9 rounded-lg border border-linha px-3 text-sm disabled:opacity-40" disabled={!temHistorico} onClick={desfazer}>
                  Desfazer
                </button>
              </div>
            )}
            {vista === "3d" && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <select aria-label="Visão 3D" className="min-h-9 rounded-lg border border-linha px-2" value={visao} onChange={(e) => setVisao(e.target.value as Visao)}>
                  <option value="livre">Girar livremente</option>
                  <option value="superior">Vista superior</option>
                  <option value="lateral">Vista lateral</option>
                </select>
                {(
                  [
                    ["modulos", "Módulos"],
                    ["estrutura", "Estrutura"],
                    ["cobertura", "Cobertura"],
                    ["obstaculos", "Obstáculos"],
                    ["terreno", "Terreno"],
                  ] as const
                ).map(([k, rotulo]) => (
                  <label key={k} className="inline-flex min-h-9 items-center gap-1">
                    <input type="checkbox" checked={camadas[k]} onChange={(e) => setCamadas((c) => ({ ...c, [k]: e.target.checked }))} /> {rotulo}
                  </label>
                ))}
              </div>
            )}
          </div>

          {vista === "2d" ? (
            <div className="h-[min(62vh,560px)] min-h-[300px] w-full">
              <PlantaInterativa
                cena={cena}
                specs={specs}
                janela={janela}
                selecionados={selecionados}
                problemas={problemas}
                superficieAtiva={ativaId}
                editavel
                grade={grade}
                onAlvo={iniciarArraste}
                onMover={moverArraste}
                onFim={finalizarArraste}
                onFundo={() => setSelecionados([])}
              />
            </div>
          ) : (
            <div className="p-3">
              {temWebgl === false ? (
                <Aviso tipo="atencao">Este aparelho não consegue mostrar o 3D. Use a planta 2D, que tem as mesmas medidas.</Aviso>
              ) : (
                <LimiteCena3D
                  onErro={() => setAviso3d("Não foi possível abrir o 3D neste aparelho. Use a planta 2D.")}
                  fallback={<Aviso tipo="atencao">Não foi possível abrir o 3D. Use a planta 2D.</Aviso>}
                >
                  <Cena3D
                    cena={cenaNormalizada}
                    specs={specs}
                    camadas={camadas}
                    visao={visao}
                    registrar={(a) => {
                      api3d.current = a;
                    }}
                    pose={cena.capa.camera}
                  />
                </LimiteCena3D>
              )}
              {aviso3d && <Aviso tipo="atencao" className="mt-2">{aviso3d}</Aviso>}
              <p className="mt-2 text-xs text-cinza">
                A montagem em 3D é uma representação prevista e está sujeita à validação técnica da obra.
              </p>
              <CapturaCapa dados={dados} api3d={api3d} aplicar={aplicar} capaSalva={capaSalva} setCapaSalva={setCapaSalva} setBanner={setBanner} cena={cena} />
            </div>
          )}
          <p className="border-t border-linha px-3 py-2 text-xs text-cinza">
            {vista === "2d"
              ? "Toque em uma peça para selecionar e arraste para mover. Arraste os pontos brancos para ajustar o contorno. Grade de 5 cm."
              : "Gire com um dedo, aproxime com dois. Use as camadas para ver módulos, estrutura e cobertura separadamente."}
          </p>
        </Cartao>

        <Paineis ed={api} />
      </div>
    </div>
  );
}

function CapturaCapa({
  dados,
  api3d,
  aplicar,
  capaSalva,
  setCapaSalva,
  setBanner,
  cena,
}: {
  dados: DadosEditor;
  api3d: { current: ApiCena3D | null };
  aplicar: (fn: (c: Cena) => Cena, registrar?: boolean) => void;
  capaSalva: string | null;
  setCapaSalva: (v: string | null) => void;
  setBanner: (v: string | null) => void;
  cena: Cena;
}) {
  const [enviando, setEnviando] = useState(false);
  const capturar = async () => {
    const api = api3d.current;
    if (!api) {
      setBanner("Abra a vista 3D para capturar a capa.");
      return;
    }
    setEnviando(true);
    try {
      const dataUrl = api.capturar();
      if (!dataUrl) throw new Error("sem imagem");
      const blob = await (await fetch(dataUrl)).blob();
      const r = await fetch(`/api/projetos/${dados.projetoId}/capa`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
      const j = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) throw new Error(j.erro ?? "falha no envio");
      setCapaSalva(`projetos/${dados.projetoId}/capa.jpg?v=${Date.now()}`);
      setBanner("Capa capturada da própria cena 3D. Ela aparece na proposta.");
    } catch {
      setBanner("Não foi possível capturar a capa. Tente de novo na vista 3D.");
    } finally {
      setEnviando(false);
    }
  };
  const guardarEnquadramento = () => {
    const pose = api3d.current?.pose();
    if (!pose) return;
    aplicar((c) => ({ ...c, capa: { camera: pose } }));
    setBanner("Enquadramento guardado para a capa.");
  };
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-linha pt-3 mt-3">
      <Botao variante="secundario" tamanho="m" onClick={guardarEnquadramento}>
        Guardar enquadramento
      </Botao>
      <Botao variante="primario" tamanho="m" onClick={() => void capturar()} disabled={enviando}>
        {enviando ? "Capturando…" : "Capturar capa"}
      </Botao>
      <span className="text-xs text-cinza">{capaSalva ? "Capa salva." : "Ainda sem capa."}</span>
      {cena.capa.camera && <span className="text-xs text-cinza">Enquadramento definido.</span>}
    </div>
  );
}


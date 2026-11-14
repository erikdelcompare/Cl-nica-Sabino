import { ALTURA_SOBRE_TELHA } from "./cena";
import { alturaEm, arred, novoId, rad } from "./geometria";
import type {
  Cena,
  Componente,
  EspecModulo,
  FormaSecao,
  FuncaoComponente,
  ItemCatalogo,
  MapaModulos,
  ModuloPosicionado,
  ParamEstruturaSolo,
  ParamEstruturaTelhado,
  Superficie,
} from "./tipos";

export type MapaCatalogo = Record<string, ItemCatalogo>;

interface Peca {
  catalogoId: string | null;
  nome: string;
  material: string;
  forma: FormaSecao;
  secao: { largura: number; altura: number; espessura: number };
  comprimentoM: number | null;
}

/** Monta a peça a partir do catálogo, caindo em um padrão genérico quando nada foi escolhido. */
function peca(
  catalogo: MapaCatalogo,
  id: string | null,
  padrao: Omit<Peca, "catalogoId" | "comprimentoM">,
): Peca {
  const item = id ? catalogo[id] : undefined;
  if (!item) return { catalogoId: null, comprimentoM: null, ...padrao, nome: `${padrao.nome} (definir no catálogo)` };
  const s = item.specs ?? {};
  return {
    catalogoId: item.id,
    nome: [item.fabricante, item.modelo].filter(Boolean).join(" ").trim() || item.descricao || padrao.nome,
    material: s.material ?? padrao.material,
    forma: s.forma ?? padrao.forma,
    secao: {
      largura: s.larguraMm ?? padrao.secao.largura,
      altura: s.alturaMm ?? padrao.secao.altura,
      espessura: s.espessuraMm ?? padrao.secao.espessura,
    },
    comprimentoM: s.comprimentoM ?? null,
  };
}

function componente(
  sup: Superficie,
  funcao: FuncaoComponente,
  p: Peca,
  geo: Partial<Pick<Componente, "eixo" | "u" | "v" | "n" | "comprimento" | "altura" | "enterrado" | "quantidade">>,
): Componente {
  return {
    id: novoId("c"),
    superficieId: sup.id,
    funcao,
    catalogoId: p.catalogoId,
    nome: p.nome,
    material: p.material,
    forma: p.forma,
    secao: { ...p.secao },
    eixo: geo.eixo ?? "ponto",
    u: arred(geo.u ?? 0),
    v: arred(geo.v ?? 0),
    n: arred(geo.n ?? 0),
    comprimento: arred(geo.comprimento ?? 0),
    altura: arred(geo.altura ?? 0),
    enterrado: arred(geo.enterrado ?? 0),
    quantidade: geo.quantidade ?? 1,
    manual: false,
    existente: false,
  };
}

/** Divide um comprimento em barras inteiras mais a sobra. */
export function dividirEmBarras(total: number, barra: number): number[] {
  if (!(barra > 0) || total <= barra + 1e-6) return [arred(total)];
  const partes: number[] = [];
  let resto = total;
  while (resto > barra + 1e-6) {
    partes.push(arred(barra));
    resto -= barra;
  }
  if (resto > 0.01) partes.push(arred(resto));
  return partes;
}

interface Corrida {
  eixo: "u" | "v";
  /** Coordenada perpendicular (centro da fileira). */
  centro: number;
  /** Dimensão do módulo na direção perpendicular ao trilho. */
  profundidade: number;
  inicio: number;
  fim: number;
  /** Bordas dos módulos ao longo do trilho. */
  juntas: number[];
  modulos: number;
}

/** Agrupa módulos em corridas contínuas para receberem trilhos compartilhados. */
export function agruparCorridas(mods: ModuloPosicionado[], specs: MapaModulos, gapMax: number): { corridas: Corrida[]; ignorados: number } {
  const corridas: Corrida[] = [];
  let ignorados = 0;
  const grupos = new Map<string, { eixo: "u" | "v"; centro: number; prof: number; itens: { ini: number; fim: number }[] }>();
  for (const m of mods) {
    const spec = specs[m.moduloId];
    const rot = ((m.rotacao % 180) + 180) % 180;
    if (!spec || (Math.abs(rot) > 0.5 && Math.abs(rot - 90) > 0.5)) {
      ignorados++;
      continue;
    }
    // Retrato: trilhos ao longo da largura (u). Paisagem: trilhos ao longo da inclinação (v).
    const retrato = Math.abs(rot) <= 0.5;
    const eixo = retrato ? "u" : "v";
    const centro = retrato ? m.v : m.u;
    const pos = retrato ? m.u : m.v;
    const chave = `${eixo}|${Math.round(centro / 0.03)}|${m.moduloId}`;
    if (!grupos.has(chave)) grupos.set(chave, { eixo, centro, prof: spec.comprimento, itens: [] });
    grupos.get(chave)!.itens.push({ ini: pos - spec.largura / 2, fim: pos + spec.largura / 2 });
  }
  for (const g of grupos.values()) {
    g.itens.sort((a, b) => a.ini - b.ini);
    let atual: Corrida | null = null;
    for (const it of g.itens) {
      if (atual && it.ini - atual.fim <= gapMax) {
        atual.juntas.push((atual.fim + it.ini) / 2);
        atual.fim = it.fim;
        atual.modulos++;
      } else {
        atual = { eixo: g.eixo, centro: g.centro, profundidade: g.prof, inicio: it.ini, fim: it.fim, juntas: [], modulos: 1 };
        corridas.push(atual);
      }
    }
  }
  return { corridas, ignorados };
}

export interface ResultadoEstrutura {
  cena: Cena;
  avisos: string[];
  gerados: number;
}

/** Posições dos trilhos (ou terças) dentro da profundidade do módulo. */
function posicoesApoio(quantidade: number, profundidade: number, fracao: number): number[] {
  const f = Math.min(0.45, Math.max(0.05, fracao));
  if (quantidade <= 1) return [0];
  const a = -profundidade / 2 + f * profundidade;
  const b = profundidade / 2 - f * profundidade;
  if (quantidade === 2) return [a, b];
  return Array.from({ length: quantidade }, (_, i) => a + ((b - a) * i) / (quantidade - 1));
}

/**
 * Telhado: trilhos, emendas, grampos e pontos de fixação a partir dos módulos desenhados.
 * As peças editadas à mão são preservadas.
 */
export function gerarEstruturaTelhado(cena: Cena, supId: string, specs: MapaModulos, catalogo: MapaCatalogo): ResultadoEstrutura {
  const sup = cena.superficies.find((s) => s.id === supId);
  if (!sup || sup.estrutura.tipo !== "telhado") return { cena, avisos: ["Superfície de telhado não encontrada."], gerados: 0 };
  const par = sup.estrutura as ParamEstruturaTelhado;
  const mods = cena.modulos.filter((m) => m.superficieId === supId);
  const avisos: string[] = [];
  const novos: Componente[] = [];

  const trilho = peca(catalogo, par.trilhoId, {
    nome: "Trilho de alumínio",
    material: "alumínio",
    forma: "retangular",
    secao: { largura: 40, altura: 40, espessura: 2 },
  });
  const emenda = peca(catalogo, par.emendaId, {
    nome: "Emenda de trilho",
    material: "alumínio",
    forma: "ponto",
    secao: { largura: 40, altura: 40, espessura: 0 },
  });
  const grampoFinal = peca(catalogo, par.grampoFinalId, {
    nome: "Grampo final",
    material: "alumínio",
    forma: "ponto",
    secao: { largura: 40, altura: 35, espessura: 0 },
  });
  const grampoInter = peca(catalogo, par.grampoIntermediarioId, {
    nome: "Grampo intermediário",
    material: "alumínio",
    forma: "ponto",
    secao: { largura: 40, altura: 35, espessura: 0 },
  });
  const fixacao = peca(catalogo, par.fixacaoId, {
    nome: "Fixação em madeira (parafuso estrutural com suporte)",
    material: "aço inox",
    forma: "ponto",
    secao: { largura: 10, altura: 200, espessura: 0 },
  });

  const barra = par.comprimentoBarra > 0 ? par.comprimentoBarra : (trilho.comprimentoM ?? 4.2);
  const gapMax = Math.max(0.15, sup.layout.espacamentoH * 3, sup.layout.espacamentoV * 3);
  const { corridas, ignorados } = agruparCorridas(mods, specs, gapMax);
  if (ignorados > 0) {
    avisos.push(`${ignorados} módulo(s) com rotação livre ou sem modelo ficaram sem estrutura automática.`);
  }
  const nTrilho = ALTURA_SOBRE_TELHA - trilho.secao.altura / 2000;

  for (const c of corridas) {
    const ini = c.inicio - par.balanco;
    const fim = c.fim + par.balanco;
    const total = fim - ini;
    for (const desloc of posicoesApoio(par.trilhosPorFileira, c.profundidade, par.posicaoTrilho)) {
      const perp = c.centro + desloc;
      // Trilhos em barras, com emendas nas junções.
      let cursor = ini;
      const partes = dividirEmBarras(total, barra);
      partes.forEach((comp, i) => {
        novos.push(
          componente(sup, "trilho", trilho, {
            eixo: c.eixo,
            u: c.eixo === "u" ? cursor : perp,
            v: c.eixo === "u" ? perp : cursor,
            n: nTrilho,
            comprimento: comp,
          }),
        );
        cursor += comp;
        if (i < partes.length - 1) {
          novos.push(
            componente(sup, "emenda", emenda, {
              u: c.eixo === "u" ? cursor : perp,
              v: c.eixo === "u" ? perp : cursor,
              n: nTrilho,
            }),
          );
        }
      });
      const noTrilho = (pos: number) => ({
        u: c.eixo === "u" ? pos : perp,
        v: c.eixo === "u" ? perp : pos,
        n: ALTURA_SOBRE_TELHA,
      });
      novos.push(componente(sup, "grampo_final", grampoFinal, noTrilho(c.inicio)));
      novos.push(componente(sup, "grampo_final", grampoFinal, noTrilho(c.fim)));
      for (const j of c.juntas) novos.push(componente(sup, "grampo_intermediario", grampoInter, noTrilho(j)));
      // Pontos de fixação distribuídos ao longo do trilho.
      const margem = Math.min(0.15, total / 4);
      const util = total - 2 * margem;
      const vaos = Math.max(1, Math.ceil(util / Math.max(0.2, par.espacamentoFixacao) - 1e-6));
      for (let i = 0; i <= vaos; i++) {
        const pos = ini + margem + (util * i) / vaos;
        novos.push(componente(sup, "fixacao", fixacao, { ...noTrilho(pos), n: 0 }));
      }
    }
  }

  const preservados = cena.componentes.filter((c) => c.superficieId !== supId || c.manual || c.existente);
  return { cena: { ...cena, componentes: [...preservados, ...novos] }, avisos, gerados: novos.length };
}

/**
 * Solo: pórticos (poste dianteiro, poste traseiro e viga inclinada), terças ao longo da mesa
 * e, se informadas, fundações. Representação da montagem prevista — não é cálculo estrutural.
 */
export function gerarEstruturaSolo(cena: Cena, supId: string, specs: MapaModulos, catalogo: MapaCatalogo): ResultadoEstrutura {
  const sup = cena.superficies.find((s) => s.id === supId);
  if (!sup || sup.estrutura.tipo !== "solo") return { cena, avisos: ["Mesa de solo não encontrada."], gerados: 0 };
  const par = sup.estrutura as ParamEstruturaSolo;
  const avisos: string[] = [];
  const novos: Componente[] = [];
  const spec: EspecModulo | undefined = sup.layout.moduloId ? specs[sup.layout.moduloId] : undefined;

  const poste = peca(catalogo, par.posteId, {
    nome: "Poste",
    material: "concreto",
    forma: "retangular",
    secao: { largura: 100, altura: 100, espessura: 0 },
  });
  const viga = peca(catalogo, par.vigaId, {
    nome: "Viga",
    material: "aço galvanizado",
    forma: "u",
    secao: { largura: 50, altura: 127, espessura: 3 },
  });
  const terca = peca(catalogo, par.tercaId, {
    nome: "Terça perfil U",
    material: "aço galvanizado",
    forma: "u",
    secao: { largura: 40, altura: 100, espessura: 2 },
  });
  const fixacao = peca(catalogo, par.fixacaoId, {
    nome: "Conjunto de fixação módulo–terça",
    material: "aço inox",
    forma: "ponto",
    secao: { largura: 8, altura: 30, espessura: 0 },
  });

  const W = sup.largura;
  const D = sup.comprimento;
  const hT = terca.secao.altura / 1000;
  const hV = viga.secao.altura / 1000;
  const cosI = Math.cos(rad(sup.inclinacao)) || 1;

  // Terças: linhas por fileira de módulos, ao longo da largura.
  const fileiras = Math.max(1, sup.mesa?.fileiras ?? 1);
  const profFileira =
    spec ? (sup.layout.orientacao === "retrato" ? spec.comprimento : spec.largura) : D / fileiras;
  const passoV = profFileira + sup.layout.espacamentoV;
  const linhasTerca: number[] = [];
  for (let f = 0; f < fileiras; f++) {
    const centro = f * passoV + profFileira / 2;
    for (const d of posicoesApoio(par.tercasPorFileira, profFileira, par.posicaoTerca)) {
      linhasTerca.push(arred(centro + d));
    }
  }
  const barraTerca = par.comprimentoBarraTerca > 0 ? par.comprimentoBarraTerca : (terca.comprimentoM ?? 6);
  const segmentos = Math.max(1, Math.ceil(W / barraTerca - 1e-6));
  for (const v of linhasTerca) {
    for (let i = 0; i < segmentos; i++) {
      novos.push(
        componente(sup, "terca", terca, { eixo: "u", u: (W * i) / segmentos, v, n: -hT / 2, comprimento: W / segmentos }),
      );
    }
  }

  // Pórticos.
  const balanco = Math.min(par.balancoLateral, W / 2 - 0.05);
  const vaoTotal = Math.max(0, W - 2 * balanco);
  const vaos = Math.max(1, Math.ceil(vaoTotal / Math.max(0.5, par.espacamentoPorticos) - 1e-6));
  const recuo = Math.min(par.recuoPoste, D / 2 - 0.05);
  const vFrente = recuo;
  const vTras = D - recuo;
  const vIni = Math.max(0, Math.min(...linhasTerca, vFrente) - 0.1);
  const vFim = Math.min(D, Math.max(...linhasTerca, vTras) + 0.1);
  let posteCurto = false;
  for (let i = 0; i <= vaos; i++) {
    const u = balanco + (vaoTotal * i) / vaos;
    for (const v of [vFrente, vTras]) {
      const altura = Math.max(0.1, alturaEm(sup, v) - (hT + hV) / cosI);
      const comprimento = altura + par.enterrado;
      if (poste.comprimentoM && comprimento > poste.comprimentoM + 1e-6) posteCurto = true;
      novos.push(componente(sup, "poste", poste, { eixo: "vertical", u, v, altura, enterrado: par.enterrado, comprimento }));
      if (par.fundacao.ativa && par.fundacao.lado > 0 && par.fundacao.profundidade > 0) {
        novos.push(
          componente(
            sup,
            "fundacao",
            {
              catalogoId: null,
              nome: "Fundação em concreto",
              material: "concreto",
              forma: par.fundacao.forma === "circular" ? "circular" : "retangular",
              secao: { largura: par.fundacao.lado * 1000, altura: par.fundacao.lado * 1000, espessura: 0 },
              comprimentoM: null,
            },
            { eixo: "vertical", u, v, comprimento: par.fundacao.profundidade, enterrado: par.fundacao.profundidade },
          ),
        );
      }
    }
    novos.push(componente(sup, "viga", viga, { eixo: "v", u, v: vIni, n: -hT - hV / 2, comprimento: vFim - vIni }));
  }
  if (posteCurto) {
    avisos.push(
      `O poste escolhido tem ${String(poste.comprimentoM).replace(".", ",")} m e a montagem pede mais: revise altura, trecho enterrado ou o item do catálogo.`,
    );
  }

  const qtdModulos = cena.modulos.filter((m) => m.superficieId === supId).length;
  if (qtdModulos > 0) {
    novos.push(componente(sup, "fixacao", fixacao, { u: W / 2, v: D / 2, quantidade: qtdModulos * 4 }));
  }

  const preservados = cena.componentes.filter((c) => c.superficieId !== supId || c.manual || c.existente);
  return { cena: { ...cena, componentes: [...preservados, ...novos] }, avisos, gerados: novos.length };
}

export function gerarEstrutura(cena: Cena, supId: string, specs: MapaModulos, catalogo: MapaCatalogo): ResultadoEstrutura {
  const sup = cena.superficies.find((s) => s.id === supId);
  if (!sup) return { cena, avisos: ["Superfície não encontrada."], gerados: 0 };
  return sup.estrutura.tipo === "solo"
    ? gerarEstruturaSolo(cena, supId, specs, catalogo)
    : gerarEstruturaTelhado(cena, supId, specs, catalogo);
}

// --------------------------------------------------------- textos e grupos

export const ROTULO_FUNCAO: Record<FuncaoComponente, string> = {
  trilho: "Trilho",
  emenda: "Emenda",
  grampo_final: "Grampo final",
  grampo_intermediario: "Grampo intermediário",
  fixacao: "Fixação",
  poste: "Poste",
  viga: "Viga",
  terca: "Terça",
  fundacao: "Fundação",
  outro: "Outro",
};

const num = (n: number, casas = 2) => n.toFixed(casas).replace(".", ",");

export function textoSecao(c: Pick<Componente, "forma" | "secao">): string {
  const { largura, altura, espessura } = c.secao;
  if (c.forma === "ponto") return "";
  const esp = espessura > 0 ? ` #${num(espessura)} mm` : "";
  if (c.forma === "circular") return `Ø ${Math.round(largura)} mm${esp}`;
  return `${Math.round(largura)}×${Math.round(altura)} mm${esp}`;
}

export function ehLinear(c: Pick<Componente, "eixo">): boolean {
  return c.eixo !== "ponto";
}

/** Chave de agrupamento: material + perfil + dimensão. */
export function chaveComponente(c: Componente): string {
  const comp = ehLinear(c) ? Math.round(c.comprimento * 100) : 0;
  return [
    c.funcao,
    c.catalogoId ?? c.nome,
    c.material,
    c.forma,
    `${Math.round(c.secao.largura)}x${Math.round(c.secao.altura)}x${c.secao.espessura}`,
    comp,
  ].join("|");
}

export function descricaoComponente(c: Componente): string {
  const partes = [c.nome];
  const secao = textoSecao(c);
  if (secao) partes.push(secao);
  if (c.material && !c.nome.toLowerCase().includes(c.material.toLowerCase())) partes.push(c.material);
  if (ehLinear(c)) partes.push(`${num(c.comprimento)} m`);
  return partes.join(" — ");
}

export interface GrupoComponentes {
  chave: string;
  descricao: string;
  funcao: FuncaoComponente;
  quantidade: number;
  ids: string[];
  exemplo: Componente;
}

/** Agrupa as peças iguais para exibição e edição em lote. */
export function agruparComponentes(componentes: Componente[]): GrupoComponentes[] {
  const mapa = new Map<string, GrupoComponentes>();
  for (const c of componentes) {
    const chave = `${c.superficieId}|${chaveComponente(c)}`;
    const g = mapa.get(chave);
    if (g) {
      g.quantidade += c.quantidade;
      g.ids.push(c.id);
    } else {
      mapa.set(chave, { chave, descricao: descricaoComponente(c), funcao: c.funcao, quantidade: c.quantidade, ids: [c.id], exemplo: c });
    }
  }
  return [...mapa.values()];
}

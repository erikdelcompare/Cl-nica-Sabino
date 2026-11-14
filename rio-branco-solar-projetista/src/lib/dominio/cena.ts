import { arred, novoId, paraPlanta, rad, retangulo } from "./geometria";
import type {
  AreaInstalacao,
  Cena,
  EspecModulo,
  EstruturaCobertura,
  MaterialCobertura,
  Obstaculo,
  Orientacao,
  P2,
  ParamEstruturaSolo,
  ParamEstruturaTelhado,
  ParamLayout,
  Superficie,
  TipoObstaculo,
  TipoProjeto,
} from "./tipos";

/** Altura do plano dos módulos acima da telha (suporte + trilho), em metros. */
export const ALTURA_SOBRE_TELHA = 0.1;

export const LAYOUT_PADRAO: ParamLayout = {
  moduloId: null,
  orientacao: "retrato",
  espacamentoH: 0.02,
  espacamentoV: 0.02,
  afastamentoBorda: 0.3,
  folgaObstaculo: 0.3,
  alinhamento: "centro",
  limite: null,
};

// Valores iniciais de montagem. São parâmetros de desenho, não cálculo estrutural:
// o proprietário ajusta conforme a obra ou um projeto validado.
export const ESTRUTURA_TELHADO_PADRAO: ParamEstruturaTelhado = {
  tipo: "telhado",
  trilhoId: null,
  grampoFinalId: null,
  grampoIntermediarioId: null,
  fixacaoId: null,
  emendaId: null,
  trilhosPorFileira: 2,
  posicaoTrilho: 0.25,
  balanco: 0.1,
  espacamentoFixacao: 1.2,
  comprimentoBarra: 4.2,
  espacamentoTercas: 1.2,
};

export const ESTRUTURA_SOLO_PADRAO: ParamEstruturaSolo = {
  tipo: "solo",
  posteId: null,
  vigaId: null,
  tercaId: null,
  fixacaoId: null,
  espacamentoPorticos: 3,
  balancoLateral: 0.6,
  tercasPorFileira: 2,
  posicaoTerca: 0.25,
  recuoPoste: 0.8,
  enterrado: 0.8,
  comprimentoBarraTerca: 6,
  fundacao: { ativa: false, forma: "circular", lado: 0.3, profundidade: 0.8 },
};

export function cenaVazia(tipo: TipoProjeto): Cena {
  return {
    versao: 1,
    tipo,
    terreno: { contorno: [], desnivel: 0 },
    superficies: [],
    obstaculos: [],
    modulos: [],
    componentes: [],
    pendencias: [],
    capa: { camera: null },
  };
}

export function areaPadrao(largura: number, comprimento: number, afastamento: number): AreaInstalacao {
  const a = Math.max(0, Math.min(afastamento, largura / 2 - 0.05, comprimento / 2 - 0.05));
  return {
    id: novoId("ar"),
    u: arred(a),
    v: arred(a),
    largura: arred(Math.max(0.1, largura - 2 * a)),
    comprimento: arred(Math.max(0.1, comprimento - 2 * a)),
  };
}

export interface OpcoesAgua {
  nome?: string;
  largura: number;
  comprimento: number;
  inclinacao?: number;
  alturaBase?: number;
  origem?: P2;
  rotacao?: number;
  material?: MaterialCobertura;
  estrutura?: EstruturaCobertura;
  moduloId?: string | null;
}

export function novaAgua(o: OpcoesAgua): Superficie {
  const layout = { ...LAYOUT_PADRAO, moduloId: o.moduloId ?? null };
  return {
    id: novoId("s"),
    classe: "agua",
    nome: o.nome ?? "Água 1",
    origem: o.origem ?? { x: 0, y: 0 },
    rotacao: o.rotacao ?? 0,
    inclinacao: o.inclinacao ?? 10,
    alturaBase: o.alturaBase ?? 3,
    largura: o.largura,
    comprimento: o.comprimento,
    contorno: retangulo(o.largura, o.comprimento),
    cobertura: { material: o.material ?? "fibrocimento", estrutura: o.estrutura ?? "madeira" },
    areas: [areaPadrao(o.largura, o.comprimento, layout.afastamentoBorda)],
    layout,
    estrutura: { ...ESTRUTURA_TELHADO_PADRAO },
    mesa: null,
  };
}

/** Dimensões do plano de uma mesa de solo a partir dos módulos. */
export function dimensoesMesa(
  fileiras: number,
  modulosPorFileira: number,
  orientacao: Orientacao,
  espacamentoH: number,
  espacamentoV: number,
  spec: Pick<EspecModulo, "largura" | "comprimento">,
): { largura: number; comprimento: number } {
  const w = orientacao === "retrato" ? spec.largura : spec.comprimento;
  const h = orientacao === "retrato" ? spec.comprimento : spec.largura;
  return {
    largura: arred(modulosPorFileira * w + Math.max(0, modulosPorFileira - 1) * espacamentoH),
    comprimento: arred(fileiras * h + Math.max(0, fileiras - 1) * espacamentoV),
  };
}

export interface OpcoesMesa {
  nome?: string;
  fileiras: number;
  modulosPorFileira: number;
  orientacao?: Orientacao;
  inclinacao?: number;
  alturaBase?: number;
  origem?: P2;
  rotacao?: number;
}

export function novaMesa(o: OpcoesMesa, spec: EspecModulo): Superficie {
  const layout: ParamLayout = {
    ...LAYOUT_PADRAO,
    moduloId: spec.id,
    orientacao: o.orientacao ?? "retrato",
    afastamentoBorda: 0,
    alinhamento: "inicio",
  };
  const d = dimensoesMesa(o.fileiras, o.modulosPorFileira, layout.orientacao, layout.espacamentoH, layout.espacamentoV, spec);
  return {
    id: novoId("s"),
    classe: "mesa",
    nome: o.nome ?? "Mesa 1",
    origem: o.origem ?? { x: 0, y: 0 },
    rotacao: o.rotacao ?? 0,
    inclinacao: o.inclinacao ?? 10,
    alturaBase: o.alturaBase ?? 1,
    largura: d.largura,
    comprimento: d.comprimento,
    contorno: retangulo(d.largura, d.comprimento),
    cobertura: null,
    areas: [],
    layout,
    estrutura: { ...ESTRUTURA_SOLO_PADRAO, fundacao: { ...ESTRUTURA_SOLO_PADRAO.fundacao } },
    mesa: { fileiras: o.fileiras, modulosPorFileira: o.modulosPorFileira },
  };
}

/** Altura do lado mais alto da superfície. */
export function alturaTraseira(sup: Pick<Superficie, "alturaBase" | "comprimento" | "inclinacao">): number {
  return arred(sup.alturaBase + sup.comprimento * Math.sin(rad(sup.inclinacao)));
}

/** Redimensiona a superfície mantendo proporcionalmente contorno, áreas, obstáculos e módulos. */
export function redimensionar(cena: Cena, supId: string, largura: number, comprimento: number): Cena {
  const sup = cena.superficies.find((s) => s.id === supId);
  if (!sup || largura <= 0 || comprimento <= 0) return cena;
  const fx = largura / sup.largura;
  const fy = comprimento / sup.comprimento;
  const nova: Superficie = {
    ...sup,
    largura: arred(largura),
    comprimento: arred(comprimento),
    contorno: sup.contorno.map((p) => ({ x: arred(p.x * fx), y: arred(p.y * fy) })),
    areas: sup.areas.map((a) => ({
      ...a,
      u: arred(a.u * fx),
      v: arred(a.v * fy),
      largura: arred(a.largura * fx),
      comprimento: arred(a.comprimento * fy),
    })),
  };
  return {
    ...cena,
    superficies: cena.superficies.map((s) => (s.id === supId ? nova : s)),
    obstaculos: cena.obstaculos.map((o) =>
      o.superficieId === supId ? { ...o, u: arred(o.u * fx), v: arred(o.v * fy) } : o,
    ),
  };
}

/** Cria a água oposta, encostada na cumeeira da água informada. */
export function aguaOposta(sup: Superficie, nome: string): Superficie {
  const origem = paraPlanta(sup, sup.largura, sup.comprimento * 2);
  return {
    ...sup,
    id: novoId("s"),
    nome,
    origem: { x: arred(origem.x), y: arred(origem.y) },
    rotacao: (sup.rotacao + 180) % 360,
    contorno: retangulo(sup.largura, sup.comprimento),
    areas: [areaPadrao(sup.largura, sup.comprimento, sup.layout.afastamentoBorda)],
    layout: { ...sup.layout },
    estrutura: { ...sup.estrutura } as Superficie["estrutura"],
  };
}

const NOMES_OBSTACULO: Record<TipoObstaculo, string> = {
  caixa_dagua: "Caixa d'água",
  chamine: "Chaminé",
  claraboia: "Claraboia",
  antena: "Antena",
  arvore: "Árvore",
  construcao: "Construção",
  outro: "Obstáculo",
};

export const nomeObstaculo = (t: TipoObstaculo) => NOMES_OBSTACULO[t] ?? "Obstáculo";

export function novoObstaculo(
  tipo: TipoObstaculo,
  superficieId: string | null,
  u: number,
  v: number,
  dims?: Partial<Pick<Obstaculo, "largura" | "comprimento" | "altura" | "nome">>,
): Obstaculo {
  const padrao: Record<TipoObstaculo, [number, number, number]> = {
    caixa_dagua: [1.2, 1.2, 0.9],
    chamine: [0.6, 0.6, 1],
    claraboia: [1, 1.5, 0.15],
    antena: [0.4, 0.4, 1.5],
    arvore: [3, 3, 5],
    construcao: [4, 3, 3],
    outro: [1, 1, 0.5],
  };
  const [l, c, a] = padrao[tipo];
  return {
    id: novoId("o"),
    superficieId,
    tipo,
    nome: dims?.nome ?? nomeObstaculo(tipo),
    u: arred(u),
    v: arred(v),
    largura: dims?.largura ?? l,
    comprimento: dims?.comprimento ?? c,
    altura: dims?.altura ?? a,
    rotacao: 0,
  };
}

// ------------------------------------------------------ modelos reutilizáveis

/** Copia a cena trocando todos os identificadores (a cópia fica independente). */
export function clonarComNovosIds(cena: Cena): Cena {
  const mapa = new Map<string, string>();
  const troca = (id: string, prefixo: string) => {
    if (!mapa.has(id)) mapa.set(id, novoId(prefixo));
    return mapa.get(id)!;
  };
  const copia: Cena = JSON.parse(JSON.stringify(cena));
  copia.superficies = copia.superficies.map((s) => ({
    ...s,
    id: troca(s.id, "s"),
    areas: s.areas.map((a) => ({ ...a, id: novoId("ar") })),
  }));
  copia.obstaculos = copia.obstaculos.map((o) => ({
    ...o,
    id: novoId("o"),
    superficieId: o.superficieId ? (mapa.get(o.superficieId) ?? o.superficieId) : null,
  }));
  const fileiras = new Map<string, string>();
  copia.modulos = copia.modulos.map((m) => {
    if (!fileiras.has(m.fileira)) fileiras.set(m.fileira, novoId("f"));
    return {
      ...m,
      id: novoId("m"),
      superficieId: mapa.get(m.superficieId) ?? m.superficieId,
      fileira: fileiras.get(m.fileira)!,
    };
  });
  copia.componentes = copia.componentes.map((c) => ({
    ...c,
    id: novoId("c"),
    superficieId: mapa.get(c.superficieId) ?? c.superficieId,
  }));
  copia.pendencias = [];
  copia.capa = { camera: null };
  return copia;
}

/** Recorta uma única cobertura ou mesa (com módulos, obstáculos e estrutura) para salvar como modelo. */
export function extrairModelo(cena: Cena, superficieId: string): Cena | null {
  const sup = cena.superficies.find((s) => s.id === superficieId);
  if (!sup) return null;
  return clonarComNovosIds({
    ...cenaVazia(cena.tipo),
    superficies: [{ ...sup, origem: { x: 0, y: 0 }, rotacao: 0 }],
    obstaculos: cena.obstaculos.filter((o) => o.superficieId === superficieId),
    modulos: cena.modulos.filter((m) => m.superficieId === superficieId),
    componentes: cena.componentes.filter((c) => c.superficieId === superficieId),
  });
}

/** Insere um modelo na cena como cópia independente. */
export function inserirModelo(cena: Cena, modelo: Cena, deslocamento: P2 = { x: 0, y: 0 }): Cena {
  const copia = clonarComNovosIds(modelo);
  const nomes = new Set(cena.superficies.map((s) => s.nome));
  return {
    ...cena,
    superficies: [
      ...cena.superficies,
      ...copia.superficies.map((s) => {
        let nome = s.nome;
        let i = 2;
        while (nomes.has(nome)) nome = `${s.nome} (${i++})`;
        nomes.add(nome);
        return { ...s, nome, origem: { x: arred(s.origem.x + deslocamento.x), y: arred(s.origem.y + deslocamento.y) } };
      }),
    ],
    obstaculos: [...cena.obstaculos, ...copia.obstaculos],
    modulos: [...cena.modulos, ...copia.modulos],
    componentes: [...cena.componentes, ...copia.componentes],
  };
}

/** Garante que uma cena lida do banco tenha todos os campos (tolerante a versões antigas). */
export function normalizarCena(bruta: unknown, tipo: TipoProjeto): Cena {
  const base = cenaVazia(tipo);
  if (!bruta || typeof bruta !== "object") return base;
  const c = bruta as Partial<Cena>;
  return {
    versao: 1,
    tipo: c.tipo === "solo" || c.tipo === "telhado" ? c.tipo : tipo,
    terreno: {
      contorno: Array.isArray(c.terreno?.contorno) ? c.terreno!.contorno : [],
      desnivel: Number(c.terreno?.desnivel ?? 0) || 0,
    },
    superficies: Array.isArray(c.superficies) ? c.superficies : [],
    obstaculos: Array.isArray(c.obstaculos) ? c.obstaculos : [],
    modulos: Array.isArray(c.modulos) ? c.modulos : [],
    componentes: Array.isArray(c.componentes) ? c.componentes : [],
    pendencias: Array.isArray(c.pendencias) ? c.pendencias : [],
    capa: { camera: c.capa?.camera ?? null },
  };
}

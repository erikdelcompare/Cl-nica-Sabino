import { dimensoesMesa } from "./cena";
import {
  arred,
  cantosModulo,
  cantosObstaculo,
  cantosRetangulo,
  convexosIntersectam,
  novoId,
  poligonoDentro,
  retangulo,
} from "./geometria";
import type { AreaInstalacao, Cena, EspecModulo, MapaModulos, ModuloPosicionado, Superficie } from "./tipos";

const EPS = 1e-6;

export interface ResultadoDistribuicao {
  cena: Cena;
  quantidade: number;
  avisos: string[];
}

function areaInteira(sup: Superficie): AreaInstalacao {
  return { id: "tudo", u: 0, v: 0, largura: sup.largura, comprimento: sup.comprimento };
}

/**
 * Distribui módulos automaticamente em uma superfície usando as dimensões reais do módulo,
 * os afastamentos e os espaçamentos. Substitui os módulos que estavam nessa superfície.
 */
export function distribuir(cena: Cena, supId: string, specs: MapaModulos): ResultadoDistribuicao {
  const sup = cena.superficies.find((s) => s.id === supId);
  if (!sup) return { cena, quantidade: 0, avisos: ["Superfície não encontrada."] };
  const spec = sup.layout.moduloId ? specs[sup.layout.moduloId] : undefined;
  if (!spec) {
    return { cena, quantidade: 0, avisos: ["Escolha o modelo do módulo antes de distribuir."] };
  }
  if (sup.classe === "mesa") return distribuirMesa(cena, sup, spec);

  const { orientacao, espacamentoH, espacamentoV, folgaObstaculo, alinhamento, limite } = sup.layout;
  const w = orientacao === "retrato" ? spec.largura : spec.comprimento;
  const h = orientacao === "retrato" ? spec.comprimento : spec.largura;
  const rotacao = orientacao === "retrato" ? 0 : 90;
  const obstaculos = cena.obstaculos
    .filter((o) => o.superficieId === sup.id)
    .map((o) => cantosObstaculo(o, folgaObstaculo));
  const areas = sup.areas.length > 0 ? sup.areas : [areaInteira(sup)];
  const novos: ModuloPosicionado[] = [];
  const avisos: string[] = [];
  const maximo = limite && limite > 0 ? limite : Infinity;

  for (const area of areas) {
    const colunas = Math.floor((area.largura + espacamentoH + EPS) / (w + espacamentoH));
    const linhas = Math.floor((area.comprimento + espacamentoV + EPS) / (h + espacamentoV));
    if (colunas <= 0 || linhas <= 0) {
      avisos.push("O módulo não cabe em uma das áreas de instalação com esta orientação.");
      continue;
    }
    const usadoL = colunas * w + (colunas - 1) * espacamentoH;
    const usadoC = linhas * h + (linhas - 1) * espacamentoV;
    const u0 = area.u + (alinhamento === "centro" ? (area.largura - usadoL) / 2 : 0);
    const v0 = area.v + (alinhamento === "centro" ? (area.comprimento - usadoC) / 2 : 0);
    for (let l = 0; l < linhas && novos.length < maximo; l++) {
      const fileira = novoId("f");
      for (let c = 0; c < colunas && novos.length < maximo; c++) {
        const u = u0 + c * (w + espacamentoH) + w / 2;
        const v = v0 + l * (h + espacamentoV) + h / 2;
        const cantos = cantosRetangulo(u, v, w, h, 0);
        if (!poligonoDentro(cantos, sup.contorno)) continue;
        if (obstaculos.some((o) => convexosIntersectam(cantos, o))) continue;
        novos.push({
          id: novoId("m"),
          superficieId: sup.id,
          moduloId: spec.id,
          u: arred(u),
          v: arred(v),
          rotacao,
          fileira,
        });
      }
    }
  }
  if (novos.length === 0 && avisos.length === 0) {
    avisos.push("Nenhum módulo coube na área: revise afastamentos, obstáculos ou orientação.");
  }
  return {
    cena: { ...cena, modulos: [...cena.modulos.filter((m) => m.superficieId !== sup.id), ...novos] },
    quantidade: novos.length,
    avisos,
  };
}

/** Mesa de solo: fileiras × módulos por fileira, ajustando o tamanho do plano. */
function distribuirMesa(cena: Cena, sup: Superficie, spec: EspecModulo): ResultadoDistribuicao {
  const mesa = sup.mesa ?? { fileiras: 1, modulosPorFileira: 1 };
  const { orientacao, espacamentoH, espacamentoV } = sup.layout;
  const w = orientacao === "retrato" ? spec.largura : spec.comprimento;
  const h = orientacao === "retrato" ? spec.comprimento : spec.largura;
  const rotacao = orientacao === "retrato" ? 0 : 90;
  const d = dimensoesMesa(mesa.fileiras, mesa.modulosPorFileira, orientacao, espacamentoH, espacamentoV, spec);
  const novos: ModuloPosicionado[] = [];
  for (let l = 0; l < mesa.fileiras; l++) {
    const fileira = novoId("f");
    for (let c = 0; c < mesa.modulosPorFileira; c++) {
      novos.push({
        id: novoId("m"),
        superficieId: sup.id,
        moduloId: spec.id,
        u: arred(c * (w + espacamentoH) + w / 2),
        v: arred(l * (h + espacamentoV) + h / 2),
        rotacao,
        fileira,
      });
    }
  }
  const nova: Superficie = {
    ...sup,
    largura: d.largura,
    comprimento: d.comprimento,
    contorno: retangulo(d.largura, d.comprimento),
    areas: [],
  };
  return {
    cena: {
      ...cena,
      superficies: cena.superficies.map((s) => (s.id === sup.id ? nova : s)),
      modulos: [...cena.modulos.filter((m) => m.superficieId !== sup.id), ...novos],
    },
    quantidade: novos.length,
    avisos: [],
  };
}

/** Adiciona uma fileira com `quantidade` módulos acima da última fileira da superfície. */
export function adicionarFileira(cena: Cena, supId: string, specs: MapaModulos, quantidade: number): Cena {
  const sup = cena.superficies.find((s) => s.id === supId);
  const spec = sup?.layout.moduloId ? specs[sup.layout.moduloId] : undefined;
  if (!sup || !spec || quantidade <= 0) return cena;
  const { orientacao, espacamentoH, espacamentoV } = sup.layout;
  const w = orientacao === "retrato" ? spec.largura : spec.comprimento;
  const h = orientacao === "retrato" ? spec.comprimento : spec.largura;
  const existentes = cena.modulos.filter((m) => m.superficieId === supId);
  let u0 = sup.areas[0]?.u ?? 0;
  let v0 = sup.areas[0]?.v ?? 0;
  if (existentes.length > 0) {
    let topo = -Infinity;
    let esquerda = Infinity;
    for (const m of existentes) {
      const s = specs[m.moduloId] ?? spec;
      const cantos = cantosModulo(m, s);
      for (const p of cantos) {
        if (p.y > topo) topo = p.y;
        if (p.x < esquerda) esquerda = p.x;
      }
    }
    u0 = esquerda;
    v0 = topo + espacamentoV;
  }
  const fileira = novoId("f");
  const novos: ModuloPosicionado[] = [];
  for (let c = 0; c < quantidade; c++) {
    novos.push({
      id: novoId("m"),
      superficieId: supId,
      moduloId: spec.id,
      u: arred(u0 + c * (w + espacamentoH) + w / 2),
      v: arred(v0 + h / 2),
      rotacao: orientacao === "retrato" ? 0 : 90,
      fileira,
    });
  }
  return { ...cena, modulos: [...cena.modulos, ...novos] };
}

/** Adiciona um módulo solto ao lado do último (ou no início da área). */
export function adicionarModulo(cena: Cena, supId: string, specs: MapaModulos): { cena: Cena; id: string | null } {
  const sup = cena.superficies.find((s) => s.id === supId);
  const spec = sup?.layout.moduloId ? specs[sup.layout.moduloId] : undefined;
  if (!sup || !spec) return { cena, id: null };
  const { orientacao, espacamentoH } = sup.layout;
  const w = orientacao === "retrato" ? spec.largura : spec.comprimento;
  const h = orientacao === "retrato" ? spec.comprimento : spec.largura;
  const existentes = cena.modulos.filter((m) => m.superficieId === supId);
  const ultimo = existentes[existentes.length - 1];
  let u = (sup.areas[0]?.u ?? 0) + w / 2;
  let v = (sup.areas[0]?.v ?? 0) + h / 2;
  let fileira = novoId("f");
  if (ultimo) {
    const s = specs[ultimo.moduloId] ?? spec;
    const larguraUltimo = Math.abs(ultimo.rotacao % 180) === 90 ? s.comprimento : s.largura;
    u = ultimo.u + larguraUltimo / 2 + espacamentoH + w / 2;
    v = ultimo.v;
    fileira = ultimo.fileira;
  }
  const novo: ModuloPosicionado = {
    id: novoId("m"),
    superficieId: supId,
    moduloId: spec.id,
    u: arred(u),
    v: arred(v),
    rotacao: orientacao === "retrato" ? 0 : 90,
    fileira,
  };
  return { cena: { ...cena, modulos: [...cena.modulos, novo] }, id: novo.id };
}

/** Duplica os módulos selecionados, deslocando a cópia para o lado (ou para cima, se for uma fileira inteira). */
export function duplicarModulos(cena: Cena, ids: string[], specs: MapaModulos): { cena: Cena; novos: string[] } {
  const sel = cena.modulos.filter((m) => ids.includes(m.id));
  if (sel.length === 0) return { cena, novos: [] };
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const m of sel) {
    const s = specs[m.moduloId];
    if (!s) continue;
    for (const p of cantosModulo(m, s)) {
      minU = Math.min(minU, p.x);
      maxU = Math.max(maxU, p.x);
      minV = Math.min(minV, p.y);
      maxV = Math.max(maxV, p.y);
    }
  }
  if (!Number.isFinite(minU)) return { cena, novos: [] };
  const sup = cena.superficies.find((s) => s.id === sel[0].superficieId);
  const gapH = sup?.layout.espacamentoH ?? 0.02;
  const gapV = sup?.layout.espacamentoV ?? 0.02;
  const fileiraInteira = new Set(sel.map((m) => m.fileira)).size === 1 && sel.length > 1;
  const du = fileiraInteira ? 0 : maxU - minU + gapH;
  const dv = fileiraInteira ? maxV - minV + gapV : 0;
  const fileiras = new Map<string, string>();
  const copias = sel.map((m) => {
    if (!fileiras.has(m.fileira)) fileiras.set(m.fileira, fileiraInteira ? novoId("f") : m.fileira);
    return { ...m, id: novoId("m"), u: arred(m.u + du), v: arred(m.v + dv), fileira: fileiras.get(m.fileira)! };
  });
  return { cena: { ...cena, modulos: [...cena.modulos, ...copias] }, novos: copias.map((c) => c.id) };
}

/** Gira os módulos em 90° no próprio centro. */
export function girarModulos(cena: Cena, ids: string[], angulo = 90): Cena {
  return {
    ...cena,
    modulos: cena.modulos.map((m) =>
      ids.includes(m.id) ? { ...m, rotacao: (((m.rotacao + angulo) % 180) + 180) % 180 } : m,
    ),
  };
}

export function moverModulos(cena: Cena, ids: string[], du: number, dv: number): Cena {
  return {
    ...cena,
    modulos: cena.modulos.map((m) => (ids.includes(m.id) ? { ...m, u: arred(m.u + du), v: arred(m.v + dv) } : m)),
  };
}

export function excluirModulos(cena: Cena, ids: string[]): Cena {
  return { ...cena, modulos: cena.modulos.filter((m) => !ids.includes(m.id)) };
}

/** Troca o modelo do módulo em uma superfície (a distribuição deve ser conferida em seguida). */
export function trocarModelo(cena: Cena, supId: string, moduloId: string): Cena {
  return {
    ...cena,
    superficies: cena.superficies.map((s) => (s.id === supId ? { ...s, layout: { ...s.layout, moduloId } } : s)),
    modulos: cena.modulos.map((m) => (m.superficieId === supId ? { ...m, moduloId } : m)),
  };
}

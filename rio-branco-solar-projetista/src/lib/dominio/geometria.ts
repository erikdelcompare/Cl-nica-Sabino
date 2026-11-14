import type { EspecModulo, ModuloPosicionado, Obstaculo, P2, Superficie } from "./tipos";

export const rad = (graus: number) => (graus * Math.PI) / 180;
export const graus = (r: number) => (r * 180) / Math.PI;
export const arred = (n: number, casas = 3) => {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
};

let contador = 0;
/** Identificador curto e único dentro da cena. */
export function novoId(prefixo = ""): string {
  contador = (contador + 1) % 1e6;
  const aleatorio =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(36).padStart(2, "0")).join("")
      : Math.random().toString(36).slice(2, 12);
  return `${prefixo}${aleatorio}${contador.toString(36)}`;
}

export function retangulo(largura: number, comprimento: number): P2[] {
  return [
    { x: 0, y: 0 },
    { x: largura, y: 0 },
    { x: largura, y: comprimento },
    { x: 0, y: comprimento },
  ];
}

/** Vértices de um retângulo centrado em (cx, cy), girado em graus. */
export function cantosRetangulo(cx: number, cy: number, largura: number, comprimento: number, rotacao = 0): P2[] {
  const c = Math.cos(rad(rotacao));
  const s = Math.sin(rad(rotacao));
  const hw = largura / 2;
  const hh = comprimento / 2;
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([dx, dy]) => ({ x: cx + dx * c - dy * s, y: cy + dx * s + dy * c }));
}

export function cantosModulo(m: ModuloPosicionado, spec: EspecModulo): P2[] {
  return cantosRetangulo(m.u, m.v, spec.largura, spec.comprimento, m.rotacao);
}

export function cantosObstaculo(o: Obstaculo, folga = 0): P2[] {
  return cantosRetangulo(o.u, o.v, o.largura + folga * 2, o.comprimento + folga * 2, o.rotacao);
}

export function areaPoligono(pontos: P2[]): number {
  let a = 0;
  for (let i = 0; i < pontos.length; i++) {
    const p = pontos[i];
    const q = pontos[(i + 1) % pontos.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

export function limites(pontos: P2[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pontos) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

const EPS = 1e-6;

export function pontoEmPoligono(p: P2, poligono: P2[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i];
    const b = poligono[j];
    // Pontos sobre a borda contam como dentro.
    const cruz = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (
      Math.abs(cruz) < EPS &&
      p.x >= Math.min(a.x, b.x) - EPS &&
      p.x <= Math.max(a.x, b.x) + EPS &&
      p.y >= Math.min(a.y, b.y) - EPS &&
      p.y <= Math.max(a.y, b.y) + EPS
    ) {
      return true;
    }
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      dentro = !dentro;
    }
  }
  return dentro;
}

function orient(a: P2, b: P2, c: P2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Cruzamento próprio (não conta toque em vértice ou borda). */
function segmentosCruzam(a: P2, b: P2, c: P2, d: P2): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return ((o1 > EPS && o2 < -EPS) || (o1 < -EPS && o2 > EPS)) && ((o3 > EPS && o4 < -EPS) || (o3 < -EPS && o4 > EPS));
}

/** `interno` (convexo) está totalmente dentro de `externo` (qualquer polígono simples)? */
export function poligonoDentro(interno: P2[], externo: P2[]): boolean {
  for (const p of interno) if (!pontoEmPoligono(p, externo)) return false;
  for (let i = 0; i < interno.length; i++) {
    const a = interno[i];
    const b = interno[(i + 1) % interno.length];
    for (let j = 0; j < externo.length; j++) {
      if (segmentosCruzam(a, b, externo[j], externo[(j + 1) % externo.length])) return false;
    }
  }
  return true;
}

/** Interseção de polígonos convexos pelo teorema do eixo separador. Encostar não conta. */
export function convexosIntersectam(a: P2[], b: P2[], tolerancia = 1e-4): boolean {
  for (const poli of [a, b]) {
    for (let i = 0; i < poli.length; i++) {
      const p = poli[i];
      const q = poli[(i + 1) % poli.length];
      const nx = -(q.y - p.y);
      const ny = q.x - p.x;
      const tam = Math.hypot(nx, ny) || 1;
      let minA = Infinity;
      let maxA = -Infinity;
      let minB = Infinity;
      let maxB = -Infinity;
      for (const v of a) {
        const d = (v.x * nx + v.y * ny) / tam;
        if (d < minA) minA = d;
        if (d > maxA) maxA = d;
      }
      for (const v of b) {
        const d = (v.x * nx + v.y * ny) / tam;
        if (d < minB) minB = d;
        if (d > maxB) maxB = d;
      }
      if (maxA <= minB + tolerancia || maxB <= minA + tolerancia) return false;
    }
  }
  return true;
}

// ------------------------------------------------ superfície ↔ planta ↔ 3D

/** Coordenada da superfície (u, v) → planta (x, y), já projetando a inclinação. */
export function paraPlanta(sup: Pick<Superficie, "origem" | "rotacao" | "inclinacao">, u: number, v: number): P2 {
  const c = Math.cos(rad(sup.rotacao));
  const s = Math.sin(rad(sup.rotacao));
  const vh = v * Math.cos(rad(sup.inclinacao));
  return { x: sup.origem.x + u * c - vh * s, y: sup.origem.y + u * s + vh * c };
}

/** Planta (x, y) → coordenada da superfície (u, v). */
export function paraLocal(sup: Pick<Superficie, "origem" | "rotacao" | "inclinacao">, p: P2): P2 {
  const c = Math.cos(rad(sup.rotacao));
  const s = Math.sin(rad(sup.rotacao));
  const dx = p.x - sup.origem.x;
  const dy = p.y - sup.origem.y;
  const cosI = Math.cos(rad(sup.inclinacao)) || 1;
  return { x: dx * c + dy * s, y: (-dx * s + dy * c) / cosI };
}

export function alturaEm(sup: Pick<Superficie, "alturaBase" | "inclinacao">, v: number): number {
  return sup.alturaBase + v * Math.sin(rad(sup.inclinacao));
}

export function contornoEmPlanta(sup: Superficie): P2[] {
  return sup.contorno.map((p) => paraPlanta(sup, p.x, p.y));
}

/** Limites de toda a cena em planta, com margem. */
export function limitesCena(
  superficies: Superficie[],
  terreno: P2[],
  obstaculosSoltos: Obstaculo[] = [],
  margem = 1,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const pts: P2[] = [...terreno];
  for (const s of superficies) pts.push(...contornoEmPlanta(s));
  for (const o of obstaculosSoltos) pts.push(...cantosObstaculo(o));
  if (pts.length === 0) return { minX: -5, minY: -5, maxX: 5, maxY: 5 };
  const l = limites(pts);
  return { minX: l.minX - margem, minY: l.minY - margem, maxX: l.maxX + margem, maxY: l.maxY + margem };
}

/** Distância entre dois pontos. */
export const distancia = (a: P2, b: P2) => Math.hypot(b.x - a.x, b.y - a.y);

/** Arredonda para a grade. */
export const naGrade = (valor: number, passo: number) => (passo > 0 ? Math.round(valor / passo) * passo : valor);

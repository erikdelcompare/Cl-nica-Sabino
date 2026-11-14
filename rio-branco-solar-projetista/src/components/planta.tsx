import type { ReactElement } from "react";
import { cantosModulo, cantosObstaculo, cantosRetangulo, contornoEmPlanta, paraPlanta } from "@/lib/dominio/geometria";
import { formatarNumero } from "@/lib/dominio/dinheiro";
import type { Cena, Componente, MapaModulos, P2, Superficie } from "@/lib/dominio/tipos";

// Vista 2D (planta). Um único desenho para o editor e para a proposta pública.
// Não usa hooks: pode ser renderizada no servidor. O editor só acrescenta os eventos de toque.

export interface Janela {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OpcoesPlanta {
  janela: Janela;
  grade?: boolean;
  editavel?: boolean;
  selecionados?: string[];
  /** Módulos com problema de conferência: "erro" (vermelho) ou "aviso" (âmbar). */
  problemas?: Record<string, "erro" | "aviso">;
  rotulos?: boolean;
  /** Superfície cujos vértices e áreas podem ser editados (a ativa). */
  superficieAtiva?: string | null;
}

const pts = (ps: P2[]) => ps.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(" ");
const num = (n: number, casas = 2) => formatarNumero(n, casas);

function passoGrade(janela: Janela): number {
  if (janela.w <= 30) return 0.5;
  if (janela.w <= 80) return 1;
  return 5;
}

export function Grade({ janela }: { janela: Janela }) {
  const passo = passoGrade(janela);
  const linhas: ReactElement[] = [];
  const x0 = Math.floor(janela.x / passo) * passo;
  const y0 = Math.floor(janela.y / passo) * passo;
  for (let x = x0; x <= janela.x + janela.w; x += passo) {
    const forte = Math.abs(x / (passo * 2) - Math.round(x / (passo * 2))) < 1e-6;
    linhas.push(
      <line key={`x${x.toFixed(3)}`} x1={x} y1={janela.y} x2={x} y2={janela.y + janela.h} stroke={forte ? "#cfd6dd" : "#e6ebf0"} strokeWidth={1} vectorEffect="non-scaling-stroke" />,
    );
  }
  for (let y = y0; y <= janela.y + janela.h; y += passo) {
    const forte = Math.abs(y / (passo * 2) - Math.round(y / (passo * 2))) < 1e-6;
    linhas.push(
      <line key={`y${y.toFixed(3)}`} x1={janela.x} y1={y} x2={janela.x + janela.w} y2={y} stroke={forte ? "#cfd6dd" : "#e6ebf0"} strokeWidth={1} vectorEffect="non-scaling-stroke" />,
    );
  }
  return <g aria-hidden="true">{linhas}</g>;
}

function centro(ps: P2[]): P2 {
  const n = ps.length || 1;
  return { x: ps.reduce((s, p) => s + p.x, 0) / n, y: ps.reduce((s, p) => s + p.y, 0) / n };
}

function Cota({ a, b, texto }: { a: P2; b: P2; texto: string }) {
  const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return (
    <g pointerEvents="none">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0f3d5e" strokeWidth={1} strokeDasharray="0.15 0.12" vectorEffect="non-scaling-stroke" />
      <text x={meio.x} y={meio.y} fontSize={0.42} textAnchor="middle" fill="#0f3d5e" stroke="#ffffff" strokeWidth={0.08} paintOrder="stroke">
        {texto}
      </text>
    </g>
  );
}

function Componentes({ componentes, superficies }: { componentes: Componente[]; superficies: Superficie[] }) {
  const mapa = new Map(superficies.map((s) => [s.id, s]));
  return (
    <g pointerEvents="none">
      {componentes.map((c) => {
        const s = mapa.get(c.superficieId);
        if (!s) return null;
        if (c.eixo === "ponto") return null;
        if (c.eixo === "vertical") {
          const p = paraPlanta(s, c.u, c.v);
          const r = Math.max(0.03, c.secao.largura / 2000);
          return <circle key={c.id} cx={p.x} cy={p.y} r={r} fill={c.funcao === "fundacao" ? "#b6b2aa" : "#4b4b4b"} />;
        }
        const a = c.eixo === "u" ? paraPlanta(s, c.u, c.v) : paraPlanta(s, c.u, c.v);
        const b = c.eixo === "u" ? paraPlanta(s, c.u + c.comprimento, c.v) : paraPlanta(s, c.u, c.v + c.comprimento);
        const cor = c.funcao === "trilho" ? "#55606b" : c.funcao === "viga" ? "#8d6e3f" : "#a58b5b";
        return <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={cor} strokeWidth={c.funcao === "terca" ? 0.06 : 0.07} strokeLinecap="round" />;
      })}
    </g>
  );
}

export function ConteudoPlanta({ cena, specs, opcoes }: { cena: Cena; specs: MapaModulos; opcoes: OpcoesPlanta }) {
  const sel = new Set(opcoes.selecionados ?? []);
  const editavel = Boolean(opcoes.editavel);
  const ativa = opcoes.superficieAtiva ?? null;
  const terreno = cena.terreno.contorno;

  return (
    <g>
      {opcoes.grade !== false && <Grade janela={opcoes.janela} />}

      {terreno.length >= 3 && (
        <g>
          <polygon points={pts(terreno)} fill="#e7efdc" stroke="#6f8f5b" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          {editavel &&
            terreno.map((p, i) => (
              <circle
                key={`tv${i}`}
                data-k="vertice-terreno"
                data-idx={i}
                cx={p.x}
                cy={p.y}
                r={0.22}
                fill="#ffffff"
                stroke="#6f8f5b"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: "move" }}
              />
            ))}
        </g>
      )}

      {cena.superficies.map((s) => {
        const contorno = contornoEmPlanta(s);
        const mesa = s.classe === "mesa";
        const c = centro(contorno);
        const aresta = (i: number) => {
          const a = contorno[i];
          const b = contorno[(i + 1) % contorno.length];
          return { a, b };
        };
        const ehAtiva = ativa === s.id;
        return (
          <g key={s.id}>
            <polygon
              points={pts(contorno)}
              fill={mesa ? "#f4efe2" : "#dbe5ee"}
              fillOpacity={mesa ? 0.9 : 0.85}
              stroke={mesa ? "#8a7a5c" : "#0f3d5e"}
              strokeWidth={ehAtiva ? 3 : 1.5}
              strokeDasharray={mesa ? "0.25 0.15" : undefined}
              vectorEffect="non-scaling-stroke"
              data-k="superficie"
              data-id={s.id}
              style={{ cursor: editavel ? "pointer" : undefined }}
            />
            {s.areas.map((ar) => {
              const pa = cantosRetangulo(ar.u + ar.largura / 2, ar.v + ar.comprimento / 2, ar.largura, ar.comprimento).map((q) => paraPlanta(s, q.x, q.y));
              return (
                <polygon
                  key={ar.id}
                  points={pts(pa)}
                  fill="rgba(245,165,36,0.12)"
                  stroke="#f5a524"
                  strokeWidth={1.5}
                  strokeDasharray="0.2 0.12"
                  vectorEffect="non-scaling-stroke"
                  data-k="area"
                  data-id={ar.id}
                  data-sup={s.id}
                  style={{ cursor: editavel && ehAtiva ? "move" : undefined }}
                />
              );
            })}
            {editavel && ehAtiva &&
              contorno.map((p, i) => (
                <circle
                  key={`v${i}`}
                  data-k="vertice-agua"
                  data-idx={i}
                  data-sup={s.id}
                  cx={p.x}
                  cy={p.y}
                  r={0.22}
                  fill="#ffffff"
                  stroke="#0f3d5e"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: "move" }}
                />
              ))}
            {opcoes.rotulos !== false && (
              <text x={c.x} y={c.y} fontSize={0.5} textAnchor="middle" fill="#0a2a42" pointerEvents="none" stroke="#ffffff" strokeWidth={0.1} paintOrder="stroke">
                {s.nome}
              </text>
            )}
            {opcoes.rotulos !== false && !mesa && (
              <>
                <Cota a={aresta(0).a} b={aresta(0).b} texto={`${num(s.largura)} m`} />
                <Cota a={aresta(1).a} b={aresta(1).b} texto={`${num(s.comprimento)} m`} />
              </>
            )}
          </g>
        );
      })}

      {cena.obstaculos.map((o) => {
        const sup = o.superficieId ? cena.superficies.find((s) => s.id === o.superficieId) : undefined;
        const base = cantosObstaculo(o);
        const ps = sup ? base.map((q) => paraPlanta(sup, q.x, q.y)) : base;
        const ehSel = sel.has(o.id);
        return (
          <g key={o.id}>
            <polygon
              points={pts(ps)}
              fill="#c8b08a"
              stroke={ehSel ? "#f5a524" : "#7a5f3a"}
              strokeWidth={ehSel ? 3 : 1.2}
              vectorEffect="non-scaling-stroke"
              data-k="obstaculo"
              data-id={o.id}
              data-sup={o.superficieId ?? ""}
              style={{ cursor: editavel ? "move" : undefined }}
            />
            {opcoes.rotulos !== false && (
              <text x={centro(ps).x} y={centro(ps).y} fontSize={0.36} textAnchor="middle" fill="#3a2c18" pointerEvents="none">
                {o.nome}
              </text>
            )}
          </g>
        );
      })}

      <Componentes componentes={cena.componentes} superficies={cena.superficies} />

      {cena.modulos.map((m) => {
        const spec = specs[m.moduloId];
        const sup = cena.superficies.find((s) => s.id === m.superficieId);
        if (!spec || !sup) {
          return null;
        }
        const ps = cantosModulo(m, spec).map((q) => paraPlanta(sup, q.x, q.y));
        const nivel = opcoes.problemas?.[m.id];
        const cor = nivel === "erro" ? "#b3261e" : nivel === "aviso" ? "#e0a100" : "#1f5b8a";
        const ehSel = sel.has(m.id);
        return (
          <polygon
            key={m.id}
            points={pts(ps)}
            fill={cor}
            fillOpacity={0.88}
            stroke={ehSel ? "#f5a524" : "#0a2a42"}
            strokeWidth={ehSel ? 3 : 0.8}
            vectorEffect="non-scaling-stroke"
            data-k="modulo"
            data-id={m.id}
            data-sup={sup.id}
            style={{ cursor: editavel ? "move" : undefined }}
          />
        );
      })}
    </g>
  );
}

/** Versão estática (sem interação), usada na proposta pública e nas listas. */
export function PlantaEstatica({
  cena,
  specs,
  largura = 640,
  rotulos = true,
  className,
  titulo,
}: {
  cena: Cena;
  specs: MapaModulos;
  largura?: number;
  rotulos?: boolean;
  className?: string;
  titulo: string;
}) {
  const todos: P2[] = [...cena.terreno.contorno];
  for (const s of cena.superficies) todos.push(...contornoEmPlanta(s));
  for (const o of cena.obstaculos) todos.push(...cantosObstaculo(o));
  let x0 = -5;
  let y0 = -5;
  let x1 = 5;
  let y1 = 5;
  if (todos.length > 0) {
    x0 = Math.min(...todos.map((p) => p.x)) - 1;
    y0 = Math.min(...todos.map((p) => p.y)) - 1;
    x1 = Math.max(...todos.map((p) => p.x)) + 1;
    y1 = Math.max(...todos.map((p) => p.y)) + 1;
  }
  const w = x1 - x0;
  const h = y1 - y0;
  const janela = { x: x0, y: y0, w, h };
  return (
    <svg
      role="img"
      aria-label={titulo}
      viewBox={`${x0} ${y0} ${w} ${h}`}
      width="100%"
      style={{ maxWidth: largura }}
      className={className}
    >
      <title>{titulo}</title>
      <rect x={x0} y={y0} width={w} height={h} fill="#ffffff" />
      <ConteudoPlanta cena={cena} specs={specs} opcoes={{ janela, grade: true, rotulos }} />
    </svg>
  );
}

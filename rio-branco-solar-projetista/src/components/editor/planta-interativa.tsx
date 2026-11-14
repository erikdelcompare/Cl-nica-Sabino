"use client";

import { useRef } from "react";
import { ConteudoPlanta, type Janela } from "@/components/planta";
import type { Cena, MapaModulos, P2 } from "@/lib/dominio/tipos";

export interface AlvoArrasto {
  tipo: "modulo" | "obstaculo" | "area" | "superficie" | "vertice-agua" | "vertice-terreno";
  id: string;
  sup?: string;
  idx?: number;
}

interface Props {
  cena: Cena;
  specs: MapaModulos;
  janela: Janela;
  selecionados: string[];
  problemas: Record<string, "erro" | "aviso">;
  superficieAtiva: string | null;
  editavel: boolean;
  grade: boolean;
  onAlvo: (alvo: AlvoArrasto, p: P2) => void;
  onMover: (p: P2) => void;
  onFim: () => void;
  onFundo: () => void;
}

/** Planta com toque e arraste. Usa eventos de ponteiro, que funcionam com dedo e com mouse. */
export function PlantaInterativa(props: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const arrastando = useRef(false);

  const pontoPlanta = (e: React.PointerEvent): P2 => {
    const el = svg.current!;
    const ctm = el.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(ctm.inverse());
    return { x: q.x, y: q.y };
  };

  return (
    <svg
      ref={svg}
      role="application"
      aria-label="Planta 2D do projeto. Toque em uma peça para selecionar e arraste para mover."
      viewBox={`${props.janela.x} ${props.janela.y} ${props.janela.w} ${props.janela.h}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      className="area-desenho block h-full w-full bg-white"
      onPointerDown={(e) => {
        const el = (e.target as Element).closest("[data-k]") as SVGElement | null;
        if (!el) {
          props.onFundo();
          return;
        }
        const k = el.dataset.k ?? "";
        const id = el.dataset.id ?? "";
        const sup = el.dataset.sup || undefined;
        const idx = el.dataset.idx !== undefined ? Number(el.dataset.idx) : undefined;
        let alvo: AlvoArrasto | null = null;
        if (k === "modulo") alvo = { tipo: "modulo", id };
        else if (k === "obstaculo") alvo = { tipo: "obstaculo", id, sup };
        else if (k === "area") alvo = { tipo: "area", id, sup };
        else if (k === "superficie") alvo = { tipo: "superficie", id };
        else if (k === "vertice-agua") alvo = { tipo: "vertice-agua", id: sup ?? "", sup, idx };
        else if (k === "vertice-terreno") alvo = { tipo: "vertice-terreno", id: "terreno", idx };
        if (!alvo) return;
        e.preventDefault();
        arrastando.current = true;
        svg.current?.setPointerCapture(e.pointerId);
        props.onAlvo(alvo, pontoPlanta(e));
      }}
      onPointerMove={(e) => {
        if (!arrastando.current) return;
        props.onMover(pontoPlanta(e));
      }}
      onPointerUp={() => {
        if (!arrastando.current) return;
        arrastando.current = false;
        props.onFim();
      }}
      onPointerCancel={() => {
        if (!arrastando.current) return;
        arrastando.current = false;
        props.onFim();
      }}
    >
      <rect x={props.janela.x} y={props.janela.y} width={props.janela.w} height={props.janela.h} fill="#ffffff" />
      <ConteudoPlanta
        cena={props.cena}
        specs={props.specs}
        opcoes={{
          janela: props.janela,
          grade: props.grade,
          editavel: props.editavel,
          selecionados: props.selecionados,
          problemas: props.problemas,
          superficieAtiva: props.superficieAtiva,
          rotulos: true,
        }}
      />
    </svg>
  );
}

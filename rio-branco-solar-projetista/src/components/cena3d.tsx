"use client";

import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ALTURA_SOBRE_TELHA } from "@/lib/dominio/cena";
import { alturaEm, limitesCena, paraPlanta, rad } from "@/lib/dominio/geometria";
import type { Cena, CameraCapa, Componente, MapaModulos, Superficie } from "@/lib/dominio/tipos";

// Vista 3D: a mesma geometria da vista 2D. Mostra a montagem prevista; não é cálculo estrutural.

export interface Camadas {
  modulos: boolean;
  estrutura: boolean;
  cobertura: boolean;
  obstaculos: boolean;
  terreno: boolean;
}

export type Visao = "livre" | "superior" | "lateral";

export interface ApiCena3D {
  capturar: () => string | null;
  pose: () => CameraCapa | null;
}

export function webglDisponivel(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Base de um plano inclinado: eixo da largura (u), eixo da inclinação (v) e normal para cima. */
function baseSuperficie(sup: Pick<Superficie, "rotacao" | "inclinacao">) {
  const r = rad(sup.rotacao);
  const I = rad(sup.inclinacao);
  const a = Math.cos(r);
  const b = Math.sin(r);
  const cI = Math.cos(I);
  const sI = Math.sin(I);
  return {
    u: new THREE.Vector3(a, 0, b),
    v: new THREE.Vector3(-b * cI, sI, a * cI),
    up: new THREE.Vector3(b * sI, cI, -a * sI),
  };
}

function pontoSuperficie(sup: Superficie, u: number, v: number, n = 0): THREE.Vector3 {
  const p = paraPlanta(sup, u, v);
  const B = baseSuperficie(sup);
  return new THREE.Vector3(p.x, alturaEm(sup, v), p.y).addScaledVector(B.up, n);
}

function quaternionSuperficie(sup: Superficie): THREE.Quaternion {
  const B = baseSuperficie(sup);
  const m = new THREE.Matrix4().makeBasis(B.u, B.up, B.v);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

const COR_COMPONENTE: Record<string, string> = {
  trilho: "#8a939c",
  emenda: "#6b7480",
  grampo_final: "#c3c9cf",
  grampo_intermediario: "#c3c9cf",
  fixacao: "#b0b6bd",
  poste: "#c7c3bb",
  viga: "#7d8791",
  terca: "#9aa3ab",
  fundacao: "#b6b2aa",
  outro: "#9aa3ab",
};

function corComponente(c: Componente): string {
  if (c.funcao === "poste" && c.material.includes("aroeira")) return "#a0744a";
  return COR_COMPONENTE[c.funcao] ?? "#9aa3ab";
}

function Caixa({
  pos,
  quat,
  tam,
  cor,
  opacidade = 1,
}: {
  pos: THREE.Vector3;
  quat?: THREE.Quaternion;
  tam: [number, number, number];
  cor: string;
  opacidade?: number;
}) {
  return (
    <mesh position={pos} quaternion={quat}>
      <boxGeometry args={tam} />
      <meshStandardMaterial color={cor} roughness={0.6} metalness={0.15} transparent={opacidade < 1} opacity={opacidade} />
    </mesh>
  );
}

function Poligono({ pontos, cor, y = 0 }: { pontos: THREE.Vector3[]; cor: string; y?: number }) {
  const geometria = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const vertices: number[] = [];
    for (let i = 1; i < pontos.length - 1; i++) {
      for (const p of [pontos[0], pontos[i], pontos[i + 1]]) vertices.push(p.x, p.y + y, p.z);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    return g;
  }, [pontos, y]);
  return (
    <mesh geometry={geometria}>
      <meshStandardMaterial color={cor} side={THREE.DoubleSide} roughness={0.8} />
    </mesh>
  );
}

function Cena({ cena, specs, camadas }: { cena: Cena; specs: MapaModulos; camadas: Camadas }) {
  const mapaSup = useMemo(() => new Map(cena.superficies.map((s) => [s.id, s])), [cena.superficies]);

  return (
    <group>
      {camadas.terreno && cena.terreno.contorno.length >= 3 && (
        <Poligono
          cor="#cfdcbf"
          y={-0.02}
          pontos={cena.terreno.contorno.map((p) => new THREE.Vector3(p.x, 0, p.y))}
        />
      )}

      {camadas.cobertura &&
        cena.superficies
          .filter((s) => s.classe === "agua")
          .map((s) => (
            <Poligono
              key={`cob-${s.id}`}
              cor="#8d969e"
              pontos={s.contorno.map((p) => pontoSuperficie(s, p.x, p.y, -0.06))}
            />
          ))}

      {camadas.modulos &&
        cena.modulos.map((m) => {
          const spec = specs[m.moduloId];
          const sup = mapaSup.get(m.superficieId);
          if (!spec || !sup) return null;
          const deitado = Math.abs(m.rotacao % 180) > 0.5;
          const tamU = deitado ? spec.comprimento : spec.largura;
          const tamV = deitado ? spec.largura : spec.comprimento;
          const pos = pontoSuperficie(sup, m.u, m.v, ALTURA_SOBRE_TELHA + spec.espessura / 2);
          return (
            <Caixa
              key={m.id}
              pos={pos}
              quat={quaternionSuperficie(sup)}
              tam={[tamU, spec.espessura, tamV]}
              cor="#1f5b8a"
            />
          );
        })}

      {camadas.estrutura &&
        cena.componentes.map((c) => {
          const sup = mapaSup.get(c.superficieId);
          if (!sup) return null;
          const cor = corComponente(c);
          const altura = c.secao.altura / 1000;
          const largura = c.secao.largura / 1000;
          if (c.eixo === "vertical") {
            if (c.funcao === "fundacao" && c.forma === "circular") {
              const p = paraPlanta(sup, c.u, c.v);
              return (
                <mesh key={c.id} position={[p.x, (c.altura - c.enterrado) / 2, p.y]}>
                  <cylinderGeometry args={[largura / 2, largura / 2, c.comprimento, 20]} />
                  <meshStandardMaterial color={cor} />
                </mesh>
              );
            }
            const p = paraPlanta(sup, c.u, c.v);
            return (
              <Caixa key={c.id} pos={new THREE.Vector3(p.x, (c.altura - c.enterrado) / 2, p.y)} tam={[largura, c.comprimento, largura]} cor={cor} />
            );
          }
          if (c.eixo === "u") {
            const pos = pontoSuperficie(sup, c.u + c.comprimento / 2, c.v, c.n);
            return <Caixa key={c.id} pos={pos} quat={quaternionSuperficie(sup)} tam={[c.comprimento, altura, largura]} cor={cor} />;
          }
          if (c.eixo === "v") {
            const pos = pontoSuperficie(sup, c.u, c.v + c.comprimento / 2, c.n);
            return <Caixa key={c.id} pos={pos} quat={quaternionSuperficie(sup)} tam={[largura, altura, c.comprimento]} cor={cor} />;
          }
          const pos = pontoSuperficie(sup, c.u, c.v, c.n);
          return (
            <mesh key={c.id} position={pos}>
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshStandardMaterial color={cor} />
            </mesh>
          );
        })}

      {camadas.obstaculos &&
        cena.obstaculos.map((o) => {
          const sup = o.superficieId ? mapaSup.get(o.superficieId) : undefined;
          if (sup) {
            return (
              <Caixa
                key={o.id}
                pos={pontoSuperficie(sup, o.u, o.v, o.altura / 2)}
                quat={quaternionSuperficie(sup)}
                tam={[o.largura, o.altura, o.comprimento]}
                cor="#c8b08a"
              />
            );
          }
          return <Caixa key={o.id} pos={new THREE.Vector3(o.u, o.altura / 2, o.v)} tam={[o.largura, o.altura, o.comprimento]} cor="#c8b08a" />;
        })}
    </group>
  );
}

function ControlesECamera({
  alvo,
  distancia,
  visao,
  registrar,
  pose,
}: {
  alvo: THREE.Vector3;
  distancia: number;
  visao: Visao;
  registrar: (api: ApiCena3D) => void;
  pose: CameraCapa | null;
}) {
  const { camera, gl, scene } = useThree();
  const controles = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);

  useEffect(() => {
    if (visao === "livre") return;
    if (visao === "superior") camera.position.set(alvo.x + 0.001, alvo.y + distancia, alvo.z + 0.001);
    else camera.position.set(alvo.x, alvo.y + distancia * 0.2, alvo.z + distancia);
    camera.lookAt(alvo);
    if (controles.current) {
      controles.current.target.copy(alvo);
      controles.current.update();
    }
  }, [visao, alvo, distancia, camera]);

  useEffect(() => {
    if (!pose) return;
    camera.position.set(...pose.posicao);
    camera.lookAt(new THREE.Vector3(...pose.alvo));
    if (controles.current) {
      controles.current.target.set(...pose.alvo);
      controles.current.update();
    }
  }, [pose, camera]);

  useEffect(() => {
    registrar({
      capturar: () => {
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/jpeg", 0.92);
      },
      pose: () => ({
        posicao: [camera.position.x, camera.position.y, camera.position.z],
        alvo: controles.current ? [controles.current.target.x, controles.current.target.y, controles.current.target.z] : [alvo.x, alvo.y, alvo.z],
      }),
    });
  }, [registrar, gl, scene, camera, alvo]);

  return <OrbitControls ref={controles as never} makeDefault enableDamping dampingFactor={0.12} minDistance={1} maxDistance={400} />;
}

export function Cena3D({
  cena,
  specs,
  camadas,
  visao,
  registrar,
  pose,
  altura = 420,
}: {
  cena: Cena;
  specs: MapaModulos;
  camadas: Camadas;
  visao: Visao;
  registrar: (api: ApiCena3D) => void;
  pose?: CameraCapa | null;
  altura?: number;
}) {
  const bounds = useMemo(() => {
    const l = limitesCena(cena.superficies, cena.terreno.contorno, cena.obstaculos, 2);
    const cx = (l.minX + l.maxX) / 2;
    const cz = (l.minY + l.maxY) / 2;
    const tamanho = Math.max(l.maxX - l.minX, l.maxY - l.minY, 4);
    const alturaMax = Math.max(3, ...cena.superficies.map((s) => s.alturaBase + s.comprimento * Math.sin(rad(s.inclinacao)) + 1));
    return { alvo: new THREE.Vector3(cx, alturaMax * 0.3, cz), distancia: tamanho * 0.8, tamanho };
  }, [cena]);

  const posicaoInicial = useMemo<[number, number, number]>(() => {
    const d = bounds.distancia;
    return [bounds.alvo.x + d * 0.7, bounds.alvo.y + d * 0.6, bounds.alvo.z + d * 0.9];
  }, [bounds]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-linha bg-[#eef2f5]" style={{ height: altura }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ fov: 42, near: 0.1, far: 2000, position: posicaoInicial }}
        dpr={[1, 2]}
        onCreated={({ camera }) => camera.lookAt(bounds.alvo)}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[30, 50, 20]} intensity={0.9} />
        <directionalLight position={[-20, 25, -30]} intensity={0.35} />
        <Cena cena={cena} specs={specs} camadas={camadas} />
        <ControlesECamera alvo={bounds.alvo} distancia={bounds.distancia} visao={visao} registrar={registrar} pose={pose ?? null} />
      </Canvas>
    </div>
  );
}

/** Mostra a alternativa (2D) quando o aparelho não consegue desenhar o 3D. */
export class LimiteCena3D extends Component<{ fallback: ReactNode; onErro?: () => void; children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch() {
    this.props.onErro?.();
  }
  render() {
    return this.state.erro ? this.props.fallback : this.props.children;
  }
}

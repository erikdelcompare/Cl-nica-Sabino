import { cantosModulo, cantosObstaculo, cantosRetangulo, convexosIntersectam, limites, poligonoDentro } from "./geometria";
import type { Cena, MapaModulos, P2 } from "./tipos";

export type TipoProblema = "sem_modelo" | "fora_cobertura" | "fora_area" | "sobreposicao" | "obstaculo";

export interface Problema {
  tipo: TipoProblema;
  gravidade: "erro" | "aviso";
  moduloId: string;
  superficieId: string;
  mensagem: string;
}

export interface ResultadoValidacao {
  problemas: Problema[];
  porModulo: Record<string, Problema[]>;
  erros: number;
  avisos: number;
}

/**
 * Confere a distribuição: peças fora da cobertura, fora das áreas de instalação,
 * sobrepostas ou interferindo com obstáculos (incluindo a folga configurada).
 */
export function validarCena(cena: Cena, specs: MapaModulos): ResultadoValidacao {
  const problemas: Problema[] = [];
  const add = (p: Problema) => problemas.push(p);

  for (const sup of cena.superficies) {
    const mods = cena.modulos.filter((m) => m.superficieId === sup.id);
    if (mods.length === 0) continue;
    const obstaculos = cena.obstaculos.filter((o) => o.superficieId === sup.id);
    const areas = sup.classe === "agua" ? sup.areas : [];
    const formas: { id: string; cantos: P2[]; caixa: ReturnType<typeof limites> }[] = [];

    for (const m of mods) {
      const spec = specs[m.moduloId];
      if (!spec) {
        add({
          tipo: "sem_modelo",
          gravidade: "erro",
          moduloId: m.id,
          superficieId: sup.id,
          mensagem: "Módulo sem modelo no catálogo (item desativado ou removido).",
        });
        continue;
      }
      const cantos = cantosModulo(m, spec);
      formas.push({ id: m.id, cantos, caixa: limites(cantos) });

      if (!poligonoDentro(cantos, sup.contorno)) {
        add({
          tipo: "fora_cobertura",
          gravidade: "erro",
          moduloId: m.id,
          superficieId: sup.id,
          mensagem: `Módulo fora dos limites de ${sup.nome}.`,
        });
      } else if (areas.length > 0) {
        const dentroDeAlguma = areas.some((a) =>
          poligonoDentro(
            cantos,
            cantosRetangulo(a.u + a.largura / 2, a.v + a.comprimento / 2, a.largura + 0.002, a.comprimento + 0.002),
          ),
        );
        if (!dentroDeAlguma) {
          add({
            tipo: "fora_area",
            gravidade: "aviso",
            moduloId: m.id,
            superficieId: sup.id,
            mensagem: "Módulo fora da área de instalação (afastamento das bordas).",
          });
        }
      }

      for (const o of obstaculos) {
        if (convexosIntersectam(cantos, cantosObstaculo(o, 0))) {
          add({
            tipo: "obstaculo",
            gravidade: "erro",
            moduloId: m.id,
            superficieId: sup.id,
            mensagem: `Módulo sobre ${o.nome}.`,
          });
        } else if (
          sup.layout.folgaObstaculo > 0 &&
          convexosIntersectam(cantos, cantosObstaculo(o, sup.layout.folgaObstaculo))
        ) {
          add({
            tipo: "obstaculo",
            gravidade: "aviso",
            moduloId: m.id,
            superficieId: sup.id,
            mensagem: `Módulo a menos de ${sup.layout.folgaObstaculo.toFixed(2).replace(".", ",")} m de ${o.nome}.`,
          });
        }
      }
    }

    for (let i = 0; i < formas.length; i++) {
      for (let j = i + 1; j < formas.length; j++) {
        const a = formas[i];
        const b = formas[j];
        if (
          a.caixa.maxX <= b.caixa.minX ||
          b.caixa.maxX <= a.caixa.minX ||
          a.caixa.maxY <= b.caixa.minY ||
          b.caixa.maxY <= a.caixa.minY
        ) {
          continue;
        }
        if (convexosIntersectam(a.cantos, b.cantos, 0.002)) {
          for (const id of [a.id, b.id]) {
            add({
              tipo: "sobreposicao",
              gravidade: "erro",
              moduloId: id,
              superficieId: sup.id,
              mensagem: "Módulos sobrepostos.",
            });
          }
        }
      }
    }
  }

  const porModulo: Record<string, Problema[]> = {};
  for (const p of problemas) (porModulo[p.moduloId] ??= []).push(p);
  return {
    problemas,
    porModulo,
    erros: new Set(problemas.filter((p) => p.gravidade === "erro").map((p) => p.moduloId)).size,
    avisos: new Set(problemas.filter((p) => p.gravidade === "aviso").map((p) => p.moduloId)).size,
  };
}

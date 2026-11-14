import { novoId } from "./geometria";
import type { MapaCatalogo } from "./estrutura";
import type { Cena, EspecModulo, ItemCatalogo, Kit, MapaModulos, VerificacaoEletrica } from "./tipos";

export function kitVazio(): Kit {
  return {
    modulos: [],
    inversores: [],
    geracaoMensalKwh: null,
    origemGeracao: "",
    verificacao: verificacaoVazia(),
  };
}

export function verificacaoVazia(): VerificacaoEletrica {
  return {
    tempMinC: 15,
    tempMaxCelulaC: 70,
    arranjos: [],
    validados: {},
    responsavel: "",
    validadoEm: null,
    observacoes: "",
  };
}

export function normalizarKit(bruto: unknown): Kit {
  const base = kitVazio();
  if (!bruto || typeof bruto !== "object") return base;
  const k = bruto as Partial<Kit>;
  return {
    modulos: Array.isArray(k.modulos) ? k.modulos : [],
    inversores: Array.isArray(k.inversores) ? k.inversores : [],
    geracaoMensalKwh: typeof k.geracaoMensalKwh === "number" ? k.geracaoMensalKwh : null,
    origemGeracao: typeof k.origemGeracao === "string" ? k.origemGeracao : "",
    verificacao: { ...base.verificacao, ...(k.verificacao ?? {}), validados: { ...(k.verificacao?.validados ?? {}) } },
  };
}

export function especDoCatalogo(item: ItemCatalogo): EspecModulo | null {
  const s = item.specs ?? {};
  if (item.tipo !== "modulo" || !s.larguraMm || !s.comprimentoMm) return null;
  return {
    id: item.id,
    rotulo: `${item.fabricante} ${item.modelo}`.trim(),
    potenciaWp: s.potenciaWp ?? 0,
    largura: s.larguraMm / 1000,
    comprimento: s.comprimentoMm / 1000,
    espessura: (s.espessuraMm ?? 35) / 1000,
  };
}

export function mapaDeModulos(catalogo: ItemCatalogo[]): MapaModulos {
  const mapa: MapaModulos = {};
  for (const item of catalogo) {
    const e = especDoCatalogo(item);
    if (e) mapa[e.id] = e;
  }
  return mapa;
}

export function mapaDoCatalogo(catalogo: ItemCatalogo[]): MapaCatalogo {
  return Object.fromEntries(catalogo.map((i) => [i.id, i]));
}

export function contarModulos(cena: Cena): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const m of cena.modulos) contagem[m.moduloId] = (contagem[m.moduloId] ?? 0) + 1;
  return contagem;
}

/** Atualiza as quantidades automáticas do kit com o que está desenhado. */
export function sincronizarKit(kit: Kit, cena: Cena): Kit {
  const contagem = contarModulos(cena);
  const modulos = kit.modulos
    .map((m) => (m.automatico ? { ...m, quantidade: contagem[m.catalogoId] ?? 0 } : m))
    .filter((m) => !(m.automatico && m.quantidade === 0));
  for (const [id, quantidade] of Object.entries(contagem)) {
    if (!modulos.some((m) => m.catalogoId === id)) modulos.push({ catalogoId: id, quantidade, automatico: true });
  }
  const igual =
    modulos.length === kit.modulos.length &&
    modulos.every((m, i) => m.catalogoId === kit.modulos[i].catalogoId && m.quantidade === kit.modulos[i].quantidade);
  return igual ? kit : { ...kit, modulos };
}

export function potenciaKwp(kit: Kit, catalogo: MapaCatalogo): number {
  let wp = 0;
  for (const m of kit.modulos) wp += (catalogo[m.catalogoId]?.specs.potenciaWp ?? 0) * m.quantidade;
  return Math.round(wp) / 1000;
}

export function potenciaInversoresKw(kit: Kit, catalogo: MapaCatalogo): number {
  let kw = 0;
  for (const i of kit.inversores) kw += (catalogo[i.catalogoId]?.specs.potenciaKw ?? 0) * i.quantidade;
  return Math.round(kw * 1000) / 1000;
}

export function totalModulos(kit: Kit): number {
  return kit.modulos.reduce((s, m) => s + m.quantidade, 0);
}

/** Estimativa simples: kWp × horas de sol pleno × 30 dias × rendimento. */
export function estimarGeracao(kwp: number, hsp: number, rendimento: number): number {
  return Math.round(kwp * hsp * 30 * rendimento);
}

// ----------------------------------------------------- verificação elétrica

export type StatusConferencia = "ok" | "atencao" | "erro" | "sem_dados" | "manual";

export interface Conferencia {
  id: string;
  titulo: string;
  detalhe: string;
  status: StatusConferencia;
  /** true = resultado calculado pelo sistema com dados das fichas. */
  calculado: boolean;
  /** Confirmado manualmente pelo responsável. */
  validado: boolean;
}

const n1 = (v: number) => v.toFixed(1).replace(".", ",");
const n2 = (v: number) => v.toFixed(2).replace(".", ",");

export const CONFERENCIAS_MANUAIS: { id: string; titulo: string; detalhe: string }[] = [
  {
    id: "rede",
    titulo: "Compatibilidade com a rede local",
    detalhe: "Tensão, número de fases e padrão de entrada conferidos com a concessionária.",
  },
  {
    id: "homologacao",
    titulo: "Homologação dos equipamentos",
    detalhe: "Registro do INMETRO do inversor e dos módulos conferido para os modelos exatos do kit.",
  },
  {
    id: "protecoes",
    titulo: "Proteções CC e CA",
    detalhe: "String box, DPS, seccionamento, disjuntores e aterramento dimensionados.",
  },
  {
    id: "cabos",
    titulo: "Cabos e queda de tensão",
    detalhe: "Seção dos condutores CC e CA conferida para as distâncias da obra.",
  },
];

/**
 * Confere os arranjos elétricos com os dados das fichas técnicas.
 * É um apoio à conferência: não substitui o projeto elétrico de um profissional habilitado.
 */
export function verificarEletrica(kit: Kit, catalogo: MapaCatalogo): Conferencia[] {
  const v = kit.verificacao;
  const lista: Conferencia[] = [];
  const add = (c: Omit<Conferencia, "validado">) => lista.push({ ...c, validado: Boolean(v.validados[c.id]) });

  const modulosKit = totalModulos(kit);
  const modulosArranjo = v.arranjos.reduce((s, a) => s + a.strings * a.modulosPorString, 0);
  if (v.arranjos.length === 0) {
    add({
      id: "arranjos",
      titulo: "Arranjos de strings",
      detalhe: "Informe como os módulos serão ligados em cada entrada (MPPT) do inversor.",
      status: "sem_dados",
      calculado: true,
    });
  } else {
    add({
      id: "arranjos",
      titulo: "Módulos nos arranjos × módulos do kit",
      detalhe: `${modulosArranjo} módulo(s) nos arranjos e ${modulosKit} no kit.`,
      status: modulosArranjo === modulosKit ? "ok" : "erro",
      calculado: true,
    });
  }

  v.arranjos.forEach((a, idx) => {
    const inv = catalogo[a.inversorId]?.specs;
    const mod = catalogo[a.moduloId]?.specs;
    const nome = `Arranjo ${idx + 1} (MPPT ${a.mppt})`;
    const base = `arr-${a.id}`;
    if (!inv || !mod) {
      add({ id: `${base}-dados`, titulo: nome, detalhe: "Escolha o inversor e o módulo do arranjo.", status: "sem_dados", calculado: true });
      return;
    }
    const N = a.modulosPorString;
    // Tensão máxima no frio.
    if (mod.voc && mod.coefVocPctC != null && inv.tensaoMaxCc) {
      const vocFrio = N * mod.voc * (1 + (mod.coefVocPctC / 100) * (v.tempMinC - 25));
      add({
        id: `${base}-voc`,
        titulo: `${nome}: tensão máxima da string`,
        detalhe: `Voc a ${n1(v.tempMinC)} °C = ${n1(vocFrio)} V; limite do inversor ${n1(inv.tensaoMaxCc)} V.`,
        status: vocFrio <= inv.tensaoMaxCc ? (vocFrio > inv.tensaoMaxCc * 0.97 ? "atencao" : "ok") : "erro",
        calculado: true,
      });
    } else {
      add({ id: `${base}-voc`, titulo: `${nome}: tensão máxima da string`, detalhe: "Faltam Voc, coeficiente de temperatura ou tensão máxima CC na ficha.", status: "sem_dados", calculado: true });
    }
    // Faixa de MPPT.
    if (mod.vmp && inv.mpptMin && inv.mpptMax) {
      const coef = mod.coefVocPctC ?? mod.coefPmaxPctC ?? -0.3;
      const vmpQuente = N * mod.vmp * (1 + (coef / 100) * (v.tempMaxCelulaC - 25));
      const vmpStc = N * mod.vmp;
      const dentro = vmpQuente >= inv.mpptMin && vmpStc <= inv.mpptMax;
      add({
        id: `${base}-mppt`,
        titulo: `${nome}: faixa de MPPT`,
        detalhe: `Vmp de ${n1(vmpQuente)} V (célula a ${n1(v.tempMaxCelulaC)} °C) a ${n1(vmpStc)} V (25 °C); faixa do inversor ${n1(inv.mpptMin)}–${n1(inv.mpptMax)} V.`,
        status: dentro ? "ok" : "erro",
        calculado: true,
      });
    } else {
      add({ id: `${base}-mppt`, titulo: `${nome}: faixa de MPPT`, detalhe: "Faltam Vmp ou a faixa de MPPT na ficha.", status: "sem_dados", calculado: true });
    }
    // Correntes.
    if (mod.imp && mod.isc && inv.correnteMaxMppt) {
      const imp = a.strings * mod.imp;
      const isc = a.strings * mod.isc;
      const iscMax = inv.iscMaxMppt ?? null;
      const status: StatusConferencia =
        iscMax != null && isc > iscMax ? "erro" : imp > inv.correnteMaxMppt ? "atencao" : "ok";
      add({
        id: `${base}-corrente`,
        titulo: `${nome}: corrente de entrada`,
        detalhe:
          `Imp ${n2(imp)} A (máx. do MPPT ${n2(inv.correnteMaxMppt)} A)` +
          (iscMax != null ? `; Isc ${n2(isc)} A (máx. ${n2(iscMax)} A).` : ".") +
          (status === "atencao" ? " A corrente de operação passa do limite do MPPT: o inversor limita a potência nesse ponto." : ""),
        status,
        calculado: true,
      });
    } else {
      add({ id: `${base}-corrente`, titulo: `${nome}: corrente de entrada`, detalhe: "Faltam Imp, Isc ou a corrente máxima do MPPT na ficha.", status: "sem_dados", calculado: true });
    }
    if (inv.stringsPorMppt && a.strings > inv.stringsPorMppt) {
      add({
        id: `${base}-strings`,
        titulo: `${nome}: strings por MPPT`,
        detalhe: `${a.strings} strings para ${inv.stringsPorMppt} entrada(s) por MPPT.`,
        status: "erro",
        calculado: true,
      });
    }
  });

  // Relação entre potência dos módulos e dos inversores.
  const kwp = potenciaKwp(kit, catalogo);
  const kw = potenciaInversoresKw(kit, catalogo);
  if (kwp > 0 && kw > 0) {
    let maxFv = 0;
    let completo = true;
    for (const i of kit.inversores) {
      const p = catalogo[i.catalogoId]?.specs.potenciaMaxFvKwp;
      if (p) maxFv += p * i.quantidade;
      else completo = false;
    }
    const relacao = kwp / kw;
    add({
      id: "potencia",
      titulo: "Potência dos módulos × inversores",
      detalhe:
        `${n2(kwp)} kWp para ${n2(kw)} kW de inversor (relação ${n2(relacao)}).` +
        (completo ? ` Potência FV máxima recomendada: ${n2(maxFv)} kWp.` : ""),
      status: completo && kwp > maxFv ? "erro" : relacao > 1.4 || relacao < 0.8 ? "atencao" : "ok",
      calculado: true,
    });
  } else {
    add({ id: "potencia", titulo: "Potência dos módulos × inversores", detalhe: "Inclua módulos e inversores no kit.", status: "sem_dados", calculado: true });
  }

  for (const m of CONFERENCIAS_MANUAIS) add({ ...m, status: "manual", calculado: false });
  return lista;
}

export function novoArranjo(inversorId: string, moduloId: string, mppt: number, modulosPorString: number) {
  return { id: novoId("a"), inversorId, mppt, moduloId, strings: 1, modulosPorString };
}

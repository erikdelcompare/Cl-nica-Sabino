import { arredondarQtd } from "./dinheiro";
import { chaveComponente, descricaoComponente, ehLinear, type MapaCatalogo } from "./estrutura";
import { novoId } from "./geometria";
import type { Cena, Componente, ItemCatalogo, ItemOrcamento, Kit } from "./tipos";

export const GRUPOS = {
  modulos: "Módulos fotovoltaicos",
  inversores: "Inversores",
  fixacao: "Estrutura de fixação",
  solo: "Estrutura de solo",
  eletrica: "Material elétrico",
  acessorios: "Acessórios",
  servicos: "Serviços",
} as const;

export interface LinhaMaterial {
  chave: string;
  origem: "desenho" | "kit";
  grupo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  catalogoId: string | null;
  custoUnit: number;
  precoUnit: number;
}

function grupoDoComponente(c: Componente): string {
  return ["poste", "viga", "terca", "fundacao"].includes(c.funcao) ? GRUPOS.solo : GRUPOS.fixacao;
}

/** Preço de uma peça: por metro × comprimento, ou por unidade. */
export function precoDaPeca(item: ItemCatalogo | undefined, c: Pick<Componente, "comprimento" | "eixo">): { custo: number; preco: number } {
  if (!item) return { custo: 0, preco: 0 };
  if (item.specs?.precoPor === "m" && c.eixo !== "ponto") {
    return {
      custo: Math.round(item.custo_centavos * c.comprimento),
      preco: Math.round(item.preco_centavos * c.comprimento),
    };
  }
  return { custo: item.custo_centavos, preco: item.preco_centavos };
}

export function descricaoEquipamento(item: ItemCatalogo): string {
  const base = `${item.fabricante} ${item.modelo}`.trim();
  if (item.tipo === "modulo") return `Módulo fotovoltaico ${base} — ${item.specs.potenciaWp ?? "?"} Wp`;
  if (item.tipo === "inversor") {
    return `Inversor ${base} — ${String(item.specs.potenciaKw ?? "?").replace(".", ",")} kW`;
  }
  return item.descricao || base;
}

/**
 * Lista de materiais contabilizada a partir do que está desenhado e do kit,
 * agrupando por material, perfil e dimensão.
 */
export function calcularMateriais(cena: Cena, kit: Kit, catalogo: MapaCatalogo): LinhaMaterial[] {
  const linhas: LinhaMaterial[] = [];

  for (const m of kit.modulos) {
    if (m.quantidade <= 0) continue;
    const item = catalogo[m.catalogoId];
    linhas.push({
      chave: `modulo|${m.catalogoId}`,
      origem: "kit",
      grupo: GRUPOS.modulos,
      descricao: item ? descricaoEquipamento(item) : "Módulo fotovoltaico (item fora do catálogo)",
      unidade: "un",
      quantidade: m.quantidade,
      catalogoId: item?.id ?? null,
      custoUnit: item?.custo_centavos ?? 0,
      precoUnit: item?.preco_centavos ?? 0,
    });
  }
  for (const i of kit.inversores) {
    if (i.quantidade <= 0) continue;
    const item = catalogo[i.catalogoId];
    linhas.push({
      chave: `inversor|${i.catalogoId}`,
      origem: "kit",
      grupo: GRUPOS.inversores,
      descricao: item ? descricaoEquipamento(item) : "Inversor (item fora do catálogo)",
      unidade: "un",
      quantidade: i.quantidade,
      catalogoId: item?.id ?? null,
      custoUnit: item?.custo_centavos ?? 0,
      precoUnit: item?.preco_centavos ?? 0,
    });
  }

  const porChave = new Map<string, LinhaMaterial>();
  let volumeFundacao = 0;
  for (const c of cena.componentes) {
    if (c.existente || c.quantidade <= 0) continue;
    if (c.funcao === "fundacao") {
      const lado = c.secao.largura / 1000;
      const area = c.forma === "circular" ? Math.PI * (lado / 2) ** 2 : lado * (c.secao.altura / 1000);
      volumeFundacao += area * c.comprimento * c.quantidade;
    }
    const chave = chaveComponente(c);
    const existente = porChave.get(chave);
    if (existente) {
      existente.quantidade += c.quantidade;
      continue;
    }
    const item = c.catalogoId ? catalogo[c.catalogoId] : undefined;
    const { custo, preco } = precoDaPeca(item, c);
    porChave.set(chave, {
      chave,
      origem: "desenho",
      grupo: grupoDoComponente(c),
      descricao: descricaoComponente(c),
      unidade: ehLinear(c) ? "pç" : "un",
      quantidade: c.quantidade,
      catalogoId: item?.id ?? null,
      custoUnit: custo,
      precoUnit: preco,
    });
  }
  linhas.push(...porChave.values());

  if (volumeFundacao > 0) {
    const concreto = Object.values(catalogo).find((i) => i.ativo && i.specs?.funcao === "fundacao" && i.unidade === "m³");
    linhas.push({
      chave: "concreto-fundacao",
      origem: "desenho",
      grupo: GRUPOS.solo,
      descricao: concreto?.descricao || "Concreto para fundações",
      unidade: "m³",
      quantidade: arredondarQtd(Math.ceil(volumeFundacao * 100) / 100),
      catalogoId: concreto?.id ?? null,
      custoUnit: concreto?.custo_centavos ?? 0,
      precoUnit: concreto?.preco_centavos ?? 0,
    });
  }
  return linhas.map((l) => ({ ...l, quantidade: arredondarQtd(l.quantidade) }));
}

export interface ResumoRecalculo {
  alterados: { descricao: string; de: number; para: number }[];
  novos: { descricao: string; quantidade: number }[];
  removidos: { descricao: string; quantidade: number }[];
  precosManuaisMantidos: number;
}

/**
 * Recalcula os itens do orçamento a partir da lista de materiais:
 * - destaca as quantidades que mudaram (guarda a anterior);
 * - preserva os itens avulsos (manuais e serviços);
 * - mantém os preços ajustados manualmente.
 */
export function sincronizarItens(
  itens: ItemOrcamento[],
  linhas: LinhaMaterial[],
): { itens: ItemOrcamento[]; resumo: ResumoRecalculo } {
  const resumo: ResumoRecalculo = { alterados: [], novos: [], removidos: [], precosManuaisMantidos: 0 };
  const calculadas = new Map(linhas.map((l) => [l.chave, l]));
  const usadas = new Set<string>();
  const resultado: ItemOrcamento[] = [];

  for (const item of itens) {
    const automatico = item.origem === "desenho" || item.origem === "kit";
    if (!automatico || !item.chave) {
      resultado.push({ ...item, quantidade_anterior: null });
      continue;
    }
    const linha = calculadas.get(item.chave);
    if (!linha) {
      resumo.removidos.push({ descricao: item.descricao, quantidade: item.quantidade });
      continue;
    }
    usadas.add(item.chave);
    const mudou = Math.abs(item.quantidade - linha.quantidade) > 1e-9;
    if (mudou) resumo.alterados.push({ descricao: linha.descricao, de: item.quantidade, para: linha.quantidade });
    if (item.preco_manual) resumo.precosManuaisMantidos++;
    resultado.push({
      ...item,
      grupo: linha.grupo,
      descricao: linha.descricao,
      unidade: linha.unidade,
      quantidade: linha.quantidade,
      quantidade_anterior: mudou ? item.quantidade : null,
      catalogo_id: linha.catalogoId,
      // Preço manual fica como está até o proprietário decidir atualizar.
      custo_unit: item.preco_manual ? item.custo_unit : linha.custoUnit,
      preco_unit: item.preco_manual ? item.preco_unit : linha.precoUnit,
    });
  }

  for (const linha of linhas) {
    if (usadas.has(linha.chave)) continue;
    resumo.novos.push({ descricao: linha.descricao, quantidade: linha.quantidade });
    resultado.push(itemDaLinha(linha));
  }

  // Ordena por grupo mantendo a ordem relativa de entrada.
  const ordemGrupo = Object.values(GRUPOS) as string[];
  const pos = (g: string) => (ordemGrupo.indexOf(g) === -1 ? ordemGrupo.length : ordemGrupo.indexOf(g));
  const ordenado = resultado
    .map((item, i) => ({ item, i }))
    .sort((a, b) => pos(a.item.grupo) - pos(b.item.grupo) || a.i - b.i)
    .map(({ item }, i) => ({ ...item, ordem: i }));
  return { itens: ordenado, resumo };
}

export function itemDaLinha(linha: LinhaMaterial): ItemOrcamento {
  return {
    id: novoId("i"),
    ordem: 0,
    origem: linha.origem,
    chave: linha.chave,
    grupo: linha.grupo,
    descricao: linha.descricao,
    unidade: linha.unidade,
    quantidade: linha.quantidade,
    quantidade_anterior: null,
    custo_unit: linha.custoUnit,
    preco_unit: linha.precoUnit,
    preco_manual: false,
    catalogo_id: linha.catalogoId,
    mostrar_descricao: true,
    mostrar_preco: false,
  };
}

export function itemAvulso(grupo: string, parcial: Partial<ItemOrcamento> = {}): ItemOrcamento {
  return {
    id: novoId("i"),
    ordem: 0,
    origem: grupo === GRUPOS.servicos ? "servico" : "manual",
    chave: null,
    grupo,
    descricao: "",
    unidade: "un",
    quantidade: 1,
    quantidade_anterior: null,
    custo_unit: 0,
    preco_unit: 0,
    preco_manual: true,
    catalogo_id: null,
    mostrar_descricao: true,
    mostrar_preco: false,
    ...parcial,
  };
}

/** Preço atual do catálogo para um item (para o botão "usar preço do catálogo"). */
export function precoCatalogoDoItem(
  item: ItemOrcamento,
  linhas: LinhaMaterial[],
  catalogo: MapaCatalogo,
): { custo: number; preco: number } | null {
  if (item.chave) {
    const linha = linhas.find((l) => l.chave === item.chave);
    if (linha) return { custo: linha.custoUnit, preco: linha.precoUnit };
  }
  const cat = item.catalogo_id ? catalogo[item.catalogo_id] : undefined;
  return cat ? { custo: cat.custo_centavos, preco: cat.preco_centavos } : null;
}

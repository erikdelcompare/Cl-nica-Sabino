import { totalLinha } from "./dinheiro";
import { descricaoEquipamento, GRUPOS } from "./materiais";
import type { MapaCatalogo } from "./estrutura";
import { potenciaInversoresKw, potenciaKwp } from "./kit";
import type {
  Cena,
  Condicoes,
  DadosOrcamento,
  Exibicao,
  ItemCatalogo,
  ItemOrcamento,
  Kit,
  MapaModulos,
  ModoExibicao,
  TipoProjeto,
} from "./tipos";

export const AVISO_TECNICO =
  "Representação 3D da montagem prevista, sujeita à validação técnica da obra. " +
  "Medidas, estrutura, verificação elétrica e geração estimada devem ser confirmadas em vistoria.";

export function condicoesPadrao(): Condicoes {
  return {
    aVista: { ativo: true, valor: 0, observacao: "" },
    cartao: { ativo: false, opcoes: [], observacao: "" },
    financiamento: { ativo: false, instituicao: "", entrada: 0, opcoes: [], observacao: "" },
  };
}

export function dadosPadrao(titulo: string): DadosOrcamento {
  return {
    titulo,
    validade: null,
    garantias: "",
    observacoes: "",
    mao_de_obra_custo: 0,
    mao_de_obra_preco: 0,
    frete_custo: 0,
    frete_preco: 0,
    desconto: 0,
    condicoes: condicoesPadrao(),
    exibicao: { modo: "total" },
  };
}

export function normalizarCondicoes(bruto: unknown): Condicoes {
  const p = condicoesPadrao();
  if (!bruto || typeof bruto !== "object") return p;
  const c = bruto as Partial<Condicoes>;
  return {
    aVista: { ...p.aVista, ...(c.aVista ?? {}) },
    cartao: { ...p.cartao, ...(c.cartao ?? {}), opcoes: Array.isArray(c.cartao?.opcoes) ? c.cartao!.opcoes : [] },
    financiamento: {
      ...p.financiamento,
      ...(c.financiamento ?? {}),
      opcoes: Array.isArray(c.financiamento?.opcoes) ? c.financiamento!.opcoes : [],
    },
  };
}

export function normalizarExibicao(bruto: unknown): Exibicao {
  const modo = (bruto as Exibicao | null)?.modo;
  return { modo: modo === "grupos" || modo === "itens" ? modo : "total" };
}

export interface Totais {
  custoItens: number;
  precoItens: number;
  custoTotal: number;
  subtotal: number;
  desconto: number;
  total: number;
  margem: number;
  margemPct: number;
  grupos: { grupo: string; custo: number; preco: number }[];
}

export function calcularTotais(dados: DadosOrcamento, itens: ItemOrcamento[]): Totais {
  const grupos = new Map<string, { grupo: string; custo: number; preco: number }>();
  let custoItens = 0;
  let precoItens = 0;
  for (const i of itens) {
    const custo = totalLinha(i.quantidade, i.custo_unit);
    const preco = totalLinha(i.quantidade, i.preco_unit);
    custoItens += custo;
    precoItens += preco;
    const g = grupos.get(i.grupo) ?? { grupo: i.grupo, custo: 0, preco: 0 };
    g.custo += custo;
    g.preco += preco;
    grupos.set(i.grupo, g);
  }
  const custoTotal = custoItens + dados.mao_de_obra_custo + dados.frete_custo;
  const subtotal = precoItens + dados.mao_de_obra_preco + dados.frete_preco;
  const desconto = Math.min(Math.max(0, dados.desconto), subtotal);
  const total = subtotal - desconto;
  const margem = total - custoTotal;
  return {
    custoItens,
    precoItens,
    custoTotal,
    subtotal,
    desconto,
    total,
    margem,
    margemPct: total > 0 ? Math.round((margem / total) * 1000) / 10 : 0,
    grupos: [...grupos.values()],
  };
}

// ------------------------------------------------------- versões publicadas

export interface LinhaComercial {
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  precoUnit: number | null;
  total: number;
}

/** O que o cliente vê depois do PIN. Nunca contém custo interno nem margem. */
export interface SnapshotComercial {
  modo: ModoExibicao;
  linhas: LinhaComercial[];
  subtotal: number;
  desconto: number;
  total: number;
  validade: string | null;
  garantias: string;
  observacoes: string;
  condicoes: {
    aVista: { valor: number; observacao: string } | null;
    cartao: { opcoes: { parcelas: number; valorParcela: number }[]; observacao: string } | null;
    financiamento: {
      instituicao: string;
      entrada: number;
      opcoes: { parcelas: number; valorParcela: number }[];
      observacao: string;
    } | null;
  };
}

export function montarComercial(dados: DadosOrcamento, itens: ItemOrcamento[]): SnapshotComercial {
  const t = calcularTotais(dados, itens);
  const modo = dados.exibicao.modo;
  const linhas: LinhaComercial[] = [];
  const linhaSimples = (descricao: string, total: number) => {
    if (total !== 0) linhas.push({ descricao, quantidade: null, unidade: null, precoUnit: null, total });
  };

  if (modo === "grupos") {
    for (const g of t.grupos) linhaSimples(g.grupo, g.preco);
    linhaSimples("Mão de obra", dados.mao_de_obra_preco);
    linhaSimples("Frete", dados.frete_preco);
  } else if (modo === "itens") {
    let demais = dados.mao_de_obra_preco + dados.frete_preco;
    for (const i of itens) {
      const total = totalLinha(i.quantidade, i.preco_unit);
      if (i.mostrar_preco) {
        linhas.push({ descricao: i.descricao, quantidade: i.quantidade, unidade: i.unidade, precoUnit: i.preco_unit, total });
      } else {
        demais += total;
      }
    }
    linhaSimples(linhas.length > 0 ? "Demais itens e serviços" : "Equipamentos, materiais e serviços", demais);
  }

  const c = dados.condicoes;
  return {
    modo,
    linhas,
    subtotal: t.subtotal,
    desconto: t.desconto,
    total: t.total,
    validade: dados.validade,
    garantias: dados.garantias,
    observacoes: dados.observacoes,
    condicoes: {
      aVista: c.aVista.ativo ? { valor: c.aVista.valor > 0 ? c.aVista.valor : t.total, observacao: c.aVista.observacao } : null,
      cartao:
        c.cartao.ativo && c.cartao.opcoes.length > 0
          ? { opcoes: c.cartao.opcoes.map((o) => ({ ...o })), observacao: c.cartao.observacao }
          : null,
      financiamento:
        c.financiamento.ativo && c.financiamento.opcoes.length > 0
          ? {
              instituicao: c.financiamento.instituicao,
              entrada: c.financiamento.entrada,
              opcoes: c.financiamento.opcoes.map((o) => ({ ...o })),
              observacao: c.financiamento.observacao,
            }
          : null,
    },
  };
}

export interface EquipamentoPublico {
  tipo: "modulo" | "inversor";
  descricao: string;
  fabricante: string;
  modelo: string;
  quantidade: number;
  potencia: string;
  detalhes: string[];
}

/** O que qualquer pessoa com o link vê antes do PIN. Nunca contém valores. */
export interface SnapshotPublico {
  empresa: { nome: string; contato: string; cidade: string };
  cliente: { nome: string; cidade: string };
  projeto: { nome: string; tipo: TipoProjeto; local: string };
  cena: Cena;
  modulos: MapaModulos;
  kit: {
    equipamentos: EquipamentoPublico[];
    potenciaKwp: number;
    potenciaInversoresKw: number;
    totalModulos: number;
    geracaoMensalKwh: number | null;
    origemGeracao: string;
  };
  materiais: { grupo: string; descricao: string; quantidade: number; unidade: string }[];
  temCapa: boolean;
  avisoTecnico: string;
  titulo: string;
}

function detalhesEquipamento(item: ItemCatalogo): string[] {
  const s = item.specs;
  const d: string[] = [];
  if (item.tipo === "modulo") {
    if (s.larguraMm && s.comprimentoMm) d.push(`${s.comprimentoMm} × ${s.larguraMm} × ${s.espessuraMm ?? "?"} mm`);
    if (s.tecnologia) d.push(s.tecnologia);
    if (s.eficienciaPct) d.push(`Eficiência ${String(s.eficienciaPct).replace(".", ",")}%`);
  } else {
    if (s.fases) d.push(s.fases === 1 ? "Monofásico" : `${s.fases} fases`);
    if (s.tensaoCa) d.push(s.tensaoCa);
    if (s.numMppt) d.push(`${s.numMppt} MPPT`);
  }
  return d;
}

export interface DadosPublicacao {
  empresa: SnapshotPublico["empresa"];
  cliente: { nome: string; cidade: string | null };
  projeto: { nome: string; tipo: TipoProjeto; local: string | null };
  titulo: string;
  cena: Cena;
  kit: Kit;
  catalogo: MapaCatalogo;
  modulos: MapaModulos;
  itens: ItemOrcamento[];
  temCapa: boolean;
}

export function montarPublico(d: DadosPublicacao): SnapshotPublico {
  const equipamentos: EquipamentoPublico[] = [];
  for (const m of d.kit.modulos) {
    const item = d.catalogo[m.catalogoId];
    if (!item || m.quantidade <= 0) continue;
    equipamentos.push({
      tipo: "modulo",
      descricao: descricaoEquipamento(item),
      fabricante: item.fabricante,
      modelo: item.modelo,
      quantidade: m.quantidade,
      potencia: `${item.specs.potenciaWp ?? "?"} Wp`,
      detalhes: detalhesEquipamento(item),
    });
  }
  for (const i of d.kit.inversores) {
    const item = d.catalogo[i.catalogoId];
    if (!item || i.quantidade <= 0) continue;
    equipamentos.push({
      tipo: "inversor",
      descricao: descricaoEquipamento(item),
      fabricante: item.fabricante,
      modelo: item.modelo,
      quantidade: i.quantidade,
      potencia: `${String(item.specs.potenciaKw ?? "?").replace(".", ",")} kW`,
      detalhes: detalhesEquipamento(item),
    });
  }
  // Só os modelos usados no desenho seguem para a versão publicada.
  const usados = new Set(d.cena.modulos.map((m) => m.moduloId));
  const modulos: MapaModulos = {};
  for (const id of usados) if (d.modulos[id]) modulos[id] = d.modulos[id];

  return {
    empresa: d.empresa,
    cliente: { nome: d.cliente.nome, cidade: d.cliente.cidade ?? "" },
    projeto: { nome: d.projeto.nome, tipo: d.projeto.tipo, local: d.projeto.local ?? "" },
    cena: { ...d.cena, pendencias: [] },
    modulos,
    kit: {
      equipamentos,
      potenciaKwp: potenciaKwp(d.kit, d.catalogo),
      potenciaInversoresKw: potenciaInversoresKw(d.kit, d.catalogo),
      totalModulos: d.kit.modulos.reduce((s, m) => s + m.quantidade, 0),
      geracaoMensalKwh: d.kit.geracaoMensalKwh,
      origemGeracao: d.kit.origemGeracao,
    },
    materiais: d.itens
      .filter((i) => i.mostrar_descricao && i.grupo !== GRUPOS.servicos && i.descricao.trim() !== "")
      .map((i) => ({ grupo: i.grupo, descricao: i.descricao, quantidade: i.quantidade, unidade: i.unidade })),
    temCapa: d.temCapa,
    avisoTecnico: AVISO_TECNICO,
    titulo: d.titulo,
  };
}

/** Guardado só para o proprietário: custos, margem e os itens exatos do catálogo naquele momento. */
export interface SnapshotInterno {
  dados: DadosOrcamento;
  itens: ItemOrcamento[];
  totais: Totais;
  kit: Kit;
  catalogo: ItemCatalogo[];
}

export function montarInterno(dados: DadosOrcamento, itens: ItemOrcamento[], kit: Kit, catalogo: MapaCatalogo): SnapshotInterno {
  const ids = new Set<string>();
  for (const m of kit.modulos) ids.add(m.catalogoId);
  for (const i of kit.inversores) ids.add(i.catalogoId);
  for (const i of itens) if (i.catalogo_id) ids.add(i.catalogo_id);
  return {
    dados,
    itens,
    totais: calcularTotais(dados, itens),
    kit,
    catalogo: [...ids].map((id) => catalogo[id]).filter(Boolean),
  };
}

export const ROTULO_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
  aceita: "Aceita",
  recusada: "Recusada",
  vencida: "Vencida",
  arquivada: "Arquivada",
};

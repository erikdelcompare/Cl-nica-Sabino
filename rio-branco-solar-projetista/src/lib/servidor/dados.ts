import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizarCena } from "@/lib/dominio/cena";
import { normalizarKit } from "@/lib/dominio/kit";
import { normalizarCondicoes, normalizarExibicao } from "@/lib/dominio/orcamento";
import type {
  Cena,
  DadosOrcamento,
  ItemCatalogo,
  ItemOrcamento,
  Kit,
  Medidas,
  OrigemProjeto,
  StatusProposta,
  TipoProjeto,
} from "@/lib/dominio/tipos";

// Leitura das tabelas com os tipos do domínio. Recebe o cliente Supabase de quem chama:
// a sessão do proprietário (sujeita às políticas RLS) ou a chave de serviço nos scripts.

export type Db = SupabaseClient;

export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  endereco: string | null;
  observacoes: string | null;
  demonstracao: boolean;
  arquivado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Local {
  id: string;
  cliente_id: string;
  nome: string;
  tipo: TipoProjeto;
  endereco: string | null;
  cidade: string | null;
  observacoes: string | null;
}

export interface Projeto {
  id: string;
  cliente_id: string;
  local_id: string | null;
  nome: string;
  tipo: TipoProjeto;
  origem: OrigemProjeto;
  medidas: Medidas;
  cena: Cena;
  kit: Kit;
  capa_caminho: string | null;
  revisao: number;
  demonstracao: boolean;
  arquivado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Orcamento extends DadosOrcamento {
  id: string;
  numero: string;
  cliente_id: string;
  projeto_id: string;
  total_centavos: number;
  custo_centavos: number;
  revisao: number;
  revisao_publicada: number | null;
  demonstracao: boolean;
  arquivado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface OrcamentoResumo {
  id: string;
  numero: string;
  titulo: string;
  cliente_id: string;
  projeto_id: string;
  total_centavos: number;
  validade: string | null;
  demonstracao: boolean;
  arquivado_em: string | null;
  criado_em: string;
  atualizado_em: string;
  cliente_nome: string;
  projeto_nome: string;
  projeto_tipo: TipoProjeto;
  ultima_versao_id: string | null;
  ultima_versao: number | null;
  ultima_publicacao: string | null;
  ultima_versao_total: number | null;
  rascunho_alterado: boolean;
  status: StatusProposta;
}

export interface VersaoResumo {
  id: string;
  orcamento_id: string;
  projeto_id: string;
  cliente_id: string;
  versao: number;
  publicado_em: string;
  total_centavos: number;
  validade: string | null;
  modo_exibicao: string;
  link_expira_em: string | null;
  revogada_em: string | null;
  pin_bloqueado_ate: string | null;
  visualizacoes: number;
  ultima_visualizacao_em: string | null;
  desbloqueios: number;
  ultimo_desbloqueio_em: string | null;
  tem_capa: boolean;
  status: Exclude<StatusProposta, "rascunho">;
}

export interface Foto {
  id: string;
  projeto_id: string;
  caminho: string;
  nome_original: string | null;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  criado_em: string;
}

export interface Modelo {
  id: string;
  nome: string;
  tipo: TipoProjeto;
  descricao: string;
  conteudo: Cena;
  demonstracao: boolean;
  criado_em: string;
}

/** Informa o formato da resposta de uma consulta (o cliente não recebe tipos gerados do banco). */
export function tipar<T>(resultado: unknown): { data: T | null; error: { message: string } | null } {
  return resultado as { data: T | null; error: { message: string } | null };
}

export function exigir<T>(resultado: { data: T | null; error: { message: string } | null }, contexto: string): NonNullable<T> {
  if (resultado.error) throw new Error(`${contexto}: ${resultado.error.message}`);
  if (resultado.data == null) throw new Error(`${contexto}: registro não encontrado.`);
  return resultado.data as NonNullable<T>;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

export function linhaParaCatalogo(l: Record<string, unknown>): ItemCatalogo {
  return {
    id: String(l.id),
    tipo: l.tipo as ItemCatalogo["tipo"],
    fabricante: String(l.fabricante ?? ""),
    modelo: String(l.modelo ?? ""),
    descricao: String(l.descricao ?? ""),
    unidade: String(l.unidade ?? "un"),
    specs: (l.specs ?? {}) as ItemCatalogo["specs"],
    custo_centavos: n(l.custo_centavos),
    preco_centavos: n(l.preco_centavos),
    preco_demonstrativo: Boolean(l.preco_demonstrativo),
    status_dados: l.status_dados as ItemCatalogo["status_dados"],
    fonte_url: (l.fonte_url as string) ?? null,
    fonte_titulo: (l.fonte_titulo as string) ?? null,
    fonte_consultada_em: (l.fonte_consultada_em as string) ?? null,
    observacoes: (l.observacoes as string) ?? null,
    ativo: Boolean(l.ativo),
  };
}

export async function listarCatalogo(db: Db, opcoes: { somenteAtivos?: boolean } = {}): Promise<ItemCatalogo[]> {
  let q = db.from("catalogo_itens").select("*").order("tipo").order("fabricante").order("modelo");
  if (opcoes.somenteAtivos) q = q.eq("ativo", true);
  return exigir(await q, "Catálogo").map(linhaParaCatalogo);
}

export function linhaParaProjeto(l: Record<string, unknown>): Projeto {
  const tipo = l.tipo as TipoProjeto;
  return {
    id: String(l.id),
    cliente_id: String(l.cliente_id),
    local_id: (l.local_id as string) ?? null,
    nome: String(l.nome),
    tipo,
    origem: l.origem as OrigemProjeto,
    medidas: (l.medidas ?? {}) as Medidas,
    cena: normalizarCena(l.cena, tipo),
    kit: normalizarKit(l.kit),
    capa_caminho: (l.capa_caminho as string) ?? null,
    revisao: n(l.revisao),
    demonstracao: Boolean(l.demonstracao),
    arquivado_em: (l.arquivado_em as string) ?? null,
    criado_em: String(l.criado_em),
    atualizado_em: String(l.atualizado_em),
  };
}

export async function carregarProjeto(db: Db, id: string): Promise<Projeto | null> {
  const linha = exigir(await db.from("projetos").select("*").eq("id", id).maybeSingle(), "Projeto");
  return linha ? linhaParaProjeto(linha) : null;
}

export function linhaParaOrcamento(l: Record<string, unknown>): Orcamento {
  return {
    id: String(l.id),
    numero: String(l.numero),
    cliente_id: String(l.cliente_id),
    projeto_id: String(l.projeto_id),
    titulo: String(l.titulo ?? ""),
    validade: (l.validade as string) ?? null,
    garantias: String(l.garantias ?? ""),
    observacoes: String(l.observacoes ?? ""),
    mao_de_obra_custo: n(l.mao_de_obra_custo),
    mao_de_obra_preco: n(l.mao_de_obra_preco),
    frete_custo: n(l.frete_custo),
    frete_preco: n(l.frete_preco),
    desconto: n(l.desconto),
    condicoes: normalizarCondicoes(l.condicoes),
    exibicao: normalizarExibicao(l.exibicao),
    total_centavos: n(l.total_centavos),
    custo_centavos: n(l.custo_centavos),
    revisao: n(l.revisao),
    revisao_publicada: l.revisao_publicada == null ? null : n(l.revisao_publicada),
    demonstracao: Boolean(l.demonstracao),
    arquivado_em: (l.arquivado_em as string) ?? null,
    criado_em: String(l.criado_em),
    atualizado_em: String(l.atualizado_em),
  };
}

export function linhaParaItem(l: Record<string, unknown>): ItemOrcamento {
  return {
    id: String(l.id),
    ordem: n(l.ordem),
    origem: l.origem as ItemOrcamento["origem"],
    chave: (l.chave as string) ?? null,
    grupo: String(l.grupo ?? ""),
    descricao: String(l.descricao ?? ""),
    unidade: String(l.unidade ?? "un"),
    quantidade: n(l.quantidade),
    quantidade_anterior: l.quantidade_anterior == null ? null : n(l.quantidade_anterior),
    custo_unit: n(l.custo_unit),
    preco_unit: n(l.preco_unit),
    preco_manual: Boolean(l.preco_manual),
    catalogo_id: (l.catalogo_id as string) ?? null,
    mostrar_descricao: l.mostrar_descricao !== false,
    mostrar_preco: Boolean(l.mostrar_preco),
  };
}

export async function carregarOrcamento(db: Db, id: string): Promise<{ orcamento: Orcamento; itens: ItemOrcamento[] } | null> {
  const linha = exigir(await db.from("orcamentos").select("*").eq("id", id).maybeSingle(), "Orçamento");
  if (!linha) return null;
  const itens = exigir(await db.from("orcamento_itens").select("*").eq("orcamento_id", id).order("ordem"), "Itens do orçamento");
  return { orcamento: linhaParaOrcamento(linha), itens: itens.map(linhaParaItem) };
}

export function dadosDoOrcamento(o: Orcamento): DadosOrcamento {
  return {
    titulo: o.titulo,
    validade: o.validade,
    garantias: o.garantias,
    observacoes: o.observacoes,
    mao_de_obra_custo: o.mao_de_obra_custo,
    mao_de_obra_preco: o.mao_de_obra_preco,
    frete_custo: o.frete_custo,
    frete_preco: o.frete_preco,
    desconto: o.desconto,
    condicoes: o.condicoes,
    exibicao: o.exibicao,
  };
}

/** Texto de busca sem acentos e em minúsculas (igual à coluna nome_busca). */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Remove caracteres que têm significado nos filtros do PostgREST. */
export function limparFiltro(texto: string): string {
  return texto.replace(/[%_,()*\\"']/g, " ").replace(/\s+/g, " ").trim();
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { calcularTotais, dadosPadrao } from "@/lib/dominio/orcamento";

import { novoId } from "@/lib/dominio/geometria";
import type { DadosOrcamento, ItemOrcamento } from "@/lib/dominio/tipos";
import { exigirProprietario } from "@/lib/servidor/auth";
import { carregarOrcamento, dadosDoOrcamento, tipar, type Db } from "@/lib/servidor/dados";
import { prepararProjeto, recalcularItens } from "@/lib/servidor/orcamento-itens";
import { publicarOrcamento, revogarVersao, trocarPinDaVersao, ErroPublicacao } from "@/lib/servidor/publicacao";
import { decifrarToken } from "@/lib/seguranca/cripto";

export interface ResultadoOrcamento {
  erro?: string;
  ok?: boolean;
  revisao?: number;
  conflito?: boolean;
  mensagem?: string;
  link?: string;
  pin?: string;
  versao?: number;
  versaoId?: string;
}

const itemSchema = z.object({
  id: z.string().min(1).max(64),
  ordem: z.number().int().optional(),
  origem: z.enum(["desenho", "kit", "manual", "servico"]),
  chave: z.string().nullable(),
  grupo: z.string().max(80),
  descricao: z.string().max(400),
  unidade: z.string().max(12),
  quantidade: z.number().finite().min(0).max(1_000_000),
  quantidade_anterior: z.number().finite().nullable(),
  custo_unit: z.number().int().min(0).max(1_000_000_000),
  preco_unit: z.number().int().min(0).max(1_000_000_000),
  preco_manual: z.boolean(),
  catalogo_id: z.uuid().nullable(),
  mostrar_descricao: z.boolean(),
  mostrar_preco: z.boolean(),
});

const dadosSchema = z.object({
  titulo: z.string().max(160),
  validade: z.string().nullable(),
  garantias: z.string().max(4000),
  observacoes: z.string().max(4000),
  mao_de_obra_custo: z.number().int().min(0),
  mao_de_obra_preco: z.number().int().min(0),
  frete_custo: z.number().int().min(0),
  frete_preco: z.number().int().min(0),
  desconto: z.number().int().min(0),
  condicoes: z.unknown(),
  exibicao: z.object({ modo: z.enum(["total", "grupos", "itens"]) }),
});

const payloadSchema = z.object({ dados: dadosSchema, itens: z.array(itemSchema).max(500) });

async function gravar(db: Db, id: string, revisao: number, dados: DadosOrcamento, itens: ItemOrcamento[]): Promise<ResultadoOrcamento> {
  const totais = calcularTotais(dados, itens);
  const r = await db.rpc("salvar_orcamento", {
    p_id: id,
    p_revisao: revisao,
    p_dados: dados,
    p_itens: itens,
    p_total: totais.total,
    p_custo: totais.custoTotal,
  });
  if (r.error) return { erro: `Não foi possível salvar: ${r.error.message}` };
  const nova = Number(r.data);
  if (nova === -1) {
    return { conflito: true, mensagem: "Este orçamento foi alterado em outro aparelho. Recarregue a página para ver a versão salva." };
  }
  return { ok: true, revisao: nova };
}

/** Cria um orçamento para o projeto, já com a lista de materiais do desenho. */
export async function criarOrcamento(projetoId: string): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  const prep = await prepararProjeto(supabase, projetoId);
  if (!prep) return { erro: "Projeto não encontrado." };
  const criado = tipar<{ id: string }>(
    await supabase
      .from("orcamentos")
      .insert({
        cliente_id: prep.projeto.cliente_id,
        projeto_id: projetoId,
        titulo: `Orçamento: ${prep.projeto.nome}`.slice(0, 160),
      })
      .select("id")
      .single(),
  );
  if (criado.error || !criado.data) return { erro: `Não foi possível criar o orçamento: ${criado.error?.message ?? ""}` };
  const itens = recalcularItens([], prep).itens;
  const r = await gravar(supabase, criado.data.id, 1, dadosPadrao(`Orçamento: ${prep.projeto.nome}`.slice(0, 160)), itens);
  if (r.erro) return r;
  revalidatePath(`/clientes/${prep.projeto.cliente_id}`);
  redirect(`/orcamentos/${criado.data.id}`);
}

export async function salvarOrcamento(orcamentoId: string, revisao: number, payloadJson: string): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  let p: z.infer<typeof payloadSchema>;
  try {
    p = payloadSchema.parse(JSON.parse(payloadJson));
  } catch {
    return { erro: "Não foi possível ler os dados do orçamento. Confira os campos numéricos." };
  }
  const dados: DadosOrcamento = { ...p.dados, condicoes: p.dados.condicoes as DadosOrcamento["condicoes"] };
  const itens: ItemOrcamento[] = p.itens.map((i, ordem) => ({ ...i, ordem: i.ordem ?? ordem, chave: i.chave, quantidade_anterior: i.quantidade_anterior }));
  const r = await gravar(supabase, orcamentoId, revisao, dados, itens);
  if (r.ok) revalidatePath(`/orcamentos/${orcamentoId}`);
  return r;
}

/** Traz a lista de materiais de volta ao orçamento: destaca o que mudou e mantém avulsos e preços manuais. */
export async function recalcularOrcamento(orcamentoId: string, payloadJson: string) {
  const { supabase } = await exigirProprietario();
  const atual = await carregarOrcamento(supabase, orcamentoId);
  if (!atual) return { erro: "Orçamento não encontrado." } as const;
  const prep = await prepararProjeto(supabase, atual.orcamento.projeto_id);
  if (!prep) return { erro: "Projeto não encontrado." } as const;
  let itens: ItemOrcamento[];
  try {
    const lista = z.array(itemSchema).parse(JSON.parse(payloadJson));
    itens = lista.map((i, ordem) => ({ ...i, ordem, quantidade_anterior: null }));
  } catch {
    return { erro: "Não foi possível ler os itens atuais." } as const;
  }
  const r = recalcularItens(itens, prep);
  return { ok: true as const, itens: r.itens, resumo: r.resumo };
}

export async function duplicarOrcamento(orcamentoId: string): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  const atual = await carregarOrcamento(supabase, orcamentoId);
  if (!atual) return { erro: "Orçamento não encontrado." };
  const o = atual.orcamento;
  const copia = tipar<{ id: string }>(
    await supabase
      .from("orcamentos")
      .insert({
        cliente_id: o.cliente_id,
        projeto_id: o.projeto_id,
        titulo: `${o.titulo} (cópia)`.slice(0, 160),
        garantias: o.garantias,
        observacoes: o.observacoes,
      })
      .select("id")
      .single(),
  );
  if (copia.error || !copia.data) return { erro: `Não foi possível duplicar: ${copia.error?.message ?? ""}` };
  const novosItens = atual.itens.map((i) => ({ ...i, id: novoId("i"), quantidade_anterior: null }));
  const r = await gravar(supabase, copia.data.id, 1, { ...dadosDoOrcamento(o), titulo: `${o.titulo} (cópia)`.slice(0, 160) }, novosItens);
  if (r.erro) return r;
  revalidatePath(`/clientes/${o.cliente_id}`);
  redirect(`/orcamentos/${copia.data.id}`);
}

export async function arquivarOrcamento(orcamentoId: string, arquivar: boolean): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  const r = await supabase.from("orcamentos").update({ arquivado_em: arquivar ? new Date().toISOString() : null }).eq("id", orcamentoId);
  if (r.error) return { erro: r.error.message };
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${orcamentoId}`);
  return { ok: true };
}

const publicarSchema = z.object({
  linkExpiraEm: z.string().nullable(),
  revogarAnteriores: z.boolean(),
});

export async function publicarOrcamentoAcao(orcamentoId: string, opcoesJson: string): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  let opcoes: z.infer<typeof publicarSchema>;
  try {
    opcoes = publicarSchema.parse(JSON.parse(opcoesJson));
  } catch {
    return { erro: "Opções de publicação inválidas." };
  }
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!base) return { erro: "Defina NEXT_PUBLIC_APP_URL no servidor para gerar o link." };
  try {
    const pub = await publicarOrcamento(supabase, orcamentoId, {
      linkExpiraEm: opcoes.linkExpiraEm,
      revogarAnteriores: opcoes.revogarAnteriores,
    });
    revalidatePath(`/orcamentos/${orcamentoId}`);
    revalidatePath("/orcamentos");
    return { ok: true, link: `${base}/p/${pub.token}`, pin: pub.pin, versao: pub.versao, versaoId: pub.versaoId };
  } catch (e) {
    if (e instanceof ErroPublicacao) return { erro: e.message };
    return { erro: e instanceof Error ? e.message : "Não foi possível publicar." };
  }
}

export async function trocarPinAcao(versaoId: string): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  try {
    const pin = await trocarPinDaVersao(supabase, versaoId);
    return { ok: true, pin, mensagem: "PIN trocado. As sessões de desbloqueio anteriores foram encerradas." };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível trocar o PIN." };
  }
}

export async function revogarAcao(versaoId: string): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  try {
    await revogarVersao(supabase, versaoId);
    revalidatePath("/orcamentos");
    return { ok: true, mensagem: "Link revogado." };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível revogar." };
  }
}

export async function definirVencimentoAcao(versaoId: string, dataIso: string | null): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  const r = await supabase.from("proposta_versoes").update({ link_expira_em: dataIso }).eq("id", versaoId);
  if (r.error) return { erro: r.error.message };
  return { ok: true, mensagem: dataIso ? "Vencimento do link definido." : "Link sem vencimento." };
}

export async function definirStatusAcao(versaoId: string, status: "publicada" | "aceita" | "recusada"): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  const r = await supabase
    .from("proposta_versoes")
    .update({ status, status_alterado_em: new Date().toISOString() })
    .eq("id", versaoId);
  if (r.error) return { erro: r.error.message };
  revalidatePath("/orcamentos");
  return { ok: true, mensagem: `Status atualizado: ${status}.` };
}

export async function linkDaVersao(versaoId: string): Promise<ResultadoOrcamento & { link?: string }> {
  const { supabase } = await exigirProprietario();
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const r = tipar<{ token_cifrado: string; revogada_em: string | null }>(
    await supabase.from("proposta_versoes").select("token_cifrado, revogada_em").eq("id", versaoId).single(),
  );
  if (r.error || !r.data) return { erro: "Versão não encontrada." };
  if (r.data.revogada_em) return { erro: "Este link foi revogado." };
  const token = decifrarToken(r.data.token_cifrado);
  if (!token) return { erro: "Não foi possível recuperar o link." };
  return { ok: true, link: `${base}/p/${token}` };
}

const catalogoSchema = z.object({
  tipo: z.enum(["modulo", "inversor", "perfil", "estrutura", "fixacao", "acessorio", "servico"]),
  fabricante: z.string().max(80),
  modelo: z.string().trim().min(2).max(120),
  descricao: z.string().max(400),
  unidade: z.string().trim().min(1).max(12),
  custo_centavos: z.number().int().min(0).max(1_000_000_000),
  preco_centavos: z.number().int().min(0).max(1_000_000_000),
  preco_demonstrativo: z.boolean(),
  status_dados: z.enum(["confirmado", "pendente", "demonstrativo"]),
  fonte_url: z.string().max(500).nullable(),
  fonte_titulo: z.string().max(200).nullable(),
  fonte_consultada_em: z.string().nullable(),
  observacoes: z.string().max(1000).nullable(),
  ativo: z.boolean(),
  specs: z.record(z.string().max(60), z.union([z.number().finite(), z.string().max(200), z.boolean()])),
});

export async function salvarItemCatalogo(id: string | null, payloadJson: string): Promise<ResultadoOrcamento & { id?: string }> {
  const { supabase } = await exigirProprietario();
  let dados: z.infer<typeof catalogoSchema>;
  try {
    dados = catalogoSchema.parse(JSON.parse(payloadJson));
  } catch (e) {
    const primeiro = e instanceof z.ZodError ? e.issues[0]?.message : "";
    return { erro: `Confira os campos do item.${primeiro ? ` (${primeiro})` : ""}` };
  }
  const r = id
    ? await supabase.from("catalogo_itens").update(dados).eq("id", id).select("id").single()
    : await supabase.from("catalogo_itens").insert(dados).select("id").single();
  if (r.error) return { erro: `Não foi possível salvar: ${r.error.message}` };
  revalidatePath("/catalogo");
  return { ok: true, id: (r.data as { id: string } | null)?.id };
}

export async function ativarItemCatalogo(id: string, ativo: boolean): Promise<ResultadoOrcamento> {
  const { supabase } = await exigirProprietario();
  const r = await supabase.from("catalogo_itens").update({ ativo }).eq("id", id);
  if (r.error) return { erro: r.error.message };
  revalidatePath("/catalogo");
  return { ok: true, mensagem: ativo ? "Item reativado." : "Item desativado. Propostas já enviadas não mudam." };
}


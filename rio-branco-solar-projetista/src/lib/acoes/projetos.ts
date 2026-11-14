"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { analiseVazia, aplicarAnalise, lerAnalise } from "@/lib/dominio/analise";
import { extrairModelo, normalizarCena } from "@/lib/dominio/cena";
import { especDoCatalogo, kitVazio, normalizarKit } from "@/lib/dominio/kit";
import type { Cena, EspecModulo, Medidas, TipoProjeto } from "@/lib/dominio/tipos";
import { exigirProprietario } from "@/lib/servidor/auth";
import { listarCatalogo, tipar } from "@/lib/servidor/dados";

export interface ResultadoProjeto {
  erro?: string;
  ok?: boolean;
  revisao?: number;
  conflito?: boolean;
  mensagem?: string;
}

const numero = z.number().finite().positive().max(500).nullable().optional();

const medidasSchema = z.object({
  largura: numero,
  comprimento: numero,
  altura: z.number().finite().min(0).max(50).nullable().optional(),
  desnivel: z.number().finite().min(0).max(50).nullable().optional(),
  inclinacao: z.number().finite().min(0).max(60).nullable().optional(),
  observacoes: z.string().max(1000).nullable().optional(),
});

const payloadNovo = z.object({
  clienteId: z.uuid(),
  localId: z.uuid().nullable(),
  localNovo: z.string().max(120).nullable().optional(),
  nome: z.string().trim().min(2).max(120),
  tipo: z.enum(["telhado", "solo"]),
  origem: z.enum(["medidas", "gemini", "chatgpt"]),
  medidas: medidasSchema,
  analise: z.unknown().nullable(),
  fotos: z.array(z.string().max(300)).max(12),
});

async function moduloPadrao(supabase: Parameters<typeof listarCatalogo>[0]): Promise<EspecModulo | null> {
  const itens = await listarCatalogo(supabase, { somenteAtivos: true });
  for (const item of itens) {
    const espec = especDoCatalogo(item);
    if (espec) return espec;
  }
  return null;
}

/** Cria um projeto pelas medidas, pela análise do Gemini ou pela análise importada do ChatGPT. */
export async function criarProjeto(payloadJson: string): Promise<ResultadoProjeto> {
  const { supabase, usuario } = await exigirProprietario();
  let entrada: z.infer<typeof payloadNovo>;
  try {
    entrada = payloadNovo.parse(JSON.parse(payloadJson));
  } catch {
    return { erro: "Confira os dados do projeto (nome, tipo e medidas)." };
  }

  let localId = entrada.localId;
  if (!localId && entrada.localNovo?.trim()) {
    const local = tipar<{ id: string }>(
      await supabase
        .from("locais")
        .insert({ cliente_id: entrada.clienteId, nome: entrada.localNovo.trim(), tipo: entrada.tipo })
        .select("id")
        .single(),
    );
    if (local.error || !local.data) return { erro: "Não foi possível criar o local." };
    localId = local.data.id;
  }

  let analise = analiseVazia(entrada.tipo);
  if (entrada.analise) {
    const lido = lerAnalise(entrada.analise);
    if (!lido.ok) return { erro: `Análise inválida: ${lido.erros[0]}` };
    analise = lido.analise;
  }

  const medidas: Medidas = entrada.medidas;
  const modulo = await moduloPadrao(supabase);
  const { cena, pendencias } = aplicarAnalise(analise, medidas, entrada.tipo as TipoProjeto, modulo);

  const criado = tipar<{ id: string }>(
    await supabase
      .from("projetos")
      .insert({
        cliente_id: entrada.clienteId,
        local_id: localId,
        nome: entrada.nome,
        tipo: entrada.tipo,
        origem: entrada.origem,
        medidas,
        cena: { ...cena, pendencias },
        kit: kitVazio(),
        analise: entrada.analise ?? null,
      })
      .select("id")
      .single(),
  );
  if (criado.error || !criado.data) return { erro: `Não foi possível criar o projeto: ${criado.error?.message ?? ""}` };
  const projetoId = criado.data.id;

  // Fotos enviadas antes da criação: passam da pasta temporária para o projeto.
  for (const caminho of entrada.fotos) {
    if (!caminho.startsWith(`temp/${usuario.id}/`)) continue;
    const destino = `projetos/${projetoId}/${caminho.split("/").pop()}`;
    const mv = await supabase.storage.from("fotos").move(caminho, destino);
    if (mv.error) continue;
    await supabase.from("projeto_fotos").insert({ projeto_id: projetoId, caminho: destino, nome_original: caminho.split("/").pop() });
  }

  revalidatePath(`/clientes/${entrada.clienteId}`);
  redirect(`/projetos/${projetoId}`);
}

const payloadSalvar = z.object({
  cena: z.unknown().optional(),
  kit: z.unknown().optional(),
  medidas: z.unknown().optional(),
  nome: z.string().trim().min(2).max(120).optional(),
  localId: z.uuid().nullable().optional(),
});

/**
 * Salva o projeto (geometria, kit, medidas). Só grava se a revisão do servidor ainda for a
 * que o aparelho conhece; se outro aparelho gravou antes, devolve conflito.
 */
export async function salvarProjeto(projetoId: string, revisao: number, payloadJson: string): Promise<ResultadoProjeto> {
  const { supabase } = await exigirProprietario();
  if (payloadJson.length > 3_000_000) return { erro: "Projeto grande demais para salvar." };
  let p: z.infer<typeof payloadSalvar>;
  try {
    p = payloadSalvar.parse(JSON.parse(payloadJson));
  } catch {
    return { erro: "Dados do projeto inválidos." };
  }
  const atual = tipar<{ tipo: TipoProjeto; revisao: number }>(
    await supabase.from("projetos").select("tipo, revisao").eq("id", projetoId).single(),
  );
  if (atual.error || !atual.data) return { erro: "Projeto não encontrado." };

  const alteracoes: Record<string, unknown> = {};
  if (p.cena !== undefined) alteracoes.cena = normalizarCena(p.cena, atual.data.tipo);
  if (p.kit !== undefined) alteracoes.kit = normalizarKit(p.kit);
  if (p.medidas !== undefined) alteracoes.medidas = p.medidas;
  if (p.nome !== undefined) alteracoes.nome = p.nome;
  if (p.localId !== undefined) alteracoes.local_id = p.localId;
  alteracoes.revisao = revisao + 1;

  const r = tipar<unknown[]>(
    await supabase.from("projetos").update(alteracoes).eq("id", projetoId).eq("revisao", revisao).select("id"),
  );
  if (r.error) return { erro: `Não foi possível salvar: ${r.error.message}` };
  if (!r.data || r.data.length === 0) {
    return { conflito: true, mensagem: "Este projeto foi alterado em outro aparelho. Recarregue a página para ver a versão salva." };
  }
  return { ok: true, revisao: revisao + 1 };
}

export async function salvarModelo(projetoId: string, superficieId: string, nome: string, descricao: string): Promise<ResultadoProjeto> {
  const { supabase } = await exigirProprietario();
  const p = tipar<{ tipo: TipoProjeto; cena: unknown }>(await supabase.from("projetos").select("tipo, cena").eq("id", projetoId).single());
  if (p.error || !p.data) return { erro: "Projeto não encontrado." };
  const cena = normalizarCena(p.data.cena, p.data.tipo) as Cena;
  const modelo = extrairModelo(cena, superficieId);
  if (!modelo) return { erro: "Superfície não encontrada." };
  const nomeLimpo = nome.trim();
  if (nomeLimpo.length < 2) return { erro: "Dê um nome ao modelo." };
  const r = await supabase.from("modelos").insert({
    nome: nomeLimpo,
    tipo: p.data.tipo,
    descricao: descricao.trim(),
    conteudo: modelo,
  });
  if (r.error) return { erro: r.error.message };
  revalidatePath("/modelos");
  return { ok: true, mensagem: "Modelo salvo. Ele pode ser usado em outros projetos." };
}

export async function excluirModelo(id: string): Promise<ResultadoProjeto> {
  const { supabase } = await exigirProprietario();
  const r = await supabase.from("modelos").delete().eq("id", id);
  if (r.error) return { erro: r.error.message };
  revalidatePath("/modelos");
  return { ok: true };
}

export async function arquivarProjeto(projetoId: string, clienteId: string): Promise<ResultadoProjeto> {
  const { supabase } = await exigirProprietario();
  const r = await supabase.from("projetos").update({ arquivado_em: new Date().toISOString() }).eq("id", projetoId);
  if (r.error) return { erro: r.error.message };
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}


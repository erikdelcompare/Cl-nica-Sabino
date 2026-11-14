"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirProprietario } from "@/lib/servidor/auth";
import { tipar } from "@/lib/servidor/dados";

export interface EstadoForm {
  erro?: string;
  sucesso?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(f: FormData, campo: string): string | null {
  const v = String(f.get(campo) ?? "").trim();
  return v === "" ? null : v;
}

function dadosCliente(f: FormData) {
  return {
    nome: String(f.get("nome") ?? "").trim(),
    telefone: texto(f, "telefone"),
    email: texto(f, "email")?.toLowerCase() ?? null,
    cidade: texto(f, "cidade"),
    endereco: texto(f, "endereco"),
    observacoes: texto(f, "observacoes"),
  };
}

function validar(d: ReturnType<typeof dadosCliente>): string | null {
  if (d.nome.length < 2) return "Informe o nome do cliente.";
  if (d.telefone && d.telefone.replace(/\D/g, "").length < 8) return "Confira o telefone (DDD e número).";
  if (d.email && !EMAIL.test(d.email)) return "Confira o e-mail.";
  return null;
}

export async function criarCliente(_anterior: EstadoForm, f: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProprietario();
  const dados = dadosCliente(f);
  const erro = validar(dados);
  if (erro) return { erro };
  const r = tipar<{ id: string }>(await supabase.from("clientes").insert(dados).select("id").single());
  if (r.error || !r.data) return { erro: `Não foi possível salvar: ${r.error?.message ?? "tente novamente."}` };
  revalidatePath("/clientes");
  redirect(`/clientes/${r.data.id}`);
}

export async function atualizarCliente(id: string, _anterior: EstadoForm, f: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProprietario();
  const dados = dadosCliente(f);
  const erro = validar(dados);
  if (erro) return { erro };
  const r = await supabase.from("clientes").update(dados).eq("id", id);
  if (r.error) return { erro: `Não foi possível salvar: ${r.error.message}` };
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  return { sucesso: "Cadastro atualizado." };
}

export async function criarLocal(clienteId: string, _anterior: EstadoForm, f: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProprietario();
  const nome = texto(f, "nome");
  if (!nome) return { erro: "Dê um nome ao local (ex.: Casa, telhado dos fundos)." };
  const r = await supabase.from("locais").insert({
    cliente_id: clienteId,
    nome,
    tipo: f.get("tipo") === "solo" ? "solo" : "telhado",
    endereco: texto(f, "endereco"),
    cidade: texto(f, "cidade"),
    observacoes: texto(f, "observacoes"),
  });
  if (r.error) return { erro: `Não foi possível salvar: ${r.error.message}` };
  revalidatePath(`/clientes/${clienteId}`);
  return { sucesso: "Local cadastrado." };
}

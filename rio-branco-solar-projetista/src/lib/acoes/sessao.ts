"use server";

import { redirect } from "next/navigation";
import { clienteServidor, supabaseConfigurado } from "@/lib/servidor/supabase";

export interface EstadoLogin {
  erro?: string;
}

function destinoSeguro(valor: FormDataEntryValue | null): string {
  const v = typeof valor === "string" ? valor : "";
  // Só caminhos internos: evita redirecionamento para outro site.
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/clientes";
}

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  if (!supabaseConfigurado()) {
    return { erro: "Configuração pendente: defina as variáveis do Supabase no servidor (veja o README)." };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe o e-mail e a senha." };

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    if (error.status === 429) return { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
    return { erro: "E-mail ou senha incorretos." };
  }

  // Login válido não basta: precisa ser o proprietário cadastrado.
  const esperado = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  const { data: proprietario } = await supabase.rpc("sou_proprietario");
  if (proprietario !== true || (esperado && email !== esperado)) {
    await supabase.auth.signOut();
    return { erro: "Acesso restrito ao proprietário." };
  }
  redirect(destinoSeguro(formData.get("voltar")));
}

export async function sair(): Promise<void> {
  if (supabaseConfigurado()) {
    const supabase = await clienteServidor();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { clienteServidor, supabaseConfigurado } from "./supabase";

export interface Sessao {
  supabase: SupabaseClient;
  usuario: User;
}

/**
 * Valida no servidor que a requisição vem do proprietário:
 * 1. o token da sessão é conferido com o serviço de autenticação (getUser);
 * 2. o usuário precisa estar na tabela de proprietários (conferido no banco);
 * 3. se OWNER_EMAIL estiver definido, o e-mail também precisa coincidir.
 * As políticas RLS repetem a regra 2 dentro do banco, então mesmo uma falha aqui não expõe dados.
 */
export const sessaoDoProprietario = cache(async (): Promise<Sessao | null> => {
  if (!supabaseConfigurado()) return null;
  const supabase = await clienteServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const esperado = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  if (esperado && (data.user.email ?? "").toLowerCase() !== esperado) return null;
  const { data: ok, error: erroRpc } = await supabase.rpc("sou_proprietario");
  if (erroRpc || ok !== true) return null;
  return { supabase, usuario: data.user };
});

/** Para páginas e Server Actions: redireciona ao login quando não é o proprietário. */
export async function exigirProprietario(): Promise<Sessao> {
  const s = await sessaoDoProprietario();
  if (!s) redirect("/login");
  return s;
}

/** Para rotas de API: devolve null para a rota responder 401. */
export async function proprietarioDaApi(): Promise<Sessao | null> {
  return sessaoDoProprietario();
}

export function naoAutorizado(): Response {
  return Response.json({ erro: "nao_autorizado", mensagem: "Sessão expirada. Entre novamente." }, { status: 401 });
}

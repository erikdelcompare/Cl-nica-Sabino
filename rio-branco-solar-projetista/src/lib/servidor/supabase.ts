import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function supabaseConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Cliente com a sessão do usuário (cookies). Toda consulta passa pelas políticas RLS. */
export async function clienteServidor(): Promise<SupabaseClient> {
  const armazenamento = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => armazenamento.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) armazenamento.set(name, value, options);
        } catch {
          // Em Server Components não é possível gravar cookies; o proxy renova a sessão.
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;

/**
 * Cliente com a chave de serviço (ignora RLS). Uso restrito ao fluxo da proposta pública
 * (leitura por hash do token, PIN e capa) — nunca é exposto ao navegador.
 */
export function clienteAdmin(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }
  admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

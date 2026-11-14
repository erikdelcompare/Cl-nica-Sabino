import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Carrega .env.local e depois .env (sem sobrescrever o que já veio do ambiente).
config({ path: [".env.local", ".env"], quiet: true });

export function clienteDeServico(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    console.error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Copie .env.example para .env.local e preencha com os dados do seu projeto Supabase.",
    );
    process.exit(1);
  }
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Lê argumentos no formato --nome valor ou --nome=valor; --flag sozinho vira "true". */
export function argumentos(): Record<string, string> {
  const args: Record<string, string> = {};
  const lista = process.argv.slice(2);
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (!a.startsWith("--")) continue;
    const [nome, valor] = a.slice(2).split("=", 2);
    if (valor !== undefined) args[nome] = valor;
    else if (lista[i + 1] && !lista[i + 1].startsWith("--")) args[nome] = lista[++i];
    else args[nome] = "true";
  }
  return args;
}

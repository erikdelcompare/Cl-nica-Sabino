import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Aviso, Logo } from "@/components/ui";
import { sessaoDoProprietario } from "@/lib/servidor/auth";
import { supabaseConfigurado } from "@/lib/servidor/supabase";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { voltar } = await searchParams;
  if (await sessaoDoProprietario()) redirect("/clientes");
  const configurado = supabaseConfigurado();

  return (
    <main className="flex min-h-screen items-center justify-center bg-azul-escuro px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo claro />
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-xl">
          <h1 className="text-lg font-semibold text-tinta">Entrar no painel</h1>
          <p className="mt-1 text-sm text-cinza">Acesso exclusivo do proprietário. O cadastro público está desativado.</p>
          {!configurado && (
            <Aviso tipo="atencao" className="mt-4">
              Configuração pendente: defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no servidor. Veja o
              README.
            </Aviso>
          )}
          <FormularioLogin voltar={typeof voltar === "string" ? voltar : ""} desabilitado={!configurado} />
        </div>
        <p className="mt-4 text-center text-xs text-white/60">Sistema privado da Rio Branco Solar</p>
      </div>
    </main>
  );
}

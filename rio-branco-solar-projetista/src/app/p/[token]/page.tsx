import type { Metadata } from "next";
import { PlantaEstatica } from "@/components/planta";
import { clienteAdmin } from "@/lib/servidor/supabase";
import { buscarVersao } from "@/lib/servidor/publica";
import { PropostaPublica } from "./proposta-publica";

// Página da proposta por link. Não é indexável e não mostra valores antes do PIN.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposta Rio Branco Solar",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true, nocache: true },
  referrer: "no-referrer",
};

function Mensagem({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-papel px-4">
      <div className="max-w-sm rounded-2xl border border-linha bg-white p-6 text-center">
        <p className="text-lg font-semibold text-azul">{titulo}</p>
        <p className="mt-2 text-sm text-cinza">{texto}</p>
        <p className="mt-4 text-xs text-cinza">Rio Branco Solar</p>
      </div>
    </main>
  );
}

export default async function PaginaProposta({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  const { estado, versao } = await buscarVersao(token);

  if (!versao || estado === "inexistente") {
    return <Mensagem titulo="Link não encontrado" texto="Confira o endereço recebido ou peça um novo link ao vendedor." />;
  }
  if (estado === "revogada") {
    return <Mensagem titulo="Proposta indisponível" texto="Esta proposta foi substituída ou revogada. Peça a versão atual ao vendedor." />;
  }
  if (estado === "expirada") {
    return <Mensagem titulo="Link vencido" texto="O prazo para acessar esta proposta terminou. Peça uma nova ao vendedor." />;
  }

  // Contagem de visualização (sem dados pessoais).
  await clienteAdmin().rpc("proposta_registrar_visualizacao", { p_id: versao.id });

  const p = versao.snapshot_publico;
  return (
    <PropostaPublica
      token={token}
      estado={estado === "vencida" ? "vencida" : "ok"}
      versao={versao.versao}
      validade={versao.validade}
      titulo={p.titulo}
      empresa={p.empresa}
      cliente={p.cliente}
      projeto={p.projeto}
      temCapa={p.temCapa}
      avisoTecnico={p.avisoTecnico}
      cena={p.cena}
      specs={p.modulos}
      kit={p.kit}
      materiais={p.materiais}
      planta={<PlantaEstatica cena={p.cena} specs={p.modulos} titulo={`Planta 2D — ${p.projeto.nome}`} />}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorProjeto } from "@/components/editor/editor-projeto";
import { exigirProprietario } from "@/lib/servidor/auth";
import { carregarProjeto, listarCatalogo, tipar } from "@/lib/servidor/dados";

export const metadata: Metadata = { title: "Projeto" };

export default async function PaginaProjeto({ params }: PageProps<"/projetos/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProprietario();
  const projeto = await carregarProjeto(supabase, id);
  if (!projeto) notFound();

  const cliente = tipar<{ id: string; nome: string }>(await supabase.from("clientes").select("id, nome").eq("id", projeto.cliente_id).maybeSingle()).data;
  const locais = tipar<{ id: string; nome: string }[]>(
    await supabase.from("locais").select("id, nome").eq("cliente_id", projeto.cliente_id).order("criado_em"),
  ).data ?? [];
  const catalogo = await listarCatalogo(supabase);
  const modelos = tipar<{ id: string; nome: string; tipo: "telhado" | "solo"; descricao: string; conteudo: unknown }[]>(
    await supabase.from("modelos").select("id, nome, tipo, descricao, conteudo").order("nome"),
  ).data ?? [];
  const fotos = tipar<{ caminho: string; nome_original: string | null }[]>(
    await supabase.from("projeto_fotos").select("caminho, nome_original").eq("projeto_id", id).order("criado_em"),
  ).data ?? [];

  return (
    <EditorProjeto
      dados={{
        projetoId: projeto.id,
        clienteId: cliente?.id ?? projeto.cliente_id,
        clienteNome: cliente?.nome ?? "Cliente",
        tipo: projeto.tipo,
        nome: projeto.nome,
        revisao: projeto.revisao,
        localId: projeto.local_id,
        locais,
        medidas: projeto.medidas,
        cena: projeto.cena,
        kit: projeto.kit,
        capaCaminho: projeto.capa_caminho,
        catalogo,
        modelos: modelos.filter((m) => m.tipo === projeto.tipo).map((m) => ({ ...m, conteudo: m.conteudo as never })),
        fotos: fotos.map((f) => ({ caminho: f.caminho, nome: f.nome_original ?? "foto" })),
      }}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TituloPagina } from "@/components/ui";
import { exigirProprietario } from "@/lib/servidor/auth";
import { carregarOrcamento, dadosDoOrcamento, listarCatalogo, tipar, type VersaoResumo } from "@/lib/servidor/dados";
import { EditorOrcamento } from "./editor";
import { potenciaKwp } from "@/lib/dominio/kit";
import { mapaDoCatalogo } from "@/lib/dominio/kit";
import { normalizarCena } from "@/lib/dominio/cena";
import type { Kit } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Orçamento" };

export default async function PaginaOrcamento({ params }: PageProps<"/orcamentos/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProprietario();
  const carregado = await carregarOrcamento(supabase, id);
  if (!carregado) notFound();
  const { orcamento, itens } = carregado;
  const projeto = tipar<{ nome: string; tipo: "telhado" | "solo"; cena: unknown; kit: unknown }>(
    await supabase.from("projetos").select("nome, tipo, cena, kit").eq("id", orcamento.projeto_id).single(),
  ).data;
  const cliente = tipar<{ nome: string }>(await supabase.from("clientes").select("nome").eq("id", orcamento.cliente_id).single()).data;
  const versoes = tipar<VersaoResumo[]>(
    await supabase.from("versoes_resumo").select("*").eq("orcamento_id", id).order("versao", { ascending: false }),
  ).data ?? [];
  const catalogo = await listarCatalogo(supabase);
  const cena = projeto ? normalizarCena(projeto.cena, projeto.tipo) : null;
  const kit = (projeto?.kit ?? {}) as Kit;
  const mapa = mapaDoCatalogo(catalogo);
  const modulos = cena ? cena.modulos.length : 0;

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <TituloPagina
        voltar={{ href: `/clientes/${orcamento.cliente_id}`, rotulo: cliente?.nome ?? "Cliente" }}
        titulo={orcamento.titulo}
        descricao={`${orcamento.numero} · ${orcamento.revisao > 1 ? `revisão ${orcamento.revisao}` : "rascunho novo"}`}
      />
      <EditorOrcamento
        id={id}
        revisao={orcamento.revisao}
        numero={orcamento.numero}
        clienteNome={cliente?.nome ?? "Cliente"}
        clienteId={orcamento.cliente_id}
        projetoNome={projeto?.nome ?? "Projeto"}
        projetoId={orcamento.projeto_id}
        projetoTipo={projeto?.tipo ?? "telhado"}
        arquivado={Boolean(orcamento.arquivado_em)}
        dados={dadosDoOrcamento(orcamento)}
        itens={itens}
        versoes={versoes}
        catalogo={catalogo}
        cenaResumo={{
          modulos,
          potenciaKwp: potenciaKwp(kit.modulos ? kit : { modulos: [], inversores: [], geracaoMensalKwh: null, origemGeracao: "", verificacao: { tempMinC: 0, tempMaxCelulaC: 0, arranjos: [], validados: {}, responsavel: "", validadoEm: null, observacoes: "" } }, mapa),
          geracao: kit.geracaoMensalKwh ?? null,
        }}
      />
    </div>
  );
}


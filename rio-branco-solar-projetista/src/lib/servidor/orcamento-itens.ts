import "server-only";
import { mapaDeModulos, mapaDoCatalogo, sincronizarKit } from "@/lib/dominio/kit";
import { calcularMateriais, sincronizarItens, type LinhaMaterial } from "@/lib/dominio/materiais";
import type { ItemOrcamento, Kit, Cena } from "@/lib/dominio/tipos";
import { carregarProjeto, listarCatalogo, type Db, type Projeto } from "./dados";

export interface Preparado {
  projeto: Projeto;
  linhas: LinhaMaterial[];
  kit: Kit;
  catalogo: ReturnType<typeof mapaDoCatalogo>;
  modulos: ReturnType<typeof mapaDeModulos>;
}

/** Lista de materiais atual do projeto (kit sincronizado com o desenho + estrutura + avulsos do catálogo). */
export async function prepararProjeto(db: Db, projetoId: string): Promise<Preparado | null> {
  const projeto = await carregarProjeto(db, projetoId);
  if (!projeto) return null;
  const lista = await listarCatalogo(db);
  const catalogo = mapaDoCatalogo(lista);
  const kit = sincronizarKit(projeto.kit, projeto.cena as Cena);
  const linhas = calcularMateriais(projeto.cena as Cena, kit, catalogo);
  return { projeto, linhas, kit, catalogo, modulos: mapaDeModulos(lista) };
}

/** Recalcula os itens do orçamento a partir do projeto, preservando avulsos e preços manuais. */
export function recalcularItens(atuais: ItemOrcamento[], prep: Preparado) {
  return sincronizarItens(atuais, prep.linhas);
}

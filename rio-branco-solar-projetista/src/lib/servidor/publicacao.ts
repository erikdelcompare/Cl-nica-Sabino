import { randomUUID } from "node:crypto";
import { mapaDeModulos, mapaDoCatalogo, sincronizarKit } from "@/lib/dominio/kit";
import { calcularTotais, montarComercial, montarInterno, montarPublico } from "@/lib/dominio/orcamento";
import { dadosDaEmpresa } from "@/lib/marca";
import { cifrarToken, gerarPin, gerarToken, hashPin, hashToken } from "@/lib/seguranca/cripto";
import { carregarOrcamento, carregarProjeto, dadosDoOrcamento, exigir, listarCatalogo, tipar, type Db } from "./dados";

export interface OpcoesPublicacao {
  /** Data/hora de vencimento do link; null = sem vencimento. */
  linkExpiraEm: string | null;
  /** Revoga os links das versões anteriores deste orçamento. */
  revogarAnteriores: boolean;
}

export interface ResultadoPublicacao {
  versaoId: string;
  versao: number;
  token: string;
  pin: string;
  total: number;
}

export class ErroPublicacao extends Error {}

/**
 * Finaliza o orçamento e grava uma versão publicada: equipamentos, descrições, quantidades,
 * preços e condições daquele momento ficam congelados. Gera o link individual (token aleatório)
 * e o PIN de 6 dígitos vinculados à versão. O PIN só é devolvido aqui; no banco fica o hash.
 */
export async function publicarOrcamento(db: Db, orcamentoId: string, opcoes: OpcoesPublicacao): Promise<ResultadoPublicacao> {
  const carregado = await carregarOrcamento(db, orcamentoId);
  if (!carregado) throw new ErroPublicacao("Orçamento não encontrado.");
  const { orcamento, itens } = carregado;
  if (orcamento.arquivado_em) throw new ErroPublicacao("Este orçamento está arquivado. Reative-o antes de publicar.");

  const projeto = await carregarProjeto(db, orcamento.projeto_id);
  if (!projeto) throw new ErroPublicacao("Projeto do orçamento não encontrado.");
  const cliente = exigir(tipar<{ nome: string; cidade: string | null }>(await db.from("clientes").select("nome, cidade").eq("id", orcamento.cliente_id).single()), "Cliente");
  const local = projeto.local_id
    ? exigir(tipar<{ nome: string; cidade: string | null }>(await db.from("locais").select("nome, cidade").eq("id", projeto.local_id).maybeSingle()), "Local")
    : null;

  // Inclui itens desativados: o que já está no rascunho precisa aparecer na versão.
  const catalogoLista = await listarCatalogo(db);
  const catalogo = mapaDoCatalogo(catalogoLista);
  const modulos = mapaDeModulos(catalogoLista);
  const kit = sincronizarKit(projeto.kit, projeto.cena);
  const dados = dadosDoOrcamento(orcamento);
  const totais = calcularTotais(dados, itens);
  if (itens.length === 0 || totais.total <= 0) {
    throw new ErroPublicacao("Inclua ao menos um item com preço de venda antes de publicar.");
  }
  if (kit.modulos.reduce((s, m) => s + m.quantidade, 0) === 0) {
    throw new ErroPublicacao("O projeto ainda não tem módulos. Distribua os módulos antes de publicar.");
  }

  const versaoId = randomUUID();
  const token = gerarToken();
  const pin = gerarPin();

  // Capa: cópia própria da versão, para que uma nova captura não altere propostas já enviadas.
  let capaCaminho: string | null = null;
  if (projeto.capa_caminho) {
    const destino = `versoes/${versaoId}/capa.jpg`;
    const copia = await db.storage.from("capas").copy(projeto.capa_caminho, destino);
    if (!copia.error) capaCaminho = destino;
  }

  const publico = montarPublico({
    empresa: dadosDaEmpresa(),
    cliente: { nome: cliente.nome, cidade: cliente.cidade },
    projeto: { nome: projeto.nome, tipo: projeto.tipo, local: local ? [local.nome, local.cidade].filter(Boolean).join(" — ") : null },
    titulo: orcamento.titulo,
    cena: projeto.cena,
    kit,
    catalogo,
    modulos,
    itens,
    temCapa: capaCaminho !== null,
  });
  const comercial = montarComercial(dados, itens);
  const interno = montarInterno(dados, itens, kit, catalogo);

  const versao = exigir(
    await db.rpc("publicar_orcamento", {
      p_id: versaoId,
      p_orcamento_id: orcamentoId,
      p_snapshot_publico: publico,
      p_snapshot_comercial: comercial,
      p_snapshot_interno: interno,
      p_total: totais.total,
      p_validade: dados.validade,
      p_modo: dados.exibicao.modo,
      p_capa_caminho: capaCaminho,
      p_token_hash: hashToken(token),
      p_token_cifrado: cifrarToken(token),
      p_pin_hash: hashPin(pin, versaoId),
      p_link_expira_em: opcoes.linkExpiraEm,
      p_revogar_anteriores: opcoes.revogarAnteriores,
    }),
    "Publicação",
  ) as { versao: number };

  return { versaoId, versao: versao.versao, token, pin, total: totais.total };
}

/** Troca o PIN: gera um novo, zera bloqueios e invalida todas as sessões de desbloqueio anteriores. */
export async function trocarPinDaVersao(db: Db, versaoId: string): Promise<string> {
  const atual = exigir(tipar<{ pin_versao: number; revogada_em: string | null }>(await db.from("proposta_versoes").select("pin_versao, revogada_em").eq("id", versaoId).single()), "Versão");
  if (atual.revogada_em) throw new ErroPublicacao("Este link foi revogado. Publique uma nova versão.");
  const pin = gerarPin();
  exigir(
    await db
      .from("proposta_versoes")
      .update({
        pin_hash: hashPin(pin, versaoId),
        pin_versao: atual.pin_versao + 1,
        pin_tentativas: 0,
        pin_bloqueios: 0,
        pin_bloqueado_ate: null,
      })
      .eq("id", versaoId)
      .select("id")
      .single(),
    "Troca de PIN",
  );
  return pin;
}

/** Revoga o link: a proposta deixa de abrir e as sessões de desbloqueio perdem a validade. */
export async function revogarVersao(db: Db, versaoId: string): Promise<void> {
  const atual = exigir(tipar<{ pin_versao: number }>(await db.from("proposta_versoes").select("pin_versao").eq("id", versaoId).single()), "Versão");
  exigir(
    await db
      .from("proposta_versoes")
      .update({ revogada_em: new Date().toISOString(), pin_versao: atual.pin_versao + 1 })
      .eq("id", versaoId)
      .select("id")
      .single(),
    "Revogação",
  );
}

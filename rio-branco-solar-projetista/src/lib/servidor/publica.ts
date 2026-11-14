import "server-only";
import type { SnapshotComercial, SnapshotPublico } from "@/lib/dominio/orcamento";
import { hashToken, tokenValido } from "@/lib/seguranca/cripto";
import { clienteAdmin } from "./supabase";

// Acesso às propostas pelo link. Usa a chave de serviço, mas só depois de conferir o token,
// e nunca devolve o hash do PIN nem os valores antes do desbloqueio.

export interface VersaoPublica {
  id: string;
  orcamento_id: string;
  versao: number;
  status: string;
  revogada_em: string | null;
  link_expira_em: string | null;
  pin_versao: number;
  pin_hash: string;
  capa_caminho: string | null;
  validade: string | null;
  total_centavos: number;
  modo_exibicao: string;
  publicado_em: string;
  snapshot_publico: SnapshotPublico;
  snapshot_comercial: SnapshotComercial;
}

export type EstadoLink = "ok" | "inexistente" | "revogada" | "expirada" | "vencida";

export function hojeRioBranco(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Rio_Branco" });
}

export async function buscarVersao(token: string): Promise<{ estado: EstadoLink; versao?: VersaoPublica }> {
  if (!tokenValido(token)) return { estado: "inexistente" };
  const r = await clienteAdmin()
    .from("proposta_versoes")
    .select(
      "id, orcamento_id, versao, status, revogada_em, link_expira_em, pin_versao, pin_hash, capa_caminho, validade, total_centavos, modo_exibicao, publicado_em, snapshot_publico, snapshot_comercial",
    )
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (r.error || !r.data) return { estado: "inexistente" };
  const versao = r.data as unknown as VersaoPublica;
  if (versao.revogada_em) return { estado: "revogada", versao };
  if (versao.link_expira_em && new Date(versao.link_expira_em).getTime() < Date.now()) return { estado: "expirada", versao };
  if (versao.validade && versao.validade < hojeRioBranco()) return { estado: "vencida", versao };
  return { estado: "ok", versao };
}

export async function baixarCapa(caminho: string): Promise<Uint8Array | null> {
  const r = await clienteAdmin().storage.from("capas").download(caminho);
  if (r.error || !r.data) return null;
  return new Uint8Array(await r.data.arrayBuffer());
}

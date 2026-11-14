import "server-only";
import { lerSessao, nomeCookieSessao } from "@/lib/seguranca/cripto";
import type { VersaoPublica } from "./publica";

/** Confere se o aparelho desbloqueou esta versão: assinatura válida, mesma versão, PIN não trocado e link não revogado. */
export function desbloqueioValido(cookieValor: string | undefined, versao: VersaoPublica): boolean {
  const s = lerSessao(cookieValor);
  return Boolean(s && s.v === versao.id && s.e === versao.pin_versao && !versao.revogada_em);
}

export { nomeCookieSessao };

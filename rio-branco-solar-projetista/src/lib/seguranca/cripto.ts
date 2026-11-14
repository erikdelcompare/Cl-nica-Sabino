import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

// Segredos e primitivas usados pelo link da proposta, pelo PIN e pela sessão de desbloqueio.
// Tudo roda somente no servidor.

function segredoBase(): Buffer {
  const s = process.env.PROPOSTA_SEGREDO ?? "";
  if (s.length < 32) {
    throw new Error("PROPOSTA_SEGREDO ausente ou curto: defina um valor aleatório com pelo menos 32 caracteres.");
  }
  return Buffer.from(s, "utf8");
}

/** Deriva uma chave específica por finalidade a partir do segredo do servidor. */
function chave(finalidade: "pin" | "sessao" | "token"): Buffer {
  return Buffer.from(hkdfSync("sha256", segredoBase(), Buffer.alloc(0), `rbs-projetista:${finalidade}`, 32));
}

export function segredoConfigurado(): boolean {
  return (process.env.PROPOSTA_SEGREDO ?? "").length >= 32;
}

const b64u = (b: Buffer) => b.toString("base64url");

// ---------------------------------------------------------------- link/token

/** Token aleatório de 256 bits para o link individual da proposta. */
export function gerarToken(): string {
  return b64u(randomBytes(32));
}

export function tokenValido(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** O banco guarda apenas o hash do token (o link não é recuperável só com o banco). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Cifra o token para o painel conseguir exibir o link novamente (AES-256-GCM). */
export function cifrarToken(token: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave("token"), iv);
  const cifrado = Buffer.concat([c.update(token, "utf8"), c.final()]);
  return `${b64u(iv)}.${b64u(c.getAuthTag())}.${b64u(cifrado)}`;
}

export function decifrarToken(cifrado: string): string | null {
  try {
    const [iv, tag, dados] = cifrado.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", chave("token"), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------- PIN

/** PIN aleatório de 6 dígitos (gerador criptográfico). */
export function gerarPin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function pinValido(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

const SCRYPT = { N: 16384, r: 8, p: 1, tamanho: 32 };

/**
 * Hash do PIN: scrypt com sal aleatório sobre um HMAC do PIN com a "pimenta" do servidor
 * e o identificador da versão. Um PIN de 6 dígitos tem pouca entropia; a pimenta impede
 * a quebra por força bruta de quem tiver apenas uma cópia do banco, e o vínculo com a versão
 * faz o PIN de uma proposta nunca valer em outra.
 */
export function hashPin(pin: string, versaoId: string): string {
  const sal = randomBytes(16);
  const material = createHmac("sha256", chave("pin")).update(`${versaoId}:${pin}`).digest();
  const h = scryptSync(material, sal, SCRYPT.tamanho, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${b64u(sal)}$${b64u(h)}`;
}

export function conferirPin(pin: string, versaoId: string, armazenado: string): boolean {
  try {
    const [algoritmo, N, r, p, sal, hash] = armazenado.split("$");
    if (algoritmo !== "scrypt") return false;
    const esperado = Buffer.from(hash, "base64url");
    const material = createHmac("sha256", chave("pin")).update(`${versaoId}:${pin}`).digest();
    const h = scryptSync(material, Buffer.from(sal, "base64url"), esperado.length, { N: Number(N), r: Number(r), p: Number(p) });
    return h.length === esperado.length && timingSafeEqual(h, esperado);
  } catch {
    return false;
  }
}

// ------------------------------------------------------ sessão de desbloqueio

export interface SessaoDesbloqueio {
  /** Versão publicada desbloqueada. */
  v: string;
  /** Época do PIN: muda ao trocar o PIN ou revogar, invalidando sessões antigas. */
  e: number;
  /** Expiração (segundos desde 1970). */
  x: number;
}

export function minutosSessao(): number {
  const n = Number(process.env.PROPOSTA_SESSAO_MINUTOS ?? 120);
  return Number.isFinite(n) && n >= 5 && n <= 1440 ? n : 120;
}

export function assinarSessao(versaoId: string, pinVersao: number, agora = Date.now()): { valor: string; expiraEm: Date } {
  const expiraEm = new Date(agora + minutosSessao() * 60_000);
  const corpo = b64u(Buffer.from(JSON.stringify({ v: versaoId, e: pinVersao, x: Math.floor(expiraEm.getTime() / 1000) } satisfies SessaoDesbloqueio)));
  const assinatura = b64u(createHmac("sha256", chave("sessao")).update(corpo).digest());
  return { valor: `${corpo}.${assinatura}`, expiraEm };
}

/** Confere assinatura e validade. A época do PIN e a revogação são conferidas contra o banco por quem chama. */
export function lerSessao(valor: string | undefined | null, agora = Date.now()): SessaoDesbloqueio | null {
  if (!valor) return null;
  const [corpo, assinatura] = valor.split(".");
  if (!corpo || !assinatura) return null;
  const esperado = createHmac("sha256", chave("sessao")).update(corpo).digest();
  const recebido = Buffer.from(assinatura, "base64url");
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return null;
  try {
    const s = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as SessaoDesbloqueio;
    if (typeof s.v !== "string" || typeof s.e !== "number" || typeof s.x !== "number") return null;
    if (s.x * 1000 <= agora) return null;
    return s;
  } catch {
    return null;
  }
}

/** Nome do cookie de desbloqueio: um por versão, sem expor o identificador. */
export function nomeCookieSessao(versaoId: string): string {
  return `rbs_prop_${createHash("sha256").update(versaoId).digest("hex").slice(0, 16)}`;
}

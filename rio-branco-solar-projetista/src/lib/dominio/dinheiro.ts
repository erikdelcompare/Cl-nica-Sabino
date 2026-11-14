// Dinheiro sempre em centavos inteiros para não perder precisão.

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarBRL(centavos: number | null | undefined): string {
  return fmtBRL.format((centavos ?? 0) / 100).replace(/ /g, " ");
}

/** "1.234,56" | "R$ 1.234,56" | "1234.56" | "1234" → centavos. Retorna null se inválido. */
export function lerBRL(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  let t = String(texto).trim().replace(/[R$\s ]/g, "");
  if (t === "") return null;
  const negativo = t.startsWith("-");
  if (negativo) t = t.slice(1);
  const temVirgula = t.includes(",");
  if (temVirgula) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal.
    t = t.replace(/\./g, "").replace(",", ".");
  } else if ((t.match(/\./g) ?? []).length > 1) {
    t = t.replace(/\./g, "");
  } else if (/^\d{1,3}\.\d{3}$/.test(t)) {
    // "1.234" sem vírgula: tratamos como milhar.
    t = t.replace(".", "");
  }
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [inteiro, decimal = ""] = t.split(".");
  const dec = (decimal + "000").slice(0, 3);
  let centavos = Number(inteiro) * 100 + Number(dec.slice(0, 2));
  if (Number(dec[2]) >= 5) centavos += 1;
  if (!Number.isSafeInteger(centavos)) return null;
  return negativo ? -centavos : centavos;
}

/** Centavos → "1234,56" (para preencher campos de formulário). */
export function centavosParaCampo(centavos: number | null | undefined): string {
  const c = Math.round(centavos ?? 0);
  const sinal = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  return `${sinal}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/** Quantidade (até 3 casas) × preço unitário em centavos, arredondando o centavo. */
export function totalLinha(quantidade: number, precoUnitCentavos: number): number {
  const milesimos = Math.round(quantidade * 1000);
  return Math.round((milesimos * precoUnitCentavos) / 1000);
}

export function arredondarQtd(q: number): number {
  return Math.round(q * 1000) / 1000;
}

const fmtNum = (casas: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function formatarNumero(valor: number, casas = 2): string {
  return fmtNum(casas).format(valor);
}

export function formatarQtd(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(valor);
}

/** Lê número digitado em português ("4,5" ou "4.5"). */
export function lerNumero(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  const t = String(texto).trim().replace(/\s/g, "");
  if (t === "") return null;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export function formatarMetros(valor: number, casas = 2): string {
  return `${formatarNumero(valor, casas)} m`;
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Rio_Branco" });
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Rio_Branco",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

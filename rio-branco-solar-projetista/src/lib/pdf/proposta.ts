import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { formatarBRL, formatarNumero, formatarQtd } from "@/lib/dominio/dinheiro";
import type { SnapshotComercial, SnapshotPublico } from "@/lib/dominio/orcamento";
import { MARCA } from "@/lib/marca";

// PDF comercial com a identidade da Rio Branco Solar. Contém preços: só é entregue depois do PIN.

export interface DadosPdf {
  numero: string;
  versao: number;
  publico: SnapshotPublico;
  comercial: SnapshotComercial;
  validade: string | null;
  capa: Uint8Array | null;
}

const A4: [number, number] = [595.28, 841.89];
const MARGEM = 46;
const cor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const AZUL = cor(MARCA.cores.azul);
const SOL = cor(MARCA.cores.sol);
const TINTA = cor(MARCA.cores.tinta);
const CINZA = cor(MARCA.cores.cinza);
const CLARO = cor("#E4EEF5");

/** Texto simples: troca caracteres fora do WinAnsi que as fontes padrão não desenham. */
function seguro(t: string): string {
  return t
    .replace(/[–—]/g, "-")
    .replace(/[•]/g, "-")
    .replace(/[≤]/g, "<=")
    .replace(/[≥]/g, ">=")
    .replace(/ /g, " ")
    .replace(/[^\x09\x0a\x0d\x20-\x7e -ÿ]/g, "");
}

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of seguro(texto).split("\n")) {
    let atual = "";
    for (const palavra of paragrafo.split(/\s+/)) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura) atual = tentativa;
      else {
        if (atual) linhas.push(atual);
        atual = palavra;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

class Escritor {
  pagina: PDFPage;
  y: number;
  readonly paginas: PDFPage[] = [];

  constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private negrito: PDFFont,
  ) {
    this.pagina = doc.addPage(A4);
    this.paginas.push(this.pagina);
    this.y = A4[1] - MARGEM;
  }

  get largura() {
    return A4[0] - MARGEM * 2;
  }

  nova() {
    this.pagina = this.doc.addPage(A4);
    this.paginas.push(this.pagina);
    this.y = A4[1] - MARGEM;
  }

  garantir(altura: number) {
    if (this.y - altura < MARGEM + 30) this.nova();
  }

  texto(t: string, opcoes: { tamanho?: number; negrito?: boolean; cor?: ReturnType<typeof rgb>; x?: number; largura?: number; espaco?: number } = {}) {
    const tamanho = opcoes.tamanho ?? 10;
    const fonte = opcoes.negrito ? this.negrito : this.regular;
    const larg = opcoes.largura ?? this.largura;
    for (const linha of quebrar(t, fonte, tamanho, larg)) {
      this.garantir(tamanho + 4);
      this.pagina.drawText(linha, { x: opcoes.x ?? MARGEM, y: this.y - tamanho, size: tamanho, font: fonte, color: opcoes.cor ?? TINTA });
      this.y -= tamanho + 4;
    }
    this.y -= opcoes.espaco ?? 0;
  }

  secao(titulo: string) {
    this.garantir(40);
    this.y -= 10;
    this.pagina.drawRectangle({ x: MARGEM, y: this.y - 3, width: this.largura, height: 0.8, color: SOL });
    this.y -= 12;
    this.texto(titulo.toUpperCase(), { tamanho: 10, negrito: true, cor: AZUL, espaco: 4 });
  }

  linhaTabela(colunas: { t: string; x: number; w: number; alinhar?: "esq" | "dir"; negrito?: boolean }[], fundo = false) {
    const altura = 15;
    this.garantir(altura + 2);
    if (fundo) this.pagina.drawRectangle({ x: MARGEM, y: this.y - altura + 3, width: this.largura, height: altura, color: CLARO });
    for (const c of colunas) {
      const fonte = c.negrito ? this.negrito : this.regular;
      let t = seguro(c.t);
      while (t.length > 3 && fonte.widthOfTextAtSize(t, 8.5) > c.w - 4) t = t.slice(0, -2);
      const x = c.alinhar === "dir" ? MARGEM + c.x + c.w - fonte.widthOfTextAtSize(t, 8.5) - 4 : MARGEM + c.x + 4;
      this.pagina.drawText(t, { x, y: this.y - 10, size: 8.5, font: fonte, color: TINTA });
    }
    this.y -= altura;
  }
}

export async function gerarPdfProposta(d: DadosPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Proposta ${d.numero} — Rio Branco Solar`);
  doc.setAuthor("Rio Branco Solar");
  doc.setSubject("Proposta comercial de sistema fotovoltaico");
  doc.setKeywords(["proposta", "confidencial"]);
  doc.setCreator("Projetista Solar 3D");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Escritor(doc, regular, negrito);
  const p = d.publico;

  // Cabeçalho com a identidade da marca.
  w.pagina.drawRectangle({ x: 0, y: A4[1] - 92, width: A4[0], height: 92, color: AZUL });
  w.pagina.drawRectangle({ x: 0, y: A4[1] - 96, width: A4[0], height: 4, color: SOL });
  w.pagina.drawText(MARCA.nome, { x: MARGEM, y: A4[1] - 44, size: 20, font: negrito, color: cor("#FFFFFF") });
  w.pagina.drawText("PROPOSTA COMERCIAL - ENERGIA SOLAR", { x: MARGEM, y: A4[1] - 62, size: 9, font: regular, color: SOL });
  const info = `Proposta ${d.numero} · versão ${d.versao}`;
  w.pagina.drawText(info, { x: A4[0] - MARGEM - regular.widthOfTextAtSize(info, 9), y: A4[1] - 62, size: 9, font: regular, color: cor("#FFFFFF") });
  w.y = A4[1] - 92 - 26;

  if (d.capa) {
    let imagem: PDFImage;
    try {
      imagem = await doc.embedJpg(d.capa);
      const largura = A4[0] - MARGEM * 2;
      const altura = (imagem.height / imagem.width) * largura;
      const alvo = Math.min(altura, 230);
      const escala = alvo / altura;
      w.garantir(alvo + 8);
      w.pagina.drawImage(imagem, { x: MARGEM, y: w.y - alvo, width: largura * escala, height: alvo });
      w.y -= alvo + 14;
    } catch {
      // Capa inválida: segue sem a imagem.
    }
  }

  w.texto(`Cliente: ${p.cliente.nome}`, { tamanho: 12, negrito: true, espaco: 2 });
  if (p.cliente.cidade) w.texto(`Cidade: ${p.cliente.cidade}`, { tamanho: 10 });
  w.texto(`Projeto: ${p.projeto.nome}${p.projeto.tipo === "telhado" ? " (telhado)" : " (estrutura de solo)"}`, { tamanho: 10 });
  if (p.projeto.local) w.texto(`Local: ${p.projeto.local}`, { tamanho: 10 });
  if (d.validade) {
    const [a, m, dia] = d.validade.split("-");
    w.texto(`Validade desta proposta: ${dia}/${m}/${a}`, { tamanho: 10, negrito: true, cor: AZUL, espaco: 4 });
  }

  w.secao("Sistema proposto");
  w.texto(
    `${p.kit.totalModulos} módulos fotovoltaicos, potência total de ${formatarNumero(p.kit.potenciaKwp, 2)} kWp; inversor(es) com ${formatarNumero(p.kit.potenciaInversoresKw, 2)} kW.`,
    { tamanho: 10, espaco: 4 },
  );
  if (p.kit.geracaoMensalKwh) {
    w.texto(
      `Geração mensal estimada: ${formatarQtd(p.kit.geracaoMensalKwh)} kWh/mês. ${p.kit.origemGeracao}`,
      { tamanho: 9, cor: CINZA, espaco: 4 },
    );
  }
  for (const e of p.kit.equipamentos) {
    w.texto(`${e.quantidade} × ${e.descricao}`, { tamanho: 10, x: MARGEM + 8, largura: w.largura - 8 });
  }

  if (p.materiais.length > 0) {
    w.secao("Materiais e serviços incluídos");
    for (const m of p.materiais.slice(0, 120)) {
      w.texto(`${formatarQtd(m.quantidade)} ${m.unidade} · ${m.descricao}`, { tamanho: 9, x: MARGEM + 8, largura: w.largura - 8 });
    }
  }

  const c = d.comercial;
  w.secao("Investimento");
  if (c.modo === "total") {
    w.texto("Valor total do investimento:", { tamanho: 10 });
  }
  if (c.linhas.length > 0) {
    const colunas = [
      { t: "Descrição", x: 0, w: 250 },
      { t: "Qtd", x: 250, w: 60, alinhar: "dir" as const },
      { t: "Preço unit.", x: 310, w: 90, alinhar: "dir" as const },
      { t: "Total", x: 400, w: 115, alinhar: "dir" as const },
    ];
    w.linhaTabela(colunas.map((col) => ({ ...col, negrito: true })), true);
    for (const l of c.linhas) {
      w.linhaTabela([
        { t: l.descricao, x: 0, w: 250 },
        { t: l.quantidade == null ? "" : `${formatarQtd(l.quantidade)} ${l.unidade ?? ""}`, x: 250, w: 60, alinhar: "dir" },
        { t: l.precoUnit == null ? "" : formatarBRL(l.precoUnit), x: 310, w: 90, alinhar: "dir" },
        { t: formatarBRL(l.total), x: 400, w: 115, alinhar: "dir" },
      ]);
    }
  }
  w.y -= 4;
  const resumo: [string, string][] = [["Subtotal", formatarBRL(c.subtotal)]];
  if (c.desconto > 0) resumo.push(["Desconto", `- ${formatarBRL(c.desconto)}`]);
  for (const [rotulo, valor] of resumo) {
    w.garantir(16);
    w.pagina.drawText(rotulo, { x: MARGEM + 300, y: w.y - 10, size: 10, font: regular, color: TINTA });
    w.pagina.drawText(valor, { x: MARGEM + w.largura - negrito.widthOfTextAtSize(valor, 10) - 4, y: w.y - 10, size: 10, font: regular, color: TINTA });
    w.y -= 15;
  }
  w.garantir(30);
  w.pagina.drawRectangle({ x: MARGEM + 290, y: w.y - 22, width: w.largura - 290, height: 22, color: AZUL });
  w.pagina.drawText("TOTAL", { x: MARGEM + 300, y: w.y - 15, size: 11, font: negrito, color: cor("#FFFFFF") });
  const total = formatarBRL(c.total);
  w.pagina.drawText(total, { x: MARGEM + w.largura - negrito.widthOfTextAtSize(total, 12) - 8, y: w.y - 15, size: 12, font: negrito, color: cor("#FFFFFF") });
  w.y -= 34;

  w.secao("Condições de pagamento");
  if (c.condicoes.aVista) {
    w.texto(`À vista: ${formatarBRL(c.condicoes.aVista.valor)}${c.condicoes.aVista.observacao ? ` (${c.condicoes.aVista.observacao})` : ""}`, { tamanho: 10 });
  }
  if (c.condicoes.cartao) {
    w.texto("No cartão:", { tamanho: 10, negrito: true });
    for (const o of c.condicoes.cartao.opcoes) {
      w.texto(`${o.parcelas}x de ${formatarBRL(o.valorParcela)}`, { tamanho: 10, x: MARGEM + 8, largura: w.largura - 8 });
    }
    if (c.condicoes.cartao.observacao) w.texto(c.condicoes.cartao.observacao, { tamanho: 9, cor: CINZA });
  }
  if (c.condicoes.financiamento) {
    const f = c.condicoes.financiamento;
    w.texto(`Financiamento${f.instituicao ? ` (${f.instituicao})` : ""}${f.entrada ? `: entrada de ${formatarBRL(f.entrada)}` : ""}`, { tamanho: 10, negrito: true });
    for (const o of f.opcoes) {
      w.texto(`${o.parcelas}x de ${formatarBRL(o.valorParcela)}`, { tamanho: 10, x: MARGEM + 8, largura: w.largura - 8 });
    }
    if (f.observacao) w.texto(f.observacao, { tamanho: 9, cor: CINZA });
  }
  if (!c.condicoes.aVista && !c.condicoes.cartao && !c.condicoes.financiamento) {
    w.texto("A combinar com o vendedor.", { tamanho: 10 });
  }

  if (c.garantias) {
    w.secao("Garantias");
    w.texto(c.garantias, { tamanho: 9.5 });
  }
  if (c.observacoes) {
    w.secao("Observações");
    w.texto(c.observacoes, { tamanho: 9.5 });
  }

  w.secao("Aviso técnico");
  w.texto(p.avisoTecnico, { tamanho: 8.5, cor: CINZA });

  // Rodapé com paginação.
  const total_paginas = w.paginas.length;
  w.paginas.forEach((pg, i) => {
    pg.drawLine({ start: { x: MARGEM, y: 36 }, end: { x: A4[0] - MARGEM, y: 36 }, thickness: 0.5, color: CLARO });
    pg.drawText(seguro(`${p.empresa.nome}${p.empresa.contato ? ` · ${p.empresa.contato}` : ""}`), { x: MARGEM, y: 24, size: 8, font: regular, color: CINZA });
    const pag = `Página ${i + 1} de ${total_paginas}`;
    pg.drawText(pag, { x: A4[0] - MARGEM - regular.widthOfTextAtSize(pag, 8), y: 24, size: 8, font: regular, color: CINZA });
  });

  return doc.save();
}

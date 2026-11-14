import { describe, expect, it } from "vitest";
import { cenaPorMedidas } from "@/lib/dominio/analise";
import { aguaOposta, clonarComNovosIds, extrairModelo, inserirModelo, novaAgua, novoObstaculo, redimensionar } from "@/lib/dominio/cena";
import { adicionarFileira, distribuir, duplicarModulos, excluirModulos, girarModulos, moverModulos, trocarModelo } from "@/lib/dominio/distribuicao";
import { agruparComponentes, dividirEmBarras, gerarEstrutura } from "@/lib/dominio/estrutura";
import { alturaEm, convexosIntersectam, cantosRetangulo, paraLocal, paraPlanta, poligonoDentro, pontoEmPoligono, retangulo } from "@/lib/dominio/geometria";
import { validarCena } from "@/lib/dominio/validacao";
import { demoSolo, demoTelhado, montarMesaDemo } from "@/lib/demo/projetos";
import { catalogo, mapa, MOD_620, MOD_650, specs } from "../apoio/catalogo";

const porCodigo = Object.fromEntries(catalogo.map((i) => [i.id, i]));

describe("geometria", () => {
  it("ponto e polígono", () => {
    const r = retangulo(4, 2);
    expect(pontoEmPoligono({ x: 1, y: 1 }, r)).toBe(true);
    expect(pontoEmPoligono({ x: 4, y: 1 }, r)).toBe(true); // borda conta
    expect(pontoEmPoligono({ x: 4.01, y: 1 }, r)).toBe(false);
    expect(poligonoDentro(cantosRetangulo(2, 1, 4, 2), r)).toBe(true);
    expect(poligonoDentro(cantosRetangulo(2, 1, 4.1, 2), r)).toBe(false);
  });

  it("retângulos encostados não contam como sobrepostos", () => {
    const a = cantosRetangulo(0.5, 0.5, 1, 1);
    expect(convexosIntersectam(a, cantosRetangulo(1.5, 0.5, 1, 1))).toBe(false);
    expect(convexosIntersectam(a, cantosRetangulo(1.4, 0.5, 1, 1))).toBe(true);
    expect(convexosIntersectam(a, cantosRetangulo(1.6, 0.5, 1, 1, 45))).toBe(true);
  });

  it("converte superfície ↔ planta considerando rotação e inclinação", () => {
    const sup = { origem: { x: 2, y: 3 }, rotacao: 90, inclinacao: 60, alturaBase: 3 };
    const p = paraPlanta(sup, 1, 2);
    // u gira para +y; v (projetado: 2 × cos 60° = 1) aponta para −x
    expect(p.x).toBeCloseTo(1);
    expect(p.y).toBeCloseTo(4);
    const volta = paraLocal(sup, p);
    expect(volta.x).toBeCloseTo(1);
    expect(volta.y).toBeCloseTo(2);
    expect(alturaEm(sup, 2)).toBeCloseTo(3 + 2 * Math.sin(Math.PI / 3));
  });
});

describe("distribuição automática", () => {
  it("telhado 4 × 12 m em retrato usa as dimensões reais do módulo de 620 W", () => {
    const cena = cenaPorMedidas("telhado", { largura: 12, comprimento: 4 }, specs[MOD_620]);
    const sup = cena.superficies[0];
    expect(sup.largura).toBe(12);
    expect(sup.comprimento).toBe(4);
    const r = distribuir(cena, sup.id, specs);
    // Área útil 11,40 × 3,40 m; módulo 1,134 × 2,382 m com 2 cm de espaçamento → 9 × 1
    expect(r.quantidade).toBe(9);
    expect(validarCena(r.cena, specs).problemas).toEqual([]);
  });

  it("paisagem muda a quantidade e a troca de modelo exige nova conferência", () => {
    let cena = cenaPorMedidas("telhado", { largura: 12, comprimento: 4 }, specs[MOD_620]);
    const id = cena.superficies[0].id;
    cena.superficies[0].layout.orientacao = "paisagem";
    const r = distribuir(cena, id, specs);
    // 11,40 / (2,382 + 0,02) = 4 colunas; 3,40 / (1,134 + 0,02) = 2 linhas
    expect(r.quantidade).toBe(8);

    // Módulo de 650 W é mais largo (1,303 m): os mesmos centros passam a se sobrepor.
    cena = distribuir(cenaPorMedidas("telhado", { largura: 12, comprimento: 4 }, specs[MOD_620]), id, specs).cena;
    const base = cenaPorMedidas("telhado", { largura: 12, comprimento: 4 }, specs[MOD_620]);
    const dist = distribuir(base, base.superficies[0].id, specs).cena;
    const trocado = trocarModelo(dist, base.superficies[0].id, MOD_650);
    const v = validarCena(trocado, specs);
    expect(v.problemas.some((p) => p.tipo === "sobreposicao")).toBe(true);
    const refeito = distribuir(trocado, base.superficies[0].id, specs);
    expect(refeito.quantidade).toBe(8); // 11,40 / (1,303 + 0,02)
    expect(validarCena(refeito.cena, specs).erros).toBe(0);
  });

  it("desvia de obstáculos respeitando a folga", () => {
    const cena = cenaPorMedidas("telhado", { largura: 12, comprimento: 4 }, specs[MOD_620]);
    const sup = cena.superficies[0];
    cena.obstaculos.push(novoObstaculo("caixa_dagua", sup.id, 6, 2, { largura: 1, comprimento: 1 }));
    const r = distribuir(cena, sup.id, specs);
    expect(r.quantidade).toBeLessThan(9);
    expect(validarCena(r.cena, specs).problemas).toEqual([]);
  });

  it("sinaliza peças fora da área, sobrepostas e sobre obstáculos", () => {
    const base = cenaPorMedidas("telhado", { largura: 12, comprimento: 4 }, specs[MOD_620]);
    const sup = base.superficies[0];
    let cena = distribuir(base, sup.id, specs).cena;
    const [a, b, c] = cena.modulos;
    cena = moverModulos(cena, [a.id], -0.6, 0); // invade o afastamento da borda
    cena = moverModulos(cena, [c.id], -0.5, 0); // sobrepõe o vizinho b
    const v = validarCena(cena, specs);
    expect(v.porModulo[a.id].map((p) => p.tipo)).toContain("fora_area");
    expect(v.porModulo[b.id].map((p) => p.tipo)).toContain("sobreposicao");
    expect(v.porModulo[c.id].map((p) => p.tipo)).toContain("sobreposicao");

    const fora = moverModulos(cena, [a.id], -2, 0);
    expect(validarCena(fora, specs).porModulo[a.id].map((p) => p.tipo)).toContain("fora_cobertura");

    const comObstaculo = { ...cena, obstaculos: [novoObstaculo("chamine", sup.id, cena.modulos[5].u, cena.modulos[5].v)] };
    expect(validarCena(comObstaculo, specs).porModulo[cena.modulos[5].id].map((p) => p.tipo)).toContain("obstaculo");
  });

  it("opera módulos individualmente e por fileira", () => {
    const base = cenaPorMedidas("telhado", { largura: 12, comprimento: 8 }, specs[MOD_620]);
    const sup = base.superficies[0];
    let cena = distribuir(base, sup.id, specs).cena;
    const total = cena.modulos.length; // 9 × 3
    expect(total).toBe(27);
    const fileira = cena.modulos.filter((m) => m.fileira === cena.modulos[0].fileira).map((m) => m.id);
    expect(fileira).toHaveLength(9);

    cena = excluirModulos(cena, fileira);
    expect(cena.modulos).toHaveLength(18);
    cena = adicionarFileira(cena, sup.id, specs, 4);
    expect(cena.modulos).toHaveLength(22);

    const um = cena.modulos[0];
    const girado = girarModulos(cena, [um.id]);
    expect(girado.modulos.find((m) => m.id === um.id)!.rotacao).toBe(90);
    expect(girarModulos(girado, [um.id]).modulos.find((m) => m.id === um.id)!.rotacao).toBe(0);

    const dup = duplicarModulos(cena, [um.id], specs);
    expect(dup.novos).toHaveLength(1);
    expect(dup.cena.modulos).toHaveLength(23);
  });
});

describe("superfícies e modelos reutilizáveis", () => {
  it("redimensionar mantém proporções e a água oposta encosta na cumeeira", () => {
    const agua = novaAgua({ largura: 10, comprimento: 5, inclinacao: 20 });
    const cena = { ...cenaPorMedidas("telhado", {}, null), superficies: [agua] };
    const r = redimensionar(cena, agua.id, 12, 4);
    expect(r.superficies[0].contorno[2]).toEqual({ x: 12, y: 4 });
    const oposta = aguaOposta(agua, "Água 2");
    const cumeeiraA = paraPlanta(agua, 0, agua.comprimento);
    const cumeeiraB = paraPlanta(oposta, oposta.largura, oposta.comprimento);
    expect(cumeeiraB.x).toBeCloseTo(cumeeiraA.x, 2);
    expect(cumeeiraB.y).toBeCloseTo(cumeeiraA.y, 2);
  });

  it("um ajuste na cópia do modelo não altera o modelo nem o projeto de origem", () => {
    const { cena: origem } = montarMesaDemo(porCodigo, "concreto");
    const modelo = extrairModelo(origem, origem.superficies[0].id)!;
    expect(modelo.modulos).toHaveLength(20);
    const antes = JSON.stringify(modelo);
    const novo = inserirModelo(cenaPorMedidas("solo", { largura: 30, comprimento: 20 }, null), modelo, { x: 2, y: 2 });
    novo.superficies[0].inclinacao = 25;
    novo.modulos[0].u = 99;
    novo.componentes[0].comprimento = 99;
    expect(JSON.stringify(modelo)).toBe(antes);
    const idsModelo = new Set(modelo.modulos.map((m) => m.id));
    expect(novo.modulos.some((m) => idsModelo.has(m.id))).toBe(false);
    expect(clonarComNovosIds(modelo).superficies[0].id).not.toBe(modelo.superficies[0].id);
  });
});

describe("estrutura", () => {
  it("divide trilhos em barras com sobra", () => {
    expect(dividirEmBarras(10.566, 4.2)).toEqual([4.2, 4.2, 2.166]);
    expect(dividirEmBarras(3, 4.2)).toEqual([3]);
  });

  it("telhado: trilhos, emendas, grampos e fixações da fileira de 9 módulos", () => {
    const base = cenaPorMedidas("telhado", { largura: 12, comprimento: 4 }, specs[MOD_620]);
    const sup = base.superficies[0];
    const cena = gerarEstrutura(distribuir(base, sup.id, specs).cena, sup.id, specs, mapa).cena;
    const conta = (f: string) => cena.componentes.filter((c) => c.funcao === f).reduce((s, c) => s + c.quantidade, 0);
    // 9 × 1,134 + 8 × 0,02 + 2 × 0,10 de balanço = 10,566 m por trilho → 3 barras e 2 emendas
    expect(conta("trilho")).toBe(6);
    expect(conta("emenda")).toBe(4);
    expect(conta("grampo_final")).toBe(4);
    expect(conta("grampo_intermediario")).toBe(16);
    expect(conta("fixacao")).toBe(20);
    const metros = cena.componentes.filter((c) => c.funcao === "trilho").reduce((s, c) => s + c.comprimento, 0);
    expect(metros).toBeCloseTo(2 * 10.566, 2);
  });

  it("preserva peças editadas à mão ao gerar de novo", () => {
    const base = cenaPorMedidas("telhado", { largura: 12, comprimento: 4 }, specs[MOD_620]);
    const sup = base.superficies[0];
    let cena = gerarEstrutura(distribuir(base, sup.id, specs).cena, sup.id, specs, mapa).cena;
    const editada = { ...cena.componentes[0], comprimento: 1.23, manual: true };
    cena = { ...cena, componentes: [editada, ...cena.componentes.slice(1)] };
    const total = cena.componentes.length;
    cena = gerarEstrutura(cena, sup.id, specs, mapa).cena;
    expect(cena.componentes.find((c) => c.id === editada.id)?.comprimento).toBe(1.23);
    expect(cena.componentes).toHaveLength(total + 1);
  });

  it("solo: 20 módulos em duas fileiras de 10 com postes, vigas, terças e fundações", () => {
    const { cena, avisos } = montarMesaDemo(porCodigo, "concreto");
    expect(avisos).toEqual([]);
    expect(cena.modulos).toHaveLength(20);
    const mesa = cena.superficies[0];
    expect(mesa.largura).toBeCloseTo(11.52, 2); // 10 × 1,134 + 9 × 0,02
    expect(mesa.comprimento).toBeCloseTo(4.784, 3); // 2 × 2,382 + 0,02
    expect(new Set(cena.modulos.map((m) => m.fileira)).size).toBe(2);
    const conta = (f: string) => cena.componentes.filter((c) => c.funcao === f).reduce((s, c) => s + c.quantidade, 0);
    expect(conta("poste")).toBe(10);
    expect(conta("viga")).toBe(5);
    expect(conta("terca")).toBe(8);
    expect(conta("fundacao")).toBe(10);
    expect(conta("fixacao")).toBe(80);
    const postes = cena.componentes.filter((c) => c.funcao === "poste");
    expect(postes.every((p) => p.material === "concreto" && p.enterrado === 0.8)).toBe(true);
    // Postes traseiros mais altos que os dianteiros
    const alturas = [...new Set(postes.map((p) => p.altura))].sort((a, b) => a - b);
    expect(alturas).toHaveLength(2);
    expect(alturas[1]).toBeGreaterThan(alturas[0]);
    expect(validarCena(cena, specs).problemas).toEqual([]);

    const aroeira = montarMesaDemo(porCodigo, "aroeira").cena;
    const p = aroeira.componentes.find((c) => c.funcao === "poste")!;
    expect(p.material).toBe("aroeira");
    expect(p.forma).toBe("circular");
    expect(agruparComponentes(aroeira.componentes).some((g) => g.descricao.includes("Lasca de aroeira"))).toBe(true);
  });
});

describe("projetos de demonstração", () => {
  it("telhado 4 × 12 m completo", () => {
    const d = demoTelhado(porCodigo);
    const sup = d.projeto.cena.superficies[0];
    expect([sup.largura, sup.comprimento]).toEqual([12, 4]);
    expect(sup.cobertura).toEqual({ material: "fibrocimento", estrutura: "madeira" });
    expect(d.projeto.cena.modulos.length).toBeGreaterThanOrEqual(8);
    expect(validarCena(d.projeto.cena, specs).erros).toBe(0);
    expect(d.projeto.kit.inversores).toHaveLength(1);
    expect(d.orcamento.itens.length).toBeGreaterThan(8);
  });

  it("solo com 20 módulos", () => {
    const d = demoSolo(porCodigo);
    expect(d.projeto.cena.modulos).toHaveLength(20);
    expect(d.projeto.kit.modulos[0].quantidade).toBe(20);
    expect(d.orcamento.itens.some((i) => i.descricao.includes("Poste"))).toBe(true);
    expect(d.orcamento.itens.some((i) => i.descricao.includes("Terça"))).toBe(true);
    expect(d.orcamento.itens.some((i) => i.unidade === "m³")).toBe(true);
  });
});

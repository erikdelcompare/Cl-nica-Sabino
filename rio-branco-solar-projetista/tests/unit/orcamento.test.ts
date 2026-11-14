import { describe, expect, it } from "vitest";
import { demoSolo, demoTelhado } from "@/lib/demo/projetos";
import { excluirModulos } from "@/lib/dominio/distribuicao";
import { gerarEstrutura } from "@/lib/dominio/estrutura";
import { mapaDeModulos, potenciaInversoresKw, potenciaKwp, sincronizarKit, verificarEletrica } from "@/lib/dominio/kit";
import { calcularMateriais, GRUPOS, itemAvulso, sincronizarItens } from "@/lib/dominio/materiais";
import { calcularTotais, dadosPadrao, montarComercial, montarInterno, montarPublico } from "@/lib/dominio/orcamento";
import type { ItemOrcamento } from "@/lib/dominio/tipos";
import { catalogo, INV_SOFAR_5, mapa, MOD_620, MOD_650, specs } from "../apoio/catalogo";

const porCodigo = Object.fromEntries(catalogo.map((i) => [i.id, i]));

describe("kit", () => {
  it("soma potência dos módulos (kWp) e dos inversores (kW)", () => {
    const d = demoTelhado(porCodigo);
    const n = d.projeto.cena.modulos.length;
    expect(potenciaKwp(d.projeto.kit, mapa)).toBeCloseTo((n * 620) / 1000, 3);
    expect(potenciaInversoresKw(d.projeto.kit, mapa)).toBe(5);
    const solo = demoSolo(porCodigo);
    expect(potenciaKwp(solo.projeto.kit, mapa)).toBe(12.6);
    expect(potenciaInversoresKw(solo.projeto.kit, mapa)).toBe(10);
  });

  it("verificação elétrica confere tensão, MPPT e corrente com os dados das fichas", () => {
    const d = demoSolo(porCodigo);
    const conf = verificarEletrica(d.projeto.kit, mapa);
    const calculadas = conf.filter((c) => c.calculado);
    expect(calculadas.every((c) => c.status === "ok")).toBe(true);
    // Itens manuais ficam indicados como ainda não validados.
    const manuais = conf.filter((c) => !c.calculado);
    expect(manuais.length).toBeGreaterThanOrEqual(4);
    expect(manuais.every((c) => c.status === "manual" && !c.validado)).toBe(true);
  });

  it("aponta string longa demais e corrente acima do MPPT", () => {
    const d = demoSolo(porCodigo);
    const kit = structuredClone(d.projeto.kit);
    kit.verificacao.arranjos = [{ ...kit.verificacao.arranjos[0], modulosPorString: 14 }];
    const longa = verificarEletrica(kit, mapa);
    expect(longa.find((c) => c.id.endsWith("-voc"))?.status).toBe("erro"); // 14 × 48,9 V > 600 V
    expect(longa.find((c) => c.id === "arranjos")?.status).toBe("erro");

    // Módulo de 650 W (Imp 17,16 A) em MPPT de 15 A do Sofar: atenção.
    const kit2 = structuredClone(d.projeto.kit);
    kit2.verificacao.arranjos = [{ id: "x", inversorId: INV_SOFAR_5, moduloId: MOD_650, mppt: 1, strings: 1, modulosPorString: 8 }];
    expect(verificarEletrica(kit2, mapa).find((c) => c.id.endsWith("-corrente"))?.status).toBe("atencao");
  });

  it("marca validações manuais", () => {
    const d = demoTelhado(porCodigo);
    const kit = structuredClone(d.projeto.kit);
    kit.verificacao.validados.rede = true;
    const conf = verificarEletrica(kit, mapa);
    expect(conf.find((c) => c.id === "rede")?.validado).toBe(true);
    expect(conf.find((c) => c.id === "cabos")?.validado).toBe(false);
  });
});

describe("lista de materiais", () => {
  it("agrupa por material, perfil e dimensão", () => {
    const d = demoTelhado(porCodigo);
    const linhas = calcularMateriais(d.projeto.cena, d.projeto.kit, mapa);
    const trilhos = linhas.filter((l) => l.descricao.startsWith("Trilho"));
    // Barras inteiras de 4,20 m e sobras agrupadas por comprimento
    expect(trilhos.find((l) => l.descricao.includes("4,20 m"))).toBeTruthy();
    expect(new Set(linhas.map((l) => l.chave)).size).toBe(linhas.length);
    const modulos = linhas.find((l) => l.grupo === GRUPOS.modulos)!;
    expect(modulos.quantidade).toBe(d.projeto.cena.modulos.length);
    expect(modulos.descricao).toContain("620 Wp");
    // Preço por metro × comprimento da barra (R$ 39,00/m × 4,20 m)
    expect(trilhos.find((l) => l.descricao.includes("4,20 m"))!.precoUnit).toBe(16380);
  });

  it("solo inclui postes, vigas, terças e concreto das fundações", () => {
    const d = demoSolo(porCodigo);
    const linhas = calcularMateriais(d.projeto.cena, d.projeto.kit, mapa);
    const achar = (t: string) => linhas.find((l) => l.descricao.includes(t));
    expect(achar("Poste de concreto")).toBeTruthy();
    expect(achar("Viga perfil U")!.quantidade).toBe(5);
    expect(achar("Terça perfil U")!.quantidade).toBe(8);
    expect(achar("Terça perfil U")!.descricao).toContain("#2,00 mm");
    // 10 fundações Ø 0,30 × 0,80 m = 0,565 m³ → arredonda para cima em centésimos
    expect(achar("Concreto")!.quantidade).toBe(0.57);
    expect(achar("Concreto")!.unidade).toBe("m³");
  });

  it("recalcular destaca mudanças, preserva avulsos e mantém preços manuais", () => {
    const d = demoTelhado(porCodigo);
    const sup = d.projeto.cena.superficies[0];
    let itens: ItemOrcamento[] = d.orcamento.itens.map((i) => ({ ...i }));
    const avulso = itemAvulso(GRUPOS.eletrica, { descricao: "Eletroduto 3/4\"", quantidade: 12, unidade: "m", preco_unit: 950 });
    itens.push(avulso);
    const idxModulo = itens.findIndex((i) => i.grupo === GRUPOS.modulos);
    itens[idxModulo] = { ...itens[idxModulo], preco_unit: 71111, preco_manual: true };
    const idxGrampo = itens.findIndex((i) => i.descricao.includes("Grampo intermediário"));
    const precoGrampoAntes = itens[idxGrampo].preco_unit;
    const qtdAntes = itens[idxModulo].quantidade;

    // Remove dois módulos, regenera a estrutura e atualiza o catálogo do grampo.
    let cena = excluirModulos(d.projeto.cena, d.projeto.cena.modulos.slice(0, 2).map((m) => m.id));
    cena = gerarEstrutura(cena, sup.id, mapaDeModulos(catalogo), mapa).cena;
    const kit = sincronizarKit(d.projeto.kit, cena);
    const catalogoNovo = { ...mapa, "fix-grampo-intermediario": { ...mapa["fix-grampo-intermediario"], preco_centavos: 1234 } };
    const r = sincronizarItens(itens, calcularMateriais(cena, kit, catalogoNovo));
    itens = r.itens;

    const modulo = itens.find((i) => i.grupo === GRUPOS.modulos)!;
    expect(modulo.quantidade).toBe(qtdAntes - 2);
    expect(modulo.quantidade_anterior).toBe(qtdAntes); // destaque da quantidade que mudou
    expect(modulo.preco_unit).toBe(71111); // preço manual mantido
    expect(modulo.preco_manual).toBe(true);
    expect(r.resumo.alterados.some((a) => a.descricao.includes("620 Wp"))).toBe(true);
    expect(r.resumo.precosManuaisMantidos).toBeGreaterThanOrEqual(1);

    const grampo = itens.find((i) => i.descricao.includes("Grampo intermediário"))!;
    expect(precoGrampoAntes).toBe(950);
    expect(grampo.preco_unit).toBe(1234); // preço não manual acompanha o catálogo

    const mantido = itens.find((i) => i.id === avulso.id)!;
    expect(mantido).toMatchObject({ descricao: "Eletroduto 3/4\"", quantidade: 12, preco_unit: 950 });
    expect(itens.filter((i) => i.origem === "manual" || i.origem === "servico")).toHaveLength(
      d.orcamento.itens.filter((i) => i.origem === "manual" || i.origem === "servico").length + 1,
    );
    // Recalcular sem mudanças limpa os destaques.
    const de_novo = sincronizarItens(itens, calcularMateriais(cena, kit, catalogoNovo));
    expect(de_novo.resumo.alterados).toEqual([]);
    expect(de_novo.itens.every((i) => i.quantidade_anterior === null)).toBe(true);
  });
});

describe("totais e versões publicadas", () => {
  it("calcula custo, preço final e margem em centavos", () => {
    const dados = { ...dadosPadrao("Teste"), mao_de_obra_custo: 10000, mao_de_obra_preco: 25000, frete_custo: 5000, frete_preco: 5000, desconto: 3000 };
    const itens = [
      itemAvulso("A", { quantidade: 3, custo_unit: 1000, preco_unit: 1999 }),
      itemAvulso("B", { quantidade: 2.5, custo_unit: 333, preco_unit: 777 }),
    ];
    const t = calcularTotais(dados, itens);
    expect(t.custoItens).toBe(3000 + 833); // 2,5 × 3,33 = 8,325 → 8,33
    expect(t.precoItens).toBe(5997 + 1943); // 2,5 × 7,77 = 19,425 → 19,43
    expect(t.custoTotal).toBe(3833 + 15000);
    expect(t.subtotal).toBe(7940 + 30000);
    expect(t.total).toBe(34940);
    expect(t.margem).toBe(34940 - 18833);
    expect(t.margemPct).toBe(46.1);
  });

  it.each(["total", "grupos", "itens"] as const)("modo %s: as linhas fecham com o total e nunca levam custos", (modo) => {
    const d = demoTelhado(porCodigo);
    const dados = { ...d.orcamento.dados, exibicao: { modo } };
    const comercial = montarComercial(dados, d.orcamento.itens);
    const t = calcularTotais(dados, d.orcamento.itens);
    expect(comercial.total).toBe(t.total);
    expect(comercial.desconto).toBe(30000);
    if (modo === "total") expect(comercial.linhas).toEqual([]);
    else expect(comercial.linhas.reduce((s, l) => s + l.total, 0)).toBe(t.subtotal);
    if (modo === "itens") {
      expect(comercial.linhas.some((l) => l.precoUnit !== null)).toBe(true);
      expect(comercial.linhas.at(-1)!.descricao).toBe("Demais itens e serviços");
    }
    const texto = JSON.stringify(comercial);
    expect(texto).not.toContain("custo");
    expect(texto).not.toContain("margem");
    expect(comercial.condicoes.aVista?.valor).toBe(t.total);
    expect(comercial.condicoes.cartao?.opcoes).toHaveLength(2);
  });

  it("a parte pública da proposta não contém nenhum valor", () => {
    const d = demoTelhado(porCodigo);
    const publico = montarPublico({
      empresa: { nome: "Rio Branco Solar", contato: "", cidade: "Rio Branco - AC" },
      cliente: { nome: d.cliente.nome, cidade: d.cliente.cidade },
      projeto: { nome: d.projeto.nome, tipo: "telhado", local: d.local.nome },
      titulo: d.orcamento.dados.titulo,
      cena: d.projeto.cena,
      kit: d.projeto.kit,
      catalogo: mapa,
      modulos: specs,
      itens: d.orcamento.itens,
      temCapa: false,
    });
    const texto = JSON.stringify(publico);
    for (const proibido of ["preco", "custo", "centavos", "margem", "desconto", "parcela", "valorParcela"]) {
      expect(texto.toLowerCase()).not.toContain(proibido.toLowerCase());
    }
    expect(publico.kit.equipamentos.map((e) => e.tipo)).toEqual(["modulo", "inversor"]);
    expect(publico.kit.potenciaKwp).toBeCloseTo(d.projeto.cena.modulos.length * 0.62, 3);
    expect(Object.keys(publico.modulos)).toEqual([MOD_620]);
    expect(publico.materiais.length).toBeGreaterThan(5);
    expect(publico.materiais.some((m) => m.grupo === GRUPOS.servicos)).toBe(false);
    // Itens não autorizados ficam de fora.
    const semTrilho = montarPublico({
      empresa: publico.empresa,
      cliente: publico.cliente,
      projeto: publico.projeto,
      titulo: "x",
      cena: d.projeto.cena,
      kit: d.projeto.kit,
      catalogo: mapa,
      modulos: specs,
      itens: d.orcamento.itens.map((i) => (i.descricao.startsWith("Trilho") ? { ...i, mostrar_descricao: false } : i)),
      temCapa: false,
    });
    expect(semTrilho.materiais.some((m) => m.descricao.startsWith("Trilho"))).toBe(false);
  });

  it("a parte interna guarda custos, margem e os itens do catálogo daquele momento", () => {
    const d = demoSolo(porCodigo);
    const interno = montarInterno(d.orcamento.dados, d.orcamento.itens, d.projeto.kit, mapa);
    expect(interno.totais.custoTotal).toBeGreaterThan(0);
    expect(interno.totais.margem).toBe(interno.totais.total - interno.totais.custoTotal);
    expect(interno.catalogo.some((c) => c.modelo === "ASW10000-S")).toBe(true);
  });
});

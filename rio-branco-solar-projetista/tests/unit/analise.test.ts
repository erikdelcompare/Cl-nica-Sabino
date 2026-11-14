import { describe, expect, it } from "vitest";
import { aplicarAnalise, cenaPorMedidas, extrairJson, gerarPromptChatGPT, lerAnalise } from "@/lib/dominio/analise";
import { distribuir } from "@/lib/dominio/distribuicao";
import { validarCena } from "@/lib/dominio/validacao";
import { MOD_620, specs } from "../apoio/catalogo";

const RESPOSTA = {
  versao: 1,
  tipo_local: "telhado",
  cobertura: { material: "fibrocimento", estrutura: "madeira" },
  aguas: [{ nome: "Água principal", largura_m: 10.2, comprimento_m: 3.6, inclinacao_graus: 12, confianca: 0.5 }],
  terreno: null,
  obstaculos: [
    { tipo: "caixa_dagua", nome: "Caixa d'água", agua: 0, posicao_x: 0.9, posicao_y: 0.75, largura_m: 1.2, comprimento_m: 1.2, altura_m: 0.9, confianca: 0.6 },
  ],
  elementos_visiveis: ["telhas de fibrocimento", "caixa d'água"],
  observacoes: "Inclinação estimada.",
};

describe("importação de análise (ChatGPT / Gemini)", () => {
  it("o prompt leva as medidas cadastradas e o formato esperado", () => {
    const prompt = gerarPromptChatGPT("telhado", { largura: 12, comprimento: 4, inclinacao: 10 });
    expect(prompt).toContain("largura: 12 m");
    expect(prompt).toContain("comprimento: 4 m");
    expect(prompt).toContain("inclinação: 10°");
    expect(prompt).toContain('"tipo_local"');
    expect(prompt).toContain("SOMENTE com um objeto JSON");
  });

  it("aceita JSON com cerca de código e texto em volta", () => {
    const texto = "Claro! Segue a análise:\n```json\n" + JSON.stringify(RESPOSTA, null, 2) + "\n```\nQualquer dúvida, avise.";
    const r = lerAnalise(texto);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.analise.obstaculos[0].tipo).toBe("caixa_dagua");
    expect(extrairJson('prefixo {"a": "tem } chave", "b": {"c": 1}} sufixo')).toEqual({ a: "tem } chave", b: { c: 1 } });
  });

  it("recusa formato inválido com mensagens claras", () => {
    expect(lerAnalise("sem json aqui")).toEqual({ ok: false, erros: ["Não encontrei um objeto JSON na resposta."] });
    const ruim = lerAnalise({ ...RESPOSTA, tipo_local: "piscina", aguas: [{ largura_m: -3 }] });
    expect(ruim.ok).toBe(false);
    if (!ruim.ok) {
      expect(ruim.erros.some((e) => e.startsWith("tipo do local"))).toBe(true);
      expect(ruim.erros.some((e) => e.startsWith("águas › item 1"))).toBe(true);
    }
    expect(lerAnalise('{"tipo_local": "telhado", ').ok).toBe(false);
    const fora = lerAnalise({ ...RESPOSTA, obstaculos: [{ ...RESPOSTA.obstaculos[0], posicao_x: 1.7 }] });
    expect(fora.ok).toBe(false);
  });

  it("as dimensões informadas têm prioridade sobre a foto (4 × 12 m)", () => {
    const lido = lerAnalise(RESPOSTA);
    if (!lido.ok) throw new Error("análise inválida");
    const { cena, pendencias } = aplicarAnalise(lido.analise, { largura: 12, comprimento: 4 }, "telhado", specs[MOD_620]);
    const sup = cena.superficies[0];
    expect([sup.largura, sup.comprimento]).toEqual([12, 4]); // informado vence 10,2 × 3,6 da foto
    expect(sup.inclinacao).toBe(12); // não informado → vem da foto
    expect(sup.cobertura).toEqual({ material: "fibrocimento", estrutura: "madeira" });

    const p = (rotulo: string) => pendencias.find((x) => x.rotulo.includes(rotulo))!;
    expect(p("largura")).toMatchObject({ origem: "informado", confirmado: true, valor: "12 m" });
    expect(p("inclinação")).toMatchObject({ origem: "foto", confirmado: false });
    expect(p("Altura do beiral")).toMatchObject({ origem: "padrao", confirmado: false });

    // Obstáculo posicionado por fração sobre as dimensões reais e ajustável depois.
    const caixa = cena.obstaculos[0];
    expect(caixa.superficieId).toBe(sup.id);
    expect(caixa.u).toBeCloseTo(10.8, 5);
    expect(caixa.v).toBeCloseTo(3, 5);
    expect(pendencias.some((x) => x.rotulo === "Caixa d'água" && x.origem === "foto")).toBe(true);

    // O rascunho já pode receber módulos e respeita o obstáculo.
    const dist = distribuir(cena, sup.id, specs);
    expect(dist.quantidade).toBeGreaterThan(0);
    expect(validarCena(dist.cena, specs).erros).toBe(0);
  });

  it("o caminho manual produz o mesmo formato, sem IA", () => {
    const manual = cenaPorMedidas("telhado", { largura: 12, comprimento: 4, inclinacao: 15, altura: 2.8 }, specs[MOD_620]);
    expect(manual.superficies[0]).toMatchObject({ largura: 12, comprimento: 4, inclinacao: 15, alturaBase: 2.8 });
    expect(manual.pendencias.filter((p) => p.origem === "foto")).toHaveLength(0);
    const solo = cenaPorMedidas("solo", { largura: 30, comprimento: 15 }, specs[MOD_620]);
    expect(solo.terreno.contorno[2]).toEqual({ x: 30, y: 15 });
    expect(solo.superficies[0].classe).toBe("mesa");
  });

  it("duas águas ficam encostadas na cumeeira", () => {
    const lido = lerAnalise({ ...RESPOSTA, aguas: [RESPOSTA.aguas[0], { nome: "Água dos fundos", largura_m: 10, comprimento_m: 3.6, inclinacao_graus: 12, confianca: 0.4 }] });
    if (!lido.ok) throw new Error(lido.erros.join());
    const { cena } = aplicarAnalise(lido.analise, {}, "telhado", null);
    expect(cena.superficies).toHaveLength(2);
    expect(cena.superficies[1].rotacao).toBe(180);
  });
});

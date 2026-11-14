import { describe, expect, it } from "vitest";
import { centavosParaCampo, formatarBRL, lerBRL, lerNumero, totalLinha } from "@/lib/dominio/dinheiro";

describe("dinheiro em centavos", () => {
  it("lê valores no formato brasileiro", () => {
    expect(lerBRL("1.234,56")).toBe(123456);
    expect(lerBRL("R$ 1.234,56")).toBe(123456);
    expect(lerBRL("1234,5")).toBe(123450);
    expect(lerBRL("1234")).toBe(123400);
    expect(lerBRL("0,01")).toBe(1);
    expect(lerBRL("1.234")).toBe(123400);
    expect(lerBRL("12.5")).toBe(1250);
    expect(lerBRL("-10,00")).toBe(-1000);
  });

  it("recusa texto inválido", () => {
    expect(lerBRL("")).toBeNull();
    expect(lerBRL("abc")).toBeNull();
    expect(lerBRL("1,2,3")).toBeNull();
  });

  it("arredonda o terceiro decimal", () => {
    expect(lerBRL("10,005")).toBe(1001);
    expect(lerBRL("10,004")).toBe(1000);
  });

  it("formata em reais", () => {
    expect(formatarBRL(123456)).toBe("R$ 1.234,56");
    expect(formatarBRL(5)).toBe("R$ 0,05");
    expect(centavosParaCampo(123456)).toBe("1234,56");
    expect(centavosParaCampo(7)).toBe("0,07");
  });

  it("multiplica quantidade por preço sem erro de ponto flutuante", () => {
    expect(totalLinha(3, 1999)).toBe(5997);
    expect(totalLinha(0.1, 30)).toBe(3);
    expect(totalLinha(2.166, 3900)).toBe(8447);
    expect(totalLinha(1.005, 100)).toBe(101); // 100,5 → arredonda para cima
    // 0,1 + 0,2 não pode virar 0,30000000000000004
    expect(totalLinha(0.1 + 0.2, 1000)).toBe(300);
  });

  it("ida e volta preserva os centavos", () => {
    for (const c of [0, 1, 99, 100, 123456, 99999999, 1234567891]) {
      expect(lerBRL(centavosParaCampo(c))).toBe(c);
      expect(lerBRL(formatarBRL(c))).toBe(c);
    }
  });

  it("lê números com vírgula", () => {
    expect(lerNumero("4,5")).toBe(4.5);
    expect(lerNumero("12")).toBe(12);
    expect(lerNumero("1.234,5")).toBe(1234.5);
    expect(lerNumero("x")).toBeNull();
  });
});

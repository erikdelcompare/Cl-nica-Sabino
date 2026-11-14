import { z } from "zod";
import { aguaOposta, cenaVazia, novaAgua, novaMesa, novoObstaculo } from "./cena";
import { arred, novoId, retangulo } from "./geometria";
import type { Cena, EspecModulo, Medidas, OrigemDado, Pendencia, TipoObstaculo, TipoProjeto } from "./tipos";

// Formato único produzido pelas duas opções de IA (Gemini e ChatGPT) e pelo editor manual.

const numero = z.number().finite();
const positivo = numero.positive().max(500);
const confianca = numero.min(0).max(1).nullish();

export const esquemaAnalise = z.object({
  versao: z.literal(1).default(1),
  tipo_local: z.enum(["telhado", "solo"]),
  cobertura: z
    .object({
      material: z.enum(["fibrocimento", "ceramica", "metalica", "laje", "outro"]),
      estrutura: z.enum(["madeira", "metalica", "concreto", "desconhecida"]).default("desconhecida"),
    })
    .nullish(),
  aguas: z
    .array(
      z.object({
        nome: z.string().max(60).nullish(),
        largura_m: positivo.nullish(),
        comprimento_m: positivo.nullish(),
        inclinacao_graus: numero.min(0).max(60).nullish(),
        confianca,
      }),
    )
    .max(8)
    .default([]),
  terreno: z
    .object({
      largura_m: positivo.nullish(),
      comprimento_m: positivo.nullish(),
      desnivel_m: numero.min(0).max(50).nullish(),
    })
    .nullish(),
  obstaculos: z
    .array(
      z.object({
        tipo: z.enum(["caixa_dagua", "chamine", "claraboia", "antena", "arvore", "construcao", "outro"]),
        nome: z.string().max(60).nullish(),
        /** Índice da água em que está; null = no terreno. */
        agua: z.number().int().min(0).max(7).nullish(),
        /** Posição do centro como fração da largura e do comprimento (0 a 1). */
        posicao_x: numero.min(0).max(1),
        posicao_y: numero.min(0).max(1),
        largura_m: positivo.nullish(),
        comprimento_m: positivo.nullish(),
        altura_m: numero.min(0).max(50).nullish(),
        confianca,
      }),
    )
    .max(30)
    .default([]),
  elementos_visiveis: z.array(z.string().max(120)).max(30).default([]),
  observacoes: z.string().max(2000).nullish(),
});

export type AnaliseLocal = z.infer<typeof esquemaAnalise>;

/** JSON Schema enviado ao Gemini (saída estruturada). Mesmo formato do esquema acima. */
export const esquemaJsonAnalise = {
  type: "object",
  properties: {
    versao: { type: "integer", description: "Sempre 1." },
    tipo_local: { type: "string", enum: ["telhado", "solo"] },
    cobertura: {
      type: ["object", "null"],
      properties: {
        material: { type: "string", enum: ["fibrocimento", "ceramica", "metalica", "laje", "outro"] },
        estrutura: { type: "string", enum: ["madeira", "metalica", "concreto", "desconhecida"] },
      },
      required: ["material", "estrutura"],
    },
    aguas: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          nome: { type: ["string", "null"] },
          largura_m: { type: ["number", "null"], description: "Ao longo do beiral." },
          comprimento_m: { type: ["number", "null"], description: "Do beiral à cumeeira, sobre a telha." },
          inclinacao_graus: { type: ["number", "null"] },
          confianca: { type: ["number", "null"], description: "0 a 1." },
        },
        required: ["nome", "largura_m", "comprimento_m", "inclinacao_graus", "confianca"],
      },
    },
    terreno: {
      type: ["object", "null"],
      properties: {
        largura_m: { type: ["number", "null"] },
        comprimento_m: { type: ["number", "null"] },
        desnivel_m: { type: ["number", "null"] },
      },
      required: ["largura_m", "comprimento_m", "desnivel_m"],
    },
    obstaculos: {
      type: "array",
      maxItems: 30,
      items: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["caixa_dagua", "chamine", "claraboia", "antena", "arvore", "construcao", "outro"] },
          nome: { type: ["string", "null"] },
          agua: { type: ["integer", "null"], description: "Índice da água (começa em 0); null se estiver no terreno." },
          posicao_x: { type: "number", description: "Centro, fração da largura (0 = esquerda, 1 = direita)." },
          posicao_y: { type: "number", description: "Centro, fração do comprimento (0 = beiral/frente, 1 = cumeeira/fundo)." },
          largura_m: { type: ["number", "null"] },
          comprimento_m: { type: ["number", "null"] },
          altura_m: { type: ["number", "null"] },
          confianca: { type: ["number", "null"] },
        },
        required: ["tipo", "nome", "agua", "posicao_x", "posicao_y", "largura_m", "comprimento_m", "altura_m", "confianca"],
      },
    },
    elementos_visiveis: { type: "array", maxItems: 30, items: { type: "string" } },
    observacoes: { type: ["string", "null"] },
  },
  required: ["versao", "tipo_local", "cobertura", "aguas", "terreno", "obstaculos", "elementos_visiveis", "observacoes"],
} as const;

const EXEMPLO_JSON = `{
  "versao": 1,
  "tipo_local": "telhado",
  "cobertura": { "material": "fibrocimento", "estrutura": "madeira" },
  "aguas": [
    { "nome": "Água principal", "largura_m": 12, "comprimento_m": 4, "inclinacao_graus": 10, "confianca": 0.6 }
  ],
  "terreno": null,
  "obstaculos": [
    { "tipo": "caixa_dagua", "nome": "Caixa d'água", "agua": 0, "posicao_x": 0.85, "posicao_y": 0.7,
      "largura_m": 1.2, "comprimento_m": 1.2, "altura_m": 0.9, "confianca": 0.5 }
  ],
  "elementos_visiveis": ["telhas de fibrocimento", "caixa d'água", "poste próximo ao beiral"],
  "observacoes": "Inclinação estimada visualmente."
}`;

const n = (v: number) => String(arred(v, 2)).replace(".", ",");

export function descreverMedidas(m: Medidas): string[] {
  const linhas: string[] = [];
  if (m.largura) linhas.push(`largura: ${n(m.largura)} m`);
  if (m.comprimento) linhas.push(`comprimento: ${n(m.comprimento)} m`);
  if (m.altura) linhas.push(`altura: ${n(m.altura)} m`);
  if (m.desnivel) linhas.push(`desnível: ${n(m.desnivel)} m`);
  if (m.inclinacao) linhas.push(`inclinação: ${n(m.inclinacao)}°`);
  if (m.observacoes) linhas.push(`observações: ${m.observacoes}`);
  return linhas;
}

/** Instruções comuns às duas IAs. */
export function instrucoesAnalise(tipo: TipoProjeto, medidas: Medidas): string {
  const conhecidas = descreverMedidas(medidas);
  return [
    "Você é um assistente de pré-projeto fotovoltaico. Analise a(s) foto(s) anexada(s) do local de instalação " +
      `(${tipo === "telhado" ? "telhado" : "terreno para estrutura de solo"}) e descreva o que é visível para montar um rascunho 2D/3D editável.`,
    "",
    conhecidas.length > 0
      ? `Medidas já conhecidas e confirmadas pelo responsável (use exatamente estes valores, não estime outros):\n- ${conhecidas.join("\n- ")}`
      : "Nenhuma medida foi informada: estime as dimensões pela foto e indique baixa confiança.",
    "",
    "Regras:",
    "1. Responda SOMENTE com um objeto JSON válido, sem texto antes ou depois e sem bloco de código.",
    "2. Use metros e graus. Use ponto como separador decimal.",
    "3. Em \"aguas\", liste cada plano de telhado visível (largura ao longo do beiral; comprimento do beiral à cumeeira). Para terreno, deixe \"aguas\": [] e preencha \"terreno\".",
    "4. Em \"obstaculos\", informe a posição do centro como fração de 0 a 1 da largura (posicao_x) e do comprimento (posicao_y) da água ou do terreno.",
    "5. \"confianca\" vai de 0 a 1. Use null quando não conseguir estimar um valor.",
    "6. Não invente elementos que não aparecem na foto.",
    "",
    "Formato esperado (exemplo):",
    EXEMPLO_JSON,
  ].join("\n");
}

/** Prompt para colar no ChatGPT junto com a foto. */
export function gerarPromptChatGPT(tipo: TipoProjeto, medidas: Medidas): string {
  return instrucoesAnalise(tipo, medidas);
}

/** Extrai o primeiro objeto JSON de uma resposta colada (aceita cercas de código e texto em volta). */
export function extrairJson(texto: string): unknown {
  const limpo = texto.replace(/```(?:json)?/gi, "").trim();
  const inicio = limpo.indexOf("{");
  if (inicio === -1) throw new Error("Não encontrei um objeto JSON na resposta.");
  let nivel = 0;
  let emTexto = false;
  let escape = false;
  for (let i = inicio; i < limpo.length; i++) {
    const ch = limpo[i];
    if (emTexto) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') emTexto = false;
      continue;
    }
    if (ch === '"') emTexto = true;
    else if (ch === "{") nivel++;
    else if (ch === "}") {
      nivel--;
      if (nivel === 0) {
        const trecho = limpo.slice(inicio, i + 1);
        try {
          return JSON.parse(trecho);
        } catch {
          throw new Error("O JSON da resposta está malformado. Peça ao ChatGPT para reenviar somente o JSON.");
        }
      }
    }
  }
  throw new Error("O JSON da resposta está incompleto (faltou fechar chaves).");
}

export type ResultadoLeitura =
  | { ok: true; analise: AnaliseLocal }
  | { ok: false; erros: string[] };

const CAMPOS: Record<string, string> = {
  tipo_local: "tipo do local",
  aguas: "águas",
  obstaculos: "obstáculos",
  terreno: "terreno",
  cobertura: "cobertura",
};

/** Valida o formato da análise (objeto já convertido ou texto colado). */
export function lerAnalise(entrada: unknown): ResultadoLeitura {
  let dado = entrada;
  if (typeof entrada === "string") {
    try {
      dado = extrairJson(entrada);
    } catch (e) {
      return { ok: false, erros: [(e as Error).message] };
    }
  }
  const r = esquemaAnalise.safeParse(dado);
  if (r.success) return { ok: true, analise: r.data };
  const erros = r.error.issues.slice(0, 8).map((i) => {
    const caminho = i.path.map((p) => (typeof p === "number" ? `item ${p + 1}` : (CAMPOS[String(p)] ?? String(p)))).join(" › ");
    return `${caminho || "resposta"}: ${i.message}`;
  });
  return { ok: false, erros };
}

export function analiseVazia(tipo: TipoProjeto): AnaliseLocal {
  return {
    versao: 1,
    tipo_local: tipo,
    cobertura: null,
    aguas: [],
    terreno: null,
    obstaculos: [],
    elementos_visiveis: [],
    observacoes: null,
  };
}

interface Escolha {
  valor: number;
  origem: OrigemDado;
}

/** Medida informada tem prioridade; depois a foto; por último um valor padrão. */
function escolher(informado: number | null | undefined, foto: number | null | undefined, padrao: number): Escolha {
  if (informado != null && informado > 0) return { valor: informado, origem: "informado" };
  if (foto != null && foto > 0) return { valor: foto, origem: "foto" };
  return { valor: padrao, origem: "padrao" };
}

const MATERIAL: Record<string, string> = {
  fibrocimento: "Fibrocimento",
  ceramica: "Cerâmica",
  metalica: "Metálica",
  laje: "Laje",
  outro: "Outro",
};

export interface ResultadoAplicacao {
  cena: Cena;
  /** O que veio da foto, o que foi informado e o que ainda precisa de confirmação. */
  pendencias: Pendencia[];
}

/**
 * Transforma a análise em um modelo 2D/3D editável.
 * As dimensões informadas pelo proprietário sempre prevalecem sobre a IA.
 */
export function aplicarAnalise(
  analise: AnaliseLocal,
  medidas: Medidas,
  tipo: TipoProjeto,
  moduloPadrao?: EspecModulo | null,
): ResultadoAplicacao {
  const cena = cenaVazia(tipo);
  const pendencias: Pendencia[] = [];
  const pend = (rotulo: string, valor: string, origem: OrigemDado) =>
    pendencias.push({ id: novoId("p"), rotulo, valor, origem, confirmado: origem === "informado" });

  if (analise.tipo_local !== tipo) {
    pend(
      "Tipo do local",
      `A foto parece ser de ${analise.tipo_local === "telhado" ? "telhado" : "terreno"}, mas o projeto é de ${tipo}.`,
      "foto",
    );
  }

  if (tipo === "telhado") {
    const aguas = analise.aguas.length > 0 ? analise.aguas : [{ nome: null, largura_m: null, comprimento_m: null, inclinacao_graus: null, confianca: null }];
    const altura = escolher(medidas.altura, null, 3);
    aguas.forEach((a, i) => {
      // As medidas informadas valem para a água principal.
      const principal = i === 0;
      const largura = escolher(principal ? medidas.largura : null, a.largura_m, 8);
      const comprimento = escolher(principal ? medidas.comprimento : null, a.comprimento_m, 4);
      const inclinacao = escolher(medidas.inclinacao, a.inclinacao_graus, 10);
      const nome = a.nome?.trim() || `Água ${i + 1}`;
      let sup = novaAgua({
        nome,
        largura: arred(largura.valor),
        comprimento: arred(comprimento.valor),
        inclinacao: arred(inclinacao.valor, 1),
        alturaBase: arred(altura.valor),
        material: analise.cobertura?.material ?? "fibrocimento",
        estrutura: analise.cobertura?.estrutura === "desconhecida" || !analise.cobertura ? "madeira" : analise.cobertura.estrutura,
        moduloId: moduloPadrao?.id ?? null,
      });
      if (i === 1 && cena.superficies[0]) {
        // Segunda água: encostada na cumeeira da primeira.
        const oposta = aguaOposta({ ...cena.superficies[0], comprimento: cena.superficies[0].comprimento }, nome);
        sup = { ...sup, origem: oposta.origem, rotacao: oposta.rotacao };
      } else if (i > 1) {
        const anterior = cena.superficies[i - 1];
        sup = { ...sup, origem: { x: arred(anterior.origem.x + anterior.largura + 1), y: 0 } };
      }
      cena.superficies.push(sup);
      pend(`${nome}: largura`, `${n(largura.valor)} m`, largura.origem);
      pend(`${nome}: comprimento`, `${n(comprimento.valor)} m`, comprimento.origem);
      pend(`${nome}: inclinação`, `${n(inclinacao.valor)}°`, inclinacao.origem);
    });
    pend("Altura do beiral", `${n(altura.valor)} m`, altura.origem);
    if (analise.cobertura) {
      pend("Tipo de cobertura", `${MATERIAL[analise.cobertura.material] ?? analise.cobertura.material} sobre estrutura ${analise.cobertura.estrutura}`, "foto");
    } else {
      pend("Tipo de cobertura", "Fibrocimento sobre estrutura de madeira", "padrao");
    }
  } else {
    const largura = escolher(medidas.largura, analise.terreno?.largura_m, 20);
    const comprimento = escolher(medidas.comprimento, analise.terreno?.comprimento_m, 12);
    const desnivel = escolher(medidas.desnivel, analise.terreno?.desnivel_m, 0);
    cena.terreno = { contorno: retangulo(arred(largura.valor), arred(comprimento.valor)), desnivel: arred(desnivel.valor) };
    pend("Terreno: largura", `${n(largura.valor)} m`, largura.origem);
    pend("Terreno: comprimento", `${n(comprimento.valor)} m`, comprimento.origem);
    if (desnivel.valor > 0 || desnivel.origem !== "padrao") pend("Terreno: desnível", `${n(desnivel.valor)} m`, desnivel.origem);
    if (moduloPadrao) {
      const inclinacao = escolher(medidas.inclinacao, null, 10);
      const alturaFrente = escolher(medidas.altura, null, 1);
      const mesa = novaMesa(
        { nome: "Mesa 1", fileiras: 2, modulosPorFileira: 5, inclinacao: inclinacao.valor, alturaBase: alturaFrente.valor },
        moduloPadrao,
      );
      mesa.origem = {
        x: arred(Math.max(0.5, (largura.valor - mesa.largura) / 2)),
        y: arred(Math.max(0.5, (comprimento.valor - mesa.comprimento) / 2)),
      };
      cena.superficies.push(mesa);
      pend("Mesa 1: inclinação", `${n(inclinacao.valor)}°`, inclinacao.origem);
      pend("Mesa 1: altura dianteira", `${n(alturaFrente.valor)} m`, alturaFrente.origem);
    }
  }

  for (const o of analise.obstaculos) {
    const sup = tipo === "telhado" ? cena.superficies[o.agua ?? 0] : undefined;
    if (tipo === "telhado" && !sup) continue;
    const base = sup
      ? { largura: sup.largura, comprimento: sup.comprimento }
      : { largura: cena.terreno.contorno[1]?.x ?? 20, comprimento: cena.terreno.contorno[2]?.y ?? 12 };
    const obst = novoObstaculo(o.tipo as TipoObstaculo, sup?.id ?? null, o.posicao_x * base.largura, o.posicao_y * base.comprimento, {
      nome: o.nome?.trim() || undefined,
      largura: o.largura_m ?? undefined,
      comprimento: o.comprimento_m ?? undefined,
      altura: o.altura_m ?? undefined,
    });
    // Mantém o obstáculo inteiro dentro da superfície.
    obst.u = arred(Math.min(Math.max(obst.u, obst.largura / 2), Math.max(obst.largura / 2, base.largura - obst.largura / 2)));
    obst.v = arred(Math.min(Math.max(obst.v, obst.comprimento / 2), Math.max(obst.comprimento / 2, base.comprimento - obst.comprimento / 2)));
    cena.obstaculos.push(obst);
    pend(`${obst.nome}`, `${n(obst.largura)} × ${n(obst.comprimento)} m, altura ${n(obst.altura)} m${sup ? ` em ${sup.nome}` : ""}`, "foto");
  }

  for (const e of analise.elementos_visiveis) {
    if (e.trim()) pend("Elemento visível na foto", e.trim(), "foto");
  }
  cena.pendencias = pendencias;
  return { cena, pendencias };
}

/** Caminho manual: mesmo formato de dados, sem IA. */
export function cenaPorMedidas(tipo: TipoProjeto, medidas: Medidas, moduloPadrao?: EspecModulo | null): Cena {
  return aplicarAnalise(analiseVazia(tipo), medidas, tipo, moduloPadrao).cena;
}

export const ROTULO_ORIGEM: Record<OrigemDado, string> = {
  informado: "Informado por você",
  foto: "Sugerido pela foto",
  padrao: "Valor padrão",
};

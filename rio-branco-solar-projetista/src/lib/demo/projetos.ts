import { cenaPorMedidas } from "@/lib/dominio/analise";
import { cenaVazia, novaMesa, novoObstaculo } from "@/lib/dominio/cena";
import { distribuir } from "@/lib/dominio/distribuicao";
import { gerarEstrutura, type MapaCatalogo } from "@/lib/dominio/estrutura";
import { arred, rad, retangulo } from "@/lib/dominio/geometria";
import { estimarGeracao, kitVazio, mapaDeModulos, novoArranjo, potenciaKwp, sincronizarKit } from "@/lib/dominio/kit";
import { calcularMateriais, GRUPOS, itemAvulso, sincronizarItens } from "@/lib/dominio/materiais";
import { dadosPadrao } from "@/lib/dominio/orcamento";
import type { Cena, DadosOrcamento, ItemCatalogo, ItemOrcamento, Kit, Medidas, TipoProjeto } from "@/lib/dominio/tipos";

// Dois projetos completos de demonstração, montados com as mesmas funções do aplicativo.
// Clientes, endereços, preços e condições são FICTÍCIOS.

export interface ProjetoDemo {
  cliente: { nome: string; telefone: string; email: string; cidade: string; endereco: string; observacoes: string };
  local: { nome: string; tipo: TipoProjeto; endereco: string; cidade: string };
  projeto: { nome: string; tipo: TipoProjeto; medidas: Medidas; cena: Cena; kit: Kit };
  orcamento: { dados: DadosOrcamento; itens: ItemOrcamento[] };
  avisos: string[];
}

export type CatalogoPorCodigo = Record<string, ItemCatalogo>;

const ORIGEM_GERACAO =
  "Estimativa demonstrativa: 4,5 kWh/m²·dia × 30 dias × rendimento 0,78. " +
  "Substitua pelo valor do CRESESB/SunData para o local ou por uma simulação.";

const reais = (v: number) => Math.round(v * 100);

function validadeEmDias(dias: number): string {
  const d = new Date(Date.now() + dias * 86400000);
  return d.toISOString().slice(0, 10);
}

function exigir(cat: CatalogoPorCodigo, codigo: string): ItemCatalogo {
  const item = cat[codigo];
  if (!item) throw new Error(`Item do catálogo inicial não encontrado: ${codigo}`);
  return item;
}

function avulsoDoCatalogo(item: ItemCatalogo, grupo: string, quantidade: number): ItemOrcamento {
  return itemAvulso(grupo, {
    descricao: item.descricao || item.modelo,
    unidade: item.unidade,
    quantidade,
    custo_unit: item.custo_centavos,
    preco_unit: item.preco_centavos,
    preco_manual: false,
    catalogo_id: item.id,
    origem: grupo === GRUPOS.servicos ? "servico" : "manual",
  });
}

/** 1. Telhado de fibrocimento sobre madeira, 4 × 12 m. */
export function demoTelhado(cat: CatalogoPorCodigo): ProjetoDemo {
  const catalogo: MapaCatalogo = Object.fromEntries(Object.values(cat).map((i) => [i.id, i]));
  const specs = mapaDeModulos(Object.values(cat));
  const modulo = exigir(cat, "mod-trina-620-ned19rc20");
  const inversor = exigir(cat, "inv-auxsol-asn-5sl-g2");
  const medidas: Medidas = { largura: 12, comprimento: 4, altura: 3, inclinacao: 10, observacoes: "Medidas de demonstração." };

  let cena = cenaPorMedidas("telhado", medidas, specs[modulo.id]);
  const sup = cena.superficies[0];
  sup.nome = "Água única";
  sup.estrutura = {
    ...sup.estrutura,
    tipo: "telhado",
    trilhoId: exigir(cat, "est-trilho-aluminio").id,
    emendaId: exigir(cat, "fix-emenda-trilho").id,
    grampoFinalId: exigir(cat, "fix-grampo-final").id,
    grampoIntermediarioId: exigir(cat, "fix-grampo-intermediario").id,
    fixacaoId: exigir(cat, "fix-parafuso-madeira").id,
  } as typeof sup.estrutura;
  cena.obstaculos.push(novoObstaculo("caixa_dagua", sup.id, 10.9, 3.1, { largura: 1, comprimento: 1, altura: 0.8 }));
  cena.pendencias = cena.pendencias.map((p) => ({ ...p, confirmado: true }));

  const avisos: string[] = [];
  const dist = distribuir(cena, sup.id, specs);
  avisos.push(...dist.avisos);
  const est = gerarEstrutura(dist.cena, sup.id, specs, catalogo);
  avisos.push(...est.avisos);
  cena = est.cena;

  let kit = sincronizarKit({ ...kitVazio(), inversores: [{ catalogoId: inversor.id, quantidade: 1 }] }, cena);
  const qtd = cena.modulos.length;
  kit = {
    ...kit,
    geracaoMensalKwh: estimarGeracao(potenciaKwp(kit, catalogo), 4.5, 0.78),
    origemGeracao: ORIGEM_GERACAO,
    verificacao: { ...kit.verificacao, arranjos: [novoArranjo(inversor.id, modulo.id, 1, qtd)] },
  };

  const base = sincronizarItens([], calcularMateriais(cena, kit, catalogo)).itens;
  const itens = [
    ...base,
    avulsoDoCatalogo(exigir(cat, "ace-cabo-solar-6-preto"), GRUPOS.eletrica, 25),
    avulsoDoCatalogo(exigir(cat, "ace-cabo-solar-6-vermelho"), GRUPOS.eletrica, 25),
    avulsoDoCatalogo(exigir(cat, "ace-conector-mc4"), GRUPOS.eletrica, 4),
    avulsoDoCatalogo(exigir(cat, "ace-string-box"), GRUPOS.eletrica, 1),
    avulsoDoCatalogo(exigir(cat, "ace-disjuntor-ca-32"), GRUPOS.eletrica, 1),
    avulsoDoCatalogo(exigir(cat, "ace-aterramento"), GRUPOS.eletrica, 1),
    avulsoDoCatalogo(exigir(cat, "srv-projeto-homologacao"), GRUPOS.servicos, 1),
  ].map((i, ordem) => ({ ...i, ordem, mostrar_preco: i.grupo === GRUPOS.modulos || i.grupo === GRUPOS.inversores }));

  const dados: DadosOrcamento = {
    ...dadosPadrao("Sistema fotovoltaico em telhado — demonstração"),
    validade: validadeEmDias(15),
    garantias:
      "Texto de demonstração. Módulos: garantia do fabricante conforme certificado. Inversor: garantia do fabricante. Instalação: 12 meses.",
    observacoes: "DEMONSTRAÇÃO — cliente, valores e condições fictícios. Projeto sujeito a vistoria técnica.",
    mao_de_obra_custo: reais(1400),
    mao_de_obra_preco: reais(2600),
    frete_custo: reais(350),
    frete_preco: reais(450),
    desconto: reais(300),
    exibicao: { modo: "grupos" },
  };
  dados.condicoes = {
    aVista: { ativo: true, valor: 0, observacao: "Pix ou transferência na assinatura (valor demonstrativo)." },
    cartao: {
      ativo: true,
      opcoes: [
        { parcelas: 6, valorParcela: reais(2590) },
        { parcelas: 12, valorParcela: reais(1340) },
      ],
      observacao: "Parcelas demonstrativas, informadas pelo proprietário.",
    },
    financiamento: {
      ativo: true,
      instituicao: "Banco de demonstração",
      entrada: 0,
      opcoes: [{ parcelas: 60, valorParcela: reais(389) }],
      observacao: "Simulação fictícia, sujeita à análise de crédito.",
    },
  };

  return {
    cliente: {
      nome: "Marta Oliveira (demonstração)",
      telefone: "(68) 99900-0101",
      email: "marta.demo@exemplo.com.br",
      cidade: "Rio Branco - AC",
      endereco: "Rua das Seringueiras, 100 (endereço fictício)",
      observacoes: "Cliente fictício criado para demonstração.",
    },
    local: { nome: "Residência — telhado dos fundos", tipo: "telhado", endereco: "Rua das Seringueiras, 100 (fictício)", cidade: "Rio Branco - AC" },
    projeto: { nome: "Telhado de fibrocimento 4 × 12 m", tipo: "telhado", medidas, cena, kit },
    orcamento: { dados, itens },
    avisos,
  };
}

export type OpcaoPoste = "concreto" | "aroeira";

/** Mesa de solo 2 × 10 já com estrutura, usada no projeto de demonstração e nos modelos reutilizáveis. */
export function montarMesaDemo(cat: CatalogoPorCodigo, poste: OpcaoPoste): { cena: Cena; avisos: string[] } {
  const catalogo: MapaCatalogo = Object.fromEntries(Object.values(cat).map((i) => [i.id, i]));
  const specs = mapaDeModulos(Object.values(cat));
  const modulo = exigir(cat, "mod-trina-630-ned19rc20");
  const cena = cenaVazia("solo");
  cena.terreno = { contorno: retangulo(20, 12), desnivel: 0 };
  const mesa = novaMesa({ nome: "Mesa 1", fileiras: 2, modulosPorFileira: 10, inclinacao: 10, alturaBase: 1 }, specs[modulo.id]);
  mesa.origem = {
    x: arred((20 - mesa.largura) / 2),
    y: arred((12 - mesa.comprimento * Math.cos(rad(mesa.inclinacao))) / 2),
  };
  mesa.estrutura = {
    ...mesa.estrutura,
    tipo: "solo",
    posteId: exigir(cat, poste === "concreto" ? "est-poste-concreto-10x10" : "est-lasca-aroeira").id,
    vigaId: exigir(cat, "est-viga-u-127").id,
    tercaId: exigir(cat, "est-terca-u-100").id,
    fixacaoId: exigir(cat, "fix-conjunto-modulo-terca").id,
    fundacao: { ativa: true, forma: "circular", lado: 0.3, profundidade: 0.8 },
  } as typeof mesa.estrutura;
  cena.superficies.push(mesa);
  const dist = distribuir(cena, mesa.id, specs);
  const est = gerarEstrutura(dist.cena, mesa.id, specs, catalogo);
  return { cena: est.cena, avisos: [...dist.avisos, ...est.avisos] };
}

/** 2. Estrutura de solo com 20 módulos em duas fileiras de 10. */
export function demoSolo(cat: CatalogoPorCodigo): ProjetoDemo {
  const catalogo: MapaCatalogo = Object.fromEntries(Object.values(cat).map((i) => [i.id, i]));
  const modulo = exigir(cat, "mod-trina-630-ned19rc20");
  const inversor = exigir(cat, "inv-solplanet-asw10000-s");
  const medidas: Medidas = { largura: 20, comprimento: 12, altura: 1, inclinacao: 10, desnivel: 0, observacoes: "Medidas de demonstração." };
  const { cena, avisos } = montarMesaDemo(cat, "concreto");
  cena.pendencias = [
    { id: "p-demo-1", rotulo: "Terreno", valor: "20,00 × 12,00 m", origem: "informado", confirmado: true },
    { id: "p-demo-2", rotulo: "Especificação da estrutura", valor: "Demonstrativa — validar com projeto estrutural", origem: "padrao", confirmado: false },
  ];

  let kit = sincronizarKit({ ...kitVazio(), inversores: [{ catalogoId: inversor.id, quantidade: 1 }] }, cena);
  kit = {
    ...kit,
    geracaoMensalKwh: estimarGeracao(potenciaKwp(kit, catalogo), 4.5, 0.78),
    origemGeracao: ORIGEM_GERACAO,
    verificacao: {
      ...kit.verificacao,
      arranjos: [
        novoArranjo(inversor.id, modulo.id, 1, 7),
        novoArranjo(inversor.id, modulo.id, 2, 7),
        novoArranjo(inversor.id, modulo.id, 3, 6),
      ],
    },
  };

  const base = sincronizarItens([], calcularMateriais(cena, kit, catalogo)).itens;
  const itens = [
    ...base,
    avulsoDoCatalogo(exigir(cat, "ace-cabo-solar-6-preto"), GRUPOS.eletrica, 60),
    avulsoDoCatalogo(exigir(cat, "ace-cabo-solar-6-vermelho"), GRUPOS.eletrica, 60),
    avulsoDoCatalogo(exigir(cat, "ace-conector-mc4"), GRUPOS.eletrica, 8),
    avulsoDoCatalogo(exigir(cat, "ace-string-box"), GRUPOS.eletrica, 2),
    avulsoDoCatalogo(exigir(cat, "ace-disjuntor-ca-32"), GRUPOS.eletrica, 1),
    avulsoDoCatalogo(exigir(cat, "ace-dps-ca"), GRUPOS.eletrica, 1),
    avulsoDoCatalogo(exigir(cat, "ace-aterramento"), GRUPOS.eletrica, 2),
    avulsoDoCatalogo(exigir(cat, "ace-cabo-terra-6"), GRUPOS.eletrica, 30),
    avulsoDoCatalogo(exigir(cat, "srv-projeto-homologacao"), GRUPOS.servicos, 1),
  ].map((i, ordem) => ({ ...i, ordem }));

  const dados: DadosOrcamento = {
    ...dadosPadrao("Usina de solo 20 módulos — demonstração"),
    validade: validadeEmDias(20),
    garantias: "Texto de demonstração. Garantias dos fabricantes conforme certificados; estrutura e instalação: 12 meses.",
    observacoes:
      "DEMONSTRAÇÃO — cliente, valores e condições fictícios. Estrutura representada conforme especificação demonstrativa, sujeita à validação técnica.",
    mao_de_obra_custo: reais(3800),
    mao_de_obra_preco: reais(6500),
    frete_custo: reais(700),
    frete_preco: reais(900),
    desconto: 0,
    exibicao: { modo: "total" },
  };
  dados.condicoes = {
    aVista: { ativo: true, valor: 0, observacao: "Valor demonstrativo." },
    cartao: { ativo: false, opcoes: [], observacao: "" },
    financiamento: {
      ativo: true,
      instituicao: "Banco de demonstração",
      entrada: reais(5000),
      opcoes: [
        { parcelas: 48, valorParcela: reais(1090) },
        { parcelas: 72, valorParcela: reais(835) },
      ],
      observacao: "Simulação fictícia, sujeita à análise de crédito.",
    },
  };

  return {
    cliente: {
      nome: "Sítio Boa Esperança (demonstração)",
      telefone: "(68) 99900-0202",
      email: "sitio.demo@exemplo.com.br",
      cidade: "Senador Guiomard - AC",
      endereco: "Ramal de demonstração, km 4 (endereço fictício)",
      observacoes: "Cliente fictício criado para demonstração.",
    },
    local: { nome: "Área ao lado do galpão", tipo: "solo", endereco: "Ramal de demonstração, km 4 (fictício)", cidade: "Senador Guiomard - AC" },
    projeto: { nome: "Estrutura de solo — 20 módulos (2 × 10)", tipo: "solo", medidas, cena, kit },
    orcamento: { dados, itens },
    avisos,
  };
}

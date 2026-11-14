// Tipos centrais do Projetista Solar 3D.
// Unidades: metros e graus na cena; milímetros nas seções e nas fichas do catálogo;
// valores monetários sempre em centavos (inteiros).

export type P2 = { x: number; y: number };

export type TipoProjeto = "telhado" | "solo";
export type OrigemProjeto = "medidas" | "gemini" | "chatgpt" | "modelo";

/** Medidas conhecidas informadas pelo proprietário. Sempre têm prioridade sobre a IA. */
export interface Medidas {
  largura?: number | null;
  comprimento?: number | null;
  altura?: number | null;
  desnivel?: number | null;
  inclinacao?: number | null;
  observacoes?: string | null;
}

// ---------------------------------------------------------------- catálogo

export type TipoCatalogo =
  | "modulo"
  | "inversor"
  | "perfil"
  | "estrutura"
  | "fixacao"
  | "acessorio"
  | "servico";

export type StatusDados = "confirmado" | "pendente" | "demonstrativo";

export interface SpecsModulo {
  potenciaWp: number;
  larguraMm: number;
  comprimentoMm: number;
  espessuraMm: number;
  pesoKg?: number | null;
  vmp?: number | null;
  imp?: number | null;
  voc?: number | null;
  isc?: number | null;
  coefVocPctC?: number | null;
  coefPmaxPctC?: number | null;
  eficienciaPct?: number | null;
  celulas?: number | null;
  tecnologia?: string | null;
}

export interface SpecsInversor {
  potenciaKw: number;
  fases?: number | null;
  tensaoCa?: string | null;
  tensaoMaxCc?: number | null;
  mpptMin?: number | null;
  mpptMax?: number | null;
  tensaoPartida?: number | null;
  correnteMaxMppt?: number | null;
  iscMaxMppt?: number | null;
  numMppt?: number | null;
  stringsPorMppt?: number | null;
  potenciaMaxFvKwp?: number | null;
  correnteMaxSaida?: number | null;
  eficienciaMaxPct?: number | null;
  larguraMm?: number | null;
  alturaMm?: number | null;
  profundidadeMm?: number | null;
  pesoKg?: number | null;
}

export type FormaSecao = "retangular" | "circular" | "u" | "ponto";

/** Perfis, postes, vigas, terças e demais peças lineares de estrutura. */
export interface SpecsPerfil {
  funcao?: FuncaoComponente | null;
  material?: string | null;
  forma?: FormaSecao | null;
  larguraMm?: number | null;
  alturaMm?: number | null;
  espessuraMm?: number | null;
  /** Comprimento comercial da barra ou peça, em metros. */
  comprimentoM?: number | null;
  /** O preço do catálogo é por unidade ou por metro? */
  precoPor?: "un" | "m" | null;
}

export type SpecsCatalogo = Partial<SpecsModulo> & Partial<SpecsInversor> & Partial<SpecsPerfil>;

export interface ItemCatalogo {
  id: string;
  tipo: TipoCatalogo;
  fabricante: string;
  modelo: string;
  descricao: string;
  unidade: string;
  specs: SpecsCatalogo;
  custo_centavos: number;
  preco_centavos: number;
  preco_demonstrativo: boolean;
  status_dados: StatusDados;
  fonte_url: string | null;
  fonte_titulo: string | null;
  fonte_consultada_em: string | null;
  observacoes: string | null;
  ativo: boolean;
}

/** Dimensões do módulo usadas pelo editor (metros). */
export interface EspecModulo {
  id: string;
  rotulo: string;
  potenciaWp: number;
  largura: number;
  comprimento: number;
  espessura: number;
}

export type MapaModulos = Record<string, EspecModulo>;

// -------------------------------------------------------------------- cena

export type ClasseSuperficie = "agua" | "mesa";
export type Orientacao = "retrato" | "paisagem";
export type MaterialCobertura =
  | "fibrocimento"
  | "ceramica"
  | "metalica"
  | "laje"
  | "outro";
export type EstruturaCobertura = "madeira" | "metalica" | "concreto" | "desconhecida";

export interface AreaInstalacao {
  id: string;
  /** Canto inferior esquerdo, em coordenadas da superfície. */
  u: number;
  v: number;
  largura: number;
  comprimento: number;
}

export interface ParamLayout {
  moduloId: string | null;
  orientacao: Orientacao;
  /** Espaço entre módulos na direção da largura (m). */
  espacamentoH: number;
  /** Espaço entre módulos na direção da inclinação (m). */
  espacamentoV: number;
  /** Afastamento das bordas da cobertura (m). */
  afastamentoBorda: number;
  /** Folga mínima em volta dos obstáculos (m). */
  folgaObstaculo: number;
  alinhamento: "inicio" | "centro";
  /** Quantidade máxima de módulos; null = preencher a área. */
  limite: number | null;
}

export interface ParamEstruturaTelhado {
  tipo: "telhado";
  trilhoId: string | null;
  grampoFinalId: string | null;
  grampoIntermediarioId: string | null;
  fixacaoId: string | null;
  emendaId: string | null;
  trilhosPorFileira: number;
  /** Fração do comprimento do módulo entre a borda e o trilho (0,25 = a 1/4). */
  posicaoTrilho: number;
  /** Sobra do trilho além do último módulo (m). */
  balanco: number;
  /** Distância máxima entre pontos de fixação (m). */
  espacamentoFixacao: number;
  /** Comprimento máximo de cada barra de trilho (m). */
  comprimentoBarra: number;
  /** Madeiramento existente (apenas representação). */
  espacamentoTercas: number;
}

export interface ParamFundacao {
  ativa: boolean;
  forma: "circular" | "quadrada";
  /** Diâmetro ou lado (m). */
  lado: number;
  profundidade: number;
}

export interface ParamEstruturaSolo {
  tipo: "solo";
  posteId: string | null;
  vigaId: string | null;
  tercaId: string | null;
  fixacaoId: string | null;
  /** Distância máxima entre pórticos (m). */
  espacamentoPorticos: number;
  /** Balanço lateral além do primeiro e do último pórtico (m). */
  balancoLateral: number;
  tercasPorFileira: number;
  posicaoTerca: number;
  /** Recuo dos postes em relação às bordas dianteira e traseira (m, ao longo da mesa). */
  recuoPoste: number;
  /** Trecho do poste abaixo do solo (m). */
  enterrado: number;
  comprimentoBarraTerca: number;
  fundacao: ParamFundacao;
}

export type ParamEstrutura = ParamEstruturaTelhado | ParamEstruturaSolo;

export interface ParamMesa {
  fileiras: number;
  modulosPorFileira: number;
}

export interface Superficie {
  id: string;
  classe: ClasseSuperficie;
  nome: string;
  /** Canto inferior esquerdo (beiral ou frente) em planta. */
  origem: P2;
  /** Rotação em planta do eixo da largura (graus, anti-horário). */
  rotacao: number;
  inclinacao: number;
  /** Altura do beiral (água) ou altura dianteira (mesa), em metros. */
  alturaBase: number;
  largura: number;
  /** Comprimento medido sobre a superfície inclinada. */
  comprimento: number;
  /** Contorno em coordenadas da superfície (u, v). */
  contorno: P2[];
  cobertura: { material: MaterialCobertura; estrutura: EstruturaCobertura } | null;
  areas: AreaInstalacao[];
  layout: ParamLayout;
  estrutura: ParamEstrutura;
  mesa: ParamMesa | null;
}

export type TipoObstaculo =
  | "caixa_dagua"
  | "chamine"
  | "claraboia"
  | "antena"
  | "arvore"
  | "construcao"
  | "outro";

export interface Obstaculo {
  id: string;
  /** null = obstáculo no terreno, em coordenadas de planta. */
  superficieId: string | null;
  tipo: TipoObstaculo;
  nome: string;
  /** Centro. */
  u: number;
  v: number;
  largura: number;
  comprimento: number;
  altura: number;
  rotacao: number;
}

export interface ModuloPosicionado {
  id: string;
  superficieId: string;
  moduloId: string;
  /** Centro, em coordenadas da superfície. */
  u: number;
  v: number;
  /** 0 = retrato (lado maior ao longo da inclinação); 90 = paisagem. */
  rotacao: number;
  fileira: string;
}

export type FuncaoComponente =
  | "trilho"
  | "emenda"
  | "grampo_final"
  | "grampo_intermediario"
  | "fixacao"
  | "poste"
  | "viga"
  | "terca"
  | "fundacao"
  | "outro";

export interface Componente {
  id: string;
  superficieId: string;
  funcao: FuncaoComponente;
  catalogoId: string | null;
  nome: string;
  material: string;
  forma: FormaSecao;
  /** Seção em milímetros. Circular usa `largura` como diâmetro. */
  secao: { largura: number; altura: number; espessura: number };
  eixo: "u" | "v" | "vertical" | "ponto";
  /** Início da barra ou posição da peça, em coordenadas da superfície. */
  u: number;
  v: number;
  /** Deslocamento normal ao plano (m): negativo fica abaixo dos módulos. */
  n: number;
  comprimento: number;
  /** Postes: trecho acima do solo (m). */
  altura: number;
  /** Postes e fundações: trecho abaixo do solo (m). */
  enterrado: number;
  quantidade: number;
  /** Editado à mão: preservado quando a estrutura é gerada novamente. */
  manual: boolean;
  /** Já existe na obra (ex.: madeiramento); não entra na lista de materiais. */
  existente: boolean;
}

export type OrigemDado = "informado" | "foto" | "padrao";

/** Dado sugerido que precisa (ou não) de confirmação do proprietário. */
export interface Pendencia {
  id: string;
  rotulo: string;
  valor: string;
  origem: OrigemDado;
  confirmado: boolean;
}

export interface CameraCapa {
  posicao: [number, number, number];
  alvo: [number, number, number];
}

export interface Cena {
  versao: 1;
  tipo: TipoProjeto;
  /** Perímetro do terreno em planta (usado em projetos de solo). */
  terreno: { contorno: P2[]; desnivel: number };
  superficies: Superficie[];
  obstaculos: Obstaculo[];
  modulos: ModuloPosicionado[];
  componentes: Componente[];
  pendencias: Pendencia[];
  capa: { camera: CameraCapa | null };
}

// --------------------------------------------------------------------- kit

export interface ArranjoEletrico {
  id: string;
  inversorId: string;
  mppt: number;
  moduloId: string;
  strings: number;
  modulosPorString: number;
}

export interface VerificacaoEletrica {
  tempMinC: number;
  tempMaxCelulaC: number;
  arranjos: ArranjoEletrico[];
  /** Conferências confirmadas manualmente, por identificador do item. */
  validados: Record<string, boolean>;
  responsavel: string;
  validadoEm: string | null;
  observacoes: string;
}

export interface Kit {
  modulos: { catalogoId: string; quantidade: number; automatico: boolean }[];
  inversores: { catalogoId: string; quantidade: number }[];
  geracaoMensalKwh: number | null;
  origemGeracao: string;
  verificacao: VerificacaoEletrica;
}

// --------------------------------------------------------------- orçamento

export type OrigemItem = "desenho" | "kit" | "manual" | "servico";

export interface ItemOrcamento {
  id: string;
  ordem: number;
  origem: OrigemItem;
  chave: string | null;
  grupo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  quantidade_anterior: number | null;
  custo_unit: number;
  preco_unit: number;
  preco_manual: boolean;
  catalogo_id: string | null;
  mostrar_descricao: boolean;
  mostrar_preco: boolean;
}

export interface OpcaoParcelamento {
  parcelas: number;
  valorParcela: number;
}

export interface Condicoes {
  aVista: { ativo: boolean; valor: number; observacao: string };
  cartao: { ativo: boolean; opcoes: OpcaoParcelamento[]; observacao: string };
  financiamento: {
    ativo: boolean;
    instituicao: string;
    entrada: number;
    opcoes: OpcaoParcelamento[];
    observacao: string;
  };
}

export type ModoExibicao = "total" | "grupos" | "itens";

export interface Exibicao {
  modo: ModoExibicao;
}

export type StatusProposta =
  | "rascunho"
  | "publicada"
  | "aceita"
  | "recusada"
  | "vencida"
  | "arquivada";

export interface DadosOrcamento {
  titulo: string;
  validade: string | null;
  garantias: string;
  observacoes: string;
  mao_de_obra_custo: number;
  mao_de_obra_preco: number;
  frete_custo: number;
  frete_preco: number;
  desconto: number;
  condicoes: Condicoes;
  exibicao: Exibicao;
}

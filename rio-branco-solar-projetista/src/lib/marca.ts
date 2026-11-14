// Identidade da Rio Branco Solar usada no painel, na proposta e no PDF.
// Visual próprio (logotipo vetorial criado para este projeto); ajuste aqui se houver marca oficial.

export const MARCA = {
  nome: "Rio Branco Solar",
  assinatura: "Energia solar sob medida",
  cores: {
    azul: "#0F3D5E",
    azulEscuro: "#0A2A42",
    sol: "#F5A524",
    solClaro: "#FFD27A",
    verde: "#2F7D4F",
    tinta: "#16212B",
    cinza: "#5B6B79",
    papel: "#F6F4EF",
  },
} as const;

/** Dados da empresa gravados em cada versão publicada (configuráveis por variável de ambiente). */
export function dadosDaEmpresa(): { nome: string; contato: string; cidade: string } {
  return {
    nome: process.env.EMPRESA_NOME?.trim() || MARCA.nome,
    contato: process.env.EMPRESA_CONTATO?.trim() || "",
    cidade: process.env.EMPRESA_CIDADE?.trim() || "Rio Branco - AC",
  };
}

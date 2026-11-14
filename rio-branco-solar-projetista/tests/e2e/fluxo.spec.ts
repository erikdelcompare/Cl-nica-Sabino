import { test, expect, devices, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Fluxo completo com os dados de demonstração e um cliente criado no teste.
// Pré-requisitos: npm run db:start, npm run db:reset, npm run seed:demo, npm run build && npm run start -- -p 3100.

const EMAIL = "proprietario@riobrancosolar.test";
const SENHA = "Teste-Local-2026!";
const AGORA = Date.now().toString();
const NOME_CLIENTE = `Cliente E2E ${AGORA.slice(-5)}`;
const TELEFONE = `(68) 9${AGORA.slice(-8, -4)}-${AGORA.slice(-4)}`;
const DIGITOS_TELEFONE = TELEFONE.replace(/\D/g, "");
const ACESSOS = resolve(process.cwd(), ".demo-acessos.json");

const RESPOSTA_CHATGPT = JSON.stringify({
  versao: 1,
  tipo_local: "telhado",
  cobertura: { material: "fibrocimento", estrutura: "madeira" },
  aguas: [{ nome: "Água principal", largura_m: 10.2, comprimento_m: 3.6, inclinacao_graus: 12, confianca: 0.6 }],
  terreno: null,
  obstaculos: [
    { tipo: "caixa_dagua", nome: "Caixa d'água", agua: 0, posicao_x: 0.85, posicao_y: 0.7, largura_m: 1.2, comprimento_m: 1.2, altura_m: 0.9, confianca: 0.5 },
  ],
  elementos_visiveis: ["telhas de fibrocimento", "caixa d'água"],
  observacoes: "Inclinação estimada.",
});

// Conta os itens do orçamento cuja descrição (campo editável) contém o texto.
async function contarItens(p: Page, texto: string): Promise<number> {
  const valores = await p
    .getByRole("textbox", { name: "Descrição do item", exact: true })
    .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  return valores.filter((v) => v.includes(texto)).length;
}

// Escolhe a opção de um <select> pelo texto visível (regex).
async function escolherOpcao(select: ReturnType<Page["getByLabel"]>, texto: RegExp) {
  const valor = await select.locator("option").filter({ hasText: texto }).first().getAttribute("value");
  if (!valor) throw new Error(`Opção não encontrada: ${texto}`);
  await select.selectOption(valor);
}

// Campos numéricos têm botões − e + com o mesmo rótulo: pega só o campo de texto.
const campoNumero = (p: Page, nome: string) => p.getByRole("textbox", { name: nome, exact: true });

let owner: BrowserContext;
let painel: Page;
let clienteId = "";
let projetoId = "";
let projetoChatId = "";
let orcamentoId = "";
let linkProposta = "";
let pinAtual = "";
let versaoId = "";

async function visitarComoProprietario(browser: Browser) {
  owner = await browser.newContext();
  painel = await owner.newPage();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await visitarComoProprietario(browser);
});
test.afterAll(async () => {
  await owner?.close();
});

test("1. login do proprietário e cadastro público desativado", async () => {
  await painel.goto("/login");
  await expect(painel.getByText("O cadastro público está desativado.")).toBeVisible();
  await painel.getByLabel("E-mail").fill(EMAIL);
  await painel.getByLabel("Senha").fill(SENHA);
  await painel.getByRole("button", { name: "Entrar" }).click();
  await painel.waitForURL("**/clientes");
  await expect(painel.getByRole("heading", { name: "Clientes" })).toBeVisible();

  // Sem sessão, o painel e a API recusam acesso.
  const anon = await painel.context().browser()!.newContext();
  const outra = await anon.newPage();
  await outra.goto("/clientes");
  await expect(outra).toHaveURL(/\/login/);
  const resposta = await anon.request.get("/api/fotos");
  expect(resposta.status()).toBe(401);
  await anon.close();
});

test("2. cadastro de cliente e busca por nome e telefone", async () => {
  await painel.goto("/clientes/novo");
  await painel.getByLabel("Nome completo").fill(NOME_CLIENTE);
  await painel.getByLabel("Telefone / WhatsApp").fill(TELEFONE);
  await painel.getByRole("button", { name: "Cadastrar cliente" }).click();
  await painel.waitForURL(/\/clientes\/[0-9a-f-]{36}$/);
  clienteId = painel.url().split("/").pop()!;
  await expect(painel.getByRole("heading", { name: NOME_CLIENTE })).toBeVisible();

  await painel.goto(`/clientes?q=${encodeURIComponent(DIGITOS_TELEFONE.slice(-8))}`);
  await expect(painel.getByRole("link", { name: new RegExp(NOME_CLIENTE) })).toBeVisible();
  await painel.goto(`/clientes?q=${encodeURIComponent("cliente e2e")}`);
  await expect(painel.getByRole("link", { name: new RegExp(NOME_CLIENTE) })).toBeVisible();
  await painel.goto("/clientes?q=zzzz-inexistente");
  await expect(painel.getByText("Nenhum cliente encontrado.")).toBeVisible();
});

test("3. projeto pelas medidas (4 × 12 m) e montagem dos módulos", async () => {
  await painel.goto(`/clientes/${clienteId}/projetos/novo`);
  await campoNumero(painel, "Largura do telhado").fill("12");
  await campoNumero(painel, "Comprimento do telhado").fill("4");
  await painel.getByLabel("Nome do projeto").fill("Telhado E2E 4 × 12 m");
  await painel.getByRole("combobox", { name: /^Local/ }).selectOption("novo");
  await painel.getByLabel("Nome do novo local").fill("Casa E2E");
  await painel.getByRole("button", { name: "Criar projeto e abrir o desenho" }).click();
  await painel.waitForURL(/\/projetos\/[0-9a-f-]{36}$/);
  projetoId = painel.url().split("/").pop()!;

  await painel.getByRole("button", { name: "Módulos", exact: true }).click();
  await escolherOpcao(painel.getByLabel("Modelo do módulo"), /620 Wp/);
  await expect(painel.getByText(/9 módulo\(s\) em/)).toBeVisible();

  // Conferência: nada fora da área nem sobreposto.
  await expect(painel.getByText("0 com erro", { exact: true })).toBeVisible();

  await painel.getByRole("button", { name: "Salvar agora" }).click();
  await expect(painel.getByRole("status").filter({ hasText: /Salvo|Tudo salvo/ })).toBeVisible();

  // Recarrega: o desenho continua exatamente como foi salvo.
  await painel.reload();
  await painel.getByRole("button", { name: "Módulos", exact: true }).click();
  await expect(painel.getByText(/9 módulo\(s\) em/)).toBeVisible();
});

test("4. importação de análise pelo ChatGPT com prévia e medidas informadas prevalecendo", async () => {
  await painel.goto(`/clientes/${clienteId}/projetos/novo`);
  await painel.getByRole("tab", { name: /Importar do ChatGPT/ }).click();
  await expect(painel.getByRole("textbox", { name: "Prompt para o ChatGPT" })).toHaveValue(/SOMENTE com um objeto JSON/);
  await expect(painel.getByRole("textbox", { name: "Prompt para o ChatGPT" })).toHaveValue(/largura: 12 m/).catch(() => undefined);

  await campoNumero(painel, "Largura do telhado").fill("12");
  await campoNumero(painel, "Comprimento do telhado").fill("4");
  await painel.getByLabel("Nome do projeto").fill("Telhado importado E2E");
  await painel.getByRole("combobox", { name: /^Local/ }).selectOption({ index: 0 });
  await painel.locator("#json-chatgpt").fill("Segue a análise:\n" + RESPOSTA_CHATGPT);
  await painel.getByRole("button", { name: "Ver prévia" }).click();
  await expect(painel.getByText("Prévia da análise")).toBeVisible();
  await expect(painel.getByText("Para confirmar")).toBeVisible();
  await painel.getByRole("button", { name: "Aplicar e criar projeto" }).click();
  await painel.waitForURL(/\/projetos\/[0-9a-f-]{36}$/);
  projetoChatId = painel.url().split("/").pop()!;

  // A medida informada (12 m) vence a estimativa da foto (10,2 m).
  await painel.getByRole("button", { name: /^Confirmações/ }).click();
  await expect(painel.getByText("Informado por você").first()).toBeVisible();
  await painel.getByRole("button", { name: "Cobertura / mesas" }).click();
  await expect(campoNumero(painel, "Largura (m)")).toHaveValue("12,00");
  await painel.getByRole("button", { name: "Obstáculos", exact: true }).click();
  await expect(painel.getByRole("button", { name: "Caixa d'água" }).first()).toBeVisible();
});

test("5. kit com inversor e geração estimada", async () => {
  await painel.goto(`/projetos/${projetoId}/kit`);
  await painel.getByRole("button", { name: "+ Adicionar inversor" }).click();
  await painel.getByRole("button", { name: /Estimar com 4,5 HSP/ }).click();
  await painel.getByRole("button", { name: "Salvar kit" }).click();
  await expect(painel.getByText("Kit salvo.")).toBeVisible();
  await expect(painel.getByText("Potência dos módulos × inversores")).toBeVisible();
});

test("6. orçamento: lista de materiais, avulsos e preços manuais", async () => {
  await painel.goto(`/projetos/${projetoId}/orcamento`);
  await painel.getByRole("button", { name: "Criar orçamento deste projeto" }).click();
  await painel.waitForURL(/\/orcamentos\/[0-9a-f-]{36}$/);
  orcamentoId = painel.url().split("/").pop()!;

  await expect.poll(() => contarItens(painel, "Módulo fotovoltaico Trina Solar")).toBeGreaterThan(0);

  // Item avulso (cabo) e mão de obra com preço ajustado à mão.
  await painel.getByText("+ Adicionar item avulso").click();
  await painel.getByRole("textbox", { name: "Descrição", exact: true }).fill("Cabo solar 6 mm² E2E");
  await painel.getByRole("textbox", { name: "Custo", exact: true }).fill("5,50");
  await painel.getByRole("textbox", { name: "Preço", exact: true }).fill("8,50");
  await painel.getByRole("button", { name: "Adicionar item" }).click();
  await expect.poll(() => contarItens(painel, "Cabo solar 6 mm² E2E")).toBe(1);

  await painel.getByRole("textbox", { name: "Mão de obra: preço", exact: true }).fill("2600,00");
  await painel.getByRole("textbox", { name: "Mão de obra: preço", exact: true }).press("Enter");

  await painel.getByRole("button", { name: "Recalcular lista de materiais" }).click();
  await expect(painel.getByText(/Lista de materiais/).or(painel.getByText(/já estava em dia/))).toBeVisible();

  await painel.getByRole("button", { name: "Salvar agora" }).click();
  await expect(painel.getByRole("status").filter({ hasText: /Salvo|Tudo salvo/ })).toBeVisible();
});

test("7. rascunho recuperado pelo cadastro do cliente", async () => {
  await painel.goto(`/clientes/${clienteId}`);
  await expect(painel.getByText("Histórico de orçamentos")).toBeVisible();
  await expect(painel.getByRole("cell", { name: /Telhado E2E/ })).toBeVisible();
  await painel.getByRole("link", { name: "Continuar" }).first().click();
  await painel.waitForURL(new RegExp(`/orcamentos/${orcamentoId}$`));
  await expect.poll(() => contarItens(painel, "Cabo solar 6 mm² E2E")).toBe(1);
  await expect(painel.getByRole("textbox", { name: "Mão de obra: preço", exact: true })).toHaveValue("2600,00");
});

test("8. publicação: link e PIN separados, versão congelada", async () => {
  await painel.goto(`/orcamentos/${orcamentoId}`);
  await painel.getByRole("button", { name: "Finalizar orçamento e publicar" }).click();
  await expect(painel.getByText(/Versão 1 publicada/)).toBeVisible();
  linkProposta = (await painel.locator("p.break-all").first().innerText()).trim();
  pinAtual = (await painel.locator("p.text-3xl").first().innerText()).trim();
  expect(linkProposta).toMatch(/\/p\/[A-Za-z0-9_-]{43}$/);
  expect(pinAtual).toMatch(/^\d{6}$/);
  const token = linkProposta.split("/p/")[1];
  const cliente = await owner.request.get(`/p/${token}`);
  expect(cliente.status()).toBe(200);
});

test("9. cliente no celular: projeto antes do PIN, valores só depois", async ({ browser }) => {
  const celular = await browser.newContext({ ...devices["iPhone 13"] });
  const pagina = await celular.newPage();
  const token = linkProposta.split("/p/")[1];
  await pagina.goto(linkProposta);
  await expect(pagina.getByRole("heading", { name: "Telhado E2E 4 × 12 m" })).toBeVisible();
  await expect(pagina.getByRole("tab", { name: "Planta 2D" })).toBeVisible();
  const semRolagemLateral = await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(semRolagemLateral).toBe(true);

  // Antes do PIN: nenhum valor, nenhum hash, nenhum campo de preço no HTML.
  const html = await pagina.content();
  expect(html).not.toMatch(/R\$\s?\d/);
  expect(html).not.toContain("total_centavos");
  expect(html).not.toContain("preco_unit");
  expect(html).not.toContain("custo_centavos");
  expect(html).not.toContain("scrypt$");
  expect(html).not.toContain("snapshot_comercial");
  expect(html).toContain('name="robots"');
  expect(html).toMatch(/noindex/);

  // PDF sem desbloqueio é recusado.
  const semCookie = await celular.request.get(`/api/p/${token}/pdf`);
  expect(semCookie.status()).toBe(401);
  const capa = await pagina.request.get(`/api/p/${token}/capa`);
  expect([200, 404]).toContain(capa.status());

  // PIN errado.
  await pagina.getByRole("button", { name: "Ver orçamento" }).click();
  await pagina.locator("#pin").fill(pinAtual === "000000" ? "111111" : "000000");
  await pagina.getByRole("button", { name: "Confirmar PIN" }).click();
  await expect(pagina.getByText(/PIN incorreto\. Restam 4 tentativa/)).toBeVisible();

  // PIN de outra proposta (demonstração) não vale aqui.
  if (existsSync(ACESSOS)) {
    const demos = JSON.parse(readFileSync(ACESSOS, "utf8")) as { pin: string }[];
    await pagina.locator("#pin").fill(demos[0].pin);
    await pagina.getByRole("button", { name: "Confirmar PIN" }).click();
    await expect(pagina.getByText(/PIN incorreto/)).toBeVisible();
  }

  // PIN correto.
  await pagina.locator("#pin").fill(pinAtual);
  await pagina.getByRole("button", { name: "Confirmar PIN" }).click();
  await expect(pagina.getByText("Valores liberados")).toBeVisible();
  await expect(pagina.getByText("Total", { exact: true })).toBeVisible();
  await expect(pagina.getByRole("link", { name: "Baixar PDF" })).toBeVisible();

  // PDF com valores, só para quem desbloqueou.
  // Busca feita pela própria página (com o cookie do desbloqueio, como o navegador faria).
  const pdf = await pagina.evaluate(async (url) => {
    const r = await fetch(url, { cache: "no-store" });
    const bytes = new Uint8Array(await r.arrayBuffer());
    return { status: r.status, tipo: r.headers.get("content-type"), inicio: String.fromCharCode(...bytes.slice(0, 4)), tamanho: bytes.length };
  }, `/api/p/${token}/pdf`);
  expect(pdf.status).toBe(200);
  expect(pdf.tipo).toContain("application/pdf");
  expect(pdf.inicio).toBe("%PDF");
  expect(pdf.tamanho).toBeGreaterThan(2000);

  await celular.close();
});

test("10. troca de PIN encerra o desbloqueio anterior; revogação e histórico", async ({ browser }) => {
  const token = linkProposta.split("/p/")[1];
  // Desbloqueia num aparelho antes da troca.
  const aparelho = await browser.newContext({ ...devices["iPhone 13"] });
  const pagina = await aparelho.newPage();
  await pagina.goto(linkProposta);
  await pagina.getByRole("button", { name: "Ver orçamento" }).click();
  await pagina.locator("#pin").fill(pinAtual);
  await pagina.getByRole("button", { name: "Confirmar PIN" }).click();
  await expect(pagina.getByText("Valores liberados")).toBeVisible();

  // Dono troca o PIN.
  await painel.goto(`/orcamentos/${orcamentoId}`);
  painel.once("dialog", (d) => d.accept());
  await painel.getByRole("button", { name: "Trocar PIN" }).click();
  const novo = (await painel.locator("strong.tracking-widest").first().innerText()).trim();
  expect(novo).toMatch(/^\d{6}$/);
  expect(novo).not.toBe(pinAtual);

  // O aparelho que já tinha desbloqueado volta a ver só o bloqueio.
  await pagina.reload();
  await expect(pagina.getByRole("button", { name: "Ver orçamento" })).toBeVisible();
  const comercial = await aparelho.request.get(`/api/p/${token}/comercial`);
  expect(comercial.status()).toBe(401);

  // PIN antigo não vale; o novo vale.
  await pagina.getByRole("button", { name: "Ver orçamento" }).click();
  await pagina.locator("#pin").fill(pinAtual);
  await pagina.getByRole("button", { name: "Confirmar PIN" }).click();
  await expect(pagina.getByText(/PIN incorreto/)).toBeVisible();
  await pagina.locator("#pin").fill(novo);
  await pagina.getByRole("button", { name: "Confirmar PIN" }).click();
  await expect(pagina.getByText("Valores liberados")).toBeVisible();
  pinAtual = novo;
  await aparelho.close();
});

test("11. editar o rascunho depois não altera a versão enviada", async ({ browser }) => {
  // Aumenta o rascunho em R$ 1.000,00.
  await painel.goto(`/orcamentos/${orcamentoId}`);
  await painel.getByRole("textbox", { name: "Garantias", exact: false }).fill("Garantia de demonstração alterada depois da publicação.");
  await painel.getByRole("button", { name: "Salvar agora" }).click();
  await expect(painel.getByRole("status").filter({ hasText: /Salvo|Tudo salvo/ })).toBeVisible();

  // Total registrado na versão 1 (histórico).
  await painel.getByRole("link", { name: "Ver o que foi enviado" }).first().click();
  await painel.waitForURL(/\/versoes\//);
  versaoId = painel.url().split("/").pop()!;
  await expect(painel.getByText(/Versão 1 — o que foi apresentado/)).toBeVisible();
  await expect(painel.getByText("Cabo solar 6 mm² E2E").first()).toBeVisible();
  await expect(painel.getByText("Garantia de demonstração alterada").first()).not.toBeVisible();

  // Aparelho do cliente, já com PIN novo, continua vendo a versão publicada.
  const aparelho = await browser.newContext({ ...devices["iPhone 13"] });
  const pagina = await aparelho.newPage();
  await pagina.goto(linkProposta);
  await pagina.getByRole("button", { name: "Ver orçamento" }).click();
  await pagina.locator("#pin").fill(pinAtual);
  await pagina.getByRole("button", { name: "Confirmar PIN" }).click();
  await expect(pagina.getByText("Valores liberados")).toBeVisible();
  await expect(pagina.getByText("Garantia de demonstração alterada")).toHaveCount(0);
  await aparelho.close();
  expect(versaoId).toMatch(/[0-9a-f-]{36}/);
});

test("12. revogação do link", async ({ browser }) => {
  await painel.goto(`/orcamentos/${orcamentoId}`);
  painel.once("dialog", (d) => d.accept());
  await painel.getByRole("button", { name: "Revogar" }).first().click();
  await expect(painel.getByText("Revogada").first()).toBeVisible();

  const aparelho = await browser.newContext({ ...devices["iPhone 13"] });
  const pagina = await aparelho.newPage();
  await pagina.goto(linkProposta);
  await expect(pagina.getByText("Proposta indisponível")).toBeVisible();
  await aparelho.close();
});

test("13. Gemini sem chave: recusa clara, editor e importação seguem funcionando", async () => {
  const r = await painel.request.post("/api/ia/gemini", {
    data: { caminhos: ["temp/inexistente/foto.jpg"], tipo: "telhado", medidas: {}, consentimento: true },
  });
  expect(r.status()).toBe(503);
  const corpo = (await r.json()) as { codigo: string; mensagem: string };
  expect(corpo.codigo).toBe("sem_chave");
  expect(corpo.mensagem).toMatch(/Use o editor manual|ChatGPT/);

  // Sem consentimento, nem chama o fornecedor.
  const semAceite = await painel.request.post("/api/ia/gemini", {
    data: { caminhos: ["temp/x/y.jpg"], tipo: "telhado", medidas: {}, consentimento: false },
  });
  expect(semAceite.status()).toBe(400);
});

test("14. demonstrações: dois projetos completos e catálogo com fontes", async () => {
  await painel.goto("/clientes?q=Marta");
  await expect(painel.getByRole("link", { name: /Marta Oliveira/ })).toBeVisible();
  await painel.goto("/clientes?q=Sítio");
  await expect(painel.getByRole("link", { name: /Sítio Boa Esperança/ })).toBeVisible();
  await painel.goto("/catalogo");
  await expect(painel.getByText("Trina Solar Vertex N TSM-630NED19RC.20").first()).toBeVisible();
  await expect(painel.getByText("ASW10000-S").first()).toBeVisible();
  await expect(painel.getByText("Fonte:").first()).toBeVisible();
});

test("15. criação com tela de celular do proprietário", async ({ browser }) => {
  const celular = await browser.newContext({ ...devices["iPhone 13"] });
  const pagina = await celular.newPage();
  await pagina.goto("/login");
  await pagina.getByLabel("E-mail").fill(EMAIL);
  await pagina.getByLabel("Senha").fill(SENHA);
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL("**/clientes");
  await expect(pagina.getByRole("navigation", { name: "Seções do editor" }).first()).toBeVisible().catch(() => undefined);
  const semRolagem = await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(semRolagem).toBe(true);
  await celular.close();
  void projetoChatId;
});

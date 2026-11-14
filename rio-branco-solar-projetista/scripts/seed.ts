// Carga inicial: catálogo e dados de demonstração.
//
//   npm run seed:catalogo            → cadastra os itens iniciais do catálogo (não sobrescreve os já existentes)
//   npm run seed:catalogo -- --atualizar → reaplica os dados dos itens iniciais (sobrescreve edições)
//   npm run seed:demo                → recria os dois projetos de demonstração e publica as propostas
//   npm run seed:demo -- --limpar    → apenas remove os dados de demonstração
//
// Os projetos são montados com as mesmas funções do aplicativo (distribuição, estrutura,
// materiais e publicação), então o que aparece no painel é exatamente o que o editor produziria.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { CATALOGO_INICIAL } from "../src/lib/catalogo/inicial";
import { demoSolo, demoTelhado, montarMesaDemo, type CatalogoPorCodigo, type ProjetoDemo } from "../src/lib/demo/projetos";
import { extrairModelo } from "../src/lib/dominio/cena";
import { calcularTotais } from "../src/lib/dominio/orcamento";
import { linhaParaCatalogo, type Db } from "../src/lib/servidor/dados";
import { publicarOrcamento } from "../src/lib/servidor/publicacao";
import { argumentos, clienteDeServico } from "./ambiente";

function ok<T>(r: { data: T | null; error: { message: string } | null }, contexto: string): T {
  if (r.error) throw new Error(`${contexto}: ${r.error.message}`);
  return r.data as T;
}

async function semearCatalogo(db: Db, atualizar: boolean) {
  const linhas = CATALOGO_INICIAL.map((i) => ({ ...i }));
  const r = await db.from("catalogo_itens").upsert(linhas, { onConflict: "codigo", ignoreDuplicates: !atualizar }).select("id");
  if (r.error) throw new Error(`Catálogo: ${r.error.message}`);
  const { count } = await db.from("catalogo_itens").select("id", { count: "exact", head: true });
  console.log(`Catálogo: ${linhas.length} itens iniciais conferidos (${r.data?.length ?? 0} gravados agora). Total no banco: ${count}.`);
}

async function catalogoPorCodigo(db: Db): Promise<CatalogoPorCodigo> {
  const linhas = ok(await db.from("catalogo_itens").select("*").not("codigo", "is", null), "Catálogo");
  const mapa: CatalogoPorCodigo = {};
  for (const l of linhas as Record<string, unknown>[]) mapa[String(l.codigo)] = linhaParaCatalogo(l);
  return mapa;
}

async function limparDemo(db: Db) {
  const orcs = ok(await db.from("orcamentos").select("id").eq("demonstracao", true), "Orçamentos demo") as { id: string }[];
  const ids = orcs.map((o) => o.id);
  if (ids.length > 0) {
    const versoes = ok(await db.from("proposta_versoes").select("id, capa_caminho").in("orcamento_id", ids), "Versões demo") as {
      id: string;
      capa_caminho: string | null;
    }[];
    const capas = versoes.map((v) => v.capa_caminho).filter((c): c is string => Boolean(c));
    if (capas.length > 0) await db.storage.from("capas").remove(capas);
    ok(await db.from("proposta_versoes").delete().in("orcamento_id", ids), "Remover versões demo");
    ok(await db.from("orcamentos").delete().in("id", ids), "Remover orçamentos demo");
  }
  const projetos = ok(await db.from("projetos").select("id, capa_caminho").eq("demonstracao", true), "Projetos demo") as {
    id: string;
    capa_caminho: string | null;
  }[];
  const capasProjeto = projetos.map((p) => p.capa_caminho).filter((c): c is string => Boolean(c));
  if (capasProjeto.length > 0) await db.storage.from("capas").remove(capasProjeto);
  ok(await db.from("projetos").delete().eq("demonstracao", true), "Remover projetos demo");
  const clientes = ok(await db.from("clientes").select("id").eq("demonstracao", true), "Clientes demo") as { id: string }[];
  if (clientes.length > 0) {
    ok(await db.from("locais").delete().in("cliente_id", clientes.map((c) => c.id)), "Remover locais demo");
    ok(await db.from("clientes").delete().eq("demonstracao", true), "Remover clientes demo");
  }
  ok(await db.from("modelos").delete().eq("demonstracao", true), "Remover modelos demo");
  console.log("Dados de demonstração anteriores removidos.");
}

interface Acesso {
  projeto: string;
  cliente: string;
  link: string;
  pin: string;
  versaoId: string;
  orcamentoId: string;
  projetoId: string;
}

async function gravarDemo(db: Db, demo: ProjetoDemo, capa: string | null): Promise<Acesso> {
  const cliente = ok(await db.from("clientes").insert({ ...demo.cliente, demonstracao: true }).select("id").single(), "Cliente demo") as { id: string };
  const local = ok(await db.from("locais").insert({ ...demo.local, cliente_id: cliente.id }).select("id").single(), "Local demo") as { id: string };
  const projeto = ok(
    await db
      .from("projetos")
      .insert({
        cliente_id: cliente.id,
        local_id: local.id,
        nome: demo.projeto.nome,
        tipo: demo.projeto.tipo,
        origem: "medidas",
        medidas: demo.projeto.medidas,
        cena: demo.projeto.cena,
        kit: demo.projeto.kit,
        demonstracao: true,
      })
      .select("id")
      .single(),
    "Projeto demo",
  ) as { id: string };

  if (capa && existsSync(capa)) {
    const caminho = `projetos/${projeto.id}/capa.jpg`;
    const envio = await db.storage.from("capas").upload(caminho, readFileSync(capa), { contentType: "image/jpeg", upsert: true });
    if (envio.error) console.warn(`  (capa não enviada: ${envio.error.message})`);
    else ok(await db.from("projetos").update({ capa_caminho: caminho }).eq("id", projeto.id).select("id").single(), "Capa demo");
  }

  const orcamento = ok(
    await db
      .from("orcamentos")
      .insert({ cliente_id: cliente.id, projeto_id: projeto.id, titulo: demo.orcamento.dados.titulo, demonstracao: true })
      .select("id, revisao")
      .single(),
    "Orçamento demo",
  ) as { id: string; revisao: number };
  const totais = calcularTotais(demo.orcamento.dados, demo.orcamento.itens);
  const revisao = ok(
    await db.rpc("salvar_orcamento", {
      p_id: orcamento.id,
      p_revisao: orcamento.revisao,
      p_dados: demo.orcamento.dados,
      p_itens: demo.orcamento.itens,
      p_total: totais.total,
      p_custo: totais.custoTotal,
    }),
    "Itens do orçamento demo",
  );
  if (revisao === -1) throw new Error("Conflito de revisão ao gravar o orçamento demo.");

  const pub = await publicarOrcamento(db, orcamento.id, { linkExpiraEm: null, revogarAnteriores: false });
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    projeto: demo.projeto.nome,
    cliente: demo.cliente.nome,
    link: `${base}/p/${pub.token}`,
    pin: pub.pin,
    versaoId: pub.versaoId,
    orcamentoId: orcamento.id,
    projetoId: projeto.id,
  };
}

async function semearDemo(db: Db) {
  if (!process.env.PROPOSTA_SEGREDO || process.env.PROPOSTA_SEGREDO.length < 32) {
    throw new Error("Defina PROPOSTA_SEGREDO (mínimo 32 caracteres) antes de publicar as demonstrações.");
  }
  await limparDemo(db);
  const cat = await catalogoPorCodigo(db);
  if (Object.keys(cat).length === 0) throw new Error("Catálogo vazio: rode primeiro npm run seed:catalogo.");

  const acessos: Acesso[] = [];
  const telhado = demoTelhado(cat);
  const solo = demoSolo(cat);
  for (const aviso of [...telhado.avisos, ...solo.avisos]) console.warn(`  aviso: ${aviso}`);
  acessos.push(await gravarDemo(db, telhado, "supabase/demo/capa-telhado.jpg"));
  acessos.push(await gravarDemo(db, solo, "supabase/demo/capa-solo.jpg"));

  // Modelos reutilizáveis: as duas opções de poste para a mesma mesa e a cobertura de fibrocimento.
  const concreto = montarMesaDemo(cat, "concreto").cena;
  const aroeira = montarMesaDemo(cat, "aroeira").cena;
  const modelos = [
    {
      nome: "Mesa de solo 2 × 10 — postes de concreto",
      tipo: "solo",
      descricao: "Demonstração: 20 módulos em duas fileiras, postes de concreto, vigas e terças de perfil U.",
      conteudo: extrairModelo(concreto, concreto.superficies[0].id),
    },
    {
      nome: "Mesa de solo 2 × 10 — lascas de aroeira",
      tipo: "solo",
      descricao: "Demonstração: mesma mesa com lascas de aroeira no lugar dos postes de concreto.",
      conteudo: extrairModelo(aroeira, aroeira.superficies[0].id),
    },
    {
      nome: "Cobertura de fibrocimento 4 × 12 m sobre madeira",
      tipo: "telhado",
      descricao: "Demonstração: uma água com módulos em retrato, trilhos, grampos e fixações.",
      conteudo: extrairModelo(telhado.projeto.cena, telhado.projeto.cena.superficies[0].id),
    },
  ];
  ok(await db.from("modelos").insert(modelos.map((m) => ({ ...m, demonstracao: true }))).select("id"), "Modelos demo");

  writeFileSync(".demo-acessos.json", JSON.stringify(acessos, null, 2));
  console.log("\nDemonstrações publicadas (dados e preços FICTÍCIOS):");
  for (const a of acessos) {
    console.log(`\n  ${a.projeto}\n    Cliente: ${a.cliente}\n    Link:    ${a.link}\n    PIN:     ${a.pin}`);
  }
  console.log("\nOs links e PINs acima também foram gravados em .demo-acessos.json (arquivo local, fora do Git).");
  console.log("No painel, o PIN não é exibido de novo: use \"Trocar PIN\" na proposta se precisar de outro.");
}

async function main() {
  const args = argumentos();
  const db = clienteDeServico();
  if (args.catalogo) await semearCatalogo(db, args.atualizar === "true");
  if (args.demo) {
    if (args.limpar === "true") await limparDemo(db);
    else await semearDemo(db);
  }
  if (!args.catalogo && !args.demo) {
    console.log("Use --catalogo e/ou --demo. Veja o cabeçalho de scripts/seed.ts.");
  }
}

main().catch((e) => {
  console.error("Falha na carga:", e instanceof Error ? e.message : e);
  process.exit(1);
});

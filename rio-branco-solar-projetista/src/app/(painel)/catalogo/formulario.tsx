"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { salvarItemCatalogo } from "@/lib/acoes/orcamentos";
import { CampoDinheiro } from "@/components/campos";
import { Aviso, Botao, Campo, Entrada, AreaTexto, Selecao, Cartao } from "@/components/ui";

import type { ItemCatalogo } from "@/lib/dominio/tipos";

const MODELOS_SPECS: Record<string, { chave: string; rotulo: string }[]> = {
  modulo: [
    { chave: "potenciaWp", rotulo: "Potência (Wp)" },
    { chave: "larguraMm", rotulo: "Largura (mm)" },
    { chave: "comprimentoMm", rotulo: "Comprimento (mm)" },
    { chave: "espessuraMm", rotulo: "Espessura (mm)" },
    { chave: "pesoKg", rotulo: "Peso (kg)" },
    { chave: "vmp", rotulo: "Vmp (V)" },
    { chave: "imp", rotulo: "Imp (A)" },
    { chave: "voc", rotulo: "Voc (V)" },
    { chave: "isc", rotulo: "Isc (A)" },
    { chave: "coefVocPctC", rotulo: "Coef. Voc (%/°C)" },
    { chave: "coefPmaxPctC", rotulo: "Coef. Pmax (%/°C)" },
    { chave: "eficienciaPct", rotulo: "Eficiência (%)" },
    { chave: "celulas", rotulo: "Número de células" },
    { chave: "tecnologia", rotulo: "Tecnologia" },
  ],
  inversor: [
    { chave: "potenciaKw", rotulo: "Potência nominal (kW)" },
    { chave: "fases", rotulo: "Fases" },
    { chave: "tensaoCa", rotulo: "Tensão CA" },
    { chave: "tensaoMaxCc", rotulo: "Tensão máx. CC (V)" },
    { chave: "mpptMin", rotulo: "MPPT mín. (V)" },
    { chave: "mpptMax", rotulo: "MPPT máx. (V)" },
    { chave: "correnteMaxMppt", rotulo: "Corrente máx. por MPPT (A)" },
    { chave: "iscMaxMppt", rotulo: "Isc máx. por MPPT (A)" },
    { chave: "numMppt", rotulo: "Número de MPPT" },
    { chave: "stringsPorMppt", rotulo: "Strings por MPPT" },
    { chave: "potenciaMaxFvKwp", rotulo: "Potência FV máx. (kWp)" },
    { chave: "eficienciaMaxPct", rotulo: "Eficiência máx. (%)" },
  ],
  perfil: [
    { chave: "funcao", rotulo: "Função (trilho, viga, terca, poste, fixacao...)" },
    { chave: "material", rotulo: "Material" },
    { chave: "forma", rotulo: "Forma (retangular, u, circular, ponto)" },
    { chave: "larguraMm", rotulo: "Largura (mm)" },
    { chave: "alturaMm", rotulo: "Altura (mm)" },
    { chave: "espessuraMm", rotulo: "Espessura (mm)" },
    { chave: "comprimentoM", rotulo: "Comprimento da barra (m)" },
    { chave: "precoPor", rotulo: "Preço por (un ou m)" },
  ],
};

function tipoParaSpecs(tipo: string) {
  if (tipo === "modulo") return "modulo";
  if (tipo === "inversor") return "inversor";
  if (tipo === "perfil" || tipo === "estrutura") return "perfil";
  return "";
}

type Linha = { chave: string; valor: string };

function valorParaTexto(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function textoParaValor(t: string): string | number | boolean {
  const s = t.trim();
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+([.,]\d+)?$/.test(s)) return Number(s.replace(",", "."));
  return s;
}

export function FormularioItem({ item }: { item?: ItemCatalogo }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<ItemCatalogo["tipo"]>(item?.tipo ?? "modulo");
  const [fabricante, setFabricante] = useState(item?.fabricante ?? "");
  const [modelo, setModelo] = useState(item?.modelo ?? "");
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [unidade, setUnidade] = useState(item?.unidade ?? "un");
  const [custo, setCusto] = useState(item?.custo_centavos ?? 0);
  const [preco, setPreco] = useState(item?.preco_centavos ?? 0);
  const [demo, setDemo] = useState(item?.preco_demonstrativo ?? true);
  const [statusDados, setStatusDados] = useState<ItemCatalogo["status_dados"]>(item?.status_dados ?? "pendente");
  const [fonteUrl, setFonteUrl] = useState(item?.fonte_url ?? "");
  const [fonteTitulo, setFonteTitulo] = useState(item?.fonte_titulo ?? "");
  const [fonteData, setFonteData] = useState(item?.fonte_consultada_em ?? "");
  const [observacoes, setObservacoes] = useState(item?.observacoes ?? "");
  const [ativo, setAtivo] = useState(item?.ativo ?? true);
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    Object.entries(item?.specs ?? {}).map(([chave, v]) => ({ chave, valor: valorParaTexto(v) })),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const usarModelo = (kind: string) => {
    const existentes = new Set(linhas.map((l) => l.chave));
    const novas = (MODELOS_SPECS[kind] ?? []).filter((m) => !existentes.has(m.chave)).map((m) => ({ chave: m.chave, valor: "" }));
    setLinhas([...linhas, ...novas]);
  };

  const salvar = async () => {
    setErro(null);
    setEnviando(true);
    const specs: Record<string, string | number | boolean> = {};
    for (const l of linhas) {
      if (!l.chave.trim() || l.valor.trim() === "") continue;
      specs[l.chave.trim()] = textoParaValor(l.valor);
    }
    const payload = {
      tipo,
      fabricante: fabricante.trim(),
      modelo: modelo.trim(),
      descricao: descricao.trim(),
      unidade: unidade.trim() || "un",
      custo_centavos: custo,
      preco_centavos: preco,
      preco_demonstrativo: demo,
      status_dados: statusDados,
      fonte_url: fonteUrl.trim() || null,
      fonte_titulo: fonteTitulo.trim() || null,
      fonte_consultada_em: fonteData || null,
      observacoes: observacoes.trim() || null,
      ativo,
      specs,
    };
    const r = await salvarItemCatalogo(item?.id ?? null, JSON.stringify(payload));
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    router.push("/catalogo");
    router.refresh();
  };

  const tipoSpecs = tipoParaSpecs(tipo);

  return (
    <div className="space-y-4">
      <Cartao titulo="Identificação">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Tipo">
            <Selecao value={tipo} onChange={(e) => setTipo(e.target.value as ItemCatalogo["tipo"])}>
              <option value="modulo">Módulo fotovoltaico</option>
              <option value="inversor">Inversor</option>
              <option value="perfil">Perfil / trilho / viga / terça</option>
              <option value="estrutura">Estrutura (poste, fundação)</option>
              <option value="fixacao">Fixação e grampos</option>
              <option value="acessorio">Acessório elétrico ou material</option>
              <option value="servico">Serviço</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Unidade de venda">
            <Selecao value={unidade} onChange={(e) => setUnidade(e.target.value)}>
              {["un", "m", "pç", "par", "m³", "sv", "kg"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Fabricante" opcional>
            <Entrada value={fabricante} onChange={(e) => setFabricante(e.target.value)} />
          </Campo>
          <Campo rotulo="Modelo">
            <Entrada value={modelo} onChange={(e) => setModelo(e.target.value)} required />
          </Campo>
          <Campo rotulo="Descrição" className="sm:col-span-2">
            <AreaTexto value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>
        </div>
      </Cartao>

      <Cartao titulo="Preços" descricao="Preços são seus. Alterar o catálogo não muda propostas já publicadas.">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoDinheiro rotulo="Custo" centavos={custo} aoMudar={setCusto} />
          <CampoDinheiro rotulo="Preço de venda" centavos={preco} aoMudar={setPreco} />
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} /> Preço demonstrativo (não confirmado)
        </label>
      </Cartao>

      <Cartao titulo="Especificações" descricao="Dados técnicos da ficha do fabricante. Número é número: use vírgula ou ponto.">
        {tipoSpecs && (
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className="min-h-9 rounded-lg border border-linha px-3 text-sm text-azul" onClick={() => usarModelo(tipoSpecs)}>
              + Campos de {tipoSpecs === "modulo" ? "módulo" : tipoSpecs === "inversor" ? "inversor" : "perfil"}
            </button>
          </div>
        )}
        <div className="space-y-2">
          {linhas.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Entrada
                aria-label="Campo da especificação"
                list="campos-specs"
                value={l.chave}
                onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, chave: e.target.value } : x)))}
                placeholder="campo"
              />
              <Entrada aria-label="Valor" value={l.valor} onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />
              <button type="button" className="min-h-11 px-2 text-sm text-erro" onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>
                Remover
              </button>
            </div>
          ))}
        </div>
        <datalist id="campos-specs">
          {Object.values(MODELOS_SPECS)
            .flat()
            .map((m) => (
              <option key={m.chave} value={m.chave}>{m.rotulo}</option>
            ))}
        </datalist>
        <button type="button" className="mt-3 min-h-10 text-sm font-medium text-azul" onClick={() => setLinhas([...linhas, { chave: "", valor: "" }])}>
          + Adicionar campo
        </button>
      </Cartao>

      <Cartao titulo="Fonte e situação dos dados" descricao="Registre de onde vieram os dados. Dados sem confirmação ficam marcados como pendentes ou demonstrativos.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Situação dos dados">
            <Selecao value={statusDados} onChange={(e) => setStatusDados(e.target.value as ItemCatalogo["status_dados"])}>
              <option value="confirmado">Confirmado na ficha</option>
              <option value="pendente">Pendente de conferência</option>
              <option value="demonstrativo">Demonstrativo</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Data da consulta" opcional>
            <Entrada type="date" value={fonteData} onChange={(e) => setFonteData(e.target.value)} />
          </Campo>
          <Campo rotulo="Título da fonte" opcional>
            <Entrada value={fonteTitulo} onChange={(e) => setFonteTitulo(e.target.value)} />
          </Campo>
          <Campo rotulo="Endereço da fonte (link)" opcional>
            <Entrada type="url" inputMode="url" value={fonteUrl} onChange={(e) => setFonteUrl(e.target.value)} />
          </Campo>
          <Campo rotulo="Observações" opcional className="sm:col-span-2">
            <AreaTexto value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </Campo>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Item ativo (aparece nas escolhas de novos projetos)
        </label>
      </Cartao>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="flex justify-end gap-2">
        <Botao variante="secundario" onClick={() => router.push("/catalogo")}>Cancelar</Botao>
        <Botao tamanho="g" onClick={() => void salvar()} disabled={enviando || modelo.trim().length < 2}>
          {enviando ? "Salvando…" : "Salvar item"}
        </Botao>
      </div>
    </div>
  );
}


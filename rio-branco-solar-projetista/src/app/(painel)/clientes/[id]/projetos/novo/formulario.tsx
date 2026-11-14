"use client";

import { useMemo, useState } from "react";
import { criarProjeto } from "@/lib/acoes/projetos";
import { instrucoesAnalise, lerAnalise, type AnaliseLocal } from "@/lib/dominio/analise";
import { especDoCatalogo } from "@/lib/dominio/kit";
import type { EspecModulo, ItemCatalogo, Medidas, TipoProjeto } from "@/lib/dominio/tipos";
import { Aviso, Botao, Campo, Entrada, Selecao, cx } from "@/components/ui";
import { CampoNumero } from "@/components/campos";
import { PreviaAnalise } from "@/components/previa-analise";

type Modo = "medidas" | "gemini" | "chatgpt";

interface FotoEnviada {
  caminho: string;
  nome: string;
}

export function NovoProjetoForm({
  clienteId,
  clienteNome,
  locais,
  catalogo,
}: {
  clienteId: string;
  clienteNome: string;
  locais: { id: string; nome: string; tipo: string }[];
  catalogo: ItemCatalogo[];
}) {
  const [modo, setModo] = useState<Modo>("medidas");
  const [tipo, setTipo] = useState<TipoProjeto>("telhado");
  const [nome, setNome] = useState("");
  const [localId, setLocalId] = useState<string>(locais[0]?.id ?? "novo");
  const [localNovo, setLocalNovo] = useState("");
  const [medidas, setMedidas] = useState<Medidas>({});
  const [fotos, setFotos] = useState<FotoEnviada[]>([]);
  const [enviandoFotos, setEnviandoFotos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [analise, setAnalise] = useState<AnaliseLocal | null>(null);
  const [consentimento, setConsentimento] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [json, setJson] = useState("");
  const [copiado, setCopiado] = useState(false);

  const modulo: EspecModulo | null = useMemo(() => {
    for (const item of catalogo) {
      if (!item.ativo) continue;
      const e = especDoCatalogo(item);
      if (e) return e;
    }
    return null;
  }, [catalogo]);

  const nomeFinal = nome.trim() || `Projeto ${tipo === "telhado" ? "de telhado" : "de solo"} — ${clienteNome.split(" ")[0]}`;
  const prompt = instrucoesAnalise(tipo, medidas);

  const enviarFotos = async (lista: FileList | null) => {
    if (!lista || lista.length === 0) return;
    const f = new FormData();
    for (const a of Array.from(lista)) f.append("fotos", a);
    setEnviandoFotos(true);
    setErro(null);
    try {
      const r = await fetch("/api/fotos", { method: "POST", body: f });
      const j = (await r.json().catch(() => ({}))) as { erro?: string; fotos?: FotoEnviada[] };
      if (!r.ok || !j.fotos) throw new Error(j.erro ?? "Não foi possível enviar as fotos.");
      setFotos((atual) => [...atual, ...j.fotos!].slice(0, 12));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar as fotos.");
    } finally {
      setEnviandoFotos(false);
    }
  };

  const analisarComGemini = async () => {
    setAnalisando(true);
    setErro(null);
    setAnalise(null);
    try {
      const r = await fetch("/api/ia/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminhos: fotos.map((f) => f.caminho), tipo, medidas, consentimento: true }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; analise?: unknown; mensagem?: string };
      if (!r.ok || !j.ok || !j.analise) throw new Error(j.mensagem ?? "Não foi possível analisar as fotos.");
      const lido = lerAnalise(j.analise);
      if (!lido.ok) throw new Error("A resposta da IA veio incompleta. Tente outra foto ou use o ChatGPT.");
      setAnalise(lido.analise);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      setAnalisando(false);
    }
  };

  const verPreviaChatGPT = () => {
    setErro(null);
    setAnalise(null);
    const lido = lerAnalise(json);
    if (!lido.ok) {
      setErro(`Não consegui ler o JSON: ${lido.erros.join(" ")}`);
      return;
    }
    setAnalise(lido.analise);
  };

  const criar = async (origem: "medidas" | "gemini" | "chatgpt") => {
    setCriando(true);
    setErro(null);
    const payload = {
      clienteId,
      localId: localId === "novo" ? null : localId,
      localNovo: localId === "novo" ? localNovo : null,
      nome: nomeFinal,
      tipo,
      origem,
      medidas: {
        largura: medidas.largura ?? null,
        comprimento: medidas.comprimento ?? null,
        altura: medidas.altura ?? null,
        desnivel: medidas.desnivel ?? null,
        inclinacao: medidas.inclinacao ?? null,
        observacoes: medidas.observacoes ?? null,
      },
      analise: origem === "medidas" ? null : analise,
      fotos: fotos.map((f) => f.caminho),
    };
    const r = await criarProjeto(JSON.stringify(payload));
    if (r?.erro) {
      setErro(r.erro);
      setCriando(false);
    }
  };

  const abas: { id: Modo; rotulo: string; sub: string }[] = [
    { id: "medidas", rotulo: "Montar pelas medidas", sub: "Você informa as medidas" },
    { id: "gemini", rotulo: "Analisar foto com IA", sub: "Gemini, cota gratuita" },
    { id: "chatgpt", rotulo: "Importar do ChatGPT", sub: "Sua conta Plus, sem chave" },
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Como criar o projeto" className="grid gap-2 sm:grid-cols-3">
        {abas.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={modo === a.id}
            onClick={() => {
              setModo(a.id);
              setErro(null);
              setAnalise(null);
            }}
            className={cx(
              "min-h-14 rounded-xl border px-3 py-2 text-left",
              modo === a.id ? "border-azul bg-azul text-white" : "border-linha bg-white text-azul",
            )}
          >
            <span className="block text-sm font-semibold">{a.rotulo}</span>
            <span className={cx("block text-xs", modo === a.id ? "text-white/80" : "text-cinza")}>{a.sub}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-linha bg-white p-4 sm:grid-cols-2">
        <Campo rotulo="Tipo de instalação">
          <Selecao value={tipo} onChange={(e) => setTipo(e.target.value as TipoProjeto)}>
            <option value="telhado">Telhado</option>
            <option value="solo">Estrutura de solo</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Nome do projeto" opcional>
          <Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder={nomeFinal} />
        </Campo>
        <Campo rotulo="Local">
          <Selecao value={localId} onChange={(e) => setLocalId(e.target.value)}>
            {locais.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
            <option value="novo">+ Novo local</option>
          </Selecao>
        </Campo>
        {localId === "novo" && (
          <Campo rotulo="Nome do novo local">
            <Entrada value={localNovo} onChange={(e) => setLocalNovo(e.target.value)} placeholder="Ex.: Casa, galpão" />
          </Campo>
        )}
      </div>

      <div className="grid gap-4 rounded-2xl border border-linha bg-white p-4 sm:grid-cols-3">
        <CampoNumero
          rotulo={tipo === "telhado" ? "Largura do telhado" : "Largura do terreno"}
          valor={medidas.largura ?? null}
          passo={0.5}
          min={0.5}
          max={500}
          sufixo="m"
          aoMudar={(v) => setMedidas((m) => ({ ...m, largura: v }))}
        />
        <CampoNumero
          rotulo={tipo === "telhado" ? "Comprimento do telhado" : "Comprimento do terreno"}
          valor={medidas.comprimento ?? null}
          passo={0.5}
          min={0.5}
          max={500}
          sufixo="m"
          aoMudar={(v) => setMedidas((m) => ({ ...m, comprimento: v }))}
        />
        {tipo === "telhado" ? (
          <CampoNumero rotulo="Altura do beiral" valor={medidas.altura ?? null} passo={0.1} min={0} max={50} sufixo="m" aoMudar={(v) => setMedidas((m) => ({ ...m, altura: v }))} />
        ) : (
          <CampoNumero rotulo="Desnível" valor={medidas.desnivel ?? null} passo={0.1} min={0} max={50} sufixo="m" aoMudar={(v) => setMedidas((m) => ({ ...m, desnivel: v }))} />
        )}
        <CampoNumero rotulo="Inclinação" valor={medidas.inclinacao ?? null} passo={1} min={0} max={60} casas={0} sufixo="°" aoMudar={(v) => setMedidas((m) => ({ ...m, inclinacao: v }))} />
        <Campo rotulo="Outras medidas ou observações" opcional className="sm:col-span-2">
          <Entrada value={medidas.observacoes ?? ""} onChange={(e) => setMedidas((m) => ({ ...m, observacoes: e.target.value }))} placeholder="Ex.: caixa d'água de 1000 L no canto direito" />
        </Campo>
      </div>

      <div className="rounded-2xl border border-linha bg-white p-4">
        <p className="mb-2 text-sm font-medium">Fotos do local (opcional, mas ajudam)</p>
        <p className="mb-3 text-xs text-cinza">Tire fotos de ângulos diferentes com o celular. As fotos ficam privadas e só você as vê.</p>
        <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-azul/40 bg-papel px-3 text-sm font-medium text-azul">
          {enviandoFotos ? "Enviando…" : "Tirar ou escolher fotos"}
          <input type="file" accept="image/*" multiple capture="environment" className="sr-only" disabled={enviandoFotos} onChange={(e) => void enviarFotos(e.target.files)} />
        </label>
        {fotos.length > 0 && <p className="mt-2 text-sm text-verde">{fotos.length} foto(s) recebida(s).</p>}
      </div>

      {modo === "medidas" && (
        <div className="flex justify-end">
          <Botao tamanho="g" onClick={() => void criar("medidas")} disabled={criando}>
            {criando ? "Criando…" : "Criar projeto e abrir o desenho"}
          </Botao>
        </div>
      )}

      {modo === "gemini" && (
        <div className="space-y-4 rounded-2xl border border-linha bg-white p-4">
          <Aviso tipo="atencao">
            <p className="font-semibold">Antes de enviar a foto</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>As fotos são enviadas à API Gemini do Google para análise.</li>
              <li>
                No nível gratuito (projeto sem faturamento), o Google pode usar os conteúdos enviados para melhorar seus produtos, e revisores humanos podem ler
                as entradas e saídas.
              </li>
              <li>Não envie fotos com pessoas, documentos ou dados sensíveis.</li>
              <li>Quando não quiser esse uso, use o editor manual ou a importação pelo ChatGPT, que não envia nada ao Gemini.</li>
            </ul>
          </Aviso>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
            <span>Li o aviso e concordo em enviar estas fotos para análise pelo Gemini.</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Botao onClick={() => void analisarComGemini()} disabled={!consentimento || fotos.length === 0 || analisando}>
              {analisando ? "Analisando…" : "Analisar fotos"}
            </Botao>
            {fotos.length === 0 && <span className="self-center text-xs text-cinza">Envie pelo menos uma foto.</span>}
          </div>
          {analise && (
            <>
              <PreviaAnalise analise={analise} medidas={medidas} tipo={tipo} modulo={modulo} />
              <Botao tamanho="g" onClick={() => void criar("gemini")} disabled={criando}>
                {criando ? "Criando…" : "Criar projeto com esta análise"}
              </Botao>
            </>
          )}
        </div>
      )}

      {modo === "chatgpt" && (
        <div className="space-y-4 rounded-2xl border border-linha bg-white p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-cinza">
            <li>Copie o prompt abaixo.</li>
            <li>No seu ChatGPT Plus, anexe a foto do local e cole o prompt.</li>
            <li>Copie a resposta em JSON e cole no campo abaixo.</li>
            <li>Confira a prévia e crie o projeto. Não é preciso chave de API.</li>
          </ol>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">Prompt para o ChatGPT</span>
              <Botao
                variante="secundario"
                tamanho="p"
                onClick={async () => {
                  await navigator.clipboard.writeText(prompt).catch(() => undefined);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                }}
              >
                {copiado ? "Copiado" : "Copiar prompt"}
              </Botao>
            </div>
            <textarea readOnly value={prompt} rows={8} className="w-full rounded-lg border border-linha bg-papel p-2 font-mono text-xs" aria-label="Prompt para o ChatGPT" />
          </div>
          <div>
            <label htmlFor="json-chatgpt" className="mb-1 block text-sm font-medium">
              Resposta do ChatGPT (JSON)
            </label>
            <textarea
              id="json-chatgpt"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={8}
              placeholder='Cole aqui a resposta. Pode vir com texto antes e depois do JSON.'
              className="w-full rounded-lg border border-linha bg-white p-2 font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" onClick={verPreviaChatGPT} disabled={json.trim().length < 5}>
              Ver prévia
            </Botao>
          </div>
          {analise && (
            <>
              <PreviaAnalise analise={analise} medidas={medidas} tipo={tipo} modulo={modulo} />
              <Botao tamanho="g" onClick={() => void criar("chatgpt")} disabled={criando}>
                {criando ? "Criando…" : "Aplicar e criar projeto"}
              </Botao>
            </>
          )}
        </div>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { CampoNumero } from "@/components/campos";
import { Aviso, Botao, Campo, Cartao, Entrada, Selecao, Selo, Vazio } from "@/components/ui";
import { excluirModelo, salvarModelo } from "@/lib/acoes/projetos";
import { aguaOposta, areaPadrao, dimensoesMesa, inserirModelo, novaAgua, novaMesa, novoObstaculo, redimensionar } from "@/lib/dominio/cena";
import { adicionarFileira, adicionarModulo, distribuir, duplicarModulos, excluirModulos, girarModulos, trocarModelo } from "@/lib/dominio/distribuicao";
import { agruparComponentes, gerarEstrutura, type MapaCatalogo } from "@/lib/dominio/estrutura";
import { arred, retangulo } from "@/lib/dominio/geometria";
import { potenciaKwp } from "@/lib/dominio/kit";
import type { Cena, ItemCatalogo, Kit, MapaModulos, Medidas, Superficie, TipoObstaculo, TipoProjeto } from "@/lib/dominio/tipos";
import type { ResultadoValidacao } from "@/lib/dominio/validacao";
import type { Camadas, ApiCena3D, Visao } from "@/components/cena3d";
import { ROTULO_ORIGEM } from "@/lib/dominio/analise";
import { formatarNumero } from "@/lib/dominio/dinheiro";

export type Aba = "superficies" | "modulos" | "obstaculos" | "estrutura" | "modelos" | "medidas" | "pendencias";

export interface EditorApi {
  aba: Aba;
  setAba: (a: Aba) => void;
  cena: Cena;
  specs: MapaModulos;
  catalogo: Record<string, ItemCatalogo>;
  modulosCatalogo: ItemCatalogo[];
  modelos: { id: string; nome: string; tipo: TipoProjeto; descricao: string; conteudo: Cena }[];
  locais: { id: string; nome: string }[];
  fotos: { caminho: string; nome: string }[];
  tipo: TipoProjeto;
  projetoId: string;
  clienteNome: string;
  kit: Kit;
  trocarKit: (k: Kit) => void;
  salvarAgora: () => Promise<void>;
  medidas: Medidas;
  alterarMedidas: (m: Medidas) => void;
  nome: string;
  trocarNome: (v: string) => void;
  localId: string | null;
  trocarLocal: (v: string | null) => void;
  superficie: Superficie | null;
  setSuperficieAtiva: (id: string) => void;
  aplicar: (fn: (c: Cena) => Cena, registrar?: boolean) => void;
  selecionados: string[];
  setSelecionados: (ids: string[]) => void;
  multi: boolean;
  setMulti: (v: boolean) => void;
  validacao: ResultadoValidacao;
  problemas: Record<string, "erro" | "aviso">;
  distribuirAgora: (supId?: string | null) => void;
  banner: string | null;
  setBanner: (v: string | null) => void;
  mensagem: string | null;
  setMensagem: (v: string | null) => void;
  desfazer: () => void;
  podeDesfazer: boolean;
  avisoRedistribuir: () => void;
  capaSalva: string | null;
  setCapaSalva: (v: string | null) => void;
  camadas: Camadas;
  setCamadas: (fn: (c: Camadas) => Camadas) => void;
  visao: Visao;
  setVisao: (v: Visao) => void;
  api3d: { current: ApiCena3D | null };
  marcarSujo: () => void;
  recarregar: () => void;
}

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "superficies", rotulo: "Cobertura / mesas" },
  { id: "modulos", rotulo: "Módulos" },
  { id: "obstaculos", rotulo: "Obstáculos" },
  { id: "estrutura", rotulo: "Estrutura" },
  { id: "modelos", rotulo: "Modelos" },
  { id: "medidas", rotulo: "Medidas" },
  { id: "pendencias", rotulo: "Confirmações" },
];

const TIPOS_OBSTACULO: { id: TipoObstaculo; rotulo: string }[] = [
  { id: "caixa_dagua", rotulo: "Caixa d'água" },
  { id: "chamine", rotulo: "Chaminé" },
  { id: "claraboia", rotulo: "Claraboia" },
  { id: "antena", rotulo: "Antena" },
  { id: "arvore", rotulo: "Árvore" },
  { id: "construcao", rotulo: "Construção" },
];

const MATERIAIS_COBERTURA = [
  { v: "fibrocimento", r: "Fibrocimento" },
  { v: "ceramica", r: "Cerâmica" },
  { v: "metalica", r: "Metálica" },
  { v: "laje", r: "Laje" },
  { v: "outro", r: "Outro" },
];

function atualizarSup(c: Cena, id: string, fn: (s: Superficie) => Superficie): Cena {
  return { ...c, superficies: c.superficies.map((s) => (s.id === id ? fn(s) : s)) };
}

/** Recalcula o plano da mesa com fileiras, módulos e orientação, e distribui de novo. */
function ajustarMesa(c: Cena, supId: string, specs: MapaModulos, mudanca: { fileiras?: number; modulos?: number; orientacao?: "retrato" | "paisagem" }): Cena {
  const sup = c.superficies.find((s) => s.id === supId);
  const spec = sup?.layout.moduloId ? specs[sup.layout.moduloId] : undefined;
  if (!sup || !spec || !sup.mesa) return c;
  const fileiras = mudanca.fileiras ?? sup.mesa.fileiras;
  const modulos = mudanca.modulos ?? sup.mesa.modulosPorFileira;
  const orientacao = mudanca.orientacao ?? sup.layout.orientacao;
  const d = dimensoesMesa(fileiras, modulos, orientacao, sup.layout.espacamentoH, sup.layout.espacamentoV, spec);
  const c2 = atualizarSup(c, supId, (s) => ({
    ...s,
    mesa: { fileiras, modulosPorFileira: modulos },
    largura: d.largura,
    comprimento: d.comprimento,
    contorno: retangulo(d.largura, d.comprimento),
    layout: { ...s.layout, orientacao },
  }));
  return distribuir(c2, supId, specs).cena;
}

export function Paineis({ ed }: { ed: EditorApi }) {
  return (
    <div className="space-y-3">
      <nav aria-label="Seções do editor" className="rolagem-suave -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => ed.setAba(a.id)}
            aria-current={ed.aba === a.id ? "page" : undefined}
            className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-medium ${ed.aba === a.id ? "bg-azul text-white" : "bg-white text-azul border border-linha"}`}
          >
            {a.rotulo}
            {a.id === "pendencias" && ed.cena.pendencias.some((p) => !p.confirmado) && (
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-sol align-middle" aria-label="há confirmações pendentes" />
            )}
          </button>
        ))}
      </nav>
      {ed.aba === "superficies" && <AbaSuperficies ed={ed} />}
      {ed.aba === "modulos" && <AbaModulos ed={ed} />}
      {ed.aba === "obstaculos" && <AbaObstaculos ed={ed} />}
      {ed.aba === "estrutura" && <AbaEstrutura ed={ed} />}
      {ed.aba === "modelos" && <AbaModelos ed={ed} />}
      {ed.aba === "medidas" && <AbaMedidas ed={ed} />}
      {ed.aba === "pendencias" && <AbaPendencias ed={ed} />}
    </div>
  );
}

// ------------------------------------------------------- superfícies

function AbaSuperficies({ ed }: { ed: EditorApi }) {
  const s = ed.superficie;
  const modeloPadrao = ed.modulosCatalogo[0];
  const porModulo = ed.modulosCatalogo.find((m) => m.id === s?.layout.moduloId);

  const adicionarAgua = () => {
    const ultima = ed.cena.superficies.filter((x) => x.classe === "agua").at(-1);
    const origem = ultima ? { x: arred(ultima.origem.x + ultima.largura + 1.5), y: ultima.origem.y } : { x: 0, y: 0 };
    const nova = novaAgua({
      nome: `Água ${ed.cena.superficies.filter((x) => x.classe === "agua").length + 1}`,
      largura: 8,
      comprimento: 4,
      origem,
      alturaBase: ed.medidas.altura ?? 3,
      inclinacao: ed.medidas.inclinacao ?? 10,
      moduloId: modeloPadrao?.id ?? null,
    });
    ed.aplicar((c) => ({ ...c, superficies: [...c.superficies, nova] }));
    ed.setSuperficieAtiva(nova.id);
  };

  const adicionarMesa = () => {
    if (!modeloPadrao) return ed.setMensagem("Cadastre um módulo ativo no catálogo antes de criar a mesa.");
    const espec = ed.specs[modeloPadrao.id];
    const mesa = novaMesa({ nome: `Mesa ${ed.cena.superficies.length + 1}`, fileiras: 2, modulosPorFileira: 10, inclinacao: ed.medidas.inclinacao ?? 10, alturaBase: 1 }, espec);
    const comDistribuicao = distribuir({ ...ed.cena, superficies: [...ed.cena.superficies, mesa] }, mesa.id, ed.specs).cena;
    ed.aplicar(() => comDistribuicao);
    ed.setSuperficieAtiva(mesa.id);
  };

  const remover = () => {
    if (!s || !window.confirm(`Excluir "${s.nome}" com seus módulos, obstáculos e estrutura?`)) return;
    ed.aplicar((c) => ({
      ...c,
      superficies: c.superficies.filter((x) => x.id !== s.id),
      obstaculos: c.obstaculos.filter((o) => o.superficieId !== s.id),
      modulos: c.modulos.filter((m) => m.superficieId !== s.id),
      componentes: c.componentes.filter((k) => k.superficieId !== s.id),
    }));
  };

  if (!s) {
    return (
      <Cartao>
        <Vazio titulo={ed.tipo === "telhado" ? "Ainda não há água de telhado." : "Ainda não há mesa de solo."}>
          Crie a superfície e ajuste as medidas aqui, ou use a aba Medidas para aplicar as que você informou.
        </Vazio>
        <div className="mt-3 flex flex-wrap gap-2">
          {ed.tipo === "telhado" ? (
            <Botao onClick={adicionarAgua}>+ Água de telhado</Botao>
          ) : (
            <Botao onClick={adicionarMesa}>+ Mesa de solo</Botao>
          )}
        </div>
      </Cartao>
    );
  }

  const ehMesa = s.classe === "mesa";
  return (
    <Cartao
      titulo={s.nome}
      descricao={ehMesa ? "Mesa de solo: as dimensões vêm das fileiras e dos módulos." : "Água do telhado: as dimensões são do plano sobre a telha."}
      acoes={
        <div className="flex flex-wrap gap-2">
          {ed.cena.superficies.length > 1 &&
            ed.cena.superficies.map((x) => (
              <button
                key={x.id}
                onClick={() => ed.setSuperficieAtiva(x.id)}
                aria-pressed={x.id === s.id}
                className={`min-h-9 rounded-full border px-3 text-xs font-medium ${x.id === s.id ? "border-azul bg-azul text-white" : "border-linha bg-white text-azul"}`}
              >
                {x.nome}
              </button>
            ))}
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome">
          <Entrada value={s.nome} onChange={(e) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, nome: e.target.value.slice(0, 60) })))} />
        </Campo>
        {!ehMesa && (
          <>
            <CampoNumero
              rotulo="Largura (m)"
              valor={s.largura}
              passo={0.1}
              min={0.5}
              max={200}
              aoMudar={(v) => {
                ed.aplicar((c) => redimensionar(c, s.id, v, s.comprimento));
                ed.avisoRedistribuir();
              }}
            />
            <CampoNumero
              rotulo="Comprimento (m)"
              valor={s.comprimento}
              passo={0.1}
              min={0.5}
              max={200}
              aoMudar={(v) => {
                ed.aplicar((c) => redimensionar(c, s.id, s.largura, v));
                ed.avisoRedistribuir();
              }}
            />
            <CampoNumero rotulo="Inclinação (°)" valor={s.inclinacao} passo={1} min={0} max={60} casas={1} aoMudar={(v) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, inclinacao: v })))} />
            <CampoNumero rotulo="Altura do beiral (m)" valor={s.alturaBase} passo={0.1} min={0} max={50} aoMudar={(v) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, alturaBase: v })))} />
          </>
        )}
        {ehMesa && s.mesa && (
          <>
            <CampoNumero rotulo="Fileiras" valor={s.mesa.fileiras} passo={1} min={1} max={20} casas={0} aoMudar={(v) => { ed.aplicar((c) => ajustarMesa(c, s.id, ed.specs, { fileiras: v })); }} />
            <CampoNumero rotulo="Módulos por fileira" valor={s.mesa.modulosPorFileira} passo={1} min={1} max={60} casas={0} aoMudar={(v) => { ed.aplicar((c) => ajustarMesa(c, s.id, ed.specs, { modulos: v })); }} />
            <Campo rotulo="Orientação dos módulos">
              <Selecao value={s.layout.orientacao} onChange={(e) => ed.aplicar((c) => ajustarMesa(c, s.id, ed.specs, { orientacao: e.target.value as "retrato" | "paisagem" }))}>
                <option value="retrato">Retrato</option>
                <option value="paisagem">Paisagem</option>
              </Selecao>
            </Campo>
            <CampoNumero rotulo="Inclinação (°)" valor={s.inclinacao} passo={1} min={0} max={45} casas={1} aoMudar={(v) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, inclinacao: v })))} />
            <CampoNumero rotulo="Altura dianteira (m)" valor={s.alturaBase} passo={0.1} min={0.2} max={10} aoMudar={(v) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, alturaBase: v })))} />
            <p className="self-end text-sm text-cinza">
              Altura traseira: {formatarNumero(s.alturaBase + s.comprimento * Math.sin((s.inclinacao * Math.PI) / 180), 2)} m
            </p>
          </>
        )}
        {!ehMesa && s.cobertura && (
          <>
            <Campo rotulo="Material da cobertura">
              <Selecao
                value={s.cobertura.material}
                onChange={(e) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, cobertura: { material: e.target.value as "fibrocimento", estrutura: x.cobertura?.estrutura ?? "madeira" } })))}
              >
                {MATERIAIS_COBERTURA.map((m) => (
                  <option key={m.v} value={m.v}>{m.r}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Estrutura do telhado">
              <Selecao
                value={s.cobertura.estrutura}
                onChange={(e) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, cobertura: { material: x.cobertura?.material ?? "fibrocimento", estrutura: e.target.value as "madeira" } })))}
              >
                <option value="madeira">Madeira</option>
                <option value="metalica">Metálica</option>
                <option value="concreto">Concreto</option>
                <option value="desconhecida">Não sei</option>
              </Selecao>
            </Campo>
          </>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Botao variante="primario" onClick={() => ed.distribuirAgora(s.id)} disabled={!s.layout.moduloId}>
          Distribuir módulos
        </Botao>
        {!ehMesa && (
          <Botao variante="secundario" onClick={() => ed.aplicar((c) => ({ ...c, superficies: [...c.superficies, aguaOposta(s, `${s.nome} (outra água)`)] }))}>
            Adicionar água oposta
          </Botao>
        )}
        {!ehMesa && (
          <Botao variante="secundario" onClick={adicionarAgua}>
            + Outra água
          </Botao>
        )}
        {ehMesa && (
          <Botao variante="secundario" onClick={adicionarMesa}>
            + Outra mesa
          </Botao>
        )}
        <Botao variante="perigo" onClick={remover}>
          Excluir
        </Botao>
      </div>
      {!s.layout.moduloId && <Aviso tipo="atencao" className="mt-3">Escolha o modelo do módulo na aba Módulos para distribuir.</Aviso>}
      {porModulo && <p className="mt-2 text-xs text-cinza">Modelo: {porModulo.fabricante} {porModulo.modelo}</p>}
    </Cartao>
  );
}

// ---------------------------------------------------------------- módulos

function AbaModulos({ ed }: { ed: EditorApi }) {
  const s = ed.superficie;
  const v = ed.validacao;
  const potencia = useMemo(() => {
    const cont: Record<string, number> = {};
    for (const m of ed.cena.modulos) cont[m.moduloId] = (cont[m.moduloId] ?? 0) + 1;
    const kit = Object.entries(cont).map(([id, q]) => ({ catalogoId: id, quantidade: q, automatico: true }));
    return potenciaKwp({ modulos: kit, inversores: [], geracaoMensalKwh: null, origemGeracao: "", verificacao: ed.kit.verificacao }, ed.catalogo);
  }, [ed.cena.modulos, ed.catalogo, ed.kit.verificacao]);

  if (!s) return <Cartao><Vazio titulo="Crie primeiro uma cobertura ou mesa."><span>Use a aba Cobertura / mesas.</span></Vazio></Cartao>;

  const selecionados = ed.cena.modulos.filter((m) => ed.selecionados.includes(m.id));
  const mudarModelo = (id: string) => {
    if (!id) return;
    ed.aplicar((c) => {
      const c2 = trocarModelo(c, s.id, id);
      return distribuir(c2, s.id, ed.specs).cena;
    });
    ed.setBanner("Modelo trocado e distribuição refeita. Confira os destaques em vermelho ou âmbar.");
  };
  const opsSelecao = (fn: (c: Cena) => Cena, msg?: string) => {
    ed.aplicar(fn);
    if (msg) ed.setBanner(msg);
  };

  return (
    <Cartao
      titulo="Distribuição dos módulos"
      descricao={`${ed.cena.modulos.filter((m) => m.superficieId === s.id).length} módulo(s) em ${s.nome} · ${formatarNumero(potencia, 2)} kWp no desenho`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Modelo do módulo" dica={ed.modulosCatalogo.length === 0 ? "Nenhum módulo ativo no catálogo." : undefined}>
          <Selecao value={s.layout.moduloId ?? ""} onChange={(e) => mudarModelo(e.target.value)}>
            <option value="">— escolher —</option>
            {ed.modulosCatalogo.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fabricante} {m.modelo} · {m.specs.potenciaWp} Wp
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Orientação">
          <Selecao
            value={s.layout.orientacao}
            onChange={(e) => {
              ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, layout: { ...x.layout, orientacao: e.target.value as "retrato" | "paisagem" } })));
              ed.avisoRedistribuir();
            }}
          >
            <option value="retrato">Retrato (em pé)</option>
            <option value="paisagem">Paisagem (deitado)</option>
          </Selecao>
        </Campo>
        <CampoNumero rotulo="Espaço entre módulos (lado)" valor={s.layout.espacamentoH} passo={0.01} min={0} max={1} sufixo="m" aoMudar={(x) => ed.aplicar((c) => atualizarSup(c, s.id, (y) => ({ ...y, layout: { ...y.layout, espacamentoH: x } })))} />
        <CampoNumero rotulo="Espaço entre fileiras" valor={s.layout.espacamentoV} passo={0.01} min={0} max={2} sufixo="m" aoMudar={(x) => ed.aplicar((c) => atualizarSup(c, s.id, (y) => ({ ...y, layout: { ...y.layout, espacamentoV: x } })))} />
        {s.classe === "agua" && (
          <>
            <CampoNumero rotulo="Afastamento das bordas" valor={s.layout.afastamentoBorda} passo={0.05} min={0} max={3} sufixo="m" aoMudar={(x) => { ed.aplicar((c) => ({ ...c, superficies: c.superficies.map((y) => (y.id === s.id ? { ...y, layout: { ...y.layout, afastamentoBorda: x }, areas: [areaPadrao(y.largura, y.comprimento, x)] } : y)) })); ed.avisoRedistribuir(); }} />
            <CampoNumero rotulo="Folga dos obstáculos" valor={s.layout.folgaObstaculo} passo={0.05} min={0} max={3} sufixo="m" aoMudar={(x) => ed.aplicar((c) => atualizarSup(c, s.id, (y) => ({ ...y, layout: { ...y.layout, folgaObstaculo: x } })))} />
          </>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Botao onClick={() => ed.distribuirAgora(s.id)} disabled={!s.layout.moduloId}>
          Distribuir automaticamente
        </Botao>
        <Botao variante="secundario" onClick={() => ed.aplicar((c) => adicionarModulo(c, s.id, ed.specs).cena)} disabled={!s.layout.moduloId}>
          + Módulo
        </Botao>
        <Botao variante="secundario" onClick={() => ed.aplicar((c) => adicionarFileira(c, s.id, ed.specs, 5))} disabled={!s.layout.moduloId}>
          + Fileira de 5
        </Botao>
      </div>

      <div className="mt-4 rounded-xl border border-linha p-3">
        <p className="text-sm font-medium">
          Conferência: <span className={v.erros > 0 ? "text-erro" : "text-verde"}>{v.erros} com erro</span> · {v.avisos} com aviso
        </p>
        {v.problemas.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {v.problemas.slice(0, 10).map((p, i) => (
              <li key={`${p.moduloId}-${i}`}>
                <button className="min-h-9 text-left underline-offset-2 hover:underline" onClick={() => ed.setSelecionados([p.moduloId])}>
                  <span className={p.gravidade === "erro" ? "text-erro" : "text-azul-escuro"}>● {p.gravidade === "erro" ? "Erro" : "Aviso"}:</span> {p.mensagem}
                </button>
              </li>
            ))}
          </ul>
        )}
        {v.problemas.length === 0 && <p className="mt-1 text-sm text-cinza">Nenhum conflito: módulos dentro da área, sem sobreposição.</p>}
      </div>

      <div className="mt-4 rounded-xl border border-linha p-3">
        <p className="text-sm font-medium">
          Selecionados: {selecionados.length}
          <span className="ml-2 text-xs font-normal text-cinza">Toque nas peças para selecionar. Use &quot;Selecionar várias&quot; para pegar mais de uma.</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Botao tamanho="p" variante="secundario" disabled={selecionados.length === 0} onClick={() => opsSelecao((c) => girarModulos(c, ed.selecionados))}>
            Girar 90°
          </Botao>
          <Botao tamanho="p" variante="secundario" disabled={selecionados.length === 0} onClick={() => {
            const r = duplicarModulos(ed.cena, ed.selecionados, ed.specs);
            ed.aplicar(() => r.cena);
            ed.setSelecionados(r.novos);
          }}>
            Duplicar
          </Botao>
          <Botao tamanho="p" variante="secundario" disabled={selecionados.length === 0} onClick={() => {
            const fileiras = new Set(selecionados.map((m) => m.fileira));
            const ids = ed.cena.modulos.filter((m) => fileiras.has(m.fileira)).map((m) => m.id);
            opsSelecao((c) => excluirModulos(c, ids), `Fileira removida (${ids.length} módulo(s)).`);
            ed.setSelecionados([]);
          }}>
            Excluir fileira
          </Botao>
          <Botao tamanho="p" variante="perigo" disabled={selecionados.length === 0} onClick={() => {
            opsSelecao((c) => excluirModulos(c, ed.selecionados));
            ed.setSelecionados([]);
          }}>
            Excluir
          </Botao>
          {ed.selecionados.length > 0 && (
            <Botao tamanho="p" variante="sutil" onClick={() => ed.setSelecionados([])}>
              Limpar seleção
            </Botao>
          )}
        </div>
        <p className="mt-2 text-xs text-cinza">Arraste uma peça selecionada na planta para mover o grupo. Os módulos permanecem na superfície.</p>
      </div>
    </Cartao>
  );
}

// ------------------------------------------------------------- obstáculos

function AbaObstaculos({ ed }: { ed: EditorApi }) {
  const s = ed.superficie;
  const obstaculos = ed.cena.obstaculos.filter((o) => (s ? o.superficieId === s.id : !o.superficieId));
  const sel = ed.cena.obstaculos.find((o) => ed.selecionados.includes(o.id) && obstaculos.includes(o));

  const adicionar = (tipo: TipoObstaculo) => {
    const base = s ? { largura: s.largura, comprimento: s.comprimento } : { largura: 10, comprimento: 10 };
    const o = novoObstaculo(tipo, s?.id ?? null, base.largura / 2, base.comprimento / 2);
    ed.aplicar((c) => ({ ...c, obstaculos: [...c.obstaculos, o] }));
    ed.setSelecionados([o.id]);
    ed.setBanner("Obstáculo adicionado no centro. Arraste na planta ou ajuste as medidas abaixo.");
  };

  return (
    <div className="space-y-3">
      <Cartao titulo="Adicionar obstáculo" descricao={s ? `Em ${s.nome}` : "No terreno"}>
        <div className="flex flex-wrap gap-2">
          {TIPOS_OBSTACULO.map((t) => (
            <Botao key={t.id} variante="secundario" tamanho="p" onClick={() => adicionar(t.id)}>
              + {t.rotulo}
            </Botao>
          ))}
        </div>
      </Cartao>
      <Cartao titulo="Obstáculos nesta superfície" descricao="Os módulos são desviados e a conferência aponta qualquer conflito.">
        {obstaculos.length === 0 ? (
          <Vazio titulo="Nenhum obstáculo aqui." />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {obstaculos.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => ed.setSelecionados([o.id])}
                  aria-pressed={ed.selecionados.includes(o.id)}
                  className={`min-h-10 rounded-full border px-3 text-sm ${ed.selecionados.includes(o.id) ? "border-azul bg-azul text-white" : "border-linha bg-white text-azul"}`}
                >
                  {o.nome}
                </button>
              </li>
            ))}
          </ul>
        )}
        {sel && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome">
              <Entrada value={sel.nome} onChange={(e) => ed.aplicar((c) => ({ ...c, obstaculos: c.obstaculos.map((o) => (o.id === sel.id ? { ...o, nome: e.target.value.slice(0, 40) } : o)) }))} />
            </Campo>
            <CampoNumero rotulo="Largura (m)" valor={sel.largura} passo={0.1} min={0.05} max={50} aoMudar={(v) => ed.aplicar((c) => ({ ...c, obstaculos: c.obstaculos.map((o) => (o.id === sel.id ? { ...o, largura: v } : o)) }))} />
            <CampoNumero rotulo="Comprimento (m)" valor={sel.comprimento} passo={0.1} min={0.05} max={50} aoMudar={(v) => ed.aplicar((c) => ({ ...c, obstaculos: c.obstaculos.map((o) => (o.id === sel.id ? { ...o, comprimento: v } : o)) }))} />
            <CampoNumero rotulo="Altura (m)" valor={sel.altura} passo={0.1} min={0} max={50} aoMudar={(v) => ed.aplicar((c) => ({ ...c, obstaculos: c.obstaculos.map((o) => (o.id === sel.id ? { ...o, altura: v } : o)) }))} />
            <CampoNumero rotulo={s ? "Posição: distância da borda esquerda (m)" : "Posição X (m)"} valor={sel.u} passo={0.1} aoMudar={(v) => ed.aplicar((c) => ({ ...c, obstaculos: c.obstaculos.map((o) => (o.id === sel.id ? { ...o, u: v } : o)) }))} />
            <CampoNumero rotulo={s ? "Posição: distância do beiral (m)" : "Posição Y (m)"} valor={sel.v} passo={0.1} aoMudar={(v) => ed.aplicar((c) => ({ ...c, obstaculos: c.obstaculos.map((o) => (o.id === sel.id ? { ...o, v } : o)) }))} />
            <div className="sm:col-span-2">
              <Botao variante="perigo" tamanho="p" onClick={() => {
                ed.aplicar((c) => ({ ...c, obstaculos: c.obstaculos.filter((o) => o.id !== sel.id) }));
                ed.setSelecionados([]);
              }}>
                Remover obstáculo
              </Botao>
            </div>
          </div>
        )}
      </Cartao>
      {s && s.classe === "agua" && (
        <Cartao titulo="Áreas de instalação" descricao="Onde os módulos podem ser colocados (fora do afastamento das bordas).">
          <div className="space-y-3">
            {s.areas.map((ar, i) => (
              <div key={ar.id} className="grid gap-3 sm:grid-cols-4">
                <CampoNumero rotulo={`Área ${i + 1}: largura`} valor={ar.largura} passo={0.1} min={0.1} max={s.largura} aoMudar={(v) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, areas: x.areas.map((a) => (a.id === ar.id ? { ...a, largura: v } : a)) })))} />
                <CampoNumero rotulo="Comprimento" valor={ar.comprimento} passo={0.1} min={0.1} max={s.comprimento} aoMudar={(v) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, areas: x.areas.map((a) => (a.id === ar.id ? { ...a, comprimento: v } : a)) })))} />
                <CampoNumero rotulo="Início (lado)" valor={ar.u} passo={0.1} min={0} aoMudar={(v) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, areas: x.areas.map((a) => (a.id === ar.id ? { ...a, u: v } : a)) })))} />
                <CampoNumero rotulo="Início (inclinação)" valor={ar.v} passo={0.1} min={0} aoMudar={(v) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, areas: x.areas.map((a) => (a.id === ar.id ? { ...a, v } : a)) })))} />
              </div>
            ))}
            <Botao variante="secundario" tamanho="p" onClick={() => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, areas: [...x.areas, areaPadrao(x.largura, x.comprimento, x.layout.afastamentoBorda)] })))}>
              Restaurar área padrão
            </Botao>
          </div>
        </Cartao>
      )}
    </div>
  );
}

// -------------------------------------------------------------- estrutura

function opcoesCatalogo(ed: EditorApi, funcao: string) {
  return Object.values(ed.catalogo).filter((i) => i.ativo && (i.specs.funcao === funcao || (funcao === "fixacao" && i.tipo === "fixacao")));
}

function SeletorCatalogo({ ed, rotulo, funcao, valor, aoMudar }: { ed: EditorApi; rotulo: string; funcao: string; valor: string | null; aoMudar: (id: string | null) => void }) {
  const opcoes = opcoesCatalogo(ed, funcao);
  return (
    <Campo rotulo={rotulo} dica={opcoes.length === 0 ? "Sem item deste tipo no catálogo: será usado um padrão de demonstração." : undefined}>
      <Selecao value={valor ?? ""} onChange={(e) => aoMudar(e.target.value || null)}>
        <option value="">— padrão —</option>
        {opcoes.map((i) => (
          <option key={i.id} value={i.id}>
            {i.modelo}
            {i.specs.larguraMm ? ` · ${i.specs.larguraMm}×${i.specs.alturaMm ?? "?"} mm` : ""}
          </option>
        ))}
      </Selecao>
    </Campo>
  );
}

function AbaEstrutura({ ed }: { ed: EditorApi }) {
  const s = ed.superficie;
  const gruposDaSup = useMemo(() => (s ? agruparComponentes(ed.cena.componentes.filter((c) => c.superficieId === s.id)) : []), [ed.cena.componentes, s]);
  if (!s) return <Cartao><Vazio titulo="Crie primeiro uma cobertura ou mesa." /></Cartao>;
  const par = s.estrutura as unknown as Record<string, unknown>;
  const set = (campo: string, valor: unknown) => ed.aplicar((c) => atualizarSup(c, s.id, (x) => ({ ...x, estrutura: { ...x.estrutura, [campo]: valor } as Superficie["estrutura"] })));
  const catalogoMapa = ed.catalogo as MapaCatalogo;
  const gerar = () => {
    const r = gerarEstrutura(ed.cena, s.id, ed.specs, catalogoMapa);
    ed.aplicar(() => r.cena);
    ed.setBanner(r.avisos.length > 0 ? r.avisos.join(" ") : `Estrutura gerada: ${r.gerados} peça(s). Peças editadas à mão foram preservadas.`);
  };

  if (s.estrutura.tipo === "telhado") {
    return (
      <Cartao titulo="Estrutura do telhado" descricao="Trilhos, emendas, grampos e fixações a partir dos módulos desenhados.">
        <div className="grid gap-3 sm:grid-cols-2">
          <SeletorCatalogo ed={ed} rotulo="Trilho" funcao="trilho" valor={par.trilhoId as string | null} aoMudar={(id) => set("trilhoId", id)} />
          <SeletorCatalogo ed={ed} rotulo="Emenda" funcao="emenda" valor={par.emendaId as string | null} aoMudar={(id) => set("emendaId", id)} />
          <SeletorCatalogo ed={ed} rotulo="Grampo final" funcao="grampo_final" valor={par.grampoFinalId as string | null} aoMudar={(id) => set("grampoFinalId", id)} />
          <SeletorCatalogo ed={ed} rotulo="Grampo intermediário" funcao="grampo_intermediario" valor={par.grampoIntermediarioId as string | null} aoMudar={(id) => set("grampoIntermediarioId", id)} />
          <SeletorCatalogo ed={ed} rotulo="Fixação na madeira" funcao="fixacao" valor={par.fixacaoId as string | null} aoMudar={(id) => set("fixacaoId", id)} />
          <CampoNumero rotulo="Trilhos por fileira" valor={Number(par.trilhosPorFileira)} passo={1} min={1} max={4} casas={0} aoMudar={(v) => set("trilhosPorFileira", v)} />
          <CampoNumero rotulo="Posição do trilho na fileira (fração)" valor={Number(par.posicaoTrilho)} passo={0.05} min={0.05} max={0.45} casas={2} aoMudar={(v) => set("posicaoTrilho", v)} />
          <CampoNumero rotulo="Sobra do trilho (m)" valor={Number(par.balanco)} passo={0.05} min={0} max={1} sufixo="m" aoMudar={(v) => set("balanco", v)} />
          <CampoNumero rotulo="Distância entre fixações (m)" valor={Number(par.espacamentoFixacao)} passo={0.1} min={0.3} max={3} sufixo="m" aoMudar={(v) => set("espacamentoFixacao", v)} />
          <CampoNumero rotulo="Comprimento da barra (m)" valor={Number(par.comprimentoBarra)} passo={0.1} min={1} max={12} sufixo="m" aoMudar={(v) => set("comprimentoBarra", v)} />
        </div>
        <EstruturaResumo ed={ed} grupos={gruposDaSup} onGerar={gerar} />
      </Cartao>
    );
  }

  const fund = (par.fundacao as { ativa: boolean; forma: "circular" | "quadrada"; lado: number; profundidade: number }) ?? { ativa: false, forma: "circular", lado: 0.3, profundidade: 0.8 };
  const setFund = (campo: string, valor: unknown) => set("fundacao", { ...fund, [campo]: valor });
  return (
    <Cartao titulo="Estrutura de solo" descricao="Postes, vigas, terças e fundações. A montagem é prevista e depende de validação técnica.">
      <div className="grid gap-3 sm:grid-cols-2">
        <SeletorCatalogo ed={ed} rotulo="Poste" funcao="poste" valor={par.posteId as string | null} aoMudar={(id) => set("posteId", id)} />
        <SeletorCatalogo ed={ed} rotulo="Viga (perfil U)" funcao="viga" valor={par.vigaId as string | null} aoMudar={(id) => set("vigaId", id)} />
        <SeletorCatalogo ed={ed} rotulo="Terça (perfil U)" funcao="terca" valor={par.tercaId as string | null} aoMudar={(id) => set("tercaId", id)} />
        <SeletorCatalogo ed={ed} rotulo="Fixação do módulo" funcao="fixacao" valor={par.fixacaoId as string | null} aoMudar={(id) => set("fixacaoId", id)} />
        <CampoNumero rotulo="Distância entre pórticos (m)" valor={Number(par.espacamentoPorticos)} passo={0.1} min={0.5} max={6} sufixo="m" aoMudar={(v) => set("espacamentoPorticos", v)} />
        <CampoNumero rotulo="Balanço lateral (m)" valor={Number(par.balancoLateral)} passo={0.1} min={0} max={3} sufixo="m" aoMudar={(v) => set("balancoLateral", v)} />
        <CampoNumero rotulo="Recuo dos postes (m)" valor={Number(par.recuoPoste)} passo={0.1} min={0.1} max={5} sufixo="m" aoMudar={(v) => set("recuoPoste", v)} />
        <CampoNumero rotulo="Trecho enterrado do poste (m)" valor={Number(par.enterrado)} passo={0.05} min={0.3} max={2} sufixo="m" aoMudar={(v) => set("enterrado", v)} />
        <CampoNumero rotulo="Terças por fileira" valor={Number(par.tercasPorFileira)} passo={1} min={1} max={6} casas={0} aoMudar={(v) => set("tercasPorFileira", v)} />
        <CampoNumero rotulo="Posição da terça (fração)" valor={Number(par.posicaoTerca)} passo={0.05} min={0.05} max={0.45} casas={2} aoMudar={(v) => set("posicaoTerca", v)} />
      </div>
      <div className="mt-4 rounded-xl border border-linha p-3">
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={fund.ativa} onChange={(e) => setFund("ativa", e.target.checked)} /> Representar fundações (sapatas) sob os postes
        </label>
        {fund.ativa && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Forma">
              <Selecao value={fund.forma} onChange={(e) => setFund("forma", e.target.value)}>
                <option value="circular">Circular</option>
                <option value="quadrada">Quadrada</option>
              </Selecao>
            </Campo>
            <CampoNumero rotulo={fund.forma === "circular" ? "Diâmetro (m)" : "Lado (m)"} valor={fund.lado} passo={0.05} min={0.1} max={2} aoMudar={(v) => setFund("lado", v)} />
            <CampoNumero rotulo="Profundidade (m)" valor={fund.profundidade} passo={0.05} min={0.2} max={3} aoMudar={(v) => setFund("profundidade", v)} />
          </div>
        )}
        <p className="mt-2 text-xs text-cinza">Use as dimensões informadas pelo fornecedor ou por um projeto validado.</p>
      </div>
      <EstruturaResumo ed={ed} grupos={gruposDaSup} onGerar={gerar} />
    </Cartao>
  );
}

function EstruturaResumo({ ed, grupos, onGerar }: { ed: EditorApi; grupos: ReturnType<typeof agruparComponentes>; onGerar: () => void }) {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Botao onClick={onGerar} disabled={!ed.superficie?.layout.moduloId}>
          Gerar estrutura
        </Botao>
        <span className="text-xs text-cinza">Gera de novo sem apagar peças editadas à mão.</span>
      </div>
      {grupos.length > 0 && (
        <ul className="mt-3 divide-y divide-linha rounded-xl border border-linha text-sm">
          {grupos.map((g) => (
            <li key={g.chave} className="flex items-start justify-between gap-3 px-3 py-2">
              <span className="min-w-0">{g.descricao}</span>
              <span className="shrink-0 tabular-nums text-cinza">{formatarNumero(g.quantidade, 0)} un</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- modelos

function AbaModelos({ ed }: { ed: EditorApi }) {
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [lista, setLista] = useState(ed.modelos);
  const modelosDoTipo = lista.filter((m) => m.tipo === ed.tipo);

  const inserir = (id: string) => {
    const m = lista.find((x) => x.id === id);
    if (!m) return;
    const alcance = ed.cena.superficies.reduce((max, s) => Math.max(max, s.origem.x + s.largura), 0);
    ed.aplicar((c) => inserirModelo(c, m.conteudo, { x: alcance + 2, y: 0 }));
    ed.setBanner(`Modelo "${m.nome}" inserido como cópia. Ajustes nela não alteram o modelo salvo.`);
  };

  const salvar = async () => {
    if (!ed.superficie) return ed.setMensagem("Selecione a cobertura ou mesa a salvar.");
    setEnviando(true);
    await ed.salvarAgora();
    const r = await salvarModelo(ed.projetoId, ed.superficie.id, nome, "");
    setEnviando(false);
    if (r.erro) return ed.setMensagem(r.erro);
    setNome("");
    ed.setBanner(r.mensagem ?? "Modelo salvo.");
    window.location.reload();
  };

  const apagar = async (id: string) => {
    if (!window.confirm("Excluir este modelo? Projetos que já usaram o modelo não mudam.")) return;
    const r = await excluirModelo(id);
    if (r.erro) return ed.setMensagem(r.erro);
    setLista((l) => l.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-3">
      <Cartao titulo="Salvar como modelo" descricao="Guarda a cobertura ou mesa selecionada para usar em outros projetos.">
        <div className="flex flex-wrap items-end gap-2">
          <Campo rotulo="Nome do modelo" className="min-w-0 flex-1">
            <Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Mesa 2 × 10 com postes de concreto" />
          </Campo>
          <Botao onClick={() => void salvar()} disabled={enviando || nome.trim().length < 2}>
            {enviando ? "Salvando…" : "Salvar modelo"}
          </Botao>
        </div>
      </Cartao>
      <Cartao titulo="Modelos disponíveis" descricao="Inserir cria uma cópia independente: ajustes nela valem só para este projeto.">
        {modelosDoTipo.length === 0 ? (
          <Vazio titulo="Nenhum modelo deste tipo ainda." />
        ) : (
          <ul className="divide-y divide-linha">
            {modelosDoTipo.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{m.nome}</p>
                  {m.descricao && <p className="text-xs text-cinza">{m.descricao}</p>}
                </div>
                <div className="flex gap-2">
                  <Botao tamanho="p" variante="secundario" onClick={() => inserir(m.id)}>
                    Inserir no projeto
                  </Botao>
                  <Botao tamanho="p" variante="sutil" onClick={() => void apagar(m.id)}>
                    Excluir
                  </Botao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

// ---------------------------------------------------------------- medidas

function AbaMedidas({ ed }: { ed: EditorApi }) {
  const m = ed.medidas;
  const set = (campo: keyof Medidas, v: number | string | null) => ed.alterarMedidas({ ...m, [campo]: v });
  const aplicar = () => {
    const s = ed.superficie;
    if (ed.tipo === "telhado" && s) {
      ed.aplicar((c) => {
        let r = c;
        if (m.largura && m.comprimento) r = redimensionar(r, s.id, m.largura, m.comprimento);
        r = atualizarSup(r, s.id, (x) => ({
          ...x,
          inclinacao: m.inclinacao ?? x.inclinacao,
          alturaBase: m.altura ?? x.alturaBase,
        }));
        return r;
      });
      ed.avisoRedistribuir();
    } else if (ed.tipo === "solo") {
      ed.aplicar((c) => ({
        ...c,
        terreno: {
          contorno: m.largura && m.comprimento ? retangulo(m.largura, m.comprimento) : c.terreno.contorno,
          desnivel: m.desnivel ?? c.terreno.desnivel,
        },
      }));
      ed.setBanner("Terreno ajustado às medidas. Confira a planta.");
    } else {
      ed.setMensagem("Crie primeiro uma cobertura ou mesa.");
    }
  };
  return (
    <Cartao
      titulo="Medidas conhecidas"
      descricao="As medidas que você informa têm prioridade sobre a foto ou a estimativa."
      acoes={<Botao variante="secundario" tamanho="p" onClick={aplicar}>Aplicar ao desenho</Botao>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoNumero rotulo={ed.tipo === "telhado" ? "Largura do telhado (m)" : "Largura do terreno (m)"} valor={m.largura ?? null} passo={0.5} min={0.5} max={500} aoMudar={(v) => set("largura", v)} />
        <CampoNumero rotulo={ed.tipo === "telhado" ? "Comprimento do telhado (m)" : "Comprimento do terreno (m)"} valor={m.comprimento ?? null} passo={0.5} min={0.5} max={500} aoMudar={(v) => set("comprimento", v)} />
        {ed.tipo === "telhado" ? (
          <CampoNumero rotulo="Altura do beiral (m)" valor={m.altura ?? null} passo={0.1} min={0} max={50} aoMudar={(v) => set("altura", v)} />
        ) : (
          <CampoNumero rotulo="Desnível do terreno (m)" valor={m.desnivel ?? null} passo={0.1} min={0} max={50} aoMudar={(v) => set("desnivel", v)} />
        )}
        <CampoNumero rotulo="Inclinação (°)" valor={m.inclinacao ?? null} passo={1} min={0} max={60} casas={1} aoMudar={(v) => set("inclinacao", v)} />
        <Campo rotulo="Observações" opcional className="sm:col-span-2">
          <Entrada value={m.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
        </Campo>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome do projeto">
          <Entrada value={ed.nome} onChange={(e) => ed.trocarNome(e.target.value)} />
        </Campo>
        <Campo rotulo="Local da instalação">
          <Selecao value={ed.localId ?? ""} onChange={(e) => ed.trocarLocal(e.target.value || null)}>
            <option value="">— sem local —</option>
            {ed.locais.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </Selecao>
        </Campo>
      </div>
      <p className="mt-3 text-xs text-cinza">
        Fotos deste projeto: {ed.fotos.length}. Envie novas fotos na tela de criação do projeto ou pelo botão abaixo.
      </p>
      <FotosProjeto projetoId={ed.projetoId} />
    </Cartao>
  );
}

function FotosProjeto({ projetoId }: { projetoId: string }) {
  const [estado, setEstado] = useState<string | null>(null);
  const enviar = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    const f = new FormData();
    f.append("projetoId", projetoId);
    for (const a of Array.from(arquivos)) f.append("fotos", a);
    setEstado("Enviando fotos…");
    const r = await fetch("/api/fotos", { method: "POST", body: f });
    const j = (await r.json().catch(() => ({}))) as { erro?: string; fotos?: unknown[] };
    setEstado(r.ok ? `${j.fotos?.length ?? 0} foto(s) enviada(s). Elas ficam privadas.` : (j.erro ?? "Não foi possível enviar."));
  };
  return (
    <div className="mt-4 rounded-xl border border-dashed border-linha p-3">
      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-papel px-3 text-sm font-medium text-azul">
        Adicionar fotos (câmera ou galeria)
        <input type="file" accept="image/*" multiple capture="environment" className="sr-only" onChange={(e) => void enviar(e.target.files)} />
      </label>
      {estado && <p className="mt-2 text-xs text-cinza" role="status">{estado}</p>}
    </div>
  );
}

// ------------------------------------------------------------ pendências

function AbaPendencias({ ed }: { ed: EditorApi }) {
  const pend = ed.cena.pendencias;
  const alternar = (id: string, v: boolean) =>
    ed.aplicar((c) => ({ ...c, pendencias: c.pendencias.map((p) => (p.id === id ? { ...p, confirmado: v } : p)) }));
  return (
    <Cartao
      titulo="Confirmações"
      descricao="Mostra o que veio da foto, o que você informou e o que ainda precisa de confirmação."
      acoes={
        pend.some((p) => !p.confirmado) ? (
          <Botao variante="secundario" tamanho="p" onClick={() => ed.aplicar((c) => ({ ...c, pendencias: c.pendencias.map((p) => ({ ...p, confirmado: true })) }))}>
            Confirmar todas
          </Botao>
        ) : null
      }
    >
      {pend.length === 0 ? (
        <Vazio titulo="Nada para confirmar." />
      ) : (
        <ul className="divide-y divide-linha">
          {pend.map((p) => (
            <li key={p.id} className="flex items-start gap-3 py-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                checked={p.confirmado}
                onChange={(e) => alternar(p.id, e.target.checked)}
                aria-label={`Confirmar ${p.rotulo}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.rotulo}</p>
                <p className="text-sm text-cinza">{p.valor}</p>
              </div>
              <Selo cor={p.origem === "informado" ? "verde" : p.origem === "foto" ? "azul" : "sol"}>{ROTULO_ORIGEM[p.origem]}</Selo>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}


import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cartao, Selo, TituloPagina, COR_STATUS, ROTULO_STATUS_PT } from "@/components/ui";
import { formatarBRL, formatarData, formatarQtd } from "@/lib/dominio/dinheiro";
import { exigirProprietario } from "@/lib/servidor/auth";
import { tipar } from "@/lib/servidor/dados";
import type { SnapshotComercial, SnapshotPublico } from "@/lib/dominio/orcamento";
import type { Totais } from "@/lib/dominio/orcamento";

export const metadata: Metadata = { title: "Versão publicada" };

interface Versao {
  id: string;
  orcamento_id: string;
  versao: number;
  publicado_em: string;
  total_centavos: number;
  validade: string | null;
  status: string;
  revogada_em: string | null;
  link_expira_em: string | null;
  snapshot_publico: SnapshotPublico;
  snapshot_comercial: SnapshotComercial;
  snapshot_interno: { totais: Totais; dados: { titulo: string } };
}

export default async function VersaoPublicada({ params }: PageProps<"/orcamentos/[id]/versoes/[versaoId]">) {
  const { id, versaoId } = await params;
  const { supabase } = await exigirProprietario();
  const v = tipar<Versao>(
    await supabase
      .from("proposta_versoes")
      .select("id, orcamento_id, versao, publicado_em, total_centavos, validade, status, revogada_em, link_expira_em, snapshot_publico, snapshot_comercial, snapshot_interno")
      .eq("id", versaoId)
      .eq("orcamento_id", id)
      .maybeSingle(),
  ).data;
  if (!v) notFound();
  const c = v.snapshot_comercial;
  const p = v.snapshot_publico;
  const interno = v.snapshot_interno?.totais;

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4">
      <TituloPagina
        voltar={{ href: `/orcamentos/${id}`, rotulo: "Orçamento" }}
        titulo={`Versão ${v.versao} — o que foi apresentado`}
        descricao={`Publicada em ${formatarData(v.publicado_em)}. Este registro não muda, mesmo que o orçamento seja editado depois.`}
        acoes={
          <Selo cor={v.revogada_em ? "erro" : COR_STATUS[v.status] ?? "neutro"}>
            {v.revogada_em ? "Revogada" : ROTULO_STATUS_PT[v.status] ?? v.status}
          </Selo>
        }
      />
      <div className="space-y-4">
        <Cartao titulo="Valores apresentados ao cliente" descricao={`Modo: ${c.modo === "total" ? "só o total" : c.modo === "grupos" ? "por grupo" : "por item selecionado"}`}>
          {c.linhas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-xs uppercase text-cinza">
                  <tr>
                    <th className="py-2 font-medium">Descrição</th>
                    <th className="py-2 text-right font-medium">Qtd</th>
                    <th className="py-2 text-right font-medium">Preço unit.</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {c.linhas.map((l, i) => (
                    <tr key={i}>
                      <td className="py-2">{l.descricao}</td>
                      <td className="py-2 text-right tabular-nums">{l.quantidade == null ? "" : `${formatarQtd(l.quantidade)} ${l.unidade ?? ""}`}</td>
                      <td className="py-2 text-right tabular-nums">{l.precoUnit == null ? "" : formatarBRL(l.precoUnit)}</td>
                      <td className="py-2 text-right tabular-nums">{formatarBRL(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            <dt className="text-cinza">Subtotal</dt>
            <dd className="text-right tabular-nums">{formatarBRL(c.subtotal)}</dd>
            {c.desconto > 0 && (
              <>
                <dt className="text-cinza">Desconto</dt>
                <dd className="text-right tabular-nums">- {formatarBRL(c.desconto)}</dd>
              </>
            )}
            <dt className="font-semibold">Total</dt>
            <dd className="text-right text-lg font-bold tabular-nums">{formatarBRL(c.total)}</dd>
          </dl>
          <div className="mt-3 text-sm text-cinza">
            {c.condicoes.aVista && <p>À vista: {formatarBRL(c.condicoes.aVista.valor)}</p>}
            {c.condicoes.cartao?.opcoes.map((o) => (
              <p key={`c${o.parcelas}`}>Cartão: {o.parcelas}x de {formatarBRL(o.valorParcela)}</p>
            ))}
            {c.condicoes.financiamento?.opcoes.map((o) => (
              <p key={`f${o.parcelas}`}>Financiamento: {o.parcelas}x de {formatarBRL(o.valorParcela)}</p>
            ))}
            {v.validade && <p>Validade: {formatarData(v.validade)}</p>}
          </div>
        </Cartao>

        <Cartao titulo="Equipamentos e materiais apresentados">
          <ul className="space-y-1 text-sm">
            {p.kit.equipamentos.map((e, i) => (
              <li key={i}>{e.quantidade} × {e.descricao}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-cinza">
            Potência: {p.kit.potenciaKwp.toString().replace(".", ",")} kWp · inversor {p.kit.potenciaInversoresKw.toString().replace(".", ",")} kW
          </p>
          {p.materiais.length > 0 && (
            <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-sm">
              {p.materiais.map((m, i) => (
                <li key={i}>{formatarQtd(m.quantidade)} {m.unidade} · {m.descricao}</li>
              ))}
            </ul>
          )}
        </Cartao>

        {interno && (
          <Cartao titulo="Dados internos desta versão" descricao="Visíveis só para você. O cliente nunca vê custos nem margem.">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <dt className="text-cinza">Custo total</dt>
              <dd className="tabular-nums">{formatarBRL(interno.custoTotal)}</dd>
              <dt className="text-cinza">Preço final</dt>
              <dd className="tabular-nums">{formatarBRL(interno.total)}</dd>
              <dt className="text-cinza">Margem</dt>
              <dd className="tabular-nums">{formatarBRL(interno.margem)}</dd>
              <dt className="text-cinza">Margem %</dt>
              <dd className="tabular-nums">{interno.margemPct.toString().replace(".", ",")}%</dd>
            </dl>
          </Cartao>
        )}
      </div>
    </div>
  );
}

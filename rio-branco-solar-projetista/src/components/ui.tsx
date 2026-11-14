import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Componentes visuais básicos, sem estado: servem tanto no servidor quanto no navegador.

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const BOTAO_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors select-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol disabled:opacity-50 disabled:pointer-events-none";

const BOTAO_VARIANTES = {
  primario: "bg-azul text-white hover:bg-azul-escuro",
  destaque: "bg-sol text-azul-escuro hover:brightness-95",
  secundario: "bg-white text-azul border border-linha hover:bg-azul-claro",
  sutil: "text-azul hover:bg-azul-claro",
  perigo: "bg-white text-erro border border-erro/40 hover:bg-erro-claro",
} as const;

const BOTAO_TAMANHOS = {
  p: "min-h-9 px-3 text-sm",
  m: "min-h-11 px-4 text-sm",
  g: "min-h-12 px-5 text-base",
} as const;

export type VarianteBotao = keyof typeof BOTAO_VARIANTES;
export type TamanhoBotao = keyof typeof BOTAO_TAMANHOS;

export function classeBotao(variante: VarianteBotao = "primario", tamanho: TamanhoBotao = "m", extra?: string) {
  return cx(BOTAO_BASE, BOTAO_VARIANTES[variante], BOTAO_TAMANHOS[tamanho], extra);
}

export function Botao({
  variante,
  tamanho,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variante?: VarianteBotao; tamanho?: TamanhoBotao }) {
  return <button type={type} className={classeBotao(variante, tamanho, className)} {...props} />;
}

export function LinkBotao({
  variante,
  tamanho,
  className,
  ...props
}: ComponentProps<typeof Link> & { variante?: VarianteBotao; tamanho?: TamanhoBotao }) {
  return <Link className={classeBotao(variante, tamanho, className)} {...props} />;
}

export const CLASSE_ENTRADA =
  "w-full min-h-11 rounded-lg border border-linha bg-white px-3 py-2 text-tinta placeholder:text-cinza/60 " +
  "focus:border-azul focus:outline-2 focus:outline-azul/20 disabled:bg-papel disabled:text-cinza";

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(CLASSE_ENTRADA, className)} {...props} />;
}

export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(CLASSE_ENTRADA, "min-h-24", className)} {...props} />;
}

export function Selecao({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(CLASSE_ENTRADA, "pr-8", className)} {...props} />;
}

export function Campo({
  rotulo,
  dica,
  opcional,
  className,
  children,
}: {
  rotulo: string;
  dica?: ReactNode;
  opcional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 flex items-baseline gap-2 text-sm font-medium text-tinta">
        {rotulo}
        {opcional && <span className="text-xs font-normal text-cinza">opcional</span>}
      </span>
      {children}
      {dica && <span className="mt-1 block text-xs text-cinza">{dica}</span>}
    </label>
  );
}

export function Cartao({
  titulo,
  descricao,
  acoes,
  className,
  children,
  id,
}: {
  titulo?: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  className?: string;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cx("rounded-2xl border border-linha bg-white p-4 sm:p-5", className)}>
      {(titulo || acoes) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {titulo && <h2 className="text-base font-semibold text-tinta">{titulo}</h2>}
            {descricao && <p className="mt-0.5 text-sm text-cinza">{descricao}</p>}
          </div>
          {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

const SELO_CORES = {
  neutro: "bg-papel text-cinza border-linha",
  azul: "bg-azul-claro text-azul border-azul/20",
  verde: "bg-verde-claro text-verde border-verde/20",
  sol: "bg-sol-claro text-azul-escuro border-sol/40",
  erro: "bg-erro-claro text-erro border-erro/20",
} as const;

export type CorSelo = keyof typeof SELO_CORES;

export function Selo({ cor = "neutro", className, children }: { cor?: CorSelo; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", SELO_CORES[cor], className)}>
      {children}
    </span>
  );
}

export const COR_STATUS: Record<string, CorSelo> = {
  rascunho: "neutro",
  publicada: "azul",
  aceita: "verde",
  recusada: "erro",
  vencida: "sol",
  arquivada: "neutro",
};

export function Aviso({ tipo = "info", children, className }: { tipo?: "info" | "atencao" | "erro" | "ok"; children: ReactNode; className?: string }) {
  const cores = {
    info: "border-azul/20 bg-azul-claro text-azul-escuro",
    atencao: "border-sol/50 bg-sol-claro/60 text-azul-escuro",
    erro: "border-erro/30 bg-erro-claro text-erro",
    ok: "border-verde/30 bg-verde-claro text-verde",
  }[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={cx("rounded-xl border px-3 py-2 text-sm", cores, className)}>
      {children}
    </div>
  );
}

/** Logotipo vetorial da Rio Branco Solar (visual próprio deste projeto). */
export function Logo({ claro = false, className, compacto = false }: { claro?: boolean; className?: string; compacto?: boolean }) {
  const texto = claro ? "#ffffff" : "#0f3d5e";
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="23" fill={claro ? "#ffffff22" : "#0f3d5e"} />
        <g stroke="#f5a524" strokeWidth="2.6" strokeLinecap="round">
          <path d="M24 6v5M10.6 11.5l3.4 3.6M37.4 11.5 34 15.1M5.5 23.5h5M37.5 23.5h5" />
        </g>
        <path d="M13 27a11 11 0 0 1 22 0Z" fill="#f5a524" />
        <path d="M9 30h30l-3.2 10H12.2Z" fill={claro ? "#ffffff" : "#e4eef5"} />
        <path d="M19 30l-1.6 10M29 30l1.6 10M24 30v10M10.6 35h26.8" stroke="#0f3d5e" strokeWidth="1.3" fill="none" />
      </svg>
      {!compacto && (
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-tight" style={{ color: texto }}>
            Rio Branco Solar
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-widest" style={{ color: claro ? "#ffe2a8" : "#5b6b79" }}>
            Projetista Solar 3D
          </span>
        </span>
      )}
    </span>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-linha bg-white/60 px-4 py-8 text-center">
      <p className="font-medium text-tinta">{titulo}</p>
      {children && <div className="mt-1 text-sm text-cinza">{children}</div>}
    </div>
  );
}

export function TituloPagina({ titulo, descricao, acoes, voltar }: { titulo: ReactNode; descricao?: ReactNode; acoes?: ReactNode; voltar?: { href: string; rotulo: string } }) {
  return (
    <div className="mb-4">
      {voltar && (
        <Link href={voltar.href} className="mb-1 inline-flex min-h-8 items-center text-sm text-azul hover:underline">
          ← {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-tinta sm:text-2xl">{titulo}</h1>
          {descricao && <p className="mt-0.5 text-sm text-cinza">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
    </div>
  );
}

export const ROTULO_STATUS_PT: Record<string, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
  aceita: "Aceita",
  recusada: "Recusada",
  vencida: "Vencida",
  arquivada: "Arquivada",
};

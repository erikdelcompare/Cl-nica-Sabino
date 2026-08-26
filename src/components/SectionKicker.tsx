import { clsx } from 'clsx'

type SectionKickerProps = {
  children: string
  className?: string
  /** 'light' (padrão) para seções escuras; 'dark' para seções de fundo claro (garante contraste AA). */
  tone?: 'light' | 'dark'
}

/** Rótulo editorial pequeno (ex.: "PEDIATRIA") com traço dourado, usado no topo das seções. */
export function SectionKicker({ children, className, tone = 'light' }: SectionKickerProps) {
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <span className="h-px w-8 gold-rule" />
      <span
        className={clsx(
          'text-xs font-semibold uppercase tracking-[0.28em]',
          tone === 'light' ? 'text-(--color-gold)' : 'text-(--color-gold-deep)',
        )}
      >
        {children}
      </span>
    </div>
  )
}

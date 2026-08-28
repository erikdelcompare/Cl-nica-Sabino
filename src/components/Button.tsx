import type { AnchorHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { ArrowRightIcon, WhatsAppIcon } from './icons'

type Variant = 'primary' | 'outline' | 'outline-invert' | 'gold'

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  withWhatsApp?: boolean
  withArrow?: boolean
}

const base =
  'group inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-sm)] font-medium transition-colors duration-300 ease-out'

const variants: Record<Variant, string> = {
  /* Grafite sólido — ação principal sobre fundo claro. */
  primary: 'bg-(--color-graphite) text-(--color-ink-invert) hover:bg-(--color-graphite-deep)',
  /* Contorno sobre fundo claro. */
  outline:
    'border border-(--color-line-strong) text-(--color-ink) hover:border-(--color-ink) hover:bg-(--color-ink)/[0.03]',
  /* Contorno sobre grafite. */
  'outline-invert':
    'border border-(--color-line-invert) text-(--color-ink-invert) hover:border-(--color-gold-light) hover:text-(--color-gold-light)',
  /* Dourado — reservado ao CTA final. */
  gold: 'bg-(--color-gold) text-[#2b2210] hover:bg-[#b89644]',
}

const sizes = {
  sm: 'px-4 py-2.5 text-[0.8125rem]',
  md: 'px-5 py-3 text-sm',
  lg: 'px-7 py-3.5 text-[0.9375rem]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  withWhatsApp = false,
  withArrow = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <a className={clsx(base, variants[variant], sizes[size], className)} {...rest}>
      {withWhatsApp && <WhatsAppIcon className="h-[1.15em] w-[1.15em] shrink-0" />}
      <span>{children}</span>
      {withArrow && (
        <ArrowRightIcon className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
      )}
    </a>
  )
}

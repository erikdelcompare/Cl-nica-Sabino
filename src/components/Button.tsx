import { clsx } from 'clsx'
import type { AnchorHTMLAttributes } from 'react'
import { ArrowRightIcon, WhatsAppIcon } from './icons'

type ButtonVariant = 'gold' | 'outline' | 'outline-dark' | 'ghost'

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant
  size?: 'md' | 'lg'
  withWhatsAppIcon?: boolean
  withArrow?: boolean
}

const base =
  'group relative inline-flex items-center justify-center gap-2.5 rounded-full font-medium tracking-wide transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-gold)'

const variants: Record<ButtonVariant, string> = {
  gold: 'bg-gradient-to-b from-(--color-gold-light) to-(--color-gold-deep) text-(--color-dark) shadow-[0_8px_30px_-8px_rgba(201,162,76,0.55)] hover:shadow-[0_10px_36px_-6px_rgba(201,162,76,0.7)] hover:brightness-[1.05] active:scale-[0.98]',
  outline:
    'border border-(--color-warm-white)/25 text-(--color-warm-white) hover:border-(--color-gold)/70 hover:text-(--color-gold-light) active:scale-[0.98]',
  'outline-dark':
    'border border-(--color-charcoal)/20 text-(--color-charcoal) hover:border-(--color-gold-deep)/70 hover:text-(--color-gold-deep) active:scale-[0.98]',
  ghost: 'text-(--color-warm-white) hover:text-(--color-gold-light) active:scale-[0.98]',
}

const sizes = {
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

export function Button({
  variant = 'gold',
  size = 'md',
  withWhatsAppIcon = false,
  withArrow = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <a className={clsx(base, variants[variant], sizes[size], className)} {...rest}>
      {withWhatsAppIcon && <WhatsAppIcon className="h-[1.1em] w-[1.1em] shrink-0" />}
      <span>{children}</span>
      {withArrow && (
        <ArrowRightIcon className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
      )}
    </a>
  )
}

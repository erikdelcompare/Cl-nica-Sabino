import type { ElementType, ReactNode } from 'react'
import { clsx } from 'clsx'
import { useReveal } from '../hooks/useReveal'

type RevealProps = {
  children: ReactNode
  className?: string
  /** Atraso em ms, para escalonar itens irmãos com moderação. */
  delay?: number
  as?: ElementType
}

/** Entrada discreta ao entrar na viewport — fade e 14px de deslocamento. */
export function Reveal({ children, className, delay = 0, as: Tag = 'div' }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <Tag
      ref={ref}
      className={clsx('reveal', visible && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}

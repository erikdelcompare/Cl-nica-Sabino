import { useState } from 'react'
import { clsx } from 'clsx'
import { SparkleIcon } from '../icons'

type SparkleFieldProps = {
  className?: string
  count?: number
}

/**
 * Pequenas estrelas douradas dispersas de forma sutil — o único elemento
 * "infantil" da seção de pediatria, discreto e não literal.
 */
export function SparkleField({ className, count = 6 }: SparkleFieldProps) {
  // Gerado uma única vez (lazy init) — evita recalcular posições aleatórias a cada render.
  const [sparkles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: 10 + Math.round(Math.random() * 80),
      top: 10 + Math.round(Math.random() * 80),
      size: 8 + Math.random() * 10,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 3,
    })),
  )

  return (
    <div aria-hidden="true" className={clsx('pointer-events-none absolute inset-0', className)}>
      {sparkles.map((s) => (
        <SparkleIcon
          key={s.id}
          className="absolute animate-pulse-soft text-(--color-gold-light)"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

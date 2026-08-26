import { useState } from 'react'
import { clsx } from 'clsx'

type ParticleFieldProps = {
  className?: string
  count?: number
}

/** Campo de partículas douradas extremamente sutis, em CSS puro (sem canvas). */
export function ParticleField({ className, count = 18 }: ParticleFieldProps) {
  // Gerado uma única vez (lazy init) — evita recalcular posições aleatórias a cada render.
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.round(Math.random() * 100),
      top: Math.round(Math.random() * 100),
      size: 1 + Math.random() * 2.2,
      delay: Math.random() * 8,
      duration: 14 + Math.random() * 12,
      opacity: 0.25 + Math.random() * 0.4,
    })),
  )

  return (
    <div aria-hidden="true" className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-(--color-gold-light) animate-drift"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

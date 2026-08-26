import { clsx } from 'clsx'

type GoldOrbProps = {
  className?: string
  size?: number
  tone?: 'gold' | 'graphite'
  animate?: boolean
}

/**
 * Esfera orgânica construída apenas com gradientes CSS (sem WebGL) para sugerir
 * profundidade e luz — usada como elemento tridimensional leve em várias seções.
 */
export function GoldOrb({ className, size = 420, tone = 'gold', animate = true }: GoldOrbProps) {
  const gradient =
    tone === 'gold'
      ? 'radial-gradient(circle at 32% 28%, #f3e2ab 0%, #d9b56a 22%, #b3893c 48%, #6f5320 78%, #3a2c12 100%)'
      : 'radial-gradient(circle at 32% 28%, #4a4a4d 0%, #303032 30%, #1c1c1e 62%, #0c0c0d 100%)'

  return (
    <div
      aria-hidden="true"
      className={clsx('pointer-events-none rounded-full blur-[1px]', animate && 'animate-float-slower', className)}
      style={{
        width: size,
        height: size,
        background: gradient,
        boxShadow:
          tone === 'gold'
            ? 'inset -18px -22px 60px rgba(0,0,0,0.45), inset 12px 14px 30px rgba(255,246,214,0.25), 0 30px 90px -20px rgba(201,162,76,0.35)'
            : 'inset -18px -22px 60px rgba(0,0,0,0.6), inset 10px 12px 24px rgba(255,255,255,0.06), 0 30px 90px -20px rgba(0,0,0,0.6)',
      }}
    />
  )
}

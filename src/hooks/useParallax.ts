import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

/**
 * Profundidade sutil ao mover o mouse (apenas desktop com ponteiro fino).
 * Retorna motion values já suavizados, prontas para uso em `style={{ x, y }}`.
 */
export function useParallax(strength = 14) {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, { stiffness: 60, damping: 20, mass: 0.6 })
  const y = useSpring(rawY, { stiffness: 60, damping: 20, mass: 0.6 })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 1024
    if (!isFinePointer) return

    const node = ref.current
    if (!node) return

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      const relX = (event.clientX - rect.left) / rect.width - 0.5
      const relY = (event.clientY - rect.top) / rect.height - 0.5
      rawX.set(relX * strength)
      rawY.set(relY * strength)
    }

    const onLeave = () => {
      rawX.set(0)
      rawY.set(0)
    }

    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [rawX, rawY, strength])

  return { ref, x, y }
}

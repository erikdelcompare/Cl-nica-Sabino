import { useEffect, useRef, useState } from 'react'

/**
 * Marca o elemento como visível na primeira vez que ele entra na viewport,
 * para que o CSS aplique a entrada (fade + deslocamento mínimo).
 *
 * Substitui a biblioteca de animação por ~15 linhas de IntersectionObserver:
 * a única animação de scroll do projeto é esta.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  // Sem suporte a IntersectionObserver, o conteúdo já nasce visível.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}

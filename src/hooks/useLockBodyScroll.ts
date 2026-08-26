import { useEffect } from 'react'

/** Bloqueia o scroll do body enquanto `locked` for verdadeiro (menu mobile fullscreen). */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [locked])
}

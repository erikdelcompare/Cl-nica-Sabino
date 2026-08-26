import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  once?: boolean
  as?: 'div' | 'span'
}

/**
 * Faz o conteúdo entrar suavemente ao alcançar a viewport (fade + leve deslocamento).
 * Respeita prefers-reduced-motion trocando o deslocamento por um simples fade.
 */
export function Reveal({ children, className, delay = 0, y = 28, once = true, as = 'div' }: RevealProps) {
  const prefersReducedMotion = useReducedMotion()

  const variants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
    },
  }

  const MotionTag = motion[as]

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.25 }}
      variants={variants}
    >
      {children}
    </MotionTag>
  )
}

type RevealGroupProps = {
  children: ReactNode
  className?: string
  stagger?: number
}

/** Contêiner que escalona a entrada dos filhos que usam `RevealItem`. */
export function RevealGroup({ children, className, stagger = 0.12 }: RevealGroupProps) {
  const variants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger },
    },
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, className, y = 20 }: RevealProps) {
  const prefersReducedMotion = useReducedMotion()

  const variants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : y },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}

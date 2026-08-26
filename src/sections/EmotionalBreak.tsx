import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Button } from '../components/Button'
import { Reveal } from '../components/Reveal'
import { WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'

export function EmotionalBreak() {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const glowY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-40, 40])

  return (
    <section ref={ref} className="relative overflow-hidden bg-(--color-dark) py-32 sm:py-40">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          y: glowY,
          background:
            'radial-gradient(60% 60% at 50% 30%, rgba(201,162,76,0.16) 0%, rgba(201,162,76,0) 60%), linear-gradient(180deg, #0b0b0c 0%, #121213 50%, #0b0b0c 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--color-gold)/40 to-transparent"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <p className="font-display text-balance text-3xl italic leading-[1.35] text-(--color-warm-white) sm:text-4xl lg:text-5xl">
            "Cuidar da saúde também é cuidar de quem está ao seu lado."
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-6 text-sm uppercase tracking-[0.28em] text-(--color-gold)/80">
            Perto da sua família, em cada consulta
          </p>
        </Reveal>
        <Reveal delay={0.28} className="mt-10 flex justify-center">
          <Button
            href={buildWhatsAppUrl(WHATSAPP_MESSAGES.default)}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            withArrow
          >
            Agendar atendimento
          </Button>
        </Reveal>
      </div>
    </section>
  )
}

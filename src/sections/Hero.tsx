import { motion } from 'framer-motion'
import { Button } from '../components/Button'
import { GoldOrb } from '../components/decor/GoldOrb'
import { MoleculeGraphic } from '../components/decor/MoleculeGraphic'
import { ParticleField } from '../components/decor/ParticleField'
import { useParallax } from '../hooks/useParallax'
import { WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'

export function Hero() {
  const { ref, x, y } = useParallax(18)

  return (
    <section
      id="inicio"
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-(--color-dark) noise-overlay"
    >
      {/* Camada de fundo: gradiente grafite profundo com luz dourada muito discreta */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(115% 90% at 82% 8%, rgba(201,162,76,0.16) 0%, rgba(201,162,76,0) 42%), radial-gradient(90% 70% at 12% 96%, rgba(201,162,76,0.08) 0%, rgba(201,162,76,0) 55%), linear-gradient(165deg, #121213 0%, #0b0b0c 55%, #08080a 100%)',
        }}
      />

      {/* Elementos flutuantes discretos (profundidade) */}
      <motion.div className="absolute -right-24 top-20 opacity-70 sm:right-[-4rem] lg:right-8" style={{ x, y }}>
        <GoldOrb size={380} className="hidden sm:block" />
      </motion.div>
      <motion.div
        className="absolute -bottom-20 -left-10 opacity-60 sm:left-4"
        style={{ x, y: y }}
      >
        <MoleculeGraphic className="h-64 w-64 opacity-60 sm:h-80 sm:w-80" />
      </motion.div>

      <ParticleField className="opacity-70" count={22} />

      {/* Conteúdo */}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pt-24 pb-16 sm:px-8 lg:px-12">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-(--color-gold)"
        >
          Sabino Especialidades Médicas — São Gabriel do Oeste — MS
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl text-balance font-display text-[2.6rem] font-medium leading-[1.08] text-(--color-warm-white) sm:text-6xl lg:text-7xl"
        >
          Cuidado médico que <span className="gold-text-gradient italic">inspira confiança</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="mt-7 max-w-xl text-balance text-lg leading-relaxed text-(--color-warm-white)/70 sm:text-xl"
        >
          Atendimento especializado e cuidado próximo para quem mais importa para você.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
        >
          <Button
            href={buildWhatsAppUrl(WHATSAPP_MESSAGES.default)}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            withWhatsAppIcon
            withArrow
          >
            Agendar pelo WhatsApp
          </Button>
          <Button href="#clinica" variant="outline" size="lg">
            Conheça a clínica
          </Button>
        </motion.div>
      </div>

      {/* Indicador de scroll */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 1 }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        aria-hidden="true"
      >
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-(--color-warm-white)/40">Role</span>
        <span className="h-9 w-px bg-gradient-to-b from-(--color-gold)/70 to-transparent" />
      </motion.div>
    </section>
  )
}

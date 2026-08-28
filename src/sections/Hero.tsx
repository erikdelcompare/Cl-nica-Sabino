import { motion } from 'framer-motion'
import { Button } from '../components/Button'
import { useParallax } from '../hooks/useParallax'
import { WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'
import receptionPhoto from '../assets/photo-reception.jpg'

export function Hero() {
  const { ref, x, y } = useParallax(10)

  return (
    <section
      id="inicio"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-(--color-dark) noise-overlay"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 70% at 8% 100%, rgba(201,162,76,0.10) 0%, rgba(201,162,76,0) 55%), linear-gradient(165deg, #131313 0%, #0b0b0c 55%, #08080a 100%)',
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] items-center gap-14 px-5 pt-28 pb-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-12 lg:pt-24">
        <div>
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
            className="text-balance font-display text-[2.5rem] font-medium leading-[1.1] text-(--color-warm-white) sm:text-5xl lg:text-6xl"
          >
            Cuidado médico que <span className="gold-text-gradient italic">inspira confiança</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 max-w-md text-balance text-lg leading-relaxed text-(--color-warm-white)/70"
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

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          <motion.div
            style={{ x, y }}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] shadow-[0_30px_90px_-24px_rgba(0,0,0,0.7)]"
          >
            <img
              src={receptionPhoto}
              alt="Recepção da Sabino Especialidades Médicas, com o Dr. Clodoaldo Sabino"
              className="h-full w-full object-cover"
              width={410}
              height={495}
              fetchPriority="high"
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(200deg, rgba(11,11,12,0) 45%, rgba(11,11,12,0.55) 100%)',
              }}
            />
            <div className="absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-(--color-gold)/25" />
          </motion.div>

          <div className="absolute -bottom-5 -left-5 rounded-xl border border-(--color-warm-white)/10 bg-(--color-graphite)/90 px-4 py-3 backdrop-blur-md sm:-left-8">
            <p className="text-xs uppercase tracking-[0.18em] text-(--color-gold-light)/90">
              São Gabriel do Oeste — MS
            </p>
            <p className="mt-0.5 text-sm text-(--color-warm-white)/80">Atendimento pediátrico e exames</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

import { Reveal } from '../components/Reveal'
import { Button } from '../components/Button'
import { GoldOrb } from '../components/decor/GoldOrb'
import { ParticleField } from '../components/decor/ParticleField'
import { WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-(--color-dark) py-28 sm:py-36">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 70% at 50% 100%, rgba(201,162,76,0.18) 0%, rgba(201,162,76,0) 60%), linear-gradient(180deg, #0b0b0c 0%, #0e0e10 100%)',
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25">
        <GoldOrb size={620} animate={false} />
      </div>
      <ParticleField count={16} className="opacity-60" />

      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <Reveal>
          <h2 className="text-balance font-display text-4xl font-medium leading-[1.14] text-(--color-warm-white) sm:text-5xl lg:text-6xl">
            Seu cuidado pode começar por uma{' '}
            <span className="gold-text-gradient italic">conversa</span>.
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-md text-balance text-lg leading-relaxed text-(--color-warm-white)/65">
            Entre em contato com a Sabino Especialidades Médicas e consulte os atendimentos disponíveis.
          </p>
        </Reveal>
        <Reveal delay={0.24} className="mt-10 flex justify-center">
          <Button
            href={buildWhatsAppUrl(WHATSAPP_MESSAGES.final)}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            withWhatsAppIcon
            withArrow
          >
            Falar com a Sabino no WhatsApp
          </Button>
        </Reveal>
      </div>
    </section>
  )
}

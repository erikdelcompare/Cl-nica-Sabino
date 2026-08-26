import { Reveal, RevealGroup, RevealItem } from '../components/Reveal'
import { SectionKicker } from '../components/SectionKicker'
import { Button } from '../components/Button'
import { GoldOrb } from '../components/decor/GoldOrb'
import { SparkleField } from '../components/decor/SparkleField'
import { CompassGuideIcon, GrowthIcon, HeartHandsIcon, SyringeIcon } from '../components/icons'
import { WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'

const cuidados = [
  { icon: HeartHandsIcon, label: 'Consultas pediátricas' },
  { icon: GrowthIcon, label: 'Acompanhamento do desenvolvimento infantil' },
  { icon: CompassGuideIcon, label: 'Orientação aos responsáveis' },
  { icon: SyringeIcon, label: 'Orientação relacionada à vacinação' },
]

export function Pediatria() {
  return (
    <section
      id="pediatria"
      className="relative overflow-hidden bg-(--color-graphite) py-24 sm:py-32"
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(70% 60% at 88% 12%, rgba(201,162,76,0.12) 0%, rgba(201,162,76,0) 55%)',
        }}
      />
      <div className="pointer-events-none absolute -right-32 top-1/3 hidden opacity-50 lg:block">
        <GoldOrb size={340} />
      </div>
      <SparkleField className="hidden lg:block" count={7} />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-2xl">
          <Reveal>
            <SectionKicker>Pediatria</SectionKicker>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 text-balance font-display text-4xl font-medium leading-[1.12] text-(--color-warm-white) sm:text-5xl">
              Cuidado em cada fase da infância.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-balance text-lg leading-relaxed text-(--color-warm-white)/70">
              O acompanhamento pediátrico da Sabino Especialidades Médicas foi pensado para acolher a criança e
              orientar a família em cada etapa do crescimento — com atenção, escuta e informação clara.
            </p>
          </Reveal>
        </div>

        <RevealGroup className="mt-14 grid gap-x-8 gap-y-6 sm:grid-cols-2" stagger={0.1}>
          {cuidados.map(({ icon: Icon, label }) => (
            <RevealItem key={label}>
              <div className="group flex items-center gap-4 rounded-2xl border border-(--color-warm-white)/10 bg-(--color-warm-white)/[0.03] p-5 transition-colors duration-300 hover:border-(--color-gold)/40">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--color-gold)/30 text-(--color-gold-light)">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[0.95rem] font-medium text-(--color-warm-white)/85">{label}</span>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.1} className="mt-12">
          <Button
            href={buildWhatsAppUrl(WHATSAPP_MESSAGES.pediatria)}
            target="_blank"
            rel="noopener noreferrer"
            withWhatsAppIcon
            withArrow
          >
            Falar com a clínica
          </Button>
        </Reveal>
      </div>
    </section>
  )
}

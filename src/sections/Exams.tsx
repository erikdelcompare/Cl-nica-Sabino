import { Reveal } from '../components/Reveal'
import { SectionKicker } from '../components/SectionKicker'
import { Button } from '../components/Button'
import { FlaskIcon } from '../components/icons'
import { WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'

export function Exams() {
  return (
    <section id="exames" className="relative overflow-hidden bg-(--color-graphite) py-24 sm:py-32">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: 'radial-gradient(65% 55% at 15% 15%, rgba(201,162,76,0.1) 0%, rgba(201,162,76,0) 55%)',
        }}
      />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-12">
        <Reveal className="order-2 flex justify-center lg:order-1">
          <div className="relative flex h-72 w-72 items-center justify-center rounded-full border border-(--color-gold)/20 sm:h-80 sm:w-80">
            <div className="absolute inset-6 rounded-full border border-(--color-gold)/15" />
            <div
              className="absolute inset-0 rounded-full opacity-70"
              style={{ background: 'radial-gradient(60% 60% at 50% 40%, rgba(201,162,76,0.18), transparent 70%)' }}
            />
            <FlaskIcon className="h-20 w-20 text-(--color-gold-light)" />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="order-1 lg:order-2">
          <SectionKicker>Exames laboratoriais</SectionKicker>
          <h2 className="mt-5 text-balance font-display text-4xl font-medium leading-[1.12] text-(--color-warm-white) sm:text-5xl">
            Exames com praticidade e cuidado em um só lugar.
          </h2>
          <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-(--color-warm-white)/70">
            A Sabino Especialidades Médicas também oferece exames laboratoriais, reunindo agendamento e
            acompanhamento em um único lugar, com atenção e comodidade para você e sua família.
          </p>
          <div className="mt-9">
            <Button
              href={buildWhatsAppUrl(WHATSAPP_MESSAGES.exames)}
              target="_blank"
              rel="noopener noreferrer"
              withWhatsAppIcon
              withArrow
            >
              Consultar disponibilidade
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

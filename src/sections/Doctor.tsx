import { Reveal } from '../components/Reveal'
import { SectionKicker } from '../components/SectionKicker'
import { CLINIC } from '../lib/site-config'

export function Doctor() {
  return (
    <section className="relative overflow-hidden bg-(--color-warm-white) py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-12">
        <Reveal>
          <div className="relative mx-auto flex aspect-[4/5] w-full max-w-md items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-(--color-dark) via-(--color-graphite) to-(--color-charcoal)">
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(70% 55% at 70% 20%, rgba(201,162,76,0.22) 0%, rgba(201,162,76,0) 60%)',
              }}
            />
            <div className="absolute inset-6 rounded-[1.5rem] border border-(--color-gold)/25" />
            <span className="gold-text-gradient font-display text-[7.5rem] leading-none">CS</span>
            <div className="absolute bottom-8 left-8 right-8 text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-(--color-warm-white)/50">
                Pediatria &amp; Neonatologia
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <SectionKicker tone="dark">O médico</SectionKicker>
          <h2 className="mt-5 font-display text-4xl font-medium leading-[1.12] text-(--color-charcoal) sm:text-5xl">
            {CLINIC.doctorName}
          </h2>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-(--color-gold-deep)">
            {CLINIC.doctorSpecialty}
          </p>
          <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-(--color-charcoal)/75">
            {CLINIC.doctorExperience.replace('Mais', 'Com mais')}, o {CLINIC.doctorName} conduz o atendimento
            pediátrico da Sabino Especialidades Médicas em {CLINIC.city}, acompanhando crianças e orientando
            famílias com atenção e proximidade.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

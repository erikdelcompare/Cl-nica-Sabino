import { Reveal } from '../components/Reveal'
import { SectionKicker } from '../components/SectionKicker'
import { CLINIC } from '../lib/site-config'
import doctorPhoto from '../assets/photo-doctor.jpg'

export function Doctor() {
  return (
    <section className="relative overflow-hidden bg-(--color-warm-white) py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-12">
        <Reveal>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[1.75rem] shadow-[0_24px_70px_-28px_rgba(23,23,26,0.4)]">
            <img
              src={doctorPhoto}
              alt="Dr. Clodoaldo Sabino da Silva em seu consultório na Sabino Especialidades Médicas"
              className="h-full w-full object-cover"
              width={410}
              height={397}
              loading="lazy"
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(190deg, rgba(11,11,12,0) 55%, rgba(11,11,12,0.6) 100%)',
              }}
            />
            <div className="absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-(--color-gold)/20" />
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-xs uppercase tracking-[0.22em] text-(--color-gold-light)/90">
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

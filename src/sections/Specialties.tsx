import { Reveal } from '../components/Reveal'
import { ClinicImage } from '../components/ClinicImage'
import { clinicData } from '../lib/clinic-data'

/**
 * Demais especialidades da clínica.
 *
 * Enquanto `clinicData.specialties` estiver vazio, a seção inteira não é
 * renderizada — nada é inventado. Ao receber a lista confirmada, basta
 * preencher o array em `clinic-data.ts`.
 */
export function Specialties() {
  const { specialties } = clinicData
  if (specialties.length === 0) return null

  return (
    <section id="especialidades" className="bg-(--color-sand) py-20 sm:py-28 lg:py-32">
      <div className="shell">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Especialidades</p>
          <h2 className="mt-5 text-balance font-display text-[2.125rem] leading-[1.12] text-(--color-ink) sm:text-[2.75rem]">
            Atendimento em diferentes áreas da medicina.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.map((specialty, i) => (
            <Reveal key={specialty.name} delay={i * 80}>
              {specialty.photo && (
                <ClinicImage
                  src={specialty.photo}
                  alt={specialty.professional ?? specialty.name}
                  ratio="4/5"
                  className="mb-5"
                />
              )}
              <h3 className="font-display text-xl text-(--color-ink)">{specialty.name}</h3>
              {specialty.professional && (
                <p className="mt-1.5 text-[0.875rem] font-medium uppercase tracking-[0.12em] text-(--color-gold-ink)">
                  {specialty.professional}
                </p>
              )}
              {specialty.description && (
                <p className="mt-2.5 text-pretty text-[0.9375rem] leading-relaxed text-(--color-ink-soft)">
                  {specialty.description}
                </p>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

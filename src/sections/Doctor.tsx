import { Reveal } from '../components/Reveal'
import { ClinicImage } from '../components/ClinicImage'
import { clinicData } from '../lib/clinic-data'

const { copy, team, yearsExperience } = clinicData

/**
 * Autoridade profissional apresentada de forma sóbria.
 * CRM, RQE e tempo de experiência só aparecem quando preenchidos em
 * `clinic-data.ts` — enquanto vazios, simplesmente não são renderizados.
 */
export function Doctor() {
  if (team.length === 0) return null

  return (
    <section id="profissional" className="bg-(--color-graphite) py-20 sm:py-28 lg:py-32">
      <div className="shell">
        {team.map((member) => (
          <div
            key={member.id}
            className="grid gap-12 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] lg:items-center lg:gap-20"
          >
            <ClinicImage
              src={member.photo}
              alt={`${member.fullName}, ${member.specialty}`}
              ratio="4/5"
              placeholderLabel="Retrato profissional"
              tone="dark"
              className="mx-auto w-full max-w-sm lg:max-w-none"
            />

            <Reveal>
              <p className="eyebrow eyebrow-invert">{copy.doctorEyebrow}</p>

              <h2 className="mt-5 font-display text-[2.125rem] leading-[1.14] text-(--color-ink-invert) sm:text-[2.75rem]">
                {member.name}
              </h2>

              {/* Credenciais: cada linha aparece só se estiver preenchida. */}
              <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.875rem]">
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Especialidade</dt>
                  <dd className="font-medium uppercase tracking-[0.14em] text-(--color-gold-light)">
                    {member.specialty}
                  </dd>
                </div>

                {member.secondarySpecialty && (
                  <div className="flex items-center gap-2 border-l border-(--color-line-invert) pl-5">
                    <dt className="sr-only">Área relacionada</dt>
                    <dd className="text-(--color-ink-invert-soft)">{member.secondarySpecialty}</dd>
                  </div>
                )}

                {member.crm && (
                  <div className="flex items-center gap-2 border-l border-(--color-line-invert) pl-5">
                    <dt className="text-(--color-ink-invert-soft)">CRM</dt>
                    <dd className="text-(--color-ink-invert)">{member.crm}</dd>
                  </div>
                )}

                {member.rqe && (
                  <div className="flex items-center gap-2 border-l border-(--color-line-invert) pl-5">
                    <dt className="text-(--color-ink-invert-soft)">RQE</dt>
                    <dd className="text-(--color-ink-invert)">{member.rqe}</dd>
                  </div>
                )}
              </dl>

              <p className="mt-7 max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-(--color-ink-invert-soft)">
                {member.bio}
              </p>

              {/* Faixa de experiência — só com autorização da clínica. */}
              {yearsExperience && (
                <p className="mt-8 border-t border-(--color-line-invert) pt-6 font-display text-[1.75rem] text-(--color-ink-invert)">
                  {yearsExperience}+ anos
                  <span className="ml-2 font-sans text-[0.9375rem] text-(--color-ink-invert-soft)">
                    dedicados à Pediatria
                  </span>
                </p>
              )}
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  )
}

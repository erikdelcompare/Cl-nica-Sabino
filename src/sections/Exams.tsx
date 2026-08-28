import { Reveal } from '../components/Reveal'
import { Button } from '../components/Button'
import { ClinicImage } from '../components/ClinicImage'
import { clinicData, whatsappUrl } from '../lib/clinic-data'

const { copy, examTypes } = clinicData

export function Exams() {
  return (
    <section id="exames" className="bg-(--color-surface) py-20 sm:py-28 lg:py-32">
      <div className="shell grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
        <ClinicImage
          src="/images/clinic/laboratory.jpg"
          alt="Coleta de exames laboratoriais na Sabino Especialidades Médicas"
          ratio="4/3"
          placeholderLabel="Coleta e laboratório"
          className="mx-auto w-full max-w-md lg:max-w-none"
        />

        <Reveal>
          <p className="eyebrow">{copy.examsEyebrow}</p>

          <h2 className="mt-5 text-balance font-display text-[2.125rem] leading-[1.12] text-(--color-ink) sm:text-[2.75rem] lg:text-[3rem]">
            {copy.examsTitle}
          </h2>

          <div className="mt-6 space-y-5 text-pretty text-[1.0625rem] leading-relaxed text-(--color-ink-soft)">
            {copy.examsParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {/* Renderizado apenas quando a clínica confirmar a lista de exames. */}
          {examTypes.length > 0 && (
            <ul className="mt-8 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {examTypes.map((exam) => (
                <li key={exam} className="flex items-start gap-3 text-[0.9375rem] text-(--color-ink)">
                  <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-(--color-gold)" />
                  {exam}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10">
            <Button
              href={whatsappUrl(
                'Olá! Gostaria de consultar os exames laboratoriais disponíveis na Sabino Especialidades Médicas.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              withWhatsApp
            >
              Consultar exames pelo WhatsApp
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

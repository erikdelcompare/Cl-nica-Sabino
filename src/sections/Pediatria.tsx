import { Reveal } from '../components/Reveal'
import { Button } from '../components/Button'
import { ClinicImage } from '../components/ClinicImage'
import { clinicData, whatsappUrl } from '../lib/clinic-data'

const { copy, images } = clinicData

const acompanhamento = [
  'Consultas pediátricas e avaliação clínica',
  'Acompanhamento do crescimento e do desenvolvimento',
  'Orientação aos responsáveis',
  'Orientação sobre o calendário de vacinação',
]

export function Pediatria() {
  return (
    <section id="pediatria" className="bg-(--color-sand) py-20 sm:py-28 lg:py-32">
      <div className="shell grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
        <Reveal className="lg:order-2">
          <p className="eyebrow">{copy.pediatricsEyebrow}</p>

          <h2 className="mt-5 text-balance font-display text-[2.125rem] leading-[1.12] text-(--color-ink) sm:text-[2.75rem] lg:text-[3rem]">
            {copy.pediatricsTitle}
          </h2>

          <div className="mt-6 space-y-5 text-pretty text-[1.0625rem] leading-relaxed text-(--color-ink-soft)">
            {copy.pediatricsParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <ul className="mt-9 space-y-3.5">
            {acompanhamento.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[0.9375rem] text-(--color-ink)">
                <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-(--color-gold)" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Button
              href={whatsappUrl(
                'Olá! Gostaria de agendar um atendimento pediátrico na Sabino Especialidades Médicas.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              withWhatsApp
            >
              Agendar atendimento pediátrico
            </Button>
          </div>
        </Reveal>

        <ClinicImage
          src={images.pediatrics}
          alt="Atendimento pediátrico na Sabino Especialidades Médicas"
          ratio="4/5"
          placeholderLabel="Atendimento pediátrico"
          className="mx-auto w-full max-w-md lg:order-1 lg:max-w-none"
        />
      </div>
    </section>
  )
}

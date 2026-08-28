import { Reveal } from '../components/Reveal'
import { ClinicImage } from '../components/ClinicImage'
import { clinicData } from '../lib/clinic-data'

const { copy, images } = clinicData

/**
 * Estrutura da clínica: uma horizontal grande e duas verticais menores.
 * Composição editorial assimétrica, sem grade de cards repetidos.
 */
export function Gallery() {
  return (
    <section className="bg-(--color-surface) py-20 sm:py-28 lg:py-32">
      <div className="shell">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{copy.galleryEyebrow}</p>
          <h2 className="mt-5 text-balance font-display text-[2.125rem] leading-[1.12] text-(--color-ink) sm:text-[2.75rem] lg:text-[3rem]">
            {copy.galleryTitle}
          </h2>
          <p className="mt-5 text-pretty text-[1.0625rem] leading-relaxed text-(--color-ink-soft)">
            {copy.galleryText}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <ClinicImage
            src={images.facade}
            alt={`Fachada da ${clinicData.name}`}
            ratio="21/9"
            placeholderLabel="Fachada da clínica"
            className="lg:col-span-2"
          />
          <ClinicImage
            src={images.receptionWide}
            alt="Ambiente de recepção da clínica"
            ratio="3/2"
            placeholderLabel="Sala de espera"
          />
          <ClinicImage
            src={images.consultingRoomWide}
            alt="Consultório de atendimento da clínica"
            ratio="3/2"
            placeholderLabel="Consultório"
          />
        </div>
      </div>
    </section>
  )
}

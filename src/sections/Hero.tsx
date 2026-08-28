import { Button } from '../components/Button'
import { ClinicImage } from '../components/ClinicImage'
import { clinicData, whatsappUrl } from '../lib/clinic-data'

const { copy, address, images } = clinicData

export function Hero() {
  return (
    <section id="inicio" className="bg-(--color-surface) pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24">
      <div className="shell grid items-center gap-10 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:gap-16">
        {/* Conteúdo — no mobile vem antes da fotografia. */}
        <div className="reveal is-visible">
          <p className="eyebrow">{copy.heroEyebrow}</p>

          <h1 className="mt-6 text-balance font-display text-[2.5rem] leading-[1.08] text-(--color-ink) sm:text-[3.25rem] lg:text-[3.75rem]">
            {copy.heroTitle}
          </h1>

          <p className="mt-6 max-w-lg text-pretty text-[1.0625rem] leading-relaxed text-(--color-ink-soft) sm:text-lg">
            {copy.heroSubtitle}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href={whatsappUrl()} target="_blank" rel="noopener noreferrer" size="lg" withWhatsApp>
              Agendar pelo WhatsApp
            </Button>
            <Button href="#clinica" variant="outline" size="lg">
              Conhecer a clínica
            </Button>
          </div>

          <p className="mt-10 border-t border-(--color-line) pt-5 text-[0.8125rem] text-(--color-ink-soft)">
            Pediatria
            <span className="mx-2.5 text-(--color-gold)">•</span>
            Exames Laboratoriais
            <span className="mx-2.5 text-(--color-gold)">•</span>
            {address.city}
          </p>
        </div>

        {/* Fotografia — grande, sem efeitos: a composição carrega o peso visual. */}
        <ClinicImage
          src={images.hero}
          alt={`Recepção da ${clinicData.name}, em ${address.city} — ${address.state}`}
          ratio="4/5"
          priority
          placeholderLabel="Fotografia institucional"
          className="mx-auto w-full max-w-md lg:max-w-none"
        />
      </div>
    </section>
  )
}

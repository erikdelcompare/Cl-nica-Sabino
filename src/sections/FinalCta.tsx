import { Reveal } from '../components/Reveal'
import { Button } from '../components/Button'
import { clinicData, whatsappUrl } from '../lib/clinic-data'

const { copy, contact } = clinicData

/** Única área ampla em grafite do site — fecha a página com contraste. */
export function FinalCta() {
  return (
    <section className="bg-(--color-graphite) py-20 sm:py-24 lg:py-28">
      <div className="shell max-w-3xl text-center">
        <Reveal>
          <span aria-hidden="true" className="mx-auto block h-px w-10 bg-(--color-gold)" />

          <h2 className="mt-8 text-balance font-display text-[2rem] leading-[1.16] text-(--color-ink-invert) sm:text-[2.5rem] lg:text-[2.875rem]">
            {copy.finalCtaTitle}
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-pretty leading-relaxed text-(--color-ink-invert-soft)">
            {copy.finalCtaText}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              variant="gold"
              size="lg"
              withWhatsApp
            >
              Falar no WhatsApp
            </Button>
            <a
              href={`tel:+${contact.whatsapp}`}
              className="px-2 py-2 text-[0.9375rem] text-(--color-ink-invert-soft) underline decoration-(--color-line-invert) underline-offset-4 transition-colors hover:text-(--color-ink-invert) hover:decoration-(--color-gold-light)"
            >
              {contact.phone}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

import { Reveal } from '../components/Reveal'
import { SectionKicker } from '../components/SectionKicker'
import { Button } from '../components/Button'
import { PinIcon } from '../components/icons'
import {
  CLINIC,
  MAPS_DIRECTIONS_URL,
  MAPS_EMBED_URL,
  WHATSAPP_MESSAGES,
  buildWhatsAppUrl,
} from '../lib/site-config'

export function Location() {
  return (
    <section id="localizacao" className="bg-(--color-warm-white) py-24 sm:py-32">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <Reveal className="max-w-xl">
          <SectionKicker tone="dark">Localização</SectionKicker>
          <h2 className="mt-5 text-balance font-display text-4xl font-medium leading-[1.12] text-(--color-charcoal) sm:text-5xl">
            Fácil de encontrar, no Centro de São Gabriel do Oeste.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-10">
          <Reveal delay={0.08} className="order-2 flex flex-col justify-center gap-8 lg:order-1">
            <div>
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--color-charcoal)/15 text-(--color-gold-deep)">
                  <PinIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-xl text-(--color-charcoal)">Sabino Especialidades Médicas</p>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-(--color-charcoal)/65">
                    {CLINIC.addressLine}
                    <br />
                    {CLINIC.city} — {CLINIC.state}, {CLINIC.postalCode}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-(--color-charcoal)/55">
                    No Centro da cidade, nas proximidades do Hospital Municipal.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href={MAPS_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" variant="outline-dark" withArrow>
                Como chegar
              </Button>
              <Button
                href={buildWhatsAppUrl(WHATSAPP_MESSAGES.localizacao)}
                target="_blank"
                rel="noopener noreferrer"
                withWhatsAppIcon
              >
                Agendar pelo WhatsApp
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.16} className="order-1 lg:order-2">
            <div
              className="aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] border border-(--color-charcoal)/12 shadow-[0_20px_60px_-24px_rgba(23,23,26,0.35)] sm:aspect-[16/10]"
              style={{
                background:
                  'radial-gradient(120% 100% at 20% 0%, rgba(201,162,76,0.14) 0%, rgba(201,162,76,0) 55%), linear-gradient(160deg, #f2efe6 0%, #e9e4d6 100%)',
              }}
            >
              <iframe
                title="Mapa — Sabino Especialidades Médicas"
                src={MAPS_EMBED_URL}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                aria-label="Mapa de localização da Sabino Especialidades Médicas"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

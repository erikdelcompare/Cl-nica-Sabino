import { Reveal } from '../components/Reveal'
import { Button } from '../components/Button'
import { ClinicImage } from '../components/ClinicImage'
import { clinicData, mapsDirectionsUrl, mapsEmbedUrl, whatsappUrl } from '../lib/clinic-data'
import { PhoneIcon, PinIcon } from '../components/icons'

const { copy, address, contact, openingHours, images } = clinicData

export function Location() {
  return (
    <section id="localizacao" className="bg-(--color-canvas) py-20 sm:py-28 lg:py-32">
      <div className="shell">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{copy.locationEyebrow}</p>
          <h2 className="mt-5 text-balance font-display text-[2.125rem] leading-[1.12] text-(--color-ink) sm:text-[2.75rem] lg:text-[3rem]">
            {copy.locationTitle}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] lg:gap-14">
          <Reveal>
            <div className="flex gap-4">
              <PinIcon className="mt-0.5 h-5 w-5 shrink-0 text-(--color-gold-ink)" />
              <div>
                <p className="font-display text-xl text-(--color-ink)">{clinicData.name}</p>
                <address className="mt-2 not-italic leading-relaxed text-(--color-ink-soft)">
                  {address.street}
                  <br />
                  {address.district} — {address.city}/{address.state}
                  <br />
                  CEP {address.postalCode}
                </address>
                <p className="mt-3 text-[0.875rem] leading-relaxed text-(--color-ink-soft)">
                  {address.reference}
                </p>
              </div>
            </div>

            <div className="mt-8 flex gap-4 border-t border-(--color-line) pt-8">
              <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-(--color-gold-ink)" />
              <div>
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-(--color-ink-soft)">
                  Telefone
                </p>
                <a
                  href={`tel:+${contact.whatsapp}`}
                  className="mt-1 block text-lg text-(--color-ink) transition-colors hover:text-(--color-gold-ink)"
                >
                  {contact.phone}
                </a>
              </div>
            </div>

            {/* Horários: renderizados apenas quando confirmados pela clínica. */}
            {openingHours.length > 0 && (
              <dl className="mt-8 border-t border-(--color-line) pt-8">
                <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-(--color-ink-soft)">
                  Atendimento
                </dt>
                {openingHours.map((entry) => (
                  <dd key={entry.days} className="mt-2 flex justify-between gap-4 text-[0.9375rem]">
                    <span className="text-(--color-ink-soft)">{entry.days}</span>
                    <span className="text-(--color-ink)">{entry.hours}</span>
                  </dd>
                ))}
              </dl>
            )}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                href={mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                withArrow
              >
                Traçar rota
              </Button>
              <Button href={whatsappUrl()} target="_blank" rel="noopener noreferrer" withWhatsApp>
                Falar pelo WhatsApp
              </Button>
            </div>
          </Reveal>

          <div className="space-y-5">
            <ClinicImage
              src={images.city}
              alt={`Vista de ${address.city} — ${address.state}`}
              ratio="21/9"
              caption={`${address.city} — ${address.state}`}
            />

            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-(--color-line)">
              <iframe
                title={`Mapa — ${clinicData.name}`}
                src={mapsEmbedUrl}
                className="block h-[20rem] w-full sm:h-[22rem] lg:h-[24rem]"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

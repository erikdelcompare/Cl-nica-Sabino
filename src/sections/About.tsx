import { Reveal } from '../components/Reveal'
import { ClinicImage } from '../components/ClinicImage'
import { clinicData } from '../lib/clinic-data'
import { InstagramIcon } from '../components/icons'

const { copy, address, contact, images } = clinicData

export function About() {
  return (
    <section id="clinica" className="bg-(--color-surface) py-20 sm:py-28 lg:py-32">
      <div className="shell grid gap-12 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] lg:items-center lg:gap-20">
        {/* Composição fotográfica: uma vertical grande + um recorte menor. */}
        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <ClinicImage
            src={images.reception}
            alt={`Recepção da ${clinicData.name}`}
            ratio="4/5"
            placeholderLabel="Recepção da clínica"
          />
          <div className="absolute -bottom-8 -right-3 w-28 rounded-[var(--radius-lg)] border-4 border-(--color-surface) sm:w-36 lg:-right-10 lg:w-44">
            <ClinicImage
              src={images.consultingRoom}
              alt="Consultório da clínica"
              ratio="1/1"
              placeholderLabel="Consultório"
              compact
            />
          </div>
        </div>

        <Reveal className="mt-10 lg:mt-0">
          <p className="eyebrow">{copy.aboutEyebrow}</p>

          <h2 className="mt-5 text-balance font-display text-[2.125rem] leading-[1.12] text-(--color-ink) sm:text-[2.75rem] lg:text-[3rem]">
            {copy.aboutTitle}
          </h2>

          <div className="mt-6 space-y-5 text-pretty text-[1.0625rem] leading-relaxed text-(--color-ink-soft)">
            {copy.aboutParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {/* Serviços como lista editorial com filetes — sem cards. */}
          <dl className="mt-10 border-t border-(--color-line)">
            {clinicData.services.map((service) => (
              <div key={service.id} className="border-b border-(--color-line) py-5">
                <dt className="font-display text-xl text-(--color-ink)">{service.title}</dt>
                <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-(--color-ink-soft)">
                  {service.description}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 text-[0.9375rem] text-(--color-ink-soft)">
            {address.street} — {address.district}, {address.city} — {address.state}
          </p>

          <a
            href={contact.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-[0.9375rem] text-(--color-ink) underline decoration-(--color-gold) decoration-1 underline-offset-4 transition-colors hover:text-(--color-gold-ink)"
          >
            <InstagramIcon className="h-4 w-4" />
            Acompanhe a clínica no Instagram
          </a>
        </Reveal>
      </div>
    </section>
  )
}

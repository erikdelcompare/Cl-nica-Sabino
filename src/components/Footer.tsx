import { clinicData, navLinks, whatsappUrl } from '../lib/clinic-data'
import { InstagramIcon, PhoneIcon, WhatsAppIcon } from './icons'

const { address, contact, legalName } = clinicData

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      id="contato"
      className="border-t border-(--color-line) bg-(--color-canvas) pt-16"
      style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      <div className="shell">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <a href="#inicio" className="inline-flex items-center gap-2.5" aria-label={clinicData.name}>
              <img src="/images/logo-mark.png" alt="" width={40} height={40} className="h-10 w-10" />
              <span className="leading-tight">
                <span className="block font-display text-[1.0625rem] text-(--color-ink)">Sabino</span>
                <span className="block text-[0.5625rem] font-medium uppercase tracking-[0.16em] text-(--color-ink-soft)">
                  Especialidades Médicas
                </span>
              </span>
            </a>
            <address className="mt-5 not-italic text-[0.9375rem] leading-relaxed text-(--color-ink-soft)">
              {address.street}
              <br />
              {address.district} — {address.city}/{address.state}
            </address>
          </div>

          <nav aria-label="Navegação do rodapé">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-(--color-ink)">
              Navegação
            </h2>
            <ul className="mt-4 space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[0.9375rem] text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-(--color-ink)">
              Contato
            </h2>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
              <li>
                <a
                  href={`tel:+${contact.whatsapp}`}
                  className="inline-flex items-center gap-2.5 text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
                >
                  <PhoneIcon className="h-4 w-4 shrink-0" />
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={contact.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
                >
                  <InstagramIcon className="h-4 w-4 shrink-0" />
                  {contact.instagram}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-(--color-line) pt-6 text-[0.8125rem] text-(--color-ink-soft) sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {legalName}. Todos os direitos reservados.
          </p>
          <p>
            {address.city} — {address.state}
          </p>
        </div>
      </div>
    </footer>
  )
}

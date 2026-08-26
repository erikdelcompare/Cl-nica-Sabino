import logo from '../assets/logo-512.png'
import {
  CLINIC,
  MAPS_DIRECTIONS_URL,
  NAV_LINKS,
  WHATSAPP_MESSAGES,
  buildWhatsAppUrl,
} from '../lib/site-config'
import { InstagramIcon, PinIcon, WhatsAppIcon } from './icons'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer id="contato" className="border-t border-(--color-warm-white)/10 bg-(--color-dark) pb-28 pt-16 md:pb-16">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <a href="#inicio" className="inline-flex items-center gap-3" aria-label="Sabino Especialidades Médicas">
              <img src={logo} alt="" className="h-12 w-12" width={48} height={48} />
              <span className="font-display text-xl text-(--color-warm-white)">Sabino Especialidades Médicas</span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-(--color-warm-white)/55">
              Atendimento pediátrico e exames laboratoriais em São Gabriel do Oeste — MS, com cuidado próximo em cada
              etapa.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-gold)">Navegação</h3>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-(--color-warm-white)/70 transition-colors hover:text-(--color-gold-light)"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-gold)">Contato</h3>
            <ul className="mt-4 space-y-3 text-sm text-(--color-warm-white)/70">
              <li>
                <a
                  href={MAPS_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 transition-colors hover:text-(--color-gold-light)"
                >
                  <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {CLINIC.addressLine}
                    <br />
                    {CLINIC.city} — {CLINIC.state}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={buildWhatsAppUrl(WHATSAPP_MESSAGES.default)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 transition-colors hover:text-(--color-gold-light)"
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  {CLINIC.whatsappDisplay}
                </a>
              </li>
              <li>
                <a
                  href={CLINIC.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 transition-colors hover:text-(--color-gold-light)"
                >
                  <InstagramIcon className="h-4 w-4 shrink-0" />
                  {CLINIC.instagramHandle}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-(--color-warm-white)/10 pt-6 text-xs text-(--color-warm-white)/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Sabino Especialidades Médicas. Todos os direitos reservados.
          </p>
          <p>São Gabriel do Oeste — MS</p>
        </div>
      </div>
    </footer>
  )
}

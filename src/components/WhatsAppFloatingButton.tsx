import { WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'
import { WhatsAppIcon } from './icons'

/** Botão flutuante discreto — visível apenas em telas médias/grandes (desktop e tablet). */
export function WhatsAppFloatingButton() {
  return (
    <a
      href={buildWhatsAppUrl(WHATSAPP_MESSAGES.default)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Agendar pelo WhatsApp"
      className="group fixed bottom-7 right-7 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-(--color-gold-light) to-(--color-gold-deep) text-(--color-dark) shadow-[0_12px_32px_-8px_rgba(201,162,76,0.6)] transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-gold) md:flex"
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-(--color-gold)/40 animate-pulse-soft" />
      <WhatsAppIcon className="h-6 w-6" />
    </a>
  )
}

import { WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'
import { ArrowRightIcon, WhatsAppIcon } from './icons'

/** Barra de CTA fixa no rodapé, apenas em mobile, respeitando a safe area do iOS. */
export function MobileCtaBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-(--color-warm-white)/10 bg-(--color-dark)/95 px-4 pt-3 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <a
        href={buildWhatsAppUrl(WHATSAPP_MESSAGES.default)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-(--color-gold-light) to-(--color-gold-deep) py-3.5 text-sm font-semibold text-(--color-dark) shadow-[0_10px_28px_-8px_rgba(201,162,76,0.6)] active:scale-[0.98]"
      >
        <WhatsAppIcon className="h-[1.1em] w-[1.1em]" />
        Agendar pelo WhatsApp
        <ArrowRightIcon className="h-4 w-4" />
      </a>
    </div>
  )
}

import { clinicData, whatsappUrl } from '../lib/clinic-data'
import { WhatsAppIcon } from './icons'

/**
 * Barra de contato fixa no rodapé, apenas em telas pequenas.
 * Discreta: uma linha, sem sombra pesada, respeitando a safe area do iOS.
 */
export function MobileCtaBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-(--color-line) bg-(--color-surface)/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-medium text-(--color-ink)">{clinicData.shortName}</p>
          <p className="truncate text-[0.75rem] text-(--color-ink-soft)">{clinicData.contact.phone}</p>
        </div>
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-sm)] bg-(--color-graphite) px-4 py-2.5 text-[0.8125rem] font-medium text-(--color-ink-invert)"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Agendar
        </a>
      </div>
    </div>
  )
}

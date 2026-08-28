import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { clinicData, navLinks, whatsappUrl } from '../lib/clinic-data'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { Button } from './Button'
import { CloseIcon, InstagramIcon, PhoneIcon } from './icons'

type MobileMenuProps = {
  open: boolean
  onClose: () => void
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  useLockBodyScroll(open)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Fecha com Esc e leva o foco ao botão de fechar quando o painel abre.
  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[60] bg-(--color-surface) transition-opacity duration-300 lg:hidden',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="flex h-full flex-col">
        <div
          className="shell flex h-20 shrink-0 items-center justify-between"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <img src="/images/logo-mark.png" alt={clinicData.name} width={40} height={40} className="h-10 w-10" />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-(--color-line-strong) text-(--color-ink)"
            aria-label="Fechar menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="shell flex-1 overflow-y-auto pt-4" aria-label="Navegação principal">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href} className="border-b border-(--color-line)">
                <a
                  href={link.href}
                  onClick={onClose}
                  className="block py-4 font-display text-2xl text-(--color-ink)"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div
          className="shell shrink-0 space-y-4 border-t border-(--color-line) py-5"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            withWhatsApp
            className="w-full"
            onClick={onClose}
          >
            Agendar pelo WhatsApp
          </Button>

          <div className="flex items-center justify-between text-[0.8125rem] text-(--color-ink-soft)">
            <a href={`tel:+${clinicData.contact.whatsapp}`} className="inline-flex items-center gap-2">
              <PhoneIcon className="h-4 w-4" />
              {clinicData.contact.phone}
            </a>
            <a
              href={clinicData.contact.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <InstagramIcon className="h-4 w-4" />
              {clinicData.contact.instagram}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

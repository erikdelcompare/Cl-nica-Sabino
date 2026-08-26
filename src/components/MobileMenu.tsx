import { AnimatePresence, motion } from 'framer-motion'
import logo from '../assets/logo-512.png'
import { CLINIC, NAV_LINKS, WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { Button } from './Button'
import { CloseIcon, InstagramIcon, WhatsAppIcon } from './icons'

type MobileMenuProps = {
  open: boolean
  onClose: () => void
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  useLockBodyScroll(open)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-(--color-graphite) noise-overlay lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(201,162,76,0.35), transparent 70%)' }}
          />

          <div className="flex items-center justify-between px-6 pt-6" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
            <img src={logo} alt="Sabino Especialidades Médicas" className="h-11 w-11" width={44} height={44} />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-(--color-warm-white)/20 text-(--color-warm-white) hover:border-(--color-gold)/60 hover:text-(--color-gold-light)"
              aria-label="Fechar menu"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col justify-center gap-2 px-8" aria-label="Navegação principal (mobile)">
            {NAV_LINKS.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={onClose}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i + 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="border-b border-(--color-warm-white)/10 py-4 font-display text-3xl text-(--color-warm-white) transition-colors hover:text-(--color-gold-light)"
              >
                {link.label}
              </motion.a>
            ))}
          </nav>

          <div
            className="flex flex-col gap-4 px-8 pb-8"
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
          >
            <Button
              href={buildWhatsAppUrl(WHATSAPP_MESSAGES.default)}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              withWhatsAppIcon
              className="w-full"
            >
              Agendar pelo WhatsApp
            </Button>

            <div className="flex items-center justify-between text-sm text-(--color-warm-white)/60">
              <a href={`tel:+${CLINIC.whatsappNumber}`} className="flex items-center gap-2 hover:text-(--color-gold-light)">
                <WhatsAppIcon className="h-4 w-4" />
                {CLINIC.whatsappDisplay}
              </a>
              <a
                href={CLINIC.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-(--color-gold-light)"
              >
                <InstagramIcon className="h-4 w-4" />
                {CLINIC.instagramHandle}
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

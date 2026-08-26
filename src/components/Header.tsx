import { useState } from 'react'
import { clsx } from 'clsx'
import logo from '../assets/logo-512.png'
import { NAV_LINKS, WHATSAPP_MESSAGES, buildWhatsAppUrl } from '../lib/site-config'
import { useScrolled } from '../hooks/useScrolled'
import { Button } from './Button'
import { MenuIcon } from './icons'
import { MobileMenu } from './MobileMenu'

export function Header() {
  const scrolled = useScrolled(32)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled
            ? 'border-b border-(--color-warm-white)/10 bg-(--color-dark)/80 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-18 max-w-[1400px] items-center justify-between px-5 py-3 sm:px-8 lg:px-12">
          <a href="#inicio" className="flex items-center gap-3" aria-label="Sabino Especialidades Médicas — início">
            <img src={logo} alt="" className="h-11 w-11 shrink-0" width={44} height={44} />
            <span className="hidden font-display text-lg tracking-tight text-(--color-warm-white) sm:block">
              Sabino
              <span className="ml-1.5 text-xs font-sans font-medium uppercase tracking-[0.2em] text-(--color-warm-white)/50">
                Especialidades Médicas
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-9 lg:flex" aria-label="Navegação principal">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative text-sm font-medium text-(--color-warm-white)/85 transition-colors hover:text-(--color-gold-light)"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 gold-rule transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <Button
                href={buildWhatsAppUrl(WHATSAPP_MESSAGES.default)}
                target="_blank"
                rel="noopener noreferrer"
                size="md"
                withWhatsAppIcon
              >
                Agendar consulta
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-(--color-warm-white)/20 text-(--color-warm-white) transition-colors hover:border-(--color-gold)/60 hover:text-(--color-gold-light) lg:hidden"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}

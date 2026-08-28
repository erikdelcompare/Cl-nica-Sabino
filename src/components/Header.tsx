import { useState } from 'react'
import { clsx } from 'clsx'
import { clinicData, navLinks, whatsappUrl } from '../lib/clinic-data'
import { useScrolled } from '../hooks/useScrolled'
import { Button } from './Button'
import { MenuIcon } from './icons'
import { MobileMenu } from './MobileMenu'

export function Header() {
  const scrolled = useScrolled(24)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-[var(--radius-sm)] focus:bg-(--color-graphite) focus:px-4 focus:py-2 focus:text-sm focus:text-(--color-ink-invert)"
      >
        Ir para o conteúdo
      </a>

      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-50 border-b bg-(--color-surface) transition-all duration-300',
          scrolled ? 'border-(--color-line)' : 'border-transparent',
        )}
        style={scrolled ? { boxShadow: '0 1px 2px rgba(37,37,37,0.04)' } : undefined}
      >
        <div
          className={clsx(
            'shell flex items-center justify-between transition-[height] duration-300',
            scrolled ? 'h-16' : 'h-20',
          )}
        >
          <a href="#inicio" className="flex items-center gap-2.5" aria-label={`${clinicData.name} — início`}>
            <img
              src="/images/logo-mark.png"
              alt=""
              width={40}
              height={40}
              className={clsx('shrink-0 transition-all duration-300', scrolled ? 'h-8 w-8' : 'h-10 w-10')}
            />
            <span className="hidden leading-tight sm:block">
              <span className="block font-display text-[1.0625rem] text-(--color-ink)">Sabino</span>
              <span className="block text-[0.5625rem] font-medium uppercase tracking-[0.16em] text-(--color-ink-soft)">
                Especialidades Médicas
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Navegação principal">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative py-1 text-[0.875rem] text-(--color-ink-soft) transition-colors hover:text-(--color-ink) after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-(--color-gold) after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <Button
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                withWhatsApp
              >
                Agendar consulta
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-(--color-line-strong) text-(--color-ink) transition-colors hover:border-(--color-ink) lg:hidden"
              aria-label="Abrir menu de navegação"
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

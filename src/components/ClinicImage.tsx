import { useState } from 'react'
import { clsx } from 'clsx'
import { showImagePlaceholders } from '../lib/clinic-data'
import { useReveal } from '../hooks/useReveal'

type ClinicImageProps = {
  /**
   * Caminho da fotografia oficial, ex.: '/images/clinic/reception.jpg'.
   * Vazio (ou arquivo ainda inexistente) → exibe o espaço reservado.
   */
  src?: string
  alt: string
  /** Proporção do enquadramento. Ex.: '4/5', '3/4', '16/10'. */
  ratio?: string
  className?: string
  /** Legenda do espaço reservado, para indicar qual foto entra aqui. */
  placeholderLabel?: string
  priority?: boolean
  /** Rótulo institucional discreto sobreposto ao pé da imagem. */
  caption?: string
  /** 'light' (padrão) ou 'dark', para seções em grafite. */
  tone?: 'light' | 'dark'
  /** Em espaços pequenos, o texto do reservado é omitido (só o ícone). */
  compact?: boolean
}

/**
 * Espaço de fotografia do site.
 *
 * Enquanto a clínica não fornece a imagem oficial, renderiza uma composição
 * sóbria em tons quentes — nunca um bloco cinza com "IMAGE HERE", e nunca uma
 * imagem genérica apresentada como se fosse foto real da unidade.
 */
export function ClinicImage({
  src,
  alt,
  ratio = '4/5',
  className,
  placeholderLabel,
  priority = false,
  caption,
  tone = 'light',
  compact = false,
}: ClinicImageProps) {
  const [failed, setFailed] = useState(false)
  const { ref, visible } = useReveal<HTMLDivElement>(0.1)

  const hasImage = Boolean(src) && !failed

  return (
    <div
      ref={ref}
      className={clsx(
        'reveal reveal-image relative overflow-hidden rounded-[var(--radius-lg)]',
        tone === 'dark' ? 'bg-(--color-graphite-deep)' : 'bg-(--color-sand)',
        visible && 'is-visible',
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      {hasImage ? (
        <>
          <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : 'auto'}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
          {caption && (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1/3"
                style={{
                  background: 'linear-gradient(to top, rgba(28,28,28,0.62), rgba(28,28,28,0))',
                }}
              />
              <p className="absolute bottom-4 left-5 right-5 text-[0.8125rem] text-white/90">{caption}</p>
            </>
          )}
        </>
      ) : (
        <ImagePlaceholder label={placeholderLabel} tone={tone} compact={compact} />
      )}

      {/* Filete interno discreto, no lugar de sombra. */}
      <div
        aria-hidden="true"
        className={clsx(
          'pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] ring-1 ring-inset',
          tone === 'dark' ? 'ring-white/10' : 'ring-(--color-line-strong)/60',
        )}
      />
    </div>
  )
}

function ImagePlaceholder({
  label,
  tone,
  compact,
}: {
  label?: string
  tone: 'light' | 'dark'
  compact: boolean
}) {
  const dark = tone === 'dark'
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center"
      style={{
        background: dark
          ? 'linear-gradient(160deg, #2c2c2c 0%, #232323 55%, #1e1e1e 100%)'
          : 'linear-gradient(160deg, #f4f2ec 0%, #eeebe3 55%, #e9e5db 100%)',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        aria-hidden="true"
        className={clsx('h-7 w-7', dark ? 'text-(--color-gold-light)/70' : 'text-(--color-gold)/70')}
      >
        <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
        <circle cx="12" cy="12" r="3.25" />
        <path d="M8 5.5l1.1-2h5.8l1.1 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {showImagePlaceholders && !compact && (
        <div>
          <p
            className={clsx(
              'text-[0.8125rem] font-medium tracking-wide',
              dark ? 'text-(--color-ink-invert)/80' : 'text-(--color-ink)/70',
            )}
          >
            {label ?? 'Imagem institucional'}
          </p>
          <p
            className={clsx(
              'mt-1 text-xs leading-relaxed',
              dark ? 'text-(--color-ink-invert-soft)' : 'text-(--color-ink-soft)',
            )}
          >
            Fotografia oficial será inserida após aprovação.
          </p>
        </div>
      )}
    </div>
  )
}

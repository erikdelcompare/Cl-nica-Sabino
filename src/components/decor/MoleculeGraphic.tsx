import { clsx } from 'clsx'

type MoleculeGraphicProps = {
  className?: string
}

/**
 * Composição SVG abstrata (átomos conectados por linhas finas) evocando
 * ciência/laboratório de forma elegante, sem recorrer a órgãos ou ícones literais.
 */
export function MoleculeGraphic({ className }: MoleculeGraphicProps) {
  return (
    <svg
      viewBox="0 0 420 420"
      className={clsx('pointer-events-none', className)}
      aria-hidden="true"
      fill="none"
    >
      <g className="animate-spin-slower" style={{ transformOrigin: '210px 210px' }}>
        <circle cx="210" cy="210" r="150" stroke="url(#mg-line)" strokeWidth="0.6" strokeDasharray="1 7" />
        <line x1="90" y1="140" x2="210" y2="210" stroke="url(#mg-line)" strokeWidth="1" />
        <line x1="210" y1="210" x2="330" y2="150" stroke="url(#mg-line)" strokeWidth="1" />
        <line x1="210" y1="210" x2="250" y2="330" stroke="url(#mg-line)" strokeWidth="1" />
        <line x1="210" y1="210" x2="120" y2="300" stroke="url(#mg-line)" strokeWidth="1" />
        <line x1="90" y1="140" x2="60" y2="230" stroke="url(#mg-line)" strokeWidth="0.7" />
        <line x1="330" y1="150" x2="360" y2="240" stroke="url(#mg-line)" strokeWidth="0.7" />

        <circle cx="210" cy="210" r="10" fill="url(#mg-node)" />
        <circle cx="90" cy="140" r="6" fill="url(#mg-node)" />
        <circle cx="330" cy="150" r="7" fill="url(#mg-node)" />
        <circle cx="250" cy="330" r="5" fill="url(#mg-node)" />
        <circle cx="120" cy="300" r="6" fill="url(#mg-node)" />
        <circle cx="60" cy="230" r="3.5" fill="url(#mg-node)" />
        <circle cx="360" cy="240" r="3.5" fill="url(#mg-node)" />
      </g>

      <defs>
        <linearGradient id="mg-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8ce8a" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#8a6b28" stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id="mg-node" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#f3e2ab" />
          <stop offset="100%" stopColor="#a1802f" />
        </radialGradient>
      </defs>
    </svg>
  )
}

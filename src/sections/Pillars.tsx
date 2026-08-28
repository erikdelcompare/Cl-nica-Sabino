import { Reveal } from '../components/Reveal'
import { clinicData } from '../lib/clinic-data'

/**
 * Faixa institucional logo abaixo do hero.
 * Sem cards: apenas colunas separadas por filetes verticais muito finos.
 */
export function Pillars() {
  return (
    <section className="border-y border-(--color-line) bg-(--color-canvas) py-14 sm:py-16">
      <div className="shell grid gap-10 sm:grid-cols-3 sm:gap-0">
        {clinicData.pillars.map((pillar, i) => (
          <Reveal
            key={pillar.title}
            delay={i * 90}
            className={
              i > 0
                ? 'sm:border-l sm:border-(--color-line) sm:pl-8 lg:pl-12'
                : 'sm:pr-8 lg:pr-12'
            }
          >
            <h2 className="font-display text-[1.375rem] leading-snug text-(--color-ink)">{pillar.title}</h2>
            <p className="mt-2.5 max-w-xs text-pretty text-[0.9375rem] leading-relaxed text-(--color-ink-soft)">
              {pillar.description}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

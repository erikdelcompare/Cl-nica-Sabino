import { Reveal } from '../components/Reveal'
import { SectionKicker } from '../components/SectionKicker'
import { ArrowRightIcon, FlaskIcon, HeartHandsIcon } from '../components/icons'

const services = [
  {
    n: '01',
    icon: HeartHandsIcon,
    title: 'Atendimento Pediátrico',
    description: 'Acompanhamento e cuidado voltados à saúde infantil, com atenção à criança e à família.',
    href: '#pediatria',
  },
  {
    n: '02',
    icon: FlaskIcon,
    title: 'Exames Laboratoriais',
    description: 'Praticidade para realizar exames e acompanhar sua saúde em um só lugar.',
    href: '#exames',
  },
]

export function Services() {
  return (
    <section className="bg-(--color-warm-white) py-24 sm:py-32">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <Reveal className="max-w-xl">
          <SectionKicker tone="dark">Serviços</SectionKicker>
          <h2 className="mt-5 text-balance font-display text-4xl font-medium leading-[1.12] text-(--color-charcoal) sm:text-5xl">
            Cuidado estruturado em cada etapa.
          </h2>
        </Reveal>

        <div className="mt-16 divide-y divide-(--color-charcoal)/12 border-y border-(--color-charcoal)/12">
          {services.map(({ n, icon: Icon, title, description, href }, i) => (
            <Reveal key={n} delay={i * 0.08}>
              <a
                href={href}
                className="group flex flex-col gap-6 py-10 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-10"
              >
                <div className="flex items-center gap-6 sm:gap-8">
                  <span className="font-display text-2xl text-(--color-gold-deep)/70 sm:text-3xl">{n}</span>
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-(--color-charcoal)/15 text-(--color-charcoal) transition-colors duration-300 group-hover:border-(--color-gold) group-hover:text-(--color-gold-deep)">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-2xl text-(--color-charcoal) sm:text-3xl">{title}</h3>
                    <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-(--color-charcoal)/65">
                      {description}
                    </p>
                  </div>
                </div>

                <span className="flex items-center gap-2 self-start text-sm font-medium text-(--color-charcoal)/60 transition-colors group-hover:text-(--color-gold-deep) sm:self-auto">
                  Saiba mais
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

import { Reveal } from '../components/Reveal'
import { SectionKicker } from '../components/SectionKicker'
import { CLINIC } from '../lib/site-config'
import { InstagramIcon } from '../components/icons'
import aerialPhoto from '../assets/photo-aerial.jpg'

const highlights = ['São Gabriel do Oeste — MS', 'Atendimento Pediátrico', 'Exames Laboratoriais']

export function About() {
  return (
    <section id="clinica" className="relative overflow-hidden bg-(--color-warm-white) py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-12">
        <Reveal className="order-2 lg:order-1">
          <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[1.75rem] shadow-[0_24px_70px_-28px_rgba(23,23,26,0.4)]">
            <img
              src={aerialPhoto}
              alt="Vista aérea de São Gabriel do Oeste — MS, cidade onde a Sabino Especialidades Médicas atende"
              className="aspect-[16/10] w-full object-cover"
              width={410}
              height={248}
              loading="lazy"
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(0deg, rgba(11,11,12,0.7) 0%, rgba(11,11,12,0.05) 45%)',
              }}
            />
            <div className="absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-(--color-gold)/20" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs uppercase tracking-[0.2em] text-(--color-gold-light)/90">
                {CLINIC.city} — {CLINIC.state}
              </p>
              <p className="mt-1 text-sm text-(--color-warm-white)/85">{CLINIC.addressLine}</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="order-1 lg:order-2">
          <SectionKicker tone="dark">A Sabino</SectionKicker>
          <h2 className="mt-5 text-balance font-display text-4xl font-medium leading-[1.12] text-(--color-charcoal) sm:text-5xl">
            Medicina próxima. Cuidado que acompanha.
          </h2>
          <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-(--color-charcoal)/75">
            A Sabino Especialidades Médicas atua em São Gabriel do Oeste com um compromisso simples: oferecer um
            atendimento próximo, atencioso e cuidadoso a cada paciente que passa pela clínica. Aqui, o cuidado
            pediátrico e os exames laboratoriais fazem parte de uma mesma proposta — acompanhar a saúde da sua
            família com atenção e clareza, do primeiro contato ao retorno.
          </p>

          <ul className="mt-8 flex flex-wrap gap-3">
            {highlights.map((item) => (
              <li
                key={item}
                className="rounded-full border border-(--color-charcoal)/15 px-4 py-2 text-sm font-medium text-(--color-charcoal)/80"
              >
                {item}
              </li>
            ))}
          </ul>

          <a
            href={CLINIC.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-9 inline-flex items-center gap-2 text-sm font-medium text-(--color-charcoal)/70 transition-colors hover:text-(--color-gold-deep)"
          >
            <InstagramIcon className="h-4 w-4" />
            <span className="relative">
              Acompanhe o dia a dia da clínica {CLINIC.instagramHandle}
              <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 group-hover:scale-x-100" />
            </span>
          </a>
        </Reveal>
      </div>
    </section>
  )
}

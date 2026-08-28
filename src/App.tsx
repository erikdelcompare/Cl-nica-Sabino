import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { MobileCtaBar } from './components/MobileCtaBar'
import { Hero } from './sections/Hero'
import { Pillars } from './sections/Pillars'
import { About } from './sections/About'
import { Pediatria } from './sections/Pediatria'
import { Doctor } from './sections/Doctor'
import { Exams } from './sections/Exams'
import { Specialties } from './sections/Specialties'
import { Gallery } from './sections/Gallery'
import { Location } from './sections/Location'
import { FinalCta } from './sections/FinalCta'

/**
 * Ritmo da página: claro → claro → bege → claro → off-white → claro →
 * bege (condicional) → claro → off-white → grafite → rodapé claro.
 * O grafite entra apenas no CTA final, como contraste de fechamento.
 */
export default function App() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <Pillars />
        <About />
        <Pediatria />
        <Doctor />
        <Exams />
        <Specialties />
        <Gallery />
        <Location />
        <FinalCta />
      </main>
      <Footer />
      <MobileCtaBar />
    </>
  )
}

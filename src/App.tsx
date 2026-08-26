import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { MobileCtaBar } from './components/MobileCtaBar'
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton'
import { About } from './sections/About'
import { Doctor } from './sections/Doctor'
import { EmotionalBreak } from './sections/EmotionalBreak'
import { Exams } from './sections/Exams'
import { FinalCta } from './sections/FinalCta'
import { Hero } from './sections/Hero'
import { Location } from './sections/Location'
import { Pediatria } from './sections/Pediatria'
import { Services } from './sections/Services'

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Pediatria />
        <Services />
        <EmotionalBreak />
        <Doctor />
        <Exams />
        <Location />
        <FinalCta />
      </main>
      <Footer />
      <WhatsAppFloatingButton />
      <MobileCtaBar />
    </>
  )
}

export default App

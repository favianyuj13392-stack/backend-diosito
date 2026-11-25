import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Reality from './components/Reality'
import Testimonials from './components/Testimonials'
import Gallery from './components/Gallery'
import Rights from './components/Rights'
import Directory from './components/Directory'
import Spread from './components/Spread'
import Footer from './components/Footer'
import TestimonialForm from './components/TestimonialForm'
import Modal from './components/ui/Modal'
import { useToast } from './hooks/useToast'
import { useLiveReaders } from './hooks/useLiveReaders'
import { INITIAL_TESTIMONIALS } from './data/content'
import {
  fetchTestimonials,
  postTestimonial,
  submitPledge,
  syncPledges,
  syncVisits,
} from './lib/api'
import {
  loadPledgeState,
  loadUserTestimonials,
  registerVisit,
} from './lib/storage'

/**
 * Composición principal de Caserito Digno.
 * Sincroniza datos con la API de Vercel/Supabase, manteniendo resiliencia
 * offline-first con localStorage.
 */
export default function App() {
  const readers = useLiveReaders()
  const [visits, setVisits] = useState(() => registerVisit())
  const [userTestimonials, setUserTestimonials] = useState(() => loadUserTestimonials())
  const [pledge, setPledge] = useState(() => loadPledgeState())
  const [modalOpen, setModalOpen] = useState(false)
  const justSubmitted = useRef(false)
  const { notify } = useToast()

  // Sincronizar datos con el backend (Supabase + Vercel Serverless)
  useEffect(() => {
    syncVisits().then(setVisits)
    syncPledges().then(setPledge)
    fetchTestimonials().then((remote) => {
      if (Array.isArray(remote) && remote.length > 0) {
        setUserTestimonials(remote)
      }
    })
  }, [])

  const testimonials = useMemo(() => {
    const existingIds = new Set(userTestimonials.map((t) => t.id))
    const fallbackSeed = INITIAL_TESTIMONIALS.filter((t) => !existingIds.has(t.id))
    return [...userTestimonials, ...fallbackSeed]
  }, [userTestimonials])

  const openTestimonialModal = useCallback(() => setModalOpen(true), [])

  const closeTestimonialModal = useCallback(() => {
    setModalOpen(false)
    if (justSubmitted.current) {
      justSubmitted.current = false
      window.setTimeout(() => {
        document.getElementById('testimonios')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
  }, [])

  const handleTestimonialSubmit = useCallback(
    async (data) => {
      const saved = await postTestimonial(data)
      setUserTestimonials((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)])
      justSubmitted.current = true
      notify('Gracias por compartir tu historia. Tu testimonio ya está publicado.')
    },
    [notify],
  )

  const handlePledge = useCallback(async () => {
    if (pledge.hasPledged) {
      notify('Ya eres parte de Caserito Digno. Gracias por sostener la campaña.', 'info')
      return
    }
    const next = await submitPledge()
    setPledge(next)
    notify('¡Bienvenido/a! Tu compromiso ciudadano ya suma a la campaña.')
  }, [pledge, notify])

  return (
    <div className="min-h-screen bg-ivory">
      <a
        href="#inicio"
        className="sr-only z-[120] rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido principal
      </a>

      <Navbar
        readers={readers}
        visits={visits}
        onOpenTestimonial={openTestimonialModal}
      />

      <main>
        <Hero
          readers={readers}
          visits={visits}
          onOpenTestimonial={openTestimonialModal}
        />
        <Reality />
        <Testimonials
          testimonials={testimonials}
          onOpenTestimonial={openTestimonialModal}
        />
        <Gallery />
        <Rights />
        <Directory />
        <Spread pledge={pledge} onPledge={handlePledge} />
      </main>

      <Footer />

      <Modal
        open={modalOpen}
        onClose={closeTestimonialModal}
        title="Registrar un testimonio"
        description="Tu historia se leerá con respeto. Puedes firmarla o publicarla de forma anónima."
      >
        <TestimonialForm
          onSubmit={handleTestimonialSubmit}
          onClose={closeTestimonialModal}
        />
      </Modal>
    </div>
  )
}

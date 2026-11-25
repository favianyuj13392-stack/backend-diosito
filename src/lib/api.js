/**
 * Servicio de conexión con la API de Caserito Digno (Vercel Serverless + Supabase).
 *
 * Implementa una estrategia resiliente (Offline-First / Cache-First) para que
 * si el backend o la base de datos están temporalmente inaccesibles, la aplicación
 * continúe funcionando con localStorage de forma transparente.
 */

import {
  createId,
  formatNumber,
  loadPledgeState,
  loadUserTestimonials,
  PLEDGES_BASELINE,
  savePledgeState,
  saveUserTestimonials,
  VISITS_BASELINE,
} from './storage'

const API_BASE = '/api'

/**
 * Registra o consulta la cantidad de visitas.
 * Realiza POST si es una nueva sesión de navegador, o GET si ya se contó en esta sesión.
 */
export async function syncVisits() {
  const isCounted = typeof window !== 'undefined' && window.sessionStorage.getItem('caserito:visit-session') === '1'

  try {
    const res = await fetch(`${API_BASE}/visits`, {
      method: isCounted ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) throw new Error(`HTTP error ${res.status}`)

    const data = await res.json()
    if (typeof window !== 'undefined' && !isCounted) {
      window.sessionStorage.setItem('caserito:visit-session', '1')
      window.localStorage.setItem('caserito:visits', String(data.visits))
    }
    return Number(data.visits) || VISITS_BASELINE
  } catch (err) {
    console.warn('[Caserito API] Error sincronizando visitas, usando fallback local:', err)
    const local = typeof window !== 'undefined' ? window.localStorage.getItem('caserito:visits') : null
    return Number(local) || VISITS_BASELINE
  }
}

/**
 * Obtiene el estado actual de los compromisos ciudadanos.
 */
export async function syncPledges() {
  const local = loadPledgeState()
  try {
    const res = await fetch(`${API_BASE}/pledges`)
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)

    const data = await res.json()
    const count = Number(data.count) || local.count
    savePledgeState({ count, hasPledged: local.hasPledged })
    return { count, hasPledged: local.hasPledged }
  } catch (err) {
    console.warn('[Caserito API] Error obteniendo compromisos, usando local:', err)
    return local
  }
}

/**
 * Registra un nuevo compromiso ciudadano en la base de datos.
 */
export async function submitPledge() {
  const local = loadPledgeState()
  if (local.hasPledged) return local

  try {
    const res = await fetch(`${API_BASE}/pledges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)

    const data = await res.json()
    const nextState = { count: Number(data.count) || local.count + 1, hasPledged: true }
    savePledgeState(nextState)
    return nextState
  } catch (err) {
    console.warn('[Caserito API] Error registrando compromiso, usando fallback local:', err)
    const nextState = { count: local.count + 1, hasPledged: true }
    savePledgeState(nextState)
    return nextState
  }
}

/**
 * Obtiene todos los testimonios aprobados de la base de datos.
 */
export async function fetchTestimonials() {
  try {
    const res = await fetch(`${API_BASE}/testimonials`)
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)

    const data = await res.json()
    if (Array.isArray(data)) {
      return data
    }
    return []
  } catch (err) {
    console.warn('[Caserito API] Error cargando testimonios remotos, usando locales:', err)
    return loadUserTestimonials()
  }
}

/**
 * Publica un nuevo testimonio en Supabase y actualiza la caché local.
 */
export async function postTestimonial(testimonialData) {
  const localId = testimonialData.id || createId()
  const payload = { ...testimonialData, id: localId }

  try {
    const res = await fetch(`${API_BASE}/testimonials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error(`HTTP error ${res.status}`)

    const saved = await res.json()
    const currentLocals = loadUserTestimonials()
    saveUserTestimonials([saved, ...currentLocals.filter((t) => t.id !== saved.id)].slice(0, 50))
    return saved
  } catch (err) {
    console.warn('[Caserito API] Error enviando testimonio remoto, guardando en local:', err)
    const fallback = {
      ...payload,
      isNew: true,
      createdAt: Date.now(),
    }
    const currentLocals = loadUserTestimonials()
    saveUserTestimonials([fallback, ...currentLocals].slice(0, 50))
    return fallback
  }
}

export { formatNumber }

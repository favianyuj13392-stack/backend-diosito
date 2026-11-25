import { supabase } from './lib/supabase.js'

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 't_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Mapear campos snake_case a camelCase para compatibilidad con el frontend
      const formatted = (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        anonymous: item.anonymous,
        role: item.role,
        roleDetail: item.role_detail,
        zone: item.zone,
        experience: item.experience,
        quote: item.quote,
        story: item.story,
        featured: item.featured,
        createdAt: item.created_at,
      }))

      return res.status(200).json(formatted)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

      const story = String(body.story || '').trim()
      if (story.length < 20) {
        return res.status(400).json({ error: 'El relato debe tener al menos 20 caracteres.' })
      }

      const anonymous = Boolean(body.anonymous)
      const name = anonymous ? 'Persona anónima' : String(body.name || '').trim()
      if (!anonymous && name.length < 2) {
        return res.status(400).json({ error: 'El nombre es obligatorio cuando no es anónimo.' })
      }

      const experience = String(body.experience || '').trim()
      if (experience.length < 3) {
        return res.status(400).json({ error: 'La experiencia o rubro es obligatoria.' })
      }

      const newId = body.id || generateId()
      const quote = String(body.quote || '').trim() || (story.length > 160 ? `${story.slice(0, 157).trimEnd()}…` : story)

      const payload = {
        id: newId,
        name,
        anonymous,
        role: String(body.role || 'Vendedor/a ambulante'),
        role_detail: body.roleDetail ? String(body.roleDetail).trim() : null,
        zone: String(body.zone || 'Pérez Velasco'),
        experience,
        quote,
        story,
        featured: false,
        approved: true, // Auto-aprobado para publicacion inmediata
      }

      const { data, error } = await supabase
        .from('testimonials')
        .insert([payload])
        .select()
        .single()

      if (error) {
        throw error
      }

      return res.status(201).json({
        id: data.id,
        name: data.name,
        anonymous: data.anonymous,
        role: data.role,
        roleDetail: data.role_detail,
        zone: data.zone,
        experience: data.experience,
        quote: data.quote,
        story: data.story,
        featured: data.featured,
        createdAt: data.created_at,
        isNew: true,
      })
    }

    return res.status(405).json({ error: 'Método no permitido' })
  } catch (err) {
    console.error('Error en /api/testimonials:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
}

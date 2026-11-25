import { supabase } from './lib/supabase.js'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'POST') {
      // Intentar incremento atomico via RPC
      const { data, error } = await supabase.rpc('increment_visits')
      if (!error && data !== null) {
        return res.status(200).json({ visits: Number(data) })
      }

      // Fallback si RPC no fue ejecutada aun
      const { data: current } = await supabase
        .from('campaign_stats')
        .select('visits_count')
        .eq('id', 'global')
        .single()

      const nextVisits = (Number(current?.visits_count) || 1428) + 1
      await supabase
        .from('campaign_stats')
        .upsert({ id: 'global', visits_count: nextVisits })

      return res.status(200).json({ visits: nextVisits })
    }

    // GET
    const { data, error } = await supabase
      .from('campaign_stats')
      .select('visits_count')
      .eq('id', 'global')
      .single()

    if (error || !data) {
      return res.status(200).json({ visits: 1428 })
    }

    return res.status(200).json({ visits: Number(data.visits_count) })
  } catch (err) {
    console.error('Error en /api/visits:', err)
    return res.status(500).json({ error: 'Error interno del servidor', visits: 1428 })
  }
}

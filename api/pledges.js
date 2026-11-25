import { supabase } from './lib/supabase.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'POST') {
      const { data, error } = await supabase.rpc('increment_pledges')
      if (!error && data !== null) {
        return res.status(200).json({ count: Number(data) })
      }

      // Fallback
      const { data: current } = await supabase
        .from('campaign_stats')
        .select('pledges_count')
        .eq('id', 'global')
        .single()

      const nextPledges = (Number(current?.pledges_count) || 1284) + 1
      await supabase
        .from('campaign_stats')
        .upsert({ id: 'global', pledges_count: nextPledges })

      return res.status(200).json({ count: nextPledges })
    }

    // GET
    const { data, error } = await supabase
      .from('campaign_stats')
      .select('pledges_count')
      .eq('id', 'global')
      .single()

    if (error || !data) {
      return res.status(200).json({ count: 1284 })
    }

    return res.status(200).json({ count: Number(data.pledges_count) })
  } catch (err) {
    console.error('Error en /api/pledges:', err)
    return res.status(500).json({ error: 'Error interno del servidor', count: 1284 })
  }
}

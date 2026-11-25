import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Middleware para desarrollo local: resuelve /api cargando las variables desde .env.local
function apiDevServerPlugin(env) {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const [path] = req.url.split('?')
        const endpoint = path.replace('/api/', '')

        // Inyectar variables de entorno si no existen en el proceso
        process.env.SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL
        process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY

        try {
          let module
          if (endpoint === 'visits') {
            module = await import('./api/visits.js')
          } else if (endpoint === 'pledges') {
            module = await import('./api/pledges.js')
          } else if (endpoint === 'testimonials') {
            module = await import('./api/testimonials.js')
          }

          if (module?.default) {
            res.status = (code) => {
              res.statusCode = code
              return res
            }
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
              return res
            }

            if (req.method === 'POST') {
              let bodyStr = ''
              req.on('data', (chunk) => {
                bodyStr += chunk
              })
              req.on('end', async () => {
                try {
                  req.body = bodyStr ? JSON.parse(bodyStr) : {}
                } catch {
                  req.body = bodyStr
                }
                await module.default(req, res)
              })
              return
            } else {
              await module.default(req, res)
              return
            }
          }
        } catch (err) {
          console.error('[API Dev Error]', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
          return
        }

        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), apiDevServerPlugin(env)],
    server: {
      port: 5173,
      open: false,
    },
  }
})

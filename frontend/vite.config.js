import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { authMiddleware } from './vite-auth-middleware.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'serve-data-folder',
        configureServer(server) {
          // Serve Custom Auth Endpoints
          server.middlewares.use(authMiddleware(env))

          const dataDir = path.resolve(__dirname, '../data')
          server.middlewares.use('/data', (req, res, next) => {
            const filePath = path.join(dataDir, decodeURIComponent(req.url.replace(/^\/?/, '')))
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.setHeader('Content-Type', 'text/csv')
              fs.createReadStream(filePath).pipe(res)
            } else {
              next()
            }
          })
        },
      },
    ],
    server: {
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
      proxy: {
        '/api/predict': {
          target: 'https://ev-backend-z6gd.onrender.com',
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(/^\/api\/predict/, '/predict'),
        },
      },
    },
    publicDir: false,
  }
})



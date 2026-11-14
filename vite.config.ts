import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/nasa-media': {
        target: 'https://svs.gsfc.nasa.gov',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nasa-media/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyResponse) => {
            // NASA's media server currently allowlists the hosted product origin.
            // For this same-origin dev proxy, allow anonymous video/canvas reads.
            proxyResponse.headers['access-control-allow-origin'] = '*'
            proxyResponse.headers['access-control-allow-methods'] = 'GET, HEAD, OPTIONS'
            proxyResponse.headers['access-control-expose-headers'] = 'Accept-Ranges, Content-Length, Content-Range'
            delete proxyResponse.headers['access-control-allow-credentials']
          })
        },
      },
    },
  },
})

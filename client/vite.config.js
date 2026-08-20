import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Load env vars so the proxy target can be configured from .env
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_URL || 'http://localhost:5000';

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
})
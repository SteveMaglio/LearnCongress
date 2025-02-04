import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import envVars from "../LearnCongress/src/utils/loadEnv"


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({include: "**/*.jsx",}),
    tailwindcss(),
    
  ],
  define: {
    "process.env": envVars,
  },
  server: {
    watch: {
      usePolling: true
    }
  }
})


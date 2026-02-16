import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use relative paths so the build works inside Electron and Capacitor
// (they load from file:// protocol, not http://)
export default defineConfig({
  plugins: [react()],
  base: './',
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // or @vitejs/plugin-react-swc

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
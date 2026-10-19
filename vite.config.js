import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './', // Essential for GitHub Pages relative paths
  plugins: [
    tailwindcss(),
  ],
})

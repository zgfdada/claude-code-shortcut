import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const rootDir = path.join(__dirname, '../..')

export default defineConfig({
  root: rootDir,
  plugins: [
    react(),
    electron([
      {
        entry: 'code/electron/main.ts',
        vite: {
          build: {
            outDir: 'code/build/dist-electron',
            rollupOptions: {
              external: ['sql.js', 'electron', 'koffi']
            }
          }
        }
      },
      {
        entry: 'code/electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'code/build/dist-electron'
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'code/src')
    }
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(path.join(__dirname, 'tailwind.config.js')),
        autoprefixer,
      ]
    }
  },
  base: './',
  build: {
    outDir: 'code/build/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(rootDir, 'code/build/index.html')
    }
  }
})

// vite.config.js
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname)

export default defineConfig({
  base: '/media/templates/site/reev-joomla/',
  
  build: {
    rollupOptions: {
      input: {
        template: path.resolve(PROJECT_ROOT, 'src/scss/template.scss'),
        app: path.resolve(PROJECT_ROOT, 'src/js/main.js'),
      },
      output: {
        // 👇 entryFileNames — только для JS entry points
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        
        // 👇 assetFileNames — для CSS, шрифтов, картинок
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
          
          // CSS
          if (name.endsWith('.css')) {
            return name.includes('template') ? 'css/template.css' : 'css/[name][extname]';
          }
          
          // Шрифты: извлекаем только имя файла, игнорируя подпапки
          if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
            return `fonts/Sora/[name][extname]`;
          }
          // Изображения
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(name)) {
            return `images/[name][extname]`;
          }
          
          // Остальные ассеты
          return 'assets/[name][extname]';
        }
      }
    },
    minify: false,
    sourcemap: true,
    manifest: true,
    outDir: path.resolve(PROJECT_ROOT, 'media/templates/site/reev-joomla'),
    emptyOutDir: true,
    cssCodeSplit: true,
  },
  
  server: {
    proxy: {
      '^/(index\\.php|templates|media|components|modules|plugins|language|administrator|images)': {
        target: 'http://localhost:80',
        changeOrigin: true,
        secure: false
      }
    },
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: { host: 'localhost', clientPort: 5173 },
    watch: { ignored: ['**/media/**', '**/node_modules/**', '**/templates/**'] }
  },
  
  optimizeDeps: { exclude: ['joomla'] },
  
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler' }
    }
  }
})
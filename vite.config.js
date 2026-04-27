import { defineConfig } from 'vite';
import { resolve } from 'path';
import { glob } from 'glob';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import fs from 'fs';
import path from 'path';
import CleanCSS from 'clean-css';

const cleanCSS = new CleanCSS({ level: 2 });

// Plugin: salin HANYA file CSS spesifik + favicon
function copyStaticAssets() {
  return {
    name: 'copy-static-assets',
    writeBundle() {
      const srcDir = resolve('src');
      const outDir = resolve('dist');

      // Hanya tiga file CSS yang benar-benar dirujuk
      const requiredCSS = ['styles.bundle.min.css', 'desktop.css', 'mobile.css'];
      const cssSrcDir = path.join(srcDir, 'css');
      const cssOutDir = path.join(outDir, 'css');

      if (fs.existsSync(cssSrcDir)) {
        fs.mkdirSync(cssOutDir, { recursive: true });
        for (const file of requiredCSS) {
          const srcPath = path.join(cssSrcDir, file);
          if (fs.existsSync(srcPath)) {
            if (file.endsWith('.css') && !file.endsWith('.min.css')) {
              const raw = fs.readFileSync(srcPath, 'utf8');
              const minified = cleanCSS.minify(raw).styles;
              fs.writeFileSync(path.join(cssOutDir, file), minified, 'utf8');
            } else {
              fs.copyFileSync(srcPath, path.join(cssOutDir, file));
            }
          }
        }
      }

      const favSrc = path.join(srcDir, 'favicon.ico');
      if (fs.existsSync(favSrc)) {
        fs.copyFileSync(favSrc, path.join(outDir, 'favicon.ico'));
      }
    },
  };
}

// Plugin anti‑flash (script only)
function injectAntiFlash() {
  return {
    name: 'inject-anti-flash',
    enforce: 'pre',
    transformIndexHtml(html) {
      const snippet = `
  <script>
    (function() {
      var theme = localStorage.getItem('sikost_theme') || 'system';
      var isDark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      document.documentElement.style.backgroundColor = isDark ? '#1e1e2e' : '#ffffff';
    })();
  </script>`;
      return html.replace('<head>', '<head>' + snippet);
    },
  };
}

export default defineConfig(({ mode }) => {
  const isAndroid = process.env.TAURI_ENV_PLATFORM === 'android';

  return {
    root: 'src',
    base: './',

    plugins: [
      injectAntiFlash(),
      copyStaticAssets(),
      // Selalu gunakan ViteMinifyPlugin, tetapi dengan opsi aman
      ViteMinifyPlugin({
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true, // Pertahankan spasi di inline-block
      }),
    ],

    build: {
      outDir: '../dist',
      emptyOutDir: true,
      target: isAndroid ? 'es2017' : 'es2021',
      // Aktifkan minify JS dengan opsi aman
      minify: 'terser',
      terserOptions: isAndroid
        ? {
            mangle: false,                     // Jangan ubah nama variabel
            compress: {
              drop_debugger: false,
              drop_console: false,
            },
          }
        : {
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
          },
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/index.html'),
          ...glob.sync('src/page/**/*.html').reduce((acc, p) => {
            const entryName = p.replace(/^src\//, '').replace(/\.html$/, '');
            acc[entryName] = resolve(__dirname, p);
            return acc;
          }, {}),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks(id) {
            if (id.includes('@tauri-apps')) return 'vendor-tauri';
          },
        },
      },
    },
  };
});
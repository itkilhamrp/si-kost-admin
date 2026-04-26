import { defineConfig } from 'vite';
import { resolve } from 'path';
import { glob } from 'glob';
import { ViteMinifyPlugin } from 'vite-plugin-minify';

export default defineConfig({
  // 1. Tentukan folder 'src' sebagai root frontend kamu
  root: 'src',
  
  // 2. Gunakan plugin untuk minifikasi HTML secara total (menghapus spasi/baris baru)
  plugins: [
    ViteMinifyPlugin({
      removeComments: true,
      collapseWhitespace: true,
    }),
  ],

  // 3. Penting untuk Android: Gunakan path relatif agar file bisa terbaca di APK
  base: './',

  build: {
    // 4. Output folder (naik satu level ke folder 'dist' di luar 'src')
    outDir: '../dist',
    emptyOutDir: true,
    
    // 5. Konfigurasi Minifikasi JavaScript (Terser)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,    // Hapus console.log di production
        drop_debugger: true,   // Hapus debugger
      },
    },

    // 6. Konfigurasi Multi-Page (Mendeteksi semua HTML secara otomatis)
    rollupOptions: {
      input: {
        // Halaman Utama
        main: resolve(__dirname, 'src/index.html'),
        
        // Cari semua file HTML di src/page/ dan subfoldernya
        ...glob.sync('src/page/**/*.html').reduce((acc, path) => {
          // Buat nama entry (contoh: 'page/settings')
          const entryName = path.replace(/^src\//, '').replace(/\.html$/, '');
          // Hubungkan nama dengan path file aslinya
          acc[entryName] = resolve(__dirname, path);
          return acc;
        }, {}),
      },
      
      // Mengatur agar nama file output lebih rapi
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
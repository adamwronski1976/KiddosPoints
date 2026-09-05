import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Osobna konfiguracja budująca panel administracyjny (kiddos-admin-panel.tsx)
// jako pojedynczy, samodzielny bundle IIFE (React + ReactDOM + Tailwind CSS
// wstrzyknięty przez JS), rejestrowany w Home Assistant jako karta Lovelace
// dokładnie tak samo jak chore-manager-card.js.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  // React (i inne zależności) odwołują się do process.env.NODE_ENV. W trybie
  // "app" Vite podstawia to automatycznie, ale w trybie biblioteki (IIFE dla
  // przeglądarki, bez Node.js) trzeba to podać jawnie, inaczej skrypt wywala
  // się w przeglądarce z "process is not defined" i nic się nie renderuje.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/kiddos-admin-panel.tsx'),
      name: 'KiddosAdminPanel',
      formats: ['iife'],
      fileName: () => 'kiddos-admin-panel.js',
    },
    outDir: 'public',
  },
});

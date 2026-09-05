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

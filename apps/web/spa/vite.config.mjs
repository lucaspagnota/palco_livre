// Gera o site em modo demonstração num único index.html (npm run build:index).
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const aqui = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: aqui('.'),
  base: './',
  resolve: {
    alias: [
      { find: /^@\//, replacement: aqui('../') },
      { find: /^next\/navigation$/, replacement: aqui('./shims/next-navigation.ts') },
      { find: /^next\/link$/, replacement: aqui('./shims/next-link.tsx') },
      { find: /^next\/font\/google$/, replacement: aqui('./shims/next-font.ts') },
    ],
  },
  define: {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': 'undefined',
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': 'undefined',
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir: aqui('./dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    modulePreload: false,
    rollupOptions: {
      // O "use client" das telas não faz diferença aqui.
      onwarn(aviso, avisar) { if (aviso.code !== 'MODULE_LEVEL_DIRECTIVE') avisar(aviso); },
    },
  },
});

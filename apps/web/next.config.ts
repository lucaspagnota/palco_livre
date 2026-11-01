import type { NextConfig } from 'next';

const banco = process.env.NEXT_PUBLIC_SUPABASE_URL;

const config: NextConfig = {
  transpilePackages: ['@palco/cifra'],
  env: {
    // Muda a cada publicação na Vercel; o service worker usa para saber quando trocar as telas guardadas.
    NEXT_PUBLIC_VERSAO: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? String(Date.now()),
  },
  async rewrites() {
    return [
      // Palco Livre do iPad 2 (apps/web/ipad, montado em public/ipad com "npm run build:ipad").
      { source: '/ipad', destination: '/ipad/index.html' },
      // O iPad antigo fala com o banco passando pelo próprio site, que ele já sabe abrir com segurança.
      ...(banco ? [{ source: '/sb/:caminho*', destination: banco + '/:caminho*' }] : []),
    ];
  },
  async headers() {
    const semGuardar = [{ key: 'Cache-Control', value: 'no-cache' }];
    return [
      { source: '/ipad', headers: semGuardar },
      { source: '/ipad/index.html', headers: semGuardar },
      { source: '/ipad/ipad.appcache', headers: [...semGuardar, { key: 'Content-Type', value: 'text/cache-manifest; charset=utf-8' }] },
    ];
  },
};

export default config;

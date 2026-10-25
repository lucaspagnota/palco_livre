import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@palco/cifra'],
  env: {
    // Muda a cada publicação na Vercel; o service worker usa para saber quando trocar as telas guardadas.
    NEXT_PUBLIC_VERSAO: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? String(Date.now()),
  },
};

export default config;

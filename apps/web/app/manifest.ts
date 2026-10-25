import type { MetadataRoute } from 'next';

// Para instalar o site na tela de início (iPhone, iPad e Android) e abrir em tela cheia, como um app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Palco Livre',
    short_name: 'Palco Livre',
    description: 'Cifras, repertórios e grupos para a sua banda.',
    lang: 'pt-BR',
    id: '/',
    start_url: '/musicas',
    scope: '/',
    display: 'standalone',
    background_color: '#0b1d33',
    theme_color: '#0b1d33',
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

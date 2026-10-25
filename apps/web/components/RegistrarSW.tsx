'use client';

import { useEffect } from 'react';

/** Liga o service worker (public/sw.js), que guarda as telas do site para abrirem sem internet. */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    // A versão no endereço faz o aparelho trocar as telas guardadas a cada publicação.
    navigator.serviceWorker.register('/sw.js?v=' + process.env.NEXT_PUBLIC_VERSAO).catch(() => { /* navegador sem suporte */ });
    // Pede para o navegador não apagar a cópia guardada quando faltar espaço.
    navigator.storage?.persist?.().catch(() => { /* idem */ });
  }, []);
  return null;
}

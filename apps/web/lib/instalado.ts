// Site instalado na tela de início (iPhone): o que abre "em outra aba" sai do app e vai para o Safari,
// que não tem a conta nem as músicas guardadas. Lá dentro, abrimos tudo na mesma tela.
import type { MouseEvent } from 'react';

export function instalado() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Abre o endereço em outra aba no navegador, ou na mesma tela no app instalado. */
export function abrir(url: string) {
  if (instalado()) location.assign(url);
  else window.open(url, '_blank');
}

/** onClick dos links com target="_blank". */
export function naMesmaTelaSeInstalado(e: MouseEvent<HTMLAnchorElement>) {
  if (!instalado()) return;
  e.preventDefault();
  location.assign(e.currentTarget.href);
}

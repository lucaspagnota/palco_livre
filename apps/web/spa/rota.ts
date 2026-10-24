// Navegação do site em versão de um arquivo só: guarda a rota em memória, sem depender do endereço da página.
import { useSyncExternalStore } from 'react';

export interface Rota { pathname: string; search: string }

let atual: Rota = { pathname: '/musicas', search: '' };
const pilha: Rota[] = [];
const ouvintes = new Set<() => void>();

function separar(href: string): Rota {
  const u = new URL(href, 'http://palco.livre' + atual.pathname);
  return { pathname: u.pathname.replace(/\/+$/, '') || '/', search: u.search };
}

export function navegar(href: string, trocar = false) {
  const nova = separar(href);
  if (!trocar) pilha.push(atual);
  atual = nova;
  window.scrollTo(0, 0);
  ouvintes.forEach(f => f());
}

export function voltar() {
  const anterior = pilha.pop();
  if (!anterior) return;
  atual = anterior;
  ouvintes.forEach(f => f());
}

const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };
export const useRota = () => useSyncExternalStore(assinar, () => atual, () => atual);

/** No site de verdade o leitor abre em outra aba; aqui ele abre na mesma página e o "Sair" volta. */
export function prenderLinks() {
  document.addEventListener('click', e => {
    const a = (e.target as Element | null)?.closest?.('a[href^="/"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navegar(a.getAttribute('href')!);
  }, true);
  const abrir = window.open.bind(window);
  window.open = (url?: string | URL, ...resto) => {
    if (typeof url === 'string' && url.startsWith('/')) { navegar(url); return null; }
    return abrir(url, ...resto);
  };
  history.back = () => (pilha.length ? voltar() : navegar('/repertorios', true));
  // Onde a janela de confirmação não pode aparecer (o navegador responde na hora), segue como se fosse "OK".
  const confirmar = window.confirm.bind(window);
  window.confirm = (texto?: string) => {
    const inicio = Date.now();
    return confirmar(texto) || Date.now() - inicio < 30;
  };
}

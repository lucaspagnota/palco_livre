// Substitui o next/navigation na versão de um arquivo só.
import { useMemo } from 'react';
import { navegar, useRota, voltar } from '../rota';

const roteador = {
  push: (href: string) => navegar(href),
  replace: (href: string) => navegar(href, true),
  back: voltar,
  forward: () => undefined,
  refresh: () => undefined,
  prefetch: () => undefined,
};

export const useRouter = () => roteador;
export const usePathname = () => useRota().pathname;
export function useSearchParams() {
  const { search } = useRota();
  return useMemo(() => new URLSearchParams(search), [search]);
}
export function redirect(href: string): never {
  navegar(href, true);
  throw new Error('redirect');
}

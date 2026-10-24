// Substitui o next/link: o clique troca a tela sem recarregar a página.
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navegar } from '../rota';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; replace?: boolean; prefetch?: boolean };

export default function Link({ href, replace, prefetch: _p, onClick, ...resto }: Props) {
  const aoClicar = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navegar(href, replace);
  };
  return <a href={href} onClick={aoClicar} {...resto} />;
}

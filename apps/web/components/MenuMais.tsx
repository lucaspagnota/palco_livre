'use client';

import { useEffect, useRef, useState } from 'react';
import { Icone } from './Icone';

export interface OpcaoMenu {
  rotulo: string;
  acao: () => void;
  perigo?: boolean;
}

/** Botão "•••" com as ações de uma linha da tabela. */
export function MenuMais({ opcoes, rotulo = 'Mais ações' }: { opcoes: (OpcaoMenu | null)[]; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fechar); document.removeEventListener('keydown', esc); };
  }, [aberto]);
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className="pilula ciano" aria-label={rotulo} aria-expanded={aberto} onClick={() => setAberto(a => !a)}>
        <Icone nome="mais" tamanho={20} />
      </button>
      {aberto ? (
        <span className="menu">
          {opcoes.filter((o): o is OpcaoMenu => !!o).map(o => (
            <button key={o.rotulo} type="button" className={o.perigo ? 'perigo' : undefined} onClick={() => { setAberto(false); o.acao(); }}>
              {o.rotulo}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

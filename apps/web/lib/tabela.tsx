'use client';

import { useMemo, useState } from 'react';

type Valor = string | number | null | undefined;

/** Ordenação por coluna (clique no título) e seleção por caixinhas. */
export function useTabela<T extends { id: string }>(linhas: T[], colunas: Record<string, (l: T) => Valor>, inicial: string) {
  const [ordem, setOrdem] = useState<{ col: string; desc: boolean }>({ col: inicial, desc: false });
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());

  const ordenadas = useMemo(() => {
    const valor = colunas[ordem.col];
    if (!valor) return linhas;
    const out = [...linhas].sort((a, b) => {
      const x = valor(a);
      const y = valor(b);
      if (typeof x === 'number' && typeof y === 'number') return x - y;
      return String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR', { sensitivity: 'base', numeric: true });
    });
    return ordem.desc ? out.reverse() : out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, ordem]);

  const ids = ordenadas.map(l => l.id);
  const todas = ids.length > 0 && ids.every(id => marcadas.has(id));

  return {
    linhas: ordenadas,
    marcadas,
    selecionadas: ids.filter(id => marcadas.has(id)),
    todas,
    alternarTodas: () => setMarcadas(todas ? new Set() : new Set(ids)),
    alternar: (id: string) => setMarcadas(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    limpar: () => setMarcadas(new Set()),
    Th: ({ col, children, className }: { col: string; children: React.ReactNode; className?: string }) => (
      <th className={className} onClick={() => setOrdem(o => ({ col, desc: o.col === col ? !o.desc : false }))} aria-sort={ordem.col === col ? (ordem.desc ? 'descending' : 'ascending') : undefined}>
        {children}{ordem.col === col ? <span className="seta">{ordem.desc ? '▼' : '▲'}</span> : null}
      </th>
    ),
  };
}

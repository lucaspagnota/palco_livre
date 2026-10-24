'use client';

import { useState, type ReactNode } from 'react';

/** Botão "?" que abre as instruções da página. */
export function Ajuda({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button type="button" className="btn ajuda" onClick={() => setAberta(true)} aria-label="Ajuda" title="Como usar esta página">?</button>
      {aberta ? (
        <div className="fundo-modal" onClick={() => setAberta(false)}>
          <div className="modal" role="dialog" aria-label={titulo} onClick={e => e.stopPropagation()}>
            <h2>{titulo}</h2>
            {children}
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button type="button" className="btn azul" onClick={() => setAberta(false)}>Entendi</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function RodapeAjuda() {
  return <p className="rodape-ajuda">Surgiu alguma dúvida? Leia as instruções do botão <span className="btn ajuda" style={{ width: 28, height: 28, fontSize: 15, verticalAlign: 'middle' }}>?</span> no início desta página.</p>;
}

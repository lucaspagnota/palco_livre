'use client';

import { useEffect, useState } from 'react';
import { Icone } from './Icone';

/** Guardado no navegador; o script do começo da página aplica antes de desenhar (sem piscar branco). */
export const CHAVE_TEMA = 'palco-tema';
export const SCRIPT_TEMA = `try{if(localStorage.getItem('${CHAVE_TEMA}')==='escuro')document.documentElement.dataset.tema='escuro'}catch(e){}`;

/** Sol no modo claro, lua no modo escuro: um clique troca e o site lembra. */
export function BotaoTema() {
  const [escuro, setEscuro] = useState(false);
  useEffect(() => setEscuro(document.documentElement.dataset.tema === 'escuro'), []);

  function trocar() {
    const novo = !escuro;
    setEscuro(novo);
    if (novo) document.documentElement.dataset.tema = 'escuro';
    else delete document.documentElement.dataset.tema;
    try { localStorage.setItem(CHAVE_TEMA, novo ? 'escuro' : 'claro'); } catch { /* vale só até fechar a página */ }
  }

  const dica = escuro ? 'Modo escuro (clique para clarear)' : 'Modo claro (clique para escurecer)';
  return (
    <button type="button" className="botao-tema" onClick={trocar} title={dica} aria-label={dica}>
      <Icone nome={escuro ? 'lua' : 'sol'} tamanho={24} />
    </button>
  );
}

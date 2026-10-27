'use client';

import { useEffect, useRef } from 'react';
import { FAVORITO_TOQUE_FACIL } from '@/lib/exportar-toque-facil';

/** Passo a passo e o botão que vai para a barra de favoritos, para tirar as músicas do Toque Fácil. */
export function FavoritoToqueFacil() {
  const ref = useRef<HTMLAnchorElement>(null);
  // O React não aceita endereço "javascript:" no href, então ele é colocado direto no botão.
  useEffect(() => { ref.current?.setAttribute('href', FAVORITO_TOQUE_FACIL); }, []);
  return (
    <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.7 }}>
      <li>No computador, aperte <b>Ctrl+Shift+B</b> para aparecer a barra de favoritos do navegador.</li>
      <li>
        Arraste este botão até a barra de favoritos:{' '}
        <a
          ref={ref}
          className="btn pessego pq"
          style={{ cursor: 'grab' }}
          title="Arraste para a barra de favoritos"
          onClick={e => { e.preventDefault(); alert('Arraste este botão para a barra de favoritos. Ele funciona dentro do site do Toque Fácil.'); }}
        >
          Exportar do Toque Fácil
        </a>
      </li>
      <li>Abra o site do Toque Fácil, entre na sua conta e clique em <b>Músicas</b>.</li>
      <li>Clique no favorito <b>Exportar do Toque Fácil</b>. Um quadro azul no canto mostra o andamento. Com muitas músicas leva alguns minutos; não feche a aba.</li>
      <li>No fim, ele baixa o arquivo <b>musicas-toque-facil.json</b> na pasta Downloads. Volte aqui e escolha esse arquivo no passo 2.</li>
    </ol>
  );
}

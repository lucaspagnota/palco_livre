'use client';

import { estiloDaLinha, type Aparencia, type Row } from '@palco/cifra';

/** Recuo para o marcador do refrão, proporcional ao tamanho da fonte. */
export const recuoDoMarcador = (a: Aparencia, fonte: number) => (a.tipoRefrao === 'marcador' ? Math.round(fonte * 0.4) : 0);

/** Uma página da cifra, desenhada linha por linha numa grade monoespaçada. */
export function Tela({
  linhas,
  aparencia,
  fonte,
  altura,
  largura,
  linhasPorPagina,
  recuo = 0,
}: {
  linhas: Row[];
  aparencia: Aparencia;
  /** Tamanho da fonte em px. */
  fonte: number;
  /** Altura de cada linha em px. */
  altura: number;
  largura?: number | string;
  /** Linhas por página: completa a página com espaço vazio. */
  linhasPorPagina?: number;
  /** Espaço à esquerda, em px, onde fica o marcador do refrão. */
  recuo?: number;
}) {
  return (
    <div className="tela" style={{ background: aparencia.fundo, fontSize: fonte, lineHeight: altura + 'px', width: largura, height: linhasPorPagina ? linhasPorPagina * altura : undefined, padding: 0 }}>
      {linhas.map((l, i) => {
        const e = estiloDaLinha(l.kind, l.refrao, l.voz2, aparencia);
        const marcador = l.refrao && aparencia.tipoRefrao === 'marcador' && l.kind !== 'blank';
        return (
          <span
            key={i}
            className="r"
            style={{
              color: e.cor,
              fontWeight: e.negrito ? 700 : 400,
              fontStyle: e.italico ? 'italic' : 'normal',
              height: altura,
              boxShadow: marcador ? `inset ${Math.max(2, Math.round(fonte / 7))}px 0 0 ${aparencia.refrao}` : undefined,
              paddingLeft: recuo,
            }}
          >
            {l.text || ' '}
          </span>
        );
      })}
    </div>
  );
}

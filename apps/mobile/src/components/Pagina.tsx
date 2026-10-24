// Uma página da cifra: uma linha de texto monoespaçado por linha da grade.
import { estiloDaLinha, type Aparencia, type Row } from '@palco/cifra';
import { Text, View } from 'react-native';
import { fonte as fontes } from '@/lib/tema';

/** Recuo à esquerda onde fica o marcador do refrão. */
export const recuoDoMarcador = (a: Aparencia, tamanho: number) => (a.tipoRefrao === 'marcador' ? Math.round(tamanho * 0.4) : 0);

export function Pagina({ linhas, aparencia, fonte, altura, largura, recuo }: {
  linhas: Row[]; aparencia: Aparencia; fonte: number; altura: number; largura: number; recuo: number;
}) {
  const barra = Math.max(2, Math.round(fonte / 7));
  return (
    <View style={{ width: largura }}>
      {linhas.map((l, i) => {
        const e = estiloDaLinha(l.kind, l.refrao, l.voz2, aparencia);
        const marcador = l.refrao && aparencia.tipoRefrao === 'marcador' && l.kind !== 'blank';
        return (
          <View key={i} style={{ height: altura, paddingLeft: recuo, overflow: 'hidden' }}>
            {marcador ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: barra, backgroundColor: aparencia.refrao }} /> : null}
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: e.negrito ? fontes.monoNegrito : e.italico ? fontes.monoItalico : fontes.mono,
                fontSize: fonte,
                lineHeight: altura,
                color: e.cor,
                includeFontPadding: false,
              }}
            >
              {l.text || ' '}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

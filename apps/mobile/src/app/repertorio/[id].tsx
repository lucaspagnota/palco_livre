// Um repertório: a sequência das músicas, separada em blocos e com as pausas (água) no meio.
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '@/components/Icone';
import { Botao, Topo, useEstilos } from '@/components/ui';
import { useStore } from '@/lib/store';
import { fonte } from '@/lib/tema';

type Linha =
  | { tipo: 'bloco'; texto: string; chave: string }
  | { tipo: 'pausa'; texto: string; chave: string }
  | { tipo: 'musica'; indice: number; numero: number; id: string; chave: string };

export default function Repertorio() {
  const { s, cor } = useEstilos();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conteudo } = useStore();
  const insets = useSafeAreaInsets();
  const rep = conteudo?.repertorios.find(r => r.id === id);
  const musicas = new Map((conteudo?.musicas ?? []).map(m => [m.id, m]));

  if (!rep) {
    return (
      <View style={s.tela}>
        <Topo titulo="Repertório" />
        <Text style={[s.suave, { padding: 24, textAlign: 'center' }]}>Repertório não encontrado neste aparelho.</Text>
      </View>
    );
  }

  const linhas: Linha[] = [];
  let n = 0;
  let numero = 0;
  rep.itens.forEach((it, i) => {
    if (it.momento) { linhas.push({ tipo: 'bloco', texto: it.momento, chave: 'm' + i }); numero = 0; }
    else if (it.pausa) linhas.push({ tipo: 'pausa', texto: it.pausa, chave: 'p' + i });
    else if (it.musicaId && musicas.has(it.musicaId)) linhas.push({ tipo: 'musica', indice: n++, numero: ++numero, id: it.musicaId, chave: 's' + i });
  });
  const tocar = (inicio = 0) => router.push({ pathname: '/leitor', params: { repertorio: rep.id, inicio: String(inicio) } });

  return (
    <View style={s.tela}>
      <Topo titulo={rep.titulo} subtitulo={[`${n} ${n === 1 ? 'música' : 'músicas'}`, rep.estilo].filter(Boolean).join(' · ')} />
      <FlatList
        data={linhas}
        keyExtractor={l => l.chave}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={<View style={{ padding: 14 }}><Botao rotulo="Tocar o repertório" icone="play" onPress={() => tocar(0)} desativado={!n} /></View>}
        renderItem={({ item: l }) => l.tipo === 'bloco' ? (
          <Text style={{ backgroundColor: cor.bloco, color: cor.blocoTexto, fontFamily: fonte.negrito, fontSize: 15, letterSpacing: 0.5, paddingHorizontal: 14, paddingVertical: 8 }}>{l.texto.toUpperCase()}</Text>
        ) : l.tipo === 'pausa' ? (
          <Text style={{ color: cor.pausaTexto, fontFamily: fonte.negrito, fontSize: 15, paddingLeft: rep.numerar ? 56 : 14, paddingVertical: 6, backgroundColor: cor.pausa }}>{l.texto}</Text>
        ) : (() => {
          const m = musicas.get(l.id)!;
          return (
            <Pressable onPress={() => tocar(l.indice)} style={({ pressed }) => [s.linhaLista, pressed && { backgroundColor: cor.cartao }]}>
              {rep.numerar ? <Text style={{ color: cor.suave, fontFamily: fonte.negrito, fontSize: 16, width: 28, textAlign: 'right' }}>{l.numero}</Text> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: cor.texto, fontFamily: fonte.negrito, fontSize: 17 }}>{m.titulo}</Text>
                <Text numberOfLines={1} style={s.suave}>{[m.artista, m.tom ? 'Tom ' + m.tom : '', m.capo ? `Capo ${m.capo}ª` : ''].filter(Boolean).join(' · ')}</Text>
              </View>
              <Icone nome="play" tamanho={20} cor={cor.realce} />
            </Pressable>
          );
        })()}
        ListEmptyComponent={<Text style={[s.suave, { padding: 24, textAlign: 'center' }]}>Este repertório ainda não tem músicas.</Text>}
      />
    </View>
  );
}

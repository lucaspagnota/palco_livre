// Minhas músicas neste aparelho: filtros, índice de A a Z e seleção para tocar.
import { porTitulo, semAcento, type Musica } from '@palco/cifra';
import { router } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, SectionList, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '@/components/Icone';
import { Escolha, Topo, useEstilos } from '@/components/ui';
import { useStore } from '@/lib/store';
import { fonte } from '@/lib/tema';

const TODOS = '';
/** Índice da esquerda: tocar (ou deslizar o dedo) numa letra leva às músicas que começam com ela. */
const LETRAS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
// Alturas fixas das linhas, para a lista saber onde fica cada letra sem desenhar tudo.
const ALTURA_MUSICA = 64;
const ALTURA_LETRA = 28;
const NOME_DONO = { todas: 'Todas', minhas: 'Minhas', recebidas: 'Da banda' };

export default function Musicas() {
  const { s, cor } = useEstilos();
  const { conteudo } = useStore();
  const insets = useSafeAreaInsets();
  const [busca, setBusca] = useState('');
  const [estilo, setEstilo] = useState(TODOS);
  const [artista, setArtista] = useState(TODOS);
  const [tom, setTom] = useState(TODOS);
  const [dono, setDono] = useState<'todas' | 'minhas' | 'recebidas'>('todas');
  const lista = useRef<SectionList<Musica>>(null);

  const musicas = useMemo(() => [...(conteudo?.musicas ?? [])].sort(porTitulo), [conteudo]);
  const unicos = (f: (m: Musica) => string) => [...new Set(musicas.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const estilos = useMemo(() => unicos(m => m.estilo), [musicas]); // eslint-disable-line react-hooks/exhaustive-deps
  const artistas = useMemo(() => unicos(m => m.artista), [musicas]); // eslint-disable-line react-hooks/exhaustive-deps
  const tons = useMemo(() => unicos(m => m.tom), [musicas]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtradas = useMemo(() => {
    const b = semAcento(busca.trim().toLowerCase());
    const eu = conteudo?.eu.id;
    return musicas.filter(m =>
      (!b || semAcento(m.titulo.toLowerCase()).includes(b) || semAcento(m.artista.toLowerCase()).includes(b))
      && (!estilo || m.estilo === estilo) && (!artista || m.artista === artista) && (!tom || m.tom === tom)
      && (dono === 'todas' || (dono === 'minhas') === (m.donoId === eu)));
  }, [musicas, busca, estilo, artista, tom, dono, conteudo]);

  const secoes = useMemo(() => {
    const porLetra = new Map<string, Musica[]>();
    for (const m of filtradas) {
      const l = semAcento(m.titulo.trim()[0] ?? '#').toUpperCase();
      const letra = /[A-Z]/.test(l) ? l : '#';
      if (!porLetra.has(letra)) porLetra.set(letra, []);
      porLetra.get(letra)!.push(m);
    }
    return [...porLetra].map(([title, data]) => ({ title, data }));
  }, [filtradas]);

  // Posição de cada linha na lista: para cada letra, o título da letra, as músicas e um rodapé vazio.
  const posicoes = useMemo(() => {
    const p: { length: number; offset: number }[] = [];
    let y = 0;
    for (const sec of secoes) {
      p.push({ length: ALTURA_LETRA, offset: y }); y += ALTURA_LETRA;
      for (let i = 0; i < sec.data.length; i++) { p.push({ length: ALTURA_MUSICA, offset: y }); y += ALTURA_MUSICA; }
      p.push({ length: 0, offset: y });
    }
    return p;
  }, [secoes]);

  const indice = useRef<ComponentRef<typeof View>>(null);
  const topoIndice = useRef(0);
  const [alturaIndice, setAlturaIndice] = useState(0);
  const [letraTocada, setLetraTocada] = useState<string | null>(null);
  const comMusica = useMemo(() => new Set(secoes.map(sec => sec.title)), [secoes]);

  /** Vai para a letra escolhida; se não houver música com ela, para a próxima letra que tiver. */
  function irParaLetra(letra: string) {
    const n = LETRAS.indexOf(letra);
    let alvo = secoes.findIndex(sec => LETRAS.indexOf(sec.title) >= n);
    if (alvo < 0) alvo = secoes.length - 1;
    if (alvo < 0) return;
    lista.current?.scrollToLocation({ sectionIndex: alvo, itemIndex: 0, viewOffset: 0, animated: false });
  }

  function tocarIndice(y: number) {
    if (!alturaIndice) return;
    const letra = LETRAS[Math.max(0, Math.min(LETRAS.length - 1, Math.floor(((y - topoIndice.current) / alturaIndice) * LETRAS.length)))];
    if (letra === letraTocada) return;
    setLetraTocada(letra);
    irParaLetra(letra);
  }

  const tocar = (id: string) => router.push({ pathname: '/leitor', params: { musica: id } });
  const op = (lista: string[], todos: string) => [{ valor: TODOS, rotulo: todos }, ...lista.map(v => ({ valor: v, rotulo: v }))];

  return (
    <View style={s.tela}>
      <Topo titulo="Minhas músicas" subtitulo="neste aparelho" />
      <View style={{ padding: 12, gap: 8, backgroundColor: cor.fundo, borderBottomWidth: 1, borderBottomColor: cor.linha }}>
        <TextInput style={[s.campo, { height: 44 }]} value={busca} onChangeText={setBusca} placeholder="Título ou artista" placeholderTextColor={cor.suave} accessibilityLabel="Buscar" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Escolha compacto titulo="Estilo" valor={estilo} opcoes={op(estilos, 'Estilo')} aoEscolher={setEstilo} estilo={{ flex: 1 }} />
          <Escolha compacto titulo="Artista" valor={artista} opcoes={op(artistas, 'Artista')} aoEscolher={setArtista} estilo={{ flex: 1.3 }} />
          <Escolha compacto titulo="Tom" valor={tom} opcoes={op(tons, 'Tom')} aoEscolher={setTom} estilo={{ flex: 0.8 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['todas', 'minhas', 'recebidas'] as const).map(d => (
            <Pressable key={d} onPress={() => setDono(d)} style={[{ paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center', borderWidth: 1, borderColor: cor.linha }, dono === d && { backgroundColor: cor.marca, borderColor: cor.marca }]}>
              <Text style={{ fontFamily: fonte.media, fontSize: 14, color: dono === d ? '#1b1d1f' : cor.texto, }}>{NOME_DONO[d]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {musicas.length ? (
          <View
            ref={indice}
            accessibilityLabel="Índice de A a Z"
            pointerEvents="box-only"
            style={{ width: 34, borderRightWidth: 1, borderRightColor: cor.linha, paddingBottom: insets.bottom }}
            onLayout={e => { setAlturaIndice(e.nativeEvent.layout.height - insets.bottom); indice.current?.measureInWindow((_x, y) => { topoIndice.current = y; }); }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={e => tocarIndice(e.nativeEvent.pageY)}
            onResponderMove={e => tocarIndice(e.nativeEvent.pageY)}
            onResponderRelease={() => setLetraTocada(null)}
            onResponderTerminate={() => setLetraTocada(null)}
          >
            {LETRAS.map(l => (
              <View key={l} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[
                  { fontFamily: fonte.negrito, fontSize: 13, color: comMusica.has(l) ? cor.realce : cor.suave, opacity: comMusica.has(l) ? 1 : 0.45, width: 24, lineHeight: 22, textAlign: 'center', borderRadius: 12, overflow: 'hidden' },
                  letraTocada === l && { backgroundColor: cor.marca, color: '#1b1d1f', opacity: 1 },
                ]}>{l}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <SectionList
          ref={lista}
          style={{ flex: 1 }}
          sections={secoes}
          keyExtractor={m => m.id}
          stickySectionHeadersEnabled
          getItemLayout={(_dados, i) => ({ ...(posicoes[i] ?? { length: 0, offset: 0 }), index: i })}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          renderSectionHeader={({ section }) => (
            <Text style={{ height: ALTURA_LETRA, lineHeight: ALTURA_LETRA, backgroundColor: cor.topo, color: cor.realce, fontFamily: fonte.negrito, fontSize: 15, paddingHorizontal: 14 }}>{section.title}</Text>
          )}
          renderItem={({ item: m }) => (
            <Pressable onPress={() => tocar(m.id)} style={({ pressed }) => [s.linhaLista, { height: ALTURA_MUSICA }, pressed && { backgroundColor: cor.cartao }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: cor.texto, fontFamily: fonte.negrito, fontSize: 17 }}>{m.titulo}</Text>
                <Text numberOfLines={1} style={s.suave}>
                  {[m.artista, m.tom ? 'Tom ' + m.tom : '', m.capo ? `Capo ${m.capo}ª` : '', m.donoId !== conteudo?.eu.id ? 'da banda' : ''].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={[s.iconeBotao, { backgroundColor: cor.topo }]}><Icone nome="play" tamanho={20} cor={cor.realce} /></View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[s.suave, { padding: 24, textAlign: 'center', fontSize: 16 }]}>
              {conteudo ? 'Nenhuma música com esses filtros.' : 'Nenhuma música neste aparelho. Vá em Conteúdo e baixe as suas.'}
            </Text>
          }
          ListFooterComponent={filtradas.length ? <Text style={[s.suave, { padding: 14 }]}>{filtradas.length} {filtradas.length === 1 ? 'música' : 'músicas'}</Text> : undefined}
          onScrollToIndexFailed={() => undefined}
        />
      </View>
    </View>
  );
}

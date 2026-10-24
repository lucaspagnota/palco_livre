import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonte, paletas, useTema, type Cores } from '@/lib/tema';
import { Icone, Marca, type NomeIcone } from './Icone';

/** Barra do topo, azul-marinho com a linha amarela embaixo (igual ao site). */
export function Topo({ titulo, subtitulo, voltar = true, direita }: { titulo: string; subtitulo?: string; voltar?: boolean; direita?: ReactNode }) {
  const { s } = useEstilos();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.topo, { paddingTop: insets.top + 8 }]}>
      {voltar ? (
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} accessibilityLabel="Voltar" style={s.voltar}>
          <Icone nome="voltar" tamanho={26} cor="#fff" traco={2.6} />
        </Pressable>
      ) : <Marca tamanho={34} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={s.tituloTopo}>{titulo}</Text>
        {subtitulo ? <Text numberOfLines={1} style={s.subTopo}>{subtitulo}</Text> : null}
      </View>
      {direita}
    </View>
  );
}

type TipoBotao = 'marca' | 'verde' | 'azul' | 'escuro' | 'perigo' | 'contorno';
const fundoDoBotao = (cor: Cores): Record<TipoBotao, string> => ({ marca: cor.marca, verde: cor.verde, azul: cor.azul, escuro: cor.topo, perigo: cor.perigo, contorno: 'transparent' });

export function Botao({ rotulo, onPress, tipo = 'marca', icone, desativado, estilo, pequeno }: {
  rotulo: string; onPress: () => void; tipo?: TipoBotao; icone?: NomeIcone; desativado?: boolean; estilo?: StyleProp<ViewStyle>; pequeno?: boolean;
}) {
  const { s, cor } = useEstilos();
  const corTexto = tipo === 'marca' ? '#1b1d1f' : tipo === 'escuro' || tipo === 'contorno' ? cor.texto : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={desativado}
      style={({ pressed }) => [s.botao, pequeno && s.botaoPq, { backgroundColor: fundoDoBotao(cor)[tipo], opacity: desativado ? 0.45 : pressed ? 0.75 : 1 }, tipo === 'contorno' && { borderWidth: 1, borderColor: cor.linha }, estilo]}
    >
      {icone ? <Icone nome={icone} tamanho={pequeno ? 18 : 20} cor={corTexto} traco={2.4} /> : null}
      <Text style={[s.textoBotao, pequeno && { fontSize: 15 }, { color: corTexto }]}>{rotulo}</Text>
    </Pressable>
  );
}

export function Caixa({ marcada, aoMudar, rotulo }: { marcada: boolean; aoMudar: (v: boolean) => void; rotulo?: string }) {
  const { s, cor } = useEstilos();
  return (
    <Pressable onPress={() => aoMudar(!marcada)} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: marcada }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[s.caixa, marcada && { backgroundColor: cor.marca, borderColor: cor.marca }]}>
        {marcada ? <Icone nome="check" tamanho={18} cor="#1b1d1f" traco={3} /> : null}
      </View>
      {rotulo ? <Text style={s.texto}>{rotulo}</Text> : null}
    </Pressable>
  );
}

export interface Opcao<T extends string | number> { valor: T; rotulo: string; cor?: string }

/** Campo que abre uma lista para escolher (como um select do site). */
export function Escolha<T extends string | number>({ titulo, valor, opcoes, aoEscolher, estilo, compacto }: {
  titulo: string; valor: T; opcoes: Opcao<T>[]; aoEscolher: (v: T) => void; estilo?: StyleProp<ViewStyle>; compacto?: boolean;
}) {
  const { s, cor } = useEstilos();
  const [aberto, setAberto] = useState(false);
  const atual = opcoes.find(o => o.valor === valor);
  return (
    <>
      <Pressable onPress={() => setAberto(true)} accessibilityRole="button" accessibilityLabel={titulo} style={[s.escolha, compacto && { height: 40 }, estilo]}>
        {atual?.cor ? <View style={[s.bolinha, { backgroundColor: atual.cor }]} /> : null}
        <Text numberOfLines={1} style={[s.texto, { flex: 1, fontSize: compacto ? 15 : 16 }]}>{atual?.rotulo ?? titulo}</Text>
        <Icone nome="baixo" tamanho={18} cor={cor.suave} />
      </Pressable>
      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)} supportedOrientations={['portrait', 'landscape']}>
        <Pressable style={s.fundoModal} onPress={() => setAberto(false)}>
          <View style={s.modal}>
            <Text style={s.tituloModal}>{titulo}</Text>
            <FlatList
              data={opcoes}
              keyExtractor={o => String(o.valor)}
              renderItem={({ item }) => (
                <Pressable onPress={() => { aoEscolher(item.valor); setAberto(false); }} style={({ pressed }) => [s.opcao, pressed && { backgroundColor: cor.linha }]}>
                  {item.cor ? <View style={[s.bolinha, { backgroundColor: item.cor }]} /> : null}
                  <Text style={[s.texto, { flex: 1 }, item.valor === valor && { color: cor.realce, fontFamily: fonte.negrito }]}>{item.rotulo}</Text>
                  {item.valor === valor ? <Icone nome="check" tamanho={20} cor={cor.realce} /> : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function Aviso({ texto }: { texto: string }) {
  const { s } = useEstilos();
  return <Text style={s.aviso}>{texto}</Text>;
}

const criarEstilos = (cor: Cores) => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  topo: { backgroundColor: cor.barra, borderBottomWidth: 3, borderBottomColor: cor.destaque, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 10 },
  voltar: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  tituloTopo: { color: '#fff', fontFamily: fonte.negrito, fontSize: 20 },
  subTopo: { color: cor.barraSuave, fontFamily: fonte.normal, fontSize: 13 },
  texto: { color: cor.texto, fontFamily: fonte.normal, fontSize: 16 },
  suave: { color: cor.suave, fontFamily: fonte.normal, fontSize: 14 },
  rotulo: { color: cor.suave, fontFamily: fonte.media, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
  botao: { height: 50, borderRadius: 25, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  botaoPq: { height: 40, borderRadius: 20, paddingHorizontal: 16 },
  textoBotao: { fontFamily: fonte.negrito, fontSize: 17 },
  caixa: { width: 26, height: 26, borderRadius: 5, borderWidth: 2, borderColor: cor.suave, alignItems: 'center', justifyContent: 'center' },
  escolha: { height: 46, borderRadius: 8, borderWidth: 1, borderColor: cor.linha, backgroundColor: cor.cartao, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  bolinha: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#888' },
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: cor.cartao, borderRadius: 14, maxHeight: '80%', paddingVertical: 8, width: '100%', maxWidth: 480, alignSelf: 'center' },
  tituloModal: { color: cor.texto, fontFamily: fonte.negrito, fontSize: 18, paddingHorizontal: 18, paddingVertical: 10 },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, minHeight: 50 },
  campo: { height: 50, borderRadius: 8, borderWidth: 1, borderColor: cor.linha, backgroundColor: cor.cartao, color: cor.texto, fontFamily: fonte.normal, fontSize: 17, paddingHorizontal: 14 },
  aviso: { backgroundColor: cor.aviso, color: cor.avisoTexto, fontFamily: fonte.normal, fontSize: 14, padding: 12, borderRadius: 8, overflow: 'hidden' },
  linhaLista: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 64, borderBottomWidth: 1, borderBottomColor: cor.linha },
  iconeBotao: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

/** Estilos prontos de cada tema. */
export const estilos = { claro: criarEstilos(paletas.claro), escuro: criarEstilos(paletas.escuro) };

/** Estilos e cores do tema em uso (claro ou escuro). */
export function useEstilos() {
  const { nome, cor } = useTema();
  return { s: estilos[nome], cor, tema: nome };
}

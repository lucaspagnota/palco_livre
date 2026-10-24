// Repertórios neste aparelho: os meus e os que a banda compartilhou.
import { porTitulo, semAcento } from '@palco/cifra';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '@/components/Icone';
import { Escolha, Topo, useEstilos } from '@/components/ui';
import { useStore } from '@/lib/store';
import { fonte } from '@/lib/tema';

export default function Repertorios() {
  const { s, cor } = useEstilos();
  const { conteudo } = useStore();
  const insets = useSafeAreaInsets();
  const [busca, setBusca] = useState('');
  const [estilo, setEstilo] = useState('');
  const [dono, setDono] = useState<'todos' | 'meus' | 'recebidos'>('todos');
  const eu = conteudo?.eu.id;

  const todos = useMemo(() => [...(conteudo?.repertorios ?? [])].sort(porTitulo), [conteudo]);
  const estilos = useMemo(() => [...new Set(todos.map(r => r.estilo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [todos]);
  const grupoDe = (id: string) => conteudo?.grupos.find(g => g.repertorios.some(x => x.repertorioId === id))?.titulo;

  const lista = todos.filter(r => {
    const b = semAcento(busca.trim().toLowerCase());
    return (!b || semAcento(r.titulo.toLowerCase()).includes(b)) && (!estilo || r.estilo === estilo)
      && (dono === 'todos' || (dono === 'meus') === (r.donoId === eu));
  });

  return (
    <View style={s.tela}>
      <Topo titulo="Repertórios" subtitulo="neste aparelho" />
      <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: cor.linha }}>
        <TextInput style={[s.campo, { height: 44 }]} value={busca} onChangeText={setBusca} placeholder="Título" placeholderTextColor={cor.suave} accessibilityLabel="Buscar" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Escolha compacto titulo="Estilo" valor={estilo} opcoes={[{ valor: '', rotulo: 'Todos os estilos' }, ...estilos.map(e => ({ valor: e, rotulo: e }))]} aoEscolher={setEstilo} estilo={{ flex: 1 }} />
          <Escolha compacto titulo="De quem" valor={dono} opcoes={[{ valor: 'todos', rotulo: 'Todos' }, { valor: 'meus', rotulo: 'Meus repertórios' }, { valor: 'recebidos', rotulo: 'Recebidos da banda' }]} aoEscolher={setDono} estilo={{ flex: 1 }} />
        </View>
      </View>
      <FlatList
        data={lista}
        keyExtractor={r => r.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        renderItem={({ item: r }) => {
          const n = r.itens.filter(i => i.musicaId).length;
          const deOutro = r.donoId !== eu;
          return (
            <View style={s.linhaLista}>
              <Pressable onPress={() => router.push({ pathname: '/repertorio/[id]', params: { id: r.id } })} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 }, pressed && { opacity: 0.7 }]}>
                <View style={[s.iconeBotao, { backgroundColor: cor.topo }]}><Icone nome="lista" tamanho={22} cor={cor.verde} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: cor.texto, fontFamily: fonte.negrito, fontSize: 17 }}>{r.titulo}</Text>
                  <Text numberOfLines={1} style={s.suave}>
                    {[`${n} ${n === 1 ? 'música' : 'músicas'}`, r.estilo, deOutro ? `de ${conteudo?.perfis[r.donoId]?.nick ?? 'outra pessoa'}` : '', deOutro ? grupoDe(r.id) : ''].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
              <Pressable accessibilityLabel={'Tocar ' + r.titulo} onPress={() => router.push({ pathname: '/leitor', params: { repertorio: r.id } })} style={({ pressed }) => [s.iconeBotao, { backgroundColor: cor.marca, opacity: pressed ? 0.7 : 1 }]}>
                <Icone nome="play" tamanho={20} cor="#1b1d1f" />
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={[s.suave, { padding: 24, textAlign: 'center', fontSize: 16 }]}>
            {conteudo ? 'Nenhum repertório com esses filtros.' : 'Nenhum repertório neste aparelho. Vá em Conteúdo e baixe os seus.'}
          </Text>
        }
        ListFooterComponent={lista.length ? <Text style={[s.suave, { padding: 14 }]}>{lista.length} {lista.length === 1 ? 'repertório' : 'repertórios'}</Text> : undefined}
      />
    </View>
  );
}

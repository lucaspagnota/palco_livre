// Início: o menu principal, no jeito do app do Toque Fácil.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone, Marca, type NomeIcone } from '@/components/Icone';
import { useEstilos } from '@/components/ui';
import { demo } from '@/lib/conteudo';
import { useStore } from '@/lib/store';
import { fonte, trocarTema } from '@/lib/tema';

function useRelogio() {
  const [agora, setAgora] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setAgora(new Date()), 15000);
    return () => clearInterval(i);
  }, []);
  return agora;
}

export default function Inicio() {
  const { s, cor, tema } = useEstilos();
  const { conteudo } = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const agora = useRelogio();
  const largo = width >= 700;

  const dataBruta = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const data = dataBruta.charAt(0).toUpperCase() + dataBruta.slice(1);
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const meus = conteudo ? conteudo.musicas.length : 0;
  const reps = conteudo ? conteudo.repertorios.length : 0;

  function sair() {
    if (Platform.OS === 'android') {
      Alert.alert('Sair', 'Fechar o Palco Livre?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', onPress: () => BackHandler.exitApp() }]);
    } else {
      Alert.alert('Sair', 'No iPhone e no iPad, feche o app pela tela de apps abertos.');
    }
  }

  const itens: { icone: NomeIcone; titulo: string; detalhe: string; cor: string; acao: () => void }[] = [
    {
      icone: 'nuvem', titulo: 'Conteúdo', cor: cor.ciano, acao: () => router.push('/conteudo'),
      detalhe: conteudo ? `Baixado em ${new Date(conteudo.baixadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Baixe suas músicas e repertórios',
    },
    { icone: 'musica', titulo: 'Músicas', cor: cor.marca, detalhe: `${meus} ${meus === 1 ? 'música' : 'músicas'} neste aparelho`, acao: () => router.push('/musicas') },
    { icone: 'lista', titulo: 'Repertórios', cor: cor.verde, detalhe: `${reps} ${reps === 1 ? 'repertório' : 'repertórios'}`, acao: () => router.push('/repertorios') },
    { icone: 'pedal', titulo: 'Pedal', cor: '#8b5cf6', detalhe: 'Configure qualquer pedal Bluetooth ou USB', acao: () => router.push('/pedal') },
    { icone: 'sair', titulo: 'Sair', cor: '#6c757d', detalhe: 'Fechar o app', acao: sair },
  ];

  return (
    <View style={s.tela}>
      <View style={[s.topo, { paddingTop: insets.top + 10, paddingBottom: 14 }]}>
        <Marca tamanho={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontFamily: fonte.logo, fontSize: 24 }}>Palco<Text style={{ color: cor.destaque }}>Livre</Text></Text>
          <Text style={s.subTopo}>{data} · {hora}</Text>
        </View>
        <Pressable onPress={() => trocarTema(tema === 'claro' ? 'escuro' : 'claro')} hitSlop={10} accessibilityLabel={tema === 'claro' ? 'Modo claro (tocar para escurecer)' : 'Modo escuro (tocar para clarear)'} style={s.voltar}>
          <Icone nome={tema === 'claro' ? 'sol' : 'lua'} tamanho={28} cor={cor.destaque} />
        </Pressable>
        <Pressable onPress={() => router.push('/configuracoes')} hitSlop={10} accessibilityLabel="Configurações" style={s.voltar}>
          <Icone nome="engrenagem" tamanho={28} cor="#fff" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        {demo ? <Text style={s.aviso}>Modo demonstração: o app ainda não foi ligado ao banco de dados. As músicas de exemplo servem para testar o leitor e o pedal.</Text> : null}
        {!conteudo ? <Text style={[s.aviso, { backgroundColor: '#d1ecf1', color: '#0c5460' }]}>Comece em Conteúdo: entre com o mesmo e-mail e senha do site para baixar suas músicas.</Text> : null}
        <View style={{ flexDirection: largo ? 'row' : 'column', flexWrap: 'wrap', gap: 12 }}>
          {itens.map(i => (
            <Pressable
              key={i.titulo}
              onPress={i.acao}
              style={({ pressed }) => [{
                flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: cor.cartao, borderRadius: 14, padding: 16,
                borderLeftWidth: 5, borderLeftColor: i.cor, opacity: pressed ? 0.75 : 1, width: largo ? '48.8%' : '100%',
              }]}
            >
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: i.cor, alignItems: 'center', justifyContent: 'center' }}>
                <Icone nome={i.icone} tamanho={28} cor="#fff" traco={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: cor.texto, fontFamily: fonte.negrito, fontSize: 21 }}>{i.titulo}</Text>
                <Text style={s.suave}>{i.detalhe}</Text>
              </View>
              <Icone nome="direita" tamanho={22} cor={cor.suave} />
            </Pressable>
          ))}
        </View>
        {conteudo ? <Text style={[s.suave, { textAlign: 'center', marginTop: 8 }]}>Conta: {conteudo.eu.nome || conteudo.eu.nick} ({conteudo.eu.email})</Text> : null}
      </ScrollView>
    </View>
  );
}

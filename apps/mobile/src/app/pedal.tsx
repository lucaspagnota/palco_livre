// Pedal: qualquer pedal Bluetooth ou USB que funcione como teclado.
// Aqui a pessoa testa o pedal e ensina ao app o que cada botão faz.
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, Topo, useEstilos } from '@/components/ui';
import { NOME_ACAO, PEDAL_PADRAO, acaoDaTecla, type AcaoPedal } from '@/lib/config';
import { nomeDaTecla, pedalDisponivel, usePedal } from '@/lib/pedal';
import { useStore } from '@/lib/store';
import { fonte } from '@/lib/tema';

const ACOES: AcaoPedal[] = ['avancar', 'voltar', 'proxima', 'anterior'];

export default function Pedal() {
  const { s, cor } = useEstilos();
  const { config, mudarConfig } = useStore();
  const insets = useSafeAreaInsets();
  const [ensinando, setEnsinando] = useState<AcaoPedal | null>(null);
  const [ultima, setUltima] = useState<string | null>(null);
  const pedal = config.pedal;

  usePedal(tecla => {
    setUltima(tecla);
    if (!ensinando) return;
    const novo = { ...pedal };
    for (const a of ACOES) novo[a] = novo[a].filter(k => k !== tecla);
    novo[ensinando] = [...novo[ensinando], tecla];
    mudarConfig({ pedal: novo });
    setEnsinando(null);
  });

  const acao = ultima ? acaoDaTecla(pedal, ultima) : null;

  return (
    <View style={s.tela}>
      <Topo titulo="Pedal" subtitulo="Bluetooth ou USB, de qualquer marca" />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Text style={[s.texto, { color: cor.suave }]}>
          1. Ligue o pedal e pareie nas configurações de Bluetooth do celular ou tablet (ou ligue no USB).{'\n'}
          2. Aperte os botões do pedal aqui para testar.{'\n'}
          3. Se algum botão não fizer nada, toque em Ensinar e aperte o botão.
        </Text>
        {!pedalDisponivel ? (
          <Text style={s.aviso}>O pedal só funciona no app instalado (APK). No Expo Go, use os toques na tela.</Text>
        ) : null}

        <View style={{ backgroundColor: cor.cartao, borderRadius: 16, padding: 20, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: ensinando ? cor.marca : cor.cartao }}>
          <Text style={s.rotulo}>{ensinando ? 'Aperte o botão para: ' + NOME_ACAO[ensinando] : 'Teste'}</Text>
          <Text style={{ color: cor.texto, fontFamily: fonte.negrito, fontSize: 30 }}>{ultima ? nomeDaTecla(ultima) : 'Aperte o pedal'}</Text>
          <Text style={[s.texto, { color: acao ? cor.verde : cor.suave }]}>
            {ultima ? (acao ? '✓ ' + NOME_ACAO[acao] : 'Esse botão ainda não faz nada') : 'O nome do botão aparece aqui'}
          </Text>
        </View>

        {ACOES.map(a => (
          <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cor.linha }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.texto, { fontFamily: fonte.negrito, fontSize: 17 }]}>{NOME_ACAO[a]}</Text>
              <Text style={s.suave}>{pedal[a].length ? [...new Set(pedal[a].map(nomeDaTecla))].join(', ') : 'Nenhum botão'}</Text>
            </View>
            <Botao rotulo={ensinando === a ? 'Aperte…' : 'Ensinar'} tipo={ensinando === a ? 'marca' : 'escuro'} pequeno onPress={() => setEnsinando(ensinando === a ? null : a)} />
          </View>
        ))}
        <Botao rotulo="Voltar ao padrão" tipo="contorno" onPress={() => mudarConfig({ pedal: PEDAL_PADRAO })} />
        <Text style={s.suave}>
          Dica: pedais que funcionam como “virador de página” costumam mandar Page Down/Page Up ou as setas, e já vêm prontos. Pedais que mandam Volume ou Play também funcionam depois de ensinar.
        </Text>
      </ScrollView>
    </View>
  );
}

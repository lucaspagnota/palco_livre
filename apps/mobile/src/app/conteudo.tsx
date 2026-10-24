// Baixar meu conteúdo: entra com a conta do site e guarda tudo no aparelho.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Botao, Caixa, Topo, useEstilos } from '@/components/ui';
import { demo, temSessao, ultimoEmail } from '@/lib/conteudo';
import { useStore } from '@/lib/store';
import { fonte } from '@/lib/tema';

export default function Conteudo() {
  const { s, cor } = useEstilos();
  const { conteudo, baixar, limpar } = useStore();
  const [email, setEmail] = useState(() => conteudo?.eu.email || ultimoEmail() || (demo ? 'voce@palcolivre.app' : ''));
  const [senha, setSenha] = useState('');
  const [usarUltima, setUsarUltima] = useState(false);
  const [podeUsarUltima, setPodeUsarUltima] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    temSessao(email).then(t => { if (vivo) { setPodeUsarUltima(t); setUsarUltima(t); } });
    return () => { vivo = false; };
  }, [email]);

  async function aoBaixar() {
    setMsg(null);
    setBaixando(true);
    try {
      const c = await baixar(email, usarUltima ? '' : senha);
      setSenha('');
      setMsg({ tipo: 'ok', texto: `Pronto! ${c.musicas.length} músicas e ${c.repertorios.length} repertórios neste aparelho.` });
      setPodeUsarUltima(true);
      setUsarUltima(true);
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setBaixando(false);
    }
  }

  function aoLimpar() {
    Alert.alert('Limpar', 'Apagar as músicas e repertórios baixados deste aparelho? Eles continuam na sua conta do site.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: () => { limpar(); setMsg({ tipo: 'ok', texto: 'Conteúdo apagado deste aparelho.' }); } },
    ]);
  }

  const recebidas = conteudo ? conteudo.musicas.filter(m => m.donoId !== conteudo.eu.id).length : 0;

  return (
    <KeyboardAvoidingView style={s.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Topo titulo="Baixar meu conteúdo" />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Text style={[s.texto, { color: cor.suave }]}>
          Use o mesmo e-mail e senha do site. O app baixa suas músicas, seus repertórios e os que a sua banda compartilhou nos grupos. Depois funciona sem internet.
        </Text>
        <Text style={s.rotulo}>E-mail</Text>
        <TextInput
          style={s.campo}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="seu@email.com"
          placeholderTextColor={cor.suave}
          accessibilityLabel="E-mail"
        />
        {!(usarUltima && podeUsarUltima) ? (
          <>
            <Text style={s.rotulo}>Senha</Text>
            <TextInput
              style={s.campo}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              placeholder={demo ? 'Qualquer senha (demonstração)' : 'Senha'}
              placeholderTextColor={cor.suave}
              accessibilityLabel="Senha"
              onSubmitEditing={aoBaixar}
            />
          </>
        ) : null}
        {podeUsarUltima && !demo ? <Caixa marcada={usarUltima} aoMudar={setUsarUltima} rotulo="Usar a última senha digitada" /> : null}
        <Botao rotulo={baixando ? 'Baixando…' : conteudo ? 'Atualizar meu conteúdo' : 'Baixar meu conteúdo'} icone="nuvem" onPress={aoBaixar} desativado={baixando} />
        {baixando ? <ActivityIndicator color={cor.realce} /> : null}
        {msg ? (
          <Text style={[s.aviso, msg.tipo === 'ok' ? { backgroundColor: '#d1e7dd', color: '#0f5132' } : { backgroundColor: '#f8d7da', color: '#842029' }]}>{msg.texto}</Text>
        ) : null}

        {conteudo ? (
          <View style={{ backgroundColor: cor.cartao, borderRadius: 12, padding: 16, gap: 6, marginTop: 6 }}>
            <Text style={s.rotulo}>Neste aparelho</Text>
            <Text style={{ color: cor.texto, fontFamily: fonte.negrito, fontSize: 18 }}>{conteudo.eu.nome || conteudo.eu.nick}</Text>
            <Text style={s.suave}>{conteudo.eu.email}</Text>
            <Text style={s.texto}>{conteudo.musicas.length} músicas ({recebidas} recebidas da banda)</Text>
            <Text style={s.texto}>{conteudo.repertorios.length} repertórios · {conteudo.grupos.length} {conteudo.grupos.length === 1 ? 'grupo' : 'grupos'}</Text>
            <Text style={s.suave}>Baixado em {new Date(conteudo.baixadoEm).toLocaleString('pt-BR')}</Text>
            <Botao rotulo="Limpar este aparelho" tipo="contorno" icone="lixo" pequeno onPress={aoLimpar} estilo={{ marginTop: 8, alignSelf: 'flex-start' }} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Configurações do leitor, no jeito do app do Toque Fácil: cores, fonte, exibição e ajustes de resolução.
import { CORES, INSTRUMENTOS, TIPOS_REFRAO, layoutPages, type Aparencia } from '@palco/cifra';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '@/components/Icone';
import { Pagina, recuoDoMarcador } from '@/components/Pagina';
import { Botao, Escolha, Topo, useEstilos } from '@/components/ui';
import type { Ajuste } from '@/lib/config';
import { useStore } from '@/lib/store';
import { fonte } from '@/lib/tema';

const AMOSTRA = `[Refrão]
{refrão}
C         G
Toda noite eu canto aqui
{/refrão}
{2ª voz}
Am        F
Canta comigo
{/2ª voz}
e|--0--1--3--|
// Anotação: repetir 2x`;

const CORES_OP = CORES.map(c => ({ valor: c.valor, rotulo: c.nome, cor: c.valor }));
const ITENS_COR: { chave: Exclude<keyof Aparencia, 'tipoRefrao'>; rotulo: string }[] = [
  { chave: 'fundo', rotulo: 'Fundo' },
  { chave: 'letra', rotulo: 'Letra' },
  { chave: 'cifra', rotulo: 'Cifra' },
  { chave: 'refrao', rotulo: 'Refrão' },
  { chave: 'tablatura', rotulo: 'Tablatura' },
  { chave: 'voz2', rotulo: 'Segunda voz' },
  { chave: 'anotacao', rotulo: 'Anotação' },
];

export default function Configuracoes() {
  const { s, cor } = useEstilos();
  const { config, mudarConfig, restaurarConfig, limpar } = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [aba, setAba] = useState<'cores' | 'exibicao' | 'ajustes'>('cores');
  const a = config.aparencia;
  const mudarCor = (p: Partial<Aparencia>) => mudarConfig({ aparencia: { ...a, ...p } });

  const larguraAmostra = Math.min(width - 36, 420);
  const fonteAmostra = 17;
  const recuo = recuoDoMarcador(a, fonteAmostra);
  const cols = Math.floor((larguraAmostra - recuo - 16) / (fonteAmostra * 0.6));
  const amostra = layoutPages(AMOSTRA, { cols, rows: 30, show: config.mostrar, upperLyrics: config.letraMaiuscula })[0] ?? [];

  return (
    <View style={s.tela}>
      <Topo titulo="Configurações" />
      <View style={{ flexDirection: 'row', backgroundColor: cor.topo }}>
        {([['cores', 'Cores'], ['exibicao', 'Exibição'], ['ajustes', 'Ajustes']] as const).map(([id, nome]) => (
          <Pressable key={id} onPress={() => setAba(id)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: aba === id ? cor.marca : 'transparent' }}>
            <Text style={{ color: aba === id ? cor.texto : cor.suave, fontFamily: fonte.negrito, fontSize: 16 }}>{nome}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 4, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {aba === 'cores' ? (
          <>
            {ITENS_COR.map(i => (
              <Linha key={i.chave} rotulo={i.rotulo}>
                <Escolha titulo={i.rotulo} valor={a[i.chave]} opcoes={CORES_OP} aoEscolher={v => mudarCor({ [i.chave]: v })} estilo={{ width: 170 }} />
              </Linha>
            ))}
            <Linha rotulo="Tipo de refrão">
              <Escolha titulo="Tipo de refrão" valor={a.tipoRefrao} opcoes={TIPOS_REFRAO.map(t => ({ valor: t.id, rotulo: t.nome }))} aoEscolher={v => mudarCor({ tipoRefrao: v })} estilo={{ width: 170 }} />
            </Linha>
            <Text style={[s.rotulo, { marginTop: 18, marginBottom: 8 }]}>Como fica</Text>
            <View style={{ backgroundColor: a.fundo, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: cor.linha, alignSelf: 'flex-start' }}>
              <Pagina linhas={amostra} aparencia={a} fonte={fonteAmostra} altura={Math.round(fonteAmostra * 1.3)} largura={larguraAmostra - 16} recuo={recuo} />
            </View>
          </>
        ) : aba === 'exibicao' ? (
          <>
            <Linha rotulo="Tamanho da fonte">
              <Escolha titulo="Tamanho da fonte" valor={config.tamanho} opcoes={[1, 2, 3, 4, 5].map(n => ({ valor: n, rotulo: n === 2 ? '2 (normal)' : String(n) }))} aoEscolher={v => mudarConfig({ tamanho: v })} estilo={{ width: 170 }} />
            </Linha>
            <Linha rotulo="Letra e cifras">
              <Escolha titulo="Letra e cifras" valor={config.mostrar} opcoes={[{ valor: 'tudo', rotulo: 'Letra e cifras' }, { valor: 'letra', rotulo: 'Só a letra' }]} aoEscolher={v => mudarConfig({ mostrar: v })} estilo={{ width: 170 }} />
            </Linha>
            <Linha rotulo="Letras em maiúsculo"><SimNao valor={config.letraMaiuscula} aoMudar={v => mudarConfig({ letraMaiuscula: v })} /></Linha>
            <Linha rotulo="Títulos em maiúsculo"><SimNao valor={config.tituloMaiusculo} aoMudar={v => mudarConfig({ tituloMaiusculo: v })} /></Linha>
            <Linha rotulo="Instrumento">
              <Escolha titulo="Instrumento" valor={config.instrumento} opcoes={INSTRUMENTOS.map(i => ({ valor: i.id, rotulo: i.nome }))} aoEscolher={v => mudarConfig({ instrumento: v })} estilo={{ width: 170 }} />
            </Linha>
            <Linha rotulo="Formato dos acordes">
              <Escolha titulo="Formato dos acordes" valor={config.canhoto ? 'canhoto' : 'destro'} opcoes={[{ valor: 'destro', rotulo: 'Destro' }, { valor: 'canhoto', rotulo: 'Canhoto' }]} aoEscolher={v => mudarConfig({ canhoto: v === 'canhoto' })} estilo={{ width: 170 }} />
            </Linha>
            <Linha rotulo="Coluna dos acordes" ajuda="Mostra o desenho dos acordes ao lado da cifra"><SimNao valor={config.colunaAcordes} aoMudar={v => mudarConfig({ colunaAcordes: v })} /></Linha>
            <Linha rotulo="Modos do painel">
              <Escolha titulo="Modos do painel" valor={config.modo} opcoes={[{ valor: 'paginacao', rotulo: 'Paginação' }, { valor: 'rolagem', rotulo: 'Rolagem' }]} aoEscolher={v => mudarConfig({ modo: v })} estilo={{ width: 170 }} />
            </Linha>
            <Linha rotulo="Duas páginas deitado" ajuda="No tablet deitado, mostra duas páginas lado a lado"><SimNao valor={config.duasPaginas} aoMudar={v => mudarConfig({ duasPaginas: v })} /></Linha>
            <Linha rotulo="Instruções do painel" ajuda="Explica os toques quando o leitor abre"><SimNao valor={config.instrucoes} aoMudar={v => mudarConfig({ instrucoes: v })} /></Linha>
            <Linha rotulo="Confirmar saídas" ajuda="Pergunta antes de fechar o leitor pelo botão voltar do aparelho"><SimNao valor={config.confirmarSaida} aoMudar={v => mudarConfig({ confirmarSaida: v })} /></Linha>
          </>
        ) : (
          <>
            <Text style={[s.rotulo, { marginBottom: 4 }]}>Ajustes de resolução</Text>
            <Text style={[s.suave, { marginBottom: 8 }]}>Se a letra ficar cortada na direita ou sobrar espaço, ajuste quantos caracteres cabem por linha e quantas linhas por página.</Text>
            <Resolucao titulo="Modo retrato (em pé)" valor={config.retrato} aoMudar={v => mudarConfig({ retrato: v })} />
            <Resolucao titulo="Modo paisagem (deitado)" valor={config.paisagem} aoMudar={v => mudarConfig({ paisagem: v })} />
            <Linha rotulo="Config padrão" ajuda="Volta todas as configurações ao original">
              <Botao rotulo="Restaurar" tipo="contorno" pequeno onPress={() => Alert.alert('Restaurar', 'Voltar todas as configurações ao padrão?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Restaurar', onPress: restaurarConfig }])} />
            </Linha>
            <Linha rotulo="Limpeza" ajuda="Apaga o conteúdo baixado deste aparelho">
              <Botao rotulo="Limpar" tipo="contorno" pequeno onPress={() => Alert.alert('Limpar', 'Apagar as músicas e repertórios baixados deste aparelho?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Limpar', style: 'destructive', onPress: () => { limpar(); } }])} />
            </Linha>
            <Linha rotulo="Privacidade" ajuda="O app guarda suas músicas só neste aparelho e na sua conta. Nada é vendido ou compartilhado." />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Linha({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children?: ReactNode }) {
  const { s, cor } = useEstilos();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: cor.linha }}>
      <View style={{ flex: 1 }}>
        <Text style={[s.texto, { fontFamily: fonte.media }]}>{rotulo}</Text>
        {ajuda ? <Text style={s.suave}>{ajuda}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function SimNao({ valor, aoMudar }: { valor: boolean; aoMudar: (v: boolean) => void }) {
  const { cor } = useEstilos();
  return (
    <Pressable onPress={() => aoMudar(!valor)} accessibilityRole="switch" accessibilityState={{ checked: valor }}
      style={{ width: 58, height: 32, borderRadius: 16, backgroundColor: valor ? cor.marca : cor.linha, padding: 3, alignItems: valor ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

function Resolucao({ titulo, valor, aoMudar }: { titulo: string; valor: Ajuste; aoMudar: (v: Ajuste) => void }) {
  const { s, cor } = useEstilos();
  const passo = (campo: keyof Ajuste, d: number) => aoMudar({ ...valor, [campo]: valor[campo] + d });
  const contador = (campo: keyof Ajuste, nome: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={[s.texto, { flex: 1 }]}>{nome}</Text>
      <Pressable onPress={() => passo(campo, -1)} accessibilityLabel={nome + ' menos'} style={[s.iconeBotao, { backgroundColor: cor.verde }]}><Icone nome="menos" cor="#fff" traco={3} /></Pressable>
      <Text style={{ color: cor.texto, fontFamily: fonte.negrito, fontSize: 18, width: 40, textAlign: 'center' }}>{valor[campo] > 0 ? '+' : ''}{valor[campo]}</Text>
      <Pressable onPress={() => passo(campo, 1)} accessibilityLabel={nome + ' mais'} style={[s.iconeBotao, { backgroundColor: cor.verde }]}><Icone nome="mais" cor="#fff" traco={3} /></Pressable>
    </View>
  );
  return (
    <View style={{ backgroundColor: cor.cartao, borderRadius: 12, padding: 14, gap: 10, marginBottom: 12 }}>
      <Text style={{ color: cor.texto, fontFamily: fonte.negrito, fontSize: 17 }}>{titulo}</Text>
      {contador('cols', 'Caracteres')}
      {contador('rows', 'Linhas')}
    </View>
  );
}

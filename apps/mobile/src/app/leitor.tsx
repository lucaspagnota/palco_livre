// Leitor de palco: fundo preto, cifra paginada, toque à direita avança e à esquerda volta.
// O pedal (qualquer marca) chega como tecla e faz o mesmo.
import {
  TAMANHOS, chordShape, flatsForKey, gridFor, layoutPages, molduraDeAjuste, layoutRows, listChords, passosDoShow, transposeKey, transposeSource, type Musica,
} from '@palco/cifra';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Alert, BackHandler, Modal, Pressable, ScrollView, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Diagrama } from '@/components/Diagrama';
import { Icone } from '@/components/Icone';
import { Pagina, recuoDoMarcador } from '@/components/Pagina';
import { Botao, Caixa, estilos } from '@/components/ui';
import { acaoDaTecla } from '@/lib/config';
import { usePedal } from '@/lib/pedal';
import { useStore } from '@/lib/store';
import { TemaFixo, fonte, paletas } from '@/lib/tema';

const MARGEM = 8;
const LARGURA_ACORDES = 92;
let instrucoesVistas = false;

function useHora() {
  const [hora, setHora] = useState('');
  useEffect(() => {
    const t = () => setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    t();
    const i = setInterval(t, 15000);
    return () => clearInterval(i);
  }, []);
  return hora;
}

// O leitor é sempre escuro, mesmo com o resto do app no tema claro.
const cor = paletas.escuro;
const s = estilos.escuro;

export default function Leitor() {
  return <TemaFixo value="escuro"><Painel /></TemaFixo>;
}

function Painel() {
  useKeepAwake();
  const params = useLocalSearchParams<{ repertorio?: string; inicio?: string; musicas?: string; musica?: string; ajuste?: string }>();
  const { conteudo, config, mudarConfig } = useStore();
  const insets = useSafeAreaInsets();
  const janela = useWindowDimensions();
  const hora = useHora();

  const repertorio = params.repertorio ? conteudo?.repertorios.find(r => r.id === params.repertorio) : undefined;
  const porId = useMemo(() => new Map((conteudo?.musicas ?? []).map(m => [m.id, m])), [conteudo]);
  // Bloco, número e pausa (água) de cada música do repertório, na mesma ordem das músicas.
  const show = useMemo(() => (repertorio ? passosDoShow(repertorio.itens, id => porId.has(id)) : []), [repertorio, porId]);
  const musicas = useMemo(() => {
    const ids = repertorio ? show.map(p => p.musicaId) : (params.musicas ?? params.musica ?? '').split(',');
    return ids.map(id => (id ? porId.get(id) : undefined)).filter((m): m is Musica => !!m);
  }, [porId, repertorio, show, params.musicas, params.musica]);

  const [atual, setAtual] = useState(() => Math.max(0, Number(params.inicio ?? 0) || 0));
  const [pagina, setPagina] = useState(0);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [opcoes, setOpcoes] = useState(false);
  // Ajustes de resolução: moldura de X no lugar da cifra para acertar caracteres e linhas na tela.
  const [ajustando, setAjustando] = useState(params.ajuste === '1');
  // Tom mudado aqui (meios-tons a partir do original de cada música). Vale enquanto o repertório está
  // aberto, indo e voltando entre as músicas; ao sair, volta ao tom da música. Para mudar de vez, só no site.
  const [tons, setTons] = useState<Record<string, number>>({});
  const mudarTom = (id: string, passos: number) => setTons(atual => ({ ...atual, [id]: passos }));
  const [instrucoes, setInstrucoes] = useState(config.instrucoes && !instrucoesVistas && params.ajuste !== '1');
  const irParaFim = useRef(false);
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const posRolagem = useRef({ y: 0, max: 0 });

  const musica = musicas[atual];
  const passos = musica ? tons[musica.id] ?? 0 : 0;
  const tom = musica?.tom ? transposeKey(musica.tom, passos) : '';
  const a = config.aparencia;

  // Grade de caracteres para o tamanho da tela (com os ajustes de resolução).
  const paisagem = area.w > area.h;
  const tablet = Math.min(janela.width, janela.height) >= 600;
  const tamanho = (TAMANHOS[config.tamanho - 1] ?? TAMANHOS[1]) * (tablet ? 1.2 : 1);
  const colunaAcordes = config.colunaAcordes && area.w >= 480 ? LARGURA_ACORDES : 0;
  const recuo = recuoDoMarcador(a, tamanho);
  const duas = config.duasPaginas && config.modo === 'paginacao' && paisagem && area.w >= 800;
  const porVez = duas ? 2 : 1;
  const larguraTexto = Math.max(120, (area.w - MARGEM * 2 - colunaAcordes - (duas ? MARGEM * 2 : 0)) / porVez);
  const ajuste = paisagem ? config.paisagem : config.retrato;
  const grade = gridFor(larguraTexto - recuo, Math.max(120, area.h - 4), tamanho, ajuste);
  const mudarAjuste = (campo: 'cols' | 'rows', d: number) => mudarConfig(paisagem ? { paisagem: { ...ajuste, [campo]: ajuste[campo] + d } } : { retrato: { ...ajuste, [campo]: ajuste[campo] + d } });
  const fecharAjuste = () => { setAjustando(false); if (!musica) sair(); };

  const opcoesLayout = musica ? {
    cols: grade.cols, steps: passos, show: config.mostrar, upperLyrics: config.letraMaiuscula, upperTitle: config.tituloMaiusculo,
    key: tom,
  } : null;
  const paginas = useMemo(() => (musica && opcoesLayout ? layoutPages(musica.letra, { ...opcoesLayout, rows: grade.rows }) : []),
    [musica, grade.cols, grade.rows, passos, tom, config.mostrar, config.letraMaiuscula, config.tituloMaiusculo]); // eslint-disable-line react-hooks/exhaustive-deps
  const linhasRolagem = useMemo(() => (musica && opcoesLayout && config.modo === 'rolagem' ? layoutRows(musica.letra, opcoesLayout) : []),
    [musica, grade.cols, passos, tom, config.mostrar, config.letraMaiuscula, config.tituloMaiusculo, config.modo]); // eslint-disable-line react-hooks/exhaustive-deps
  const acordes = useMemo(() => {
    if (!musica || !colunaAcordes) return [];
    const texto = passos ? transposeSource(musica.letra, passos, flatsForKey(tom || null)) : musica.letra;
    return listChords(texto).map(c => chordShape(c, config.instrumento, config.canhoto)).filter(x => !!x);
  }, [musica, colunaAcordes, passos, tom, config.instrumento, config.canhoto]);
  const total = paginas.length;

  useEffect(() => {
    if (irParaFim.current) { irParaFim.current = false; setPagina(Math.max(0, Math.floor((total - 1) / porVez) * porVez)); }
    else setPagina(p => Math.min(Math.floor(p / porVez) * porVez, Math.max(0, total - 1)));
  }, [total, porVez]);

  useEffect(() => { rolagem.current?.scrollTo({ y: 0, animated: false }); posRolagem.current.y = 0; }, [atual]);

  const irPara = (i: number) => { if (i >= 0 && i < musicas.length) { setAtual(i); setPagina(0); } };

  function avancar() {
    if (config.modo === 'rolagem') {
      const { y, max } = posRolagem.current;
      if (y < max - 4) rolagem.current?.scrollTo({ y: Math.min(max, y + area.h * 0.85), animated: true });
      else irPara(atual + 1);
      return;
    }
    if (pagina + porVez < total) setPagina(pagina + porVez);
    else irPara(atual + 1);
  }

  function voltar() {
    if (config.modo === 'rolagem') {
      const { y } = posRolagem.current;
      if (y > 4) rolagem.current?.scrollTo({ y: Math.max(0, y - area.h * 0.85), animated: true });
      else if (atual > 0) irPara(atual - 1);
      return;
    }
    if (pagina > 0) setPagina(Math.max(0, pagina - porVez));
    else if (atual > 0) { irParaFim.current = true; setAtual(atual - 1); }
  }

  usePedal(tecla => {
    if (opcoes || ajustando) return;
    setInstrucoes(false);
    const acao = acaoDaTecla(config.pedal, tecla);
    if (acao === 'avancar') avancar();
    else if (acao === 'voltar') voltar();
    else if (acao === 'proxima') irPara(atual + 1);
    else if (acao === 'anterior') irPara(atual - 1);
  });

  // Confirmar saídas: o botão voltar do Android pergunta antes de fechar o leitor.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (opcoes) { setOpcoes(false); return true; }
      if (ajustando) { fecharAjuste(); return true; }
      if (!config.confirmarSaida) return false;
      Alert.alert('Sair do leitor?', '', [{ text: 'Continuar tocando', style: 'cancel' }, { text: 'Sair', onPress: sair }]);
      return true;
    });
    return () => sub.remove();
  }, [config.confirmarSaida, opcoes, ajustando, musica]); // eslint-disable-line react-hooks/exhaustive-deps

  function sair() {
    if (router.canGoBack()) router.back(); else router.replace('/');
  }

  function fecharInstrucoes(naoMostrar: boolean) {
    instrucoesVistas = true;
    setInstrucoes(false);
    if (naoMostrar) mudarConfig({ instrucoes: false });
  }

  const proxima = musicas[atual + 1];
  // O que vem depois desta música no show: pausa (água) e começo de outro bloco. Aparece no meio da barra de cima.
  const pausa = show[atual]?.pausaDepois ?? null;
  const blocoSeguinte = proxima && show[atual + 1]?.bloco && show[atual + 1].bloco !== show[atual]?.bloco ? show[atual + 1].bloco : null;
  const corTopo = a.cifra;

  if (!musica && !ajustando) {
    return (
      <View style={[s.tela, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }]}>
        <Text style={[s.texto, { textAlign: 'center' }]}>{conteudo ? 'Nada para tocar aqui.' : 'Baixe seu conteúdo primeiro.'}</Text>
        <Botao rotulo="Voltar" onPress={sair} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: a.fundo }}>
      <StatusBar hidden />
      {musica ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#2f4f4f', paddingTop: insets.top + 2, paddingHorizontal: MARGEM, paddingBottom: 4 }}>
        <Pressable style={{ flex: 3, minWidth: 0 }} onPress={() => { if (!ajustando) irPara(atual - 1); }} focusable={false} accessibilityLabel="Música anterior">
          <Text numberOfLines={1} style={{ color: corTopo, fontFamily: fonte.negrito, fontSize: tablet ? 22 : 18 }}>{ajustando ? 'AJUSTES DE RESOLUÇÃO' : musica.titulo.toUpperCase()}</Text>
          {/* No ajuste a barra continua da mesma altura (só some o texto), para a área da cifra ser a mesma. */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', opacity: ajustando ? 0 : 1 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, color: corTopo, fontFamily: fonte.media, fontSize: tablet ? 16 : 14 }}>{musica.artista}</Text>
            {tom ? <Text numberOfLines={1} style={{ flexShrink: 0, marginLeft: musica.artista ? 24 : 0, color: corTopo, fontFamily: fonte.negrito, fontSize: tablet ? 17 : 15 }}>Tom: {tom}</Text> : null}
            {musica.capo ? <Text style={{ marginLeft: 24, color: corTopo, fontFamily: fonte.media, fontSize: tablet ? 16 : 14 }}>Capo {musica.capo}ª</Text> : null}
          </View>
        </Pressable>
        {pausa || blocoSeguinte ? (
          <View style={{ flex: 2, minWidth: 0, alignItems: 'center', gap: 2, paddingHorizontal: 8 }}>
            {pausa ? (
              <Text numberOfLines={1} style={{ color: '#ffd43b', fontFamily: fonte.negrito, fontSize: tablet ? 18 : 15, borderWidth: 1.5, borderColor: '#ffd43b', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 1 }}>
                {pausa.toUpperCase()}
              </Text>
            ) : null}
            {blocoSeguinte ? <Text numberOfLines={1} style={{ color: '#8ce99a', fontFamily: fonte.negrito, fontSize: tablet ? 16 : 13 }}>▸ {blocoSeguinte.toUpperCase()}</Text> : null}
          </View>
        ) : null}
        <Pressable style={{ alignItems: 'flex-end', maxWidth: '40%', paddingLeft: 10 }} onPress={() => { if (!ajustando) irPara(atual + 1); }} focusable={false} accessibilityLabel="Próxima música">
          <Text style={{ color: '#bbb', fontFamily: fonte.negrito, fontSize: tablet ? 18 : 15 }}>
            ♫ {atual + 1}/{musicas.length}{config.modo === 'paginacao' ? `   ▤ ${Math.min(Math.floor(pagina / porVez) + 1, Math.max(1, Math.ceil(total / porVez)))}/${Math.max(1, Math.ceil(total / porVez))}` : ''}
          </Text>
          {proxima ? <Text numberOfLines={1} style={{ color: '#bbb', fontFamily: fonte.media, fontSize: tablet ? 15 : 13 }}>▶ {proxima.titulo}</Text> : null}
        </Pressable>
      </View>
      ) : (
        <View style={{ borderBottomWidth: 2, borderBottomColor: '#2f4f4f', paddingTop: insets.top + 2, paddingHorizontal: MARGEM, paddingBottom: 4 }}>
          <Text style={{ color: corTopo, fontFamily: fonte.negrito, fontSize: tablet ? 22 : 18 }}>AJUSTES DE RESOLUÇÃO</Text>
          {/* Mesma altura da barra com a música (título + artista), para o ajuste valer igual no leitor. */}
          <Text style={{ fontFamily: fonte.media, fontSize: tablet ? 16 : 14 }}> </Text>
        </View>
      )}

      <View style={{ flex: 1, flexDirection: 'row' }} onLayout={e => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <View style={{ flex: 1, paddingHorizontal: MARGEM, overflow: 'hidden' }}>
          {area.w > 0 ? (
            ajustando ? (
              <View style={{ flexDirection: 'row', gap: duas ? MARGEM * 2 : 0 }}>
                {Array.from({ length: porVez }, (_, i) => (
                  <Pagina key={i} linhas={molduraDeAjuste(grade.cols, grade.rows)} aparencia={a} fonte={grade.font} altura={grade.line} largura={larguraTexto} recuo={recuo} />
                ))}
              </View>
            ) : config.modo === 'rolagem' ? (
              <ScrollView
                ref={rolagem}
                scrollEventThrottle={64}
                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const n = e.nativeEvent;
                  posRolagem.current = { y: n.contentOffset.y, max: Math.max(0, n.contentSize.height - n.layoutMeasurement.height) };
                }}
              >
                <Pagina linhas={linhasRolagem} aparencia={a} fonte={grade.font} altura={grade.line} largura={larguraTexto} recuo={recuo} />
                <View style={{ height: area.h * 0.5 }} />
              </ScrollView>
            ) : (
              <View style={{ flexDirection: 'row', gap: duas ? MARGEM * 2 : 0 }}>
                {paginas.slice(pagina, pagina + porVez).map((linhas, i) => (
                  <Pagina key={pagina + i} linhas={linhas} aparencia={a} fonte={grade.font} altura={grade.line} largura={larguraTexto} recuo={recuo} />
                ))}
              </View>
            )
          ) : null}
        </View>
        {colunaAcordes ? (
          <ScrollView style={{ width: colunaAcordes, flexGrow: 0, flexShrink: 0, borderLeftWidth: 1, borderLeftColor: '#2f4f4f' }} contentContainerStyle={{ alignItems: 'center', gap: 6, paddingVertical: 6 }}>
            {acordes.map(f => <Diagrama key={f!.name} forma={f!} tamanho={76} cor={a.cifra} tinta={a.letra} />)}
          </ScrollView>
        ) : null}
        {config.modo === 'paginacao' && !ajustando ? (
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: colunaAcordes, flexDirection: 'row' }}>
            <Pressable style={{ flex: 1 }} onPress={voltar} focusable={false} accessibilityLabel="Página anterior" />
            <Pressable style={{ flex: 1 }} onPress={avancar} focusable={false} accessibilityLabel="Próxima página" />
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 2, borderTopColor: '#2f4f4f', paddingHorizontal: MARGEM + 2, paddingTop: 3, paddingBottom: insets.bottom + 3 }}>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Text style={{ color: corTopo, fontFamily: fonte.negrito, fontSize: 13 }}>PalcoLivre</Text>
          <Text numberOfLines={1} style={{ flexShrink: 1, color: corTopo, fontFamily: fonte.negrito, fontSize: 13 }}>{repertorio?.titulo.toUpperCase() ?? ''}</Text>
        </View>
        <Pressable
          onPress={sair}
          focusable={false}
          hitSlop={10}
          accessibilityLabel="Sair do leitor"
          style={({ pressed }) => ({ height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: corTopo, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, marginHorizontal: 12, opacity: pressed ? 0.6 : 1 })}
        >
          <Icone nome="sair" tamanho={17} cor={corTopo} traco={2.2} />
          <Text style={{ color: corTopo, fontFamily: fonte.negrito, fontSize: 13 }}>SAIR</Text>
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
          <Pressable
            onPress={() => setOpcoes(true)}
            focusable={false}
            hitSlop={12}
            accessibilityLabel="Opções do leitor"
            style={({ pressed }) => ({ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: corTopo, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
          >
            <Icone nome="engrenagem" tamanho={18} cor={corTopo} traco={2.2} />
          </Pressable>
          <Text style={{ color: corTopo, fontFamily: fonte.negrito, fontSize: 13 }}>{hora}</Text>
        </View>
      </View>

      {instrucoes ? <Instrucoes aoFechar={fecharInstrucoes} topo={insets.top} /> : null}

      {ajustando ? (
        <AjusteResolucao
          aoMudar={mudarAjuste}
          aoPadrao={() => mudarConfig(paisagem ? { paisagem: { cols: 0, rows: 0 } } : { retrato: { cols: 0, rows: 0 } })}
          aoFechar={fecharAjuste}
        />
      ) : null}

      {musica ? (
      <Modal visible={opcoes} transparent animationType="fade" onRequestClose={() => setOpcoes(false)} supportedOrientations={['portrait', 'landscape']}>
        {/* Caixa no canto de cima à direita, como no Toque Fácil: a cifra continua aparecendo do lado. */}
        <Pressable style={{ flex: 1 }} onPress={() => setOpcoes(false)}>
          <Pressable
            onPress={() => undefined}
            style={[s.modal, {
              position: 'absolute', top: insets.top + 6, right: 6, alignSelf: 'auto', maxWidth: undefined,
              width: Math.min(tablet ? 340 : 300, janela.width - 24), maxHeight: janela.height - insets.top - insets.bottom - 12,
              paddingVertical: 0, borderWidth: 1, borderColor: '#3a3f44',
            }]}
          >
            <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
              <Text numberOfLines={1} style={[s.tituloModal, { padding: 0, fontSize: 16 }]}>{musica.titulo}</Text>
              <MaisMenos rotulo={`Tom${tom ? ': ' + tom : ''}`} aoMenos={() => mudarTom(musica.id, passos - 1)} aoMais={() => mudarTom(musica.id, passos + 1)} menos="Baixar meio tom" mais="Subir meio tom" />
              <MaisMenos rotulo={`Fonte ${config.tamanho}`} aoMenos={() => mudarConfig({ tamanho: Math.max(1, config.tamanho - 1) })} aoMais={() => mudarConfig({ tamanho: Math.min(5, config.tamanho + 1) })} menos="Diminuir a letra" mais="Aumentar a letra" />
              <Caixa marcada={config.mostrar === 'letra'} aoMudar={v => mudarConfig({ mostrar: v ? 'letra' : 'tudo' })} rotulo="Só a letra" />
              <Caixa marcada={config.modo === 'rolagem'} aoMudar={v => mudarConfig({ modo: v ? 'rolagem' : 'paginacao' })} rotulo="Rolagem em vez de páginas" />
              <Caixa marcada={config.colunaAcordes} aoMudar={v => mudarConfig({ colunaAcordes: v })} rotulo="Coluna dos acordes" />
              {musicas.length > 1 ? (
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200, borderTopWidth: 1, borderBottomWidth: 1, borderColor: cor.linha }}>
                  {musicas.map((m, i) => (
                    <View key={m.id + i}>
                      {show[i]?.bloco && show[i].bloco !== show[i - 1]?.bloco ? (
                        <Text style={{ color: '#8ce99a', fontFamily: fonte.negrito, fontSize: 13, paddingTop: 8 }}>{show[i].bloco!.toUpperCase()}</Text>
                      ) : null}
                      <Pressable onPress={() => { irPara(i); setOpcoes(false); }} style={{ paddingVertical: 8, flexDirection: 'row', gap: 8 }}>
                        <Text style={[s.suave, { width: 24, textAlign: 'right' }]}>{show[i]?.numero ?? i + 1}</Text>
                        <Text numberOfLines={1} style={[s.texto, { flex: 1, fontSize: 15 }, i === atual && { color: cor.marca, fontFamily: fonte.negrito }]}>{m.titulo}</Text>
                      </Pressable>
                      {show[i]?.pausaDepois ? <Text style={{ color: '#ffd43b', fontFamily: fonte.negrito, fontSize: 13, paddingLeft: 32, paddingBottom: 4 }}>{show[i].pausaDepois}</Text> : null}
                    </View>
                  ))}
                </ScrollView>
              ) : null}
              <Botao rotulo="Ajustes de resolução" tipo="escuro" pequeno onPress={() => { setOpcoes(false); setAjustando(true); }} />
              <Botao rotulo="Configurações" icone="engrenagem" tipo="escuro" pequeno onPress={() => { setOpcoes(false); router.push('/configuracoes'); }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Botao rotulo="Sair" icone="sair" tipo="perigo" pequeno estilo={{ flex: 1 }} onPress={() => { setOpcoes(false); sair(); }} />
                <Botao rotulo="Fechar" pequeno estilo={{ flex: 1 }} onPress={() => setOpcoes(false)} />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      ) : null}
    </View>
  );
}

/** Caixa do "Ajustes de resolução", por cima da moldura de X. Vale para o modo em que o aparelho está (em pé ou deitado). */
function AjusteResolucao({ aoMudar, aoPadrao, aoFechar }: {
  aoMudar: (campo: 'cols' | 'rows', d: number) => void; aoPadrao: () => void; aoFechar: () => void;
}) {
  // Igual à caixinha do Toque Fácil: a moldura de X atrás cresce ou encolhe a cada toque.
  const linha = (rotulo: string, campo: 'cols' | 'rows', menos: string, mais: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Redondo icone="menos" onPress={() => aoMudar(campo, -1)} rotulo={menos} />
      <Text style={{ flex: 1, textAlign: 'center', color: '#222', fontFamily: fonte.media, fontSize: 17 }}>{rotulo}</Text>
      <Redondo icone="mais" onPress={() => aoMudar(campo, 1)} rotulo={mais} />
    </View>
  );
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 6, paddingVertical: 16, paddingHorizontal: 18, gap: 12, width: 290, maxWidth: '100%' }}>
        <Text style={{ textAlign: 'center', color: '#555', fontFamily: fonte.normal, fontSize: 15, lineHeight: 21 }}>
          Altere o tamanho do marcador até abranger toda a área disponível para a letra cifrada.
        </Text>
        {linha('Largura', 'cols', 'Diminuir largura', 'Aumentar largura')}
        {linha('Altura', 'rows', 'Diminuir altura', 'Aumentar altura')}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Pressable onPress={aoPadrao} accessibilityLabel="Voltar ao padrão" style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ color: '#888', fontFamily: fonte.media, fontSize: 14 }}>Padrão</Text>
          </Pressable>
          <Pressable onPress={aoFechar} accessibilityLabel="Ok" style={({ pressed }) => ({ borderWidth: 1.5, borderColor: cor.verde, borderRadius: 18, paddingHorizontal: 30, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: cor.verde, fontFamily: fonte.negrito, fontSize: 16 }}>Ok</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** "−  Tom: G  +", como na caixa do Toque Fácil. */
function MaisMenos({ rotulo, aoMenos, aoMais, menos, mais }: { rotulo: string; aoMenos: () => void; aoMais: () => void; menos: string; mais: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Redondo icone="menos" onPress={aoMenos} rotulo={menos} />
      <Text numberOfLines={1} style={[s.texto, { flex: 1, textAlign: 'center', fontFamily: fonte.negrito, fontSize: 17 }]}>{rotulo}</Text>
      <Redondo icone="mais" onPress={aoMais} rotulo={mais} />
    </View>
  );
}

function Redondo({ icone, onPress, rotulo }: { icone: 'mais' | 'menos'; onPress: () => void; rotulo: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={rotulo} style={({ pressed }) => [s.iconeBotao, { backgroundColor: cor.verde, opacity: pressed ? 0.7 : 1 }]}>
      <Icone nome={icone} tamanho={22} cor="#fff" traco={3} />
    </Pressable>
  );
}

/** Instruções do painel: aparecem na primeira vez que o leitor abre. */
function Instrucoes({ aoFechar, topo }: { aoFechar: (naoMostrar: boolean) => void; topo: number }) {
  const [naoMostrar, setNaoMostrar] = useState(false);
  const caixa = { flex: 1, borderWidth: 2, borderStyle: 'dashed' as const, borderColor: cor.marca, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 10 };
  const t = { color: '#fff', fontFamily: fonte.negrito, fontSize: 18, textAlign: 'center' as const };
  return (
    <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.82)', padding: 12, paddingTop: topo + 8, gap: 10 }} onPress={() => aoFechar(naoMostrar)}>
      <View style={{ flexDirection: 'row', gap: 10, height: 70 }}>
        <View style={caixa}><Text style={t}>Toque no título: música anterior</Text></View>
        <View style={caixa}><Text style={t}>Toque aqui: próxima música</Text></View>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
        <View style={caixa}><Text style={t}>◀{'\n'}Voltar página</Text></View>
        <View style={caixa}><Text style={t}>▶{'\n'}Avançar página</Text></View>
      </View>
      <Text style={[s.texto, { textAlign: 'center' }]}>Lá embaixo: SAIR, no meio, fecha o leitor. O botão redondo, ao lado da hora, abre as opções: tom, fonte e a lista de músicas.</Text>
      <Text style={[s.texto, { textAlign: 'center' }]}>O pedal faz o mesmo que os toques: configure os botões em Início › Pedal.</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }}>
        <Caixa marcada={naoMostrar} aoMudar={setNaoMostrar} rotulo="Não mostrar de novo" />
        <Botao rotulo="Entendi" pequeno onPress={() => aoFechar(naoMostrar)} />
      </View>
    </Pressable>
  );
}

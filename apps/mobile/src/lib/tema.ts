// Cores e fontes das telas do app (o leitor usa as cores escolhidas nas Configurações).
// O app tem tema claro (o padrão) e escuro; o botão de sol/lua da tela inicial troca.
import 'expo-sqlite/localStorage/install';
import { createContext, useContext, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

const comum = {
  /** Barra de cima das telas, igual à do site (azul-marinho com a linha amarela). */
  barra: '#0b1d33',
  destaque: '#ffd23f',
  /** Texto apagado em cima da barra azul-marinho. */
  barraSuave: '#b3c2d6',
  marca: '#ff7a45',
  marcaEscura: '#e8590c',
  verde: '#2fb344',
  azul: '#0d6efd',
  ciano: '#17a2b8',
  perigo: '#e5484d',
  aviso: '#fff3cd',
  avisoTexto: '#664d03',
};

export const paletas = {
  claro: {
    ...comum,
    fundo: '#eef1f5',
    cartao: '#ffffff',
    topo: '#e2e7ee',
    linha: '#d6dde6',
    texto: '#0b1d33',
    suave: '#5c6b7e',
    /** Laranja para letras e ícones (mais escuro para ler no fundo claro). */
    realce: '#d9480f',
    bloco: '#d3f9d8',
    blocoTexto: '#2b8a3e',
    pausa: '#fff3bf',
    pausaTexto: '#8a6100',
  },
  escuro: {
    ...comum,
    fundo: '#1b1d1f',
    cartao: '#25282b',
    topo: '#2e3236',
    linha: '#3a3f44',
    texto: '#f1f1f1',
    suave: '#9aa0a6',
    realce: '#ff7a45',
    bloco: '#1f3d26',
    blocoTexto: '#8ce99a',
    pausa: '#2b2716',
    pausaTexto: '#ffd43b',
  },
};

export type NomeTema = keyof typeof paletas;
export type Cores = (typeof paletas)[NomeTema];

const CHAVE = 'palco-tema-v4';
const ouvintes = new Set<() => void>();
let atual: NomeTema = (() => {
  try { return localStorage.getItem(CHAVE) === 'escuro' ? 'escuro' : 'claro'; } catch { return 'claro'; }
})();

export function trocarTema(nome: NomeTema) {
  atual = nome;
  try { localStorage.setItem(CHAVE, nome); } catch { /* fica só até fechar o app */ }
  ouvintes.forEach(f => f());
}

const ouvir = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

/** Prende um pedaço do app num tema (o leitor fica sempre escuro). */
const Fixo = createContext<NomeTema | null>(null);
export const TemaFixo = Fixo.Provider;

export function useTema() {
  const escolhido = useSyncExternalStore(ouvir, () => atual);
  const nome = useContext(Fixo) ?? escolhido;
  return { nome, cor: paletas[nome] };
}

// No navegador, se a fonte não carregar, a cifra continua em fonte de largura fixa.
const reserva = (nome: string, outra: string) => (Platform.OS === 'web' ? `${nome}, ${outra}` : nome);
const sans = 'Roboto, system-ui, sans-serif';
const mono = 'ui-monospace, Menlo, Consolas, monospace';

export const fonte = {
  normal: reserva('Roboto_400Regular', sans),
  media: reserva('Roboto_500Medium', sans),
  negrito: reserva('Roboto_700Bold', sans),
  mono: reserva('RobotoMono_400Regular', mono),
  monoNegrito: reserva('RobotoMono_700Bold', mono),
  monoItalico: reserva('RobotoMono_400Regular_Italic', mono),
  logo: reserva('Rubik_800ExtraBold', 'Rubik, ' + sans),
};

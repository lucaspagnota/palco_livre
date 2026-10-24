// Cores e opções da tela de leitura, iguais no site (prévia) e no app.

export interface Cor { nome: string; valor: string }

export const CORES: Cor[] = [
  { nome: 'Preto', valor: '#000000' },
  { nome: 'Grafite', valor: '#6b6b6b' },
  { nome: 'Cinza', valor: '#dcdcdc' },
  { nome: 'Branco', valor: '#ffffff' },
  { nome: 'Laranja', valor: '#ff7a45' },
  { nome: 'Amarelo', valor: '#ffff00' },
  { nome: 'Verde', valor: '#3cb371' },
  { nome: 'Azul', valor: '#00bfff' },
  { nome: 'Vermelho', valor: '#ff4d4d' },
  { nome: 'Rosa', valor: '#ff79c6' },
  { nome: 'Azul-escuro', valor: '#0b1a33' },
  { nome: 'Creme', valor: '#fdf6e3' },
];

export type TipoRefrao = 'marcador' | 'colorido' | 'normal';

export interface Aparencia {
  fundo: string;
  letra: string;
  cifra: string;
  refrao: string;
  tablatura: string;
  voz2: string;
  anotacao: string;
  tipoRefrao: TipoRefrao;
}

export const APARENCIA_PADRAO: Aparencia = {
  fundo: '#000000',
  letra: '#ffffff',
  cifra: '#ff7a45',
  refrao: '#ffff00',
  tablatura: '#00bfff',
  voz2: '#3cb371',
  anotacao: '#6b6b6b',
  tipoRefrao: 'marcador',
};

/** Muda quando a aparência padrão muda, para atualizar quem ainda usa a cor antiga. */
export const VERSAO_CORES = 2;

/** Junta a aparência guardada no aparelho com o padrão. A letra era cinza até a versão 2 das cores; quem guardou antes passa a ver branco. */
export function aparenciaGuardada(guardada: Partial<Aparencia> | undefined, versao: number | undefined): Aparencia {
  const a = { ...APARENCIA_PADRAO, ...guardada };
  if ((versao ?? 1) < 2 && a.letra.toLowerCase() === '#dcdcdc') a.letra = APARENCIA_PADRAO.letra;
  return a;
}

export const TIPOS_REFRAO: { id: TipoRefrao; nome: string }[] = [
  { id: 'marcador', nome: 'Com marcador' },
  { id: 'colorido', nome: 'Letra colorida' },
  { id: 'normal', nome: 'Sem destaque' },
];

/** Tamanhos da fonte do leitor (1 a 5), em pontos de tela. */
export const TAMANHOS = [18, 22, 26, 30, 35];

export function nomeDaCor(valor: string) {
  return CORES.find(c => c.valor.toLowerCase() === valor.toLowerCase())?.nome ?? valor;
}

/** Cor e estilo de cada linha da tela. */
export function estiloDaLinha(kind: string, refrao: boolean, voz2: boolean, a: Aparencia) {
  switch (kind) {
    case 'chords':
    case 'key':
      return { cor: a.cifra, negrito: true, italico: false };
    case 'tab':
      return { cor: a.tablatura, negrito: false, italico: false };
    case 'note':
      return { cor: a.anotacao, negrito: false, italico: true };
    case 'title':
      return { cor: a.letra, negrito: true, italico: false };
    default:
      return {
        cor: voz2 ? a.voz2 : refrao && a.tipoRefrao === 'colorido' ? a.refrao : a.letra,
        negrito: false,
        italico: false,
      };
  }
}

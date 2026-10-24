// Tipos usados pelo site e pelo app.

export interface Perfil {
  id: string;
  nome: string;
  nick: string;
  email: string;
  uf: string;
}

export interface Musica {
  id: string;
  donoId: string;
  titulo: string;
  artista: string;
  estilo: string;
  tom: string;
  capo: number | null;
  letra: string;
  /** "Edição pública": quem recebe pelo grupo também pode editar. */
  publica: boolean;
  copias: number;
  atualizadoEm: string;
}

/** Uma linha do repertório: uma música, o título de um bloco (momento) ou uma pausa entre as músicas (ex.: ÁGUA). */
export interface ItemRepertorio {
  musicaId: string | null;
  momento: string | null;
  pausa?: string | null;
}

export interface Repertorio {
  id: string;
  donoId: string;
  titulo: string;
  estilo: string;
  /** Mostrar a numeração 1, 2, 3... */
  numerar: boolean;
  publica: boolean;
  copias: number;
  atualizadoEm: string;
  itens: ItemRepertorio[];
}

export interface RepertorioNoGrupo {
  repertorioId: string;
  adicionadoPor: string;
}

export interface Grupo {
  id: string;
  donoId: string;
  titulo: string;
  atualizadoEm: string;
  membros: string[];
  repertorios: RepertorioNoGrupo[];
}

export const ESTILOS = [
  'Axé', 'Blues', 'Bossa Nova', 'Católica', 'Country', 'Eletrônica', 'Forró', 'Funk', 'Gospel', 'Hino',
  'Infantil', 'Instrumental', 'Internacional', 'Jazz', 'MPB', 'Natal', 'Outro', 'Pagode', 'Pop', 'Reggae',
  'Rock', 'Romântica', 'Samba', 'Sertanejo',
];

export const TONS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm',
];

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** "Out/2026", como na coluna Revisão. */
export function revisao(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return MESES[d.getMonth()] + '/' + d.getFullYear();
}

/** Compara textos ignorando maiúsculas e acentos. */
export function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function porTitulo<T extends { titulo: string }>(a: T, b: T) {
  return a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base', numeric: true });
}

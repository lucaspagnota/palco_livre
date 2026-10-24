// Monta a cifra na tela do leitor: grade monoespaçada com N caracteres por linha
// e M linhas por página. Linhas compridas quebram junto com o acorde de cima,
// e um par acorde + letra nunca fica separado entre duas páginas.

import { flatsForKey } from './chords';
import { readSource, transposeSource, type SourceLine } from './texto';

export type RowKind = 'title' | 'key' | 'blank' | 'lyric' | 'chords' | 'label' | 'tab' | 'note';

export interface Row {
  kind: RowKind;
  text: string;
  refrao: boolean;
  voz2: boolean;
}

export interface SongHeader {
  title: string;
  key?: string | null;
  capo?: number | null;
}

export interface LayoutOptions {
  /** Caracteres por linha. */
  cols: number;
  /** Semitons de transposição só para a leitura. */
  steps?: number;
  /** "letra" esconde acordes e tablaturas. */
  show?: 'tudo' | 'letra';
  upperLyrics?: boolean;
  upperTitle?: boolean;
  /** Tom em que a música está sendo lida. Não aparece na tela: só escolhe entre # e b ao transpor. */
  key?: string | null;
  /** Título e tom no começo da primeira página. */
  header?: SongHeader | null;
}

const blankRow = (refrao = false, voz2 = false): Row => ({ kind: 'blank', text: '', refrao, voz2 });

function rowOf(line: SourceLine): Row {
  const kind: RowKind =
    line.kind === 'labelChords' ? 'chords' : line.kind === 'label' ? 'label' : line.kind;
  return { kind, text: line.text, refrao: line.refrao, voz2: line.voz2 };
}

/** Quebra um texto comum em palavras. */
function wrapWords(text: string, cols: number): string[] {
  if (text.length <= cols) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > cols) {
    let cut = rest.lastIndexOf(' ', cols);
    if (cut <= 0) cut = cols;
    out.push(rest.slice(0, cut).replace(/\s+$/, ''));
    rest = rest.slice(cut).replace(/^\s+/, '');
  }
  if (rest) out.push(rest);
  return out;
}

/** Quebra uma linha de acordes entre um acorde e outro. */
function wrapChords(text: string, cols: number): string[] {
  if (text.length <= cols) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > cols) {
    let cut = cols;
    while (cut > 0 && rest[cut] !== ' ' && rest[cut] !== undefined && rest[cut - 1] !== ' ') cut--;
    if (cut <= 0) cut = cols;
    out.push(rest.slice(0, cut).replace(/\s+$/, ''));
    rest = rest.slice(cut).replace(/^\s+/, '');
  }
  if (rest) out.push(rest);
  return out;
}

const leading = (s: string) => s.length - s.replace(/^\s+/, '').length;

/** Quebra um par acorde + letra no mesmo ponto, para o acorde continuar em cima da sílaba. */
function wrapPair(chords: string, lyric: string, cols: number): [string, string][] {
  const out: [string, string][] = [];
  let c = chords;
  let l = lyric;
  while (Math.max(c.length, l.length) > cols) {
    let cut = -1;
    for (let i = cols; i > Math.floor(cols / 3); i--) {
      const lyricOk = i >= l.length || l[i - 1] === ' ' || l[i] === ' ';
      const chordOk = i >= c.length || c[i - 1] === ' ' || c[i] === ' ';
      if (lyricOk && chordOk) { cut = i; break; }
    }
    if (cut < 0) cut = cols;
    out.push([c.slice(0, cut).replace(/\s+$/, ''), l.slice(0, cut).replace(/\s+$/, '')]);
    c = c.slice(cut);
    l = l.slice(cut);
    const rests = [c, l].filter(s => s.trim());
    const shift = rests.length ? Math.min(...rests.map(leading)) : 0;
    c = c.slice(shift);
    l = l.slice(shift);
    if (!c.trim() && !l.trim()) return out;
  }
  out.push([c.replace(/\s+$/, ''), l.replace(/\s+$/, '')]);
  return out;
}

/** Blocos de linhas que não podem ser separados entre páginas. */
export function layoutBlocks(source: string, opts: LayoutOptions): Row[][] {
  const cols = Math.max(8, Math.floor(opts.cols));
  const steps = opts.steps ?? 0;
  const text = steps ? transposeSource(source, steps, flatsForKey(opts.key ?? opts.header?.key ?? null)) : source;
  const lines = readSource(text).map(rowOf);
  const letra = opts.show === 'letra';
  const blocks: Row[][] = [];

  if (opts.header) {
    const title = opts.upperTitle ? opts.header.title.toUpperCase() : opts.header.title;
    if (title) for (const t of wrapWords(title, cols)) blocks.push([{ kind: 'title', text: t, refrao: false, voz2: false }]);
    const parts: string[] = [];
    if (opts.header.key) parts.push('Tom: ' + opts.header.key);
    if (opts.header.capo) parts.push('Capo ' + opts.header.capo + 'ª');
    if (parts.length && !letra) blocks.push([{ kind: 'key', text: parts.join('  '), refrao: false, voz2: false }]);
    blocks.push([blankRow()]);
  }

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i];
    if (letra && (row.kind === 'chords' || row.kind === 'tab')) continue;
    if (opts.upperLyrics && (row.kind === 'lyric' || row.kind === 'label')) row.text = row.text.toUpperCase();
    const next = lines[i + 1];
    if (!letra && row.kind === 'chords' && next && next.kind === 'lyric') {
      if (opts.upperLyrics) next.text = next.text.toUpperCase();
      // A linha inteira (com as quebras) fica junta na mesma página sempre que couber.
      blocks.push(wrapPair(row.text, next.text, cols).flatMap(([c, l]) =>
        c.trim() ? [{ ...row, text: c }, { ...next, text: l }] : [{ ...next, text: l }]));
      i++;
      continue;
    }
    if (row.kind === 'blank') {
      const last = blocks[blocks.length - 1];
      if (letra && last && last[last.length - 1].kind === 'blank') continue;
      blocks.push([row]);
      continue;
    }
    const pieces =
      row.kind === 'tab' ? chunk(row.text, cols) : row.kind === 'chords' ? wrapChords(row.text, cols) : wrapWords(row.text, cols);
    blocks.push(pieces.map(p => ({ ...row, text: p })));
  }
  while (blocks.length && blocks[blocks.length - 1][0].kind === 'blank') blocks.pop();
  return blocks;
}

function chunk(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out.length ? out : [''];
}

/** Todas as linhas em sequência (modo rolagem). */
export function layoutRows(source: string, opts: LayoutOptions): Row[] {
  return layoutBlocks(source, opts).flat();
}

/** Divide em páginas de `rows` linhas. */
export function paginate(blocks: Row[][], rows: number): Row[][] {
  const perPage = Math.max(3, Math.floor(rows));
  const pages: Row[][] = [];
  let page: Row[] = [];
  const flush = () => {
    // Título de parte sozinho no fim da página vai para a próxima.
    const carry: Row[] = [];
    while (page.length > 1 && (page[page.length - 1].kind === 'label' || page[page.length - 1].kind === 'blank')) {
      const r = page.pop()!;
      if (r.kind === 'label') carry.unshift(r);
    }
    pages.push(page);
    page = carry;
  };
  for (const block of blocks.flatMap(b => (b.length > perPage ? splitBlock(b) : [b]))) {
    if (block[0].kind === 'blank' && page.length === 0) continue;
    if (page.length + block.length > perPage && page.length > 0) flush();
    if (block[0].kind === 'blank' && page.length === 0) continue;
    page.push(...block);
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}

/** Bloco maior que a página: separa em pares cifra + letra (ou linhas soltas). */
function splitBlock(block: Row[]): Row[][] {
  const out: Row[][] = [];
  for (let i = 0; i < block.length; i++) {
    if (block[i].kind === 'chords' && block[i + 1]?.kind === 'lyric') { out.push([block[i], block[i + 1]]); i++; }
    else out.push([block[i]]);
  }
  return out;
}

/** Atalho: páginas prontas de uma música. */
export function layoutPages(source: string, opts: LayoutOptions & { rows: number }): Row[][] {
  return paginate(layoutBlocks(source, opts), opts.rows);
}

/**
 * Tamanho da grade para uma área de tela. `fontSize` é o tamanho escolhido;
 * os ajustes somam caracteres e linhas, como em "Ajustes de resolução".
 * A largura de um caractere monoespaçado é 0,6 do tamanho da fonte.
 */
export function gridFor(
  width: number,
  height: number,
  fontSize: number,
  adjust: { cols?: number; rows?: number } = {},
  lineHeight = 1.3,
) {
  const baseCols = Math.max(10, Math.floor(width / (fontSize * 0.6)));
  const cols = Math.max(10, baseCols + (adjust.cols ?? 0));
  // 2% de folga: algumas fontes monoespaçadas são um tiquinho mais largas que 0,6.
  const font = Math.min(fontSize * 1.6, (width / (cols * 0.6)) * 0.98);
  const baseRows = Math.max(4, Math.floor(height / (font * lineHeight)));
  const rows = Math.max(4, baseRows + (adjust.rows ?? 0));
  return { cols, rows, font, line: height / rows };
}

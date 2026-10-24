// Leitura do texto da "letra cifrada": cada linha do editor vira um tipo
// (acordes, letra, título de parte, tablatura...). O texto é monoespaçado:
// o acorde fica na mesma coluna da sílaba, como em qualquer site de cifras.

import { parseChord, transposeChord } from './chords';

export type LineKind =
  | 'blank'
  | 'lyric' // letra
  | 'chords' // só acordes, incluindo "( C Am7 G )" e "| G | D |"
  | 'label' // [Primeira Parte]
  | 'labelChords' // [Intro] C Am7 G
  | 'tab' // e|---3---|
  | 'note'; // // anotação

export interface SourceLine {
  kind: LineKind;
  text: string;
  /** Dentro de um bloco {refrão}. */
  refrao: boolean;
  /** Dentro de um bloco {2ª voz}. */
  voz2: boolean;
}

// Marcadores colocados pelos botões "Refrão" e "2ª Voz" do editor, sempre em linha própria.
export const MARK = {
  refraoStart: '{refrão}',
  refraoEnd: '{/refrão}',
  voz2Start: '{2ª voz}',
  voz2End: '{/2ª voz}',
};

const REFRAO_START = /^\s*\{\s*(refr[aã]o|r)\s*\}\s*$/i;
const REFRAO_END = /^\s*\{\s*\/\s*(refr[aã]o|r)\s*\}\s*$/i;
const VOZ2_START = /^\s*\{\s*(2[ªa]?\s*voz|segunda\s+voz|2v)\s*\}\s*$/i;
const VOZ2_END = /^\s*\{\s*\/\s*(2[ªa]?\s*voz|segunda\s+voz|2v)\s*\}\s*$/i;

/**
 * Texto colado de outros sites e aplicativos às vezes vem com espaços diferentes do comum e caracteres invisíveis.
 * Eles viram espaço comum (ou somem), para o acorde continuar sendo reconhecido e ficar na coluna certa.
 */
export function limparTexto(texto: string) {
  return texto
    .replace(/\r\n?|[\u2028\u2029\u0085\v\f]/g, '\n')
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u2800\u3000]/g, ' ')
    .replace(/[\u00ad\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g, '');
}

export function expandTabs(text: string) {
  let out = '';
  for (const c of text) out += c === '\t' ? ' '.repeat(8 - (out.length % 8)) : c;
  return out;
}

/** Tira parênteses e barras em volta de um acorde: "(C", "G)", "|D|". */
function bareChord(token: string): { chord: string; lead: number } | null {
  const m = /^([|([]*)(.+?)([|)\],.]*)$/.exec(token);
  if (!m || !parseChord(m[2])) return null;
  return { chord: m[2], lead: m[1].length };
}

// Pedaços que podem aparecer numa linha de acordes sem ser acorde.
const FILLER = /^(?:[|/\\\-–—.:()[\]~*>]+|\(?\d{1,2}\s*[xX×]\)?|\(?[xX×]\s*\d{1,2}\)?|N\.?C\.?)$/;

export function isTabLine(text: string) {
  if (/^\s*(?:afina[cç][aã]o|tuning)\s*[:=]/i.test(text)) return true;
  const words = text.trim().split(/\s+/);
  if (words.some(w => bareChord(w)) && words.every(w => FILLER.test(w) || bareChord(w))) return false;
  return /^\s*(?:[A-Ga-g][#b]?|\d{1,2})?\s*[|:]\s*[-–—\dxXhHpPbBrRsStT/\\~()=<>.*^|:]+\s*$/.test(text) && /[-–—]{2}/.test(text);
}

/** Acordes de uma linha só de acordes, com a coluna de cada um. null se a linha não for de acordes. */
export function chordsOf(text: string): { chord: string; col: number }[] | null {
  if (!text.trim() || isTabLine(text)) return null;
  const body = expandTabs(text);
  const out: { chord: string; col: number }[] = [];
  for (const w of body.matchAll(/\S+/g)) {
    const tok = bareChord(w[0]);
    if (tok) { out.push({ chord: tok.chord, col: (w.index ?? 0) + tok.lead }); continue; }
    if (FILLER.test(w[0])) continue;
    return null;
  }
  return out.length ? out : null;
}

function labelOf(text: string): { label: string; rest: string } | null {
  const m = /^\s*\[([^\]\r\n]+)\](.*)$/.exec(text);
  if (!m || parseChord(m[1].trim())) return null;
  return { label: m[1].trim(), rest: m[2] };
}

/** Classifica cada linha do texto. Os marcadores de refrão e 2ª voz somem e viram atributos. */
export function readSource(source: string): SourceLine[] {
  const out: SourceLine[] = [];
  let refrao = false;
  let voz2 = false;
  for (const raw of limparTexto(source).split('\n')) {
    if (REFRAO_START.test(raw)) { refrao = true; continue; }
    if (REFRAO_END.test(raw)) { refrao = false; continue; }
    if (VOZ2_START.test(raw)) { voz2 = true; continue; }
    if (VOZ2_END.test(raw)) { voz2 = false; continue; }
    const text = expandTabs(raw).replace(/\s+$/, '');
    let kind: LineKind;
    if (!text.trim()) kind = 'blank';
    else if (/^\s*\/\//.test(text)) kind = 'note';
    else if (isTabLine(text)) kind = 'tab';
    else {
      const label = labelOf(text);
      if (label) kind = label.rest.trim() && chordsOf(label.rest) ? 'labelChords' : 'label';
      else kind = chordsOf(text) ? 'chords' : 'lyric';
    }
    out.push({ kind, text: kind === 'note' ? text.replace(/^\s*\/\/\s?/, '') : text, refrao, voz2 });
  }
  return out;
}

/** Todos os acordes usados, na ordem em que aparecem, sem repetir. */
export function listChords(source: string): string[] {
  const seen = new Set<string>();
  for (const line of readSource(source)) {
    const text = line.kind === 'labelChords' ? labelOf(line.text)!.rest : line.text;
    if (line.kind === 'chords' || line.kind === 'labelChords') {
      for (const c of chordsOf(text) ?? []) seen.add(c.chord);
    }
  }
  return [...seen];
}

/** Troca os acordes de uma linha mantendo as colunas sempre que houver espaço. */
function transposeLine(line: string, t: (c: string) => string) {
  let out = '';
  let debt = 0;
  for (const part of line.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      const keep = Math.max(1, part.length - debt);
      debt -= part.length - keep;
      out += ' '.repeat(keep);
      continue;
    }
    const tok = bareChord(part);
    if (!tok) { out += part; continue; }
    const next = t(tok.chord);
    debt += next.length - tok.chord.length;
    const replaced = part.slice(0, tok.lead) + next + part.slice(tok.lead + tok.chord.length);
    if (debt < 0) { out += replaced + ' '.repeat(-debt); debt = 0; }
    else out += replaced;
  }
  return out.replace(/\s+$/, '');
}

/**
 * Transpõe o próprio texto da cifra (botões "- Tom" e "+ Tom"),
 * mantendo cada acorde em cima da mesma sílaba. Letra, tablatura e anotações não mudam.
 */
export function transposeSource(source: string, steps: number, preferFlats?: boolean): string {
  if (!steps) return source;
  const t = (c: string) => transposeChord(c, steps, preferFlats);
  return limparTexto(source).split('\n').map(raw => {
    const text = expandTabs(raw);
    if (!text.trim() || /^\s*\/\//.test(text) || isTabLine(text)) return raw;
    const label = labelOf(text);
    if (label) {
      if (!label.rest.trim() || !chordsOf(label.rest)) return raw;
      const head = text.slice(0, text.length - label.rest.length);
      return head + transposeLine(label.rest, t);
    }
    return chordsOf(text) ? transposeLine(text, t) : raw;
  }).join('\n');
}

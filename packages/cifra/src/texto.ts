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

/**
 * Acorde dentro de um pedaço de texto sem espaço, com o que estiver em volta:
 * "(C", "G)", "|D|", "F#m7(11)", "A#7(4))". Os parênteses do próprio acorde ficam com ele.
 */
function bareChord(token: string): { chord: string; lead: number } | null {
  const lead = /^[|([]*/.exec(token)![0].length;
  // Tenta primeiro o pedaço inteiro e vai tirando do fim só o que não pode ser parte do acorde.
  for (let end = token.length; end > lead; end--) {
    if (end < token.length && !/[|)\],.]/.test(token[end])) break;
    const chord = token.slice(lead, end);
    if (parseChord(chord)) return { chord, lead };
  }
  return null;
}

/**
 * Acordes grudados sem espaço: "A#7(4)A#7" ou "C/G)F". Só quando o pedaço tem número, sustenido,
 * bemol, barra ou parênteses, para palavras como "DADA" ou "Ebe" não virarem acordes.
 */
function gluedChords(token: string): { chord: string; at: number }[] | null {
  if (!/[\d#♯♭()/º°+]/.test(token)) return null;
  const lead = /^[|([]*/.exec(token)![0].length;
  const trail = /[|)\],.]*$/.exec(token.slice(lead))![0].length;
  const core = token.slice(lead, token.length - trail);
  // Divide do maior pedaço para o menor ("C7M" antes de "C7" + "M"); cada pedaço começa numa nota de A a G.
  const split = (from: number): { chord: string; at: number }[] | null => {
    if (from === core.length) return [];
    for (let end = core.length; end > from; end--) {
      if (end < core.length && !/[A-G]/.test(core[end])) continue;
      const chord = core.slice(from, end);
      if (!parseChord(chord)) continue;
      const rest = split(end);
      if (rest) return [{ chord, at: lead + from }, ...rest];
    }
    return null;
  };
  const parts = /^[A-G]/.test(core) ? split(0) : null;
  return parts && parts.length > 1 ? parts : null;
}

// Pedaços que podem aparecer numa linha de acordes sem ser acorde: barras, "2x", "x3", "N.C.", "bis".
const FILLER = /^(?:[|/\\\-–—.:()[\]~*>]+|\(?\d{1,2}\s*[xX×]\)?|\(?[xX×]\s*\d{1,2}\)?|N\.?C\.?|bis)$/i;

// Palavras de anotação comuns entre parênteses ou colchetes no meio dos acordes: "(riff 1)", "[Frase 4]", "(2x)".
const ANOTACAO = /^(?:\d{1,2}\s*[xX×]|[xX×]\s*\d{1,2}|riff|frase|solo|bis|repete|repetir|volta|base|intro|final|fim|ponte|refr[aã]o|pausa|para|breque|break|levada|dedilhado|arpejo|batida|palhetada|abafado|baixo|bateria|teclado|guitarra|viol[aã]o|voz|vocal|tutti|fade|ritornelo|segue|continua|\d)/i;

/**
 * Anotações entre parênteses ou colchetes numa linha de acordes ("Bm   (riff 1)", "Fm[Frase 4]", "C# (Frase 6)").
 * Viram espaço na hora de achar os acordes, para não deixarem a linha inteira virar letra.
 * Parênteses só com acordes dentro ("( C  A  G )", "(Bb F)") continuam sendo acordes.
 */
function semAnotacoes(text: string): { text: string; tirou: boolean } {
  let tirou = false;
  const out = text.replace(/\(([^()]*)\)|\[([^\]]*)\]/g, (all, par: string | undefined, col: string | undefined, at: number) => {
    const inner = (par ?? col ?? '').trim();
    if (!inner) return all;
    // Grudado no acorde, "(11)", "(4)", "(9/13)", "(b5)", "(add9)" é parte dele. Anotação grudada tem palavra: "Fm[Frase 4]".
    if (at > 0 && /\S/.test(text[at - 1]) && !/[A-Za-zÀ-ÿ]{3,}/.test(inner.replace(/add|sus|dim|aug|maj|omit|min/gi, '')) && !/^\d{1,2}\s*[xX×]$/.test(inner)) return all;
    const words = inner.split(/[\s/,-]+/).filter(Boolean);
    if (words.every(w => bareChord(w) || gluedChords(w) || FILLER.test(w))) return all;
    if (inner.length > 24 || words.length > 4 || !/[A-Za-zÀ-ÿ]/.test(inner) && !/^\d/.test(inner)) return all;
    tirou = true;
    return ' '.repeat(all.length);
  });
  return { text: out, tirou };
}

// Acordes que também são palavras comuns em português ("E" e "A"). Com só eles na linha, a anotação
// entre parênteses precisa ser uma das conhecidas, para "E (eu te amo)" continuar sendo letra.
const PALAVRA = /^[AE]$/;

/** Acha os acordes de uma linha sem olhar se é tablatura. */
function scanChords(text: string): { chord: string; col: number }[] | null {
  const body = expandTabs(text);
  const { text: limpo, tirou } = semAnotacoes(body);
  const out: { chord: string; col: number }[] = [];
  for (const w of limpo.matchAll(/\S+/g)) {
    const at = w.index ?? 0;
    const tok = bareChord(w[0]);
    if (tok) { out.push({ chord: tok.chord, col: at + tok.lead }); continue; }
    if (FILLER.test(w[0])) continue;
    const glued = gluedChords(w[0]);
    if (glued) { for (const g of glued) out.push({ chord: g.chord, col: at + g.at }); continue; }
    return null;
  }
  if (!out.length) return null;
  if (tirou && out.every(c => PALAVRA.test(c.chord))) {
    for (const g of body.matchAll(/\(([^()]*)\)|\[([^\]]*)\]/g)) {
      const inner = (g[1] ?? g[2] ?? '').trim();
      if (limpo.slice(g.index, (g.index ?? 0) + g[0].length).trim() === '' && !ANOTACAO.test(inner)) return null;
    }
  }
  return out;
}

export function isTabLine(text: string) {
  if (/^\s*(?:afina[cç][aã]o|tuning)\s*[:=]/i.test(text)) return true;
  if (scanChords(text)) return false;
  return /^\s*(?:[A-Ga-g][#b]?|\d{1,2})?\s*[|:]\s*[-–—\dxXhHpPbBrRsStT/\\~()=<>.*^|:]+\s*$/.test(text) && /[-–—]{2}/.test(text);
}

/** Acordes de uma linha só de acordes, com a coluna de cada um. null se a linha não for de acordes. */
export function chordsOf(text: string): { chord: string; col: number }[] | null {
  if (!text.trim() || isTabLine(text)) return null;
  return scanChords(text);
}

// Nomes de parte que às vezes vêm sem colchete e sem dois-pontos: "Intro Am F C G".
const PARTE = /^(?:intro(?:du[cç][aã]o)?|solo|riff|final|ponte|refr[aã]o|pr[eé]-?refr[aã]o|interl[uú]dio|base|outro|coda|passagem|levada|dedilhado)$/i;
// Linhas com dois-pontos que continuam sendo texto comum. "Tom: A" não está aqui: o tom escrito na letra
// fica laranja como os acordes e muda junto quando a música é transposta.
const NAO_E_PARTE = /^(?:capo(?:traste)?|afina[cç][aã]o|tuning)$/i;

/**
 * Título de parte no começo da linha, com os acordes que vierem depois:
 * "[Intro] Am F", "Intro: Am F C G", "Primeira Parte:" e "Solo Am G".
 * `rest` é sempre o fim da própria linha (o que vem depois do título).
 */
function labelOf(text: string): { label: string; rest: string } | null {
  const m = /^\s*\[([^\]\r\n]+)\](.*)$/.exec(text);
  if (m) return parseChord(m[1].trim()) ? null : { label: m[1].trim(), rest: m[2] };
  const c = /^\s*([^\s:[\]|(/][^:[\]|]{0,28}?)\s*:(.*)$/.exec(text);
  if (c) {
    const label = c[1].trim();
    if (/[A-Za-zÀ-ÿ]/.test(label) && !parseChord(label) && !NAO_E_PARTE.test(label)) {
      // Com acordes depois ("Intro: Am F"), ou sozinho e curto ("Primeira Parte:").
      if (c[2].trim() ? chordsOf(c[2]) : label.split(/\s+/).length <= 4) return { label, rest: c[2] };
    }
  }
  const w = /^\s*(\S+)(\s.*)$/.exec(text);
  if (w && PARTE.test(w[1]) && chordsOf(w[2])) return { label: w[1], rest: w[2] };
  return null;
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
  const text = expandTabs(line);
  const chords = scanChords(text);
  if (!chords) return line;
  let out = '';
  let debt = 0; // quantos caracteres a linha andou para a direita (negativo: para a esquerda)
  let pos = 0;
  // O espaço entre um acorde e outro encolhe ou cresce para o próximo acorde voltar à coluna dele.
  const copy = (piece: string) => {
    for (const part of piece.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part) && out.length) {
        const keep = Math.max(1, part.length - debt);
        debt -= part.length - keep;
        out += ' '.repeat(keep);
      } else out += part;
    }
  };
  for (const c of chords) {
    copy(text.slice(pos, c.col));
    const next = t(c.chord);
    out += next;
    debt += next.length - c.chord.length;
    pos = c.col + c.chord.length;
  }
  copy(text.slice(pos));
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

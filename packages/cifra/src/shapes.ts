// Desenhos de acordes para violão/guitarra (afinação padrão).
// Cordas da 6ª (Mi grave) para a 1ª (Mi agudo); -1 = não tocar, 0 = solta.

import { notePitch, parseChord, mod12 } from './chords';

export interface ChordShape {
  name: string;
  /** Casa absoluta em cada corda, da 6ª para a 1ª. */
  frets: number[];
  /** Primeira casa mostrada no desenho. */
  baseFret: number;
  /** true quando o desenho ignora parte do acorde (ex.: 9ª ou baixo diferente). */
  simplified: boolean;
}

type Quality = '' | 'm' | '7' | 'm7' | 'maj7' | 'sus4' | 'sus2' | 'dim' | 'm7b5' | '6' | 'm6';

const X = -1;
const OPEN: Record<string, number[]> = {
  C: [X, 3, 2, 0, 1, 0], D: [X, X, 0, 2, 3, 2], G: [3, 2, 0, 0, 0, 3], Dm: [X, X, 0, 2, 3, 1],
  C7: [X, 3, 2, 3, 1, 0], D7: [X, X, 0, 2, 1, 2], G7: [3, 2, 0, 0, 0, 1], B7: [X, 2, 1, 2, 0, 2],
  Cmaj7: [X, 3, 2, 0, 0, 0], Dm7: [X, X, 0, 2, 1, 1], Dmaj7: [X, X, 0, 2, 2, 2], Fmaj7: [X, X, 3, 2, 1, 0],
  Dsus4: [X, X, 0, 2, 3, 3], Dsus2: [X, X, 0, 2, 3, 0], Asus2: [X, 0, 2, 2, 0, 0], C6: [X, 3, 2, 2, 1, 0],
  'D/F#': [2, X, 0, 2, 3, 2], 'G/B': [X, 2, 0, 0, 0, 3], 'C/E': [0, 3, 2, 0, 1, 0], 'C/G': [3, 3, 2, 0, 1, 0],
  'A/C#': [X, 4, 2, 2, 2, 0], 'Am/G': [3, 0, 2, 2, 1, 0], 'Em/D': [X, X, 0, 0, 0, 0], 'D/A': [X, 0, 0, 2, 3, 2],
  'F/C': [X, 3, 3, 2, 1, 1], 'E/G#': [4, X, 2, 1, 0, 0], 'Am/C': [X, 3, 2, 2, 1, 0],
};

// Formas móveis: deslocamento a partir da casa da fundamental.
const E_SHAPE: Partial<Record<Quality, number[]>> = {
  '': [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, X, 1, 1, 0, X], sus4: [0, 2, 2, 2, 0, 0],
};
const A_SHAPE: Partial<Record<Quality, number[]>> = {
  '': [X, 0, 2, 2, 2, 0], m: [X, 0, 2, 2, 1, 0], '7': [X, 0, 2, 0, 2, 0], m7: [X, 0, 2, 0, 1, 0],
  maj7: [X, 0, 2, 1, 2, 0], sus4: [X, 0, 2, 2, 3, 0], sus2: [X, 0, 2, 2, 0, 0], dim: [X, 0, 1, 2, 1, X],
  m7b5: [X, 0, 1, 0, 1, X], '6': [X, 0, 2, 2, 2, 2], m6: [X, 0, 2, 2, 1, 2],
};

function quality(suffix: string): { q: Quality; simplified: boolean } {
  const s = suffix.replace(/[()]/g, '').replace('min', 'm').replace('♭', 'b');
  const table: [RegExp, Quality][] = [
    [/^(m7b5|ø7?)$/, 'm7b5'], [/^(dim7?|°7?|º7?)$/, 'dim'], [/^(maj7|7M|M7|7\+|Δ7?)/, 'maj7'],
    [/^m7/, 'm7'], [/^m6/, 'm6'], [/^m/, 'm'], [/^sus2/, 'sus2'], [/^(sus4?|4)$/, 'sus4'],
    [/^7/, '7'], [/^6/, '6'], [/^9$/, '7'],
  ];
  for (const [re, q] of table) {
    if (re.test(s)) {
      const exact = s.replace(re, '') === '' && !/^9$/.test(s);
      return { q, simplified: !exact };
    }
  }
  return { q: '', simplified: s !== '' };
}

function withBase(name: string, frets: number[], simplified: boolean): ChordShape {
  const pressed = frets.filter(f => f > 0);
  const max = pressed.length ? Math.max(...pressed) : 0;
  const min = pressed.length ? Math.min(...pressed) : 1;
  return { name, frets, baseFret: max > 4 ? min : 1, simplified };
}

/** Desenho de violão para um acorde, ou null se não for possível montar. */
export function guitarShape(chord: string): ChordShape | null {
  const parts = parseChord(chord.replace('♯', '#').replace('♭', 'b'));
  if (!parts) return null;
  const pitch = notePitch(parts.root);
  if (pitch === null) return null;
  const { q, simplified } = quality(parts.suffix);
  const sharpName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pitch];
  const flatName = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][pitch];
  if (parts.bass) {
    for (const r of [sharpName, flatName]) {
      const key = r + q + '/' + parts.bass;
      if (OPEN[key]) return withBase(chord, OPEN[key], simplified);
    }
  }
  for (const r of [sharpName, flatName]) {
    if (OPEN[r + q]) return withBase(chord, OPEN[r + q], simplified || !!parts.bass);
  }
  const options: number[][] = [];
  const e = E_SHAPE[q];
  const a = A_SHAPE[q];
  if (e) options.push(e.map(v => (v < 0 ? X : v + mod12(pitch - 4))));
  if (a) options.push(a.map(v => (v < 0 ? X : v + mod12(pitch - 9))));
  if (!options.length) return null;
  const lowest = (f: number[]) => Math.max(...f);
  options.sort((x, y) => lowest(x) - lowest(y));
  return withBase(chord, options[0], simplified || !!parts.bass);
}

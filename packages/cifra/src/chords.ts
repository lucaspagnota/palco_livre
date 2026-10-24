// Acordes: reconhecer, transpor e escrever notas.

const ROOT_PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
// Grafia mais comum no Brasil para cada altura quando não há preferência.
const COMMON = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

const SUFFIX = /^(?:maj|min|dim|aug|sus|add|omit|no|m|M|Δ|ø|°|º|\+|-|\d{1,2}|[#b♯♭]\d{1,2}|[(),/])+$/;

export interface ChordParts {
  root: string;
  suffix: string;
  bass: string | null;
}

export const mod12 = (n: number) => ((n % 12) + 12) % 12;

export function notePitch(note: string): number | null {
  const m = /^([A-G])([#b♯♭]?)$/.exec(note);
  if (!m) return null;
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
  return mod12(ROOT_PITCH[m[1]] + acc);
}

function balanced(s: string) {
  let depth = 0;
  for (const c of s) {
    if (c === '(') depth++;
    if (c === ')' && --depth < 0) return false;
  }
  return depth === 0;
}

/** Separa um acorde em fundamental, complemento e baixo. Retorna null se não for acorde. */
export function parseChord(value: string): ChordParts | null {
  if (!value || /\s/.test(value)) return null;
  const m = /^([A-G][#b♯♭]?)(.*)$/.exec(value);
  if (!m) return null;
  let suffix = m[2];
  let bass: string | null = null;
  const slash = /\/([A-G][#b♯♭]?)$/.exec(suffix);
  if (slash) {
    bass = slash[1];
    suffix = suffix.slice(0, slash.index);
  }
  if (suffix) {
    if (!SUFFIX.test(suffix) || !balanced(suffix)) return null;
    if (!/[a-zA-Z0-9Δø°º+-]/.test(suffix)) return null;
    if (/^\/|\/$|\/\//.test(suffix)) return null;
    if (/m{2,}|M{2,}/.test(suffix)) return null;
  }
  return { root: m[1], suffix, bass };
}

export const isChord = (value: string) => parseChord(value) !== null;

export function spell(pitch: number, preferFlats?: boolean) {
  const p = mod12(pitch);
  if (preferFlats === true) return FLATS[p];
  if (preferFlats === false) return SHARPS[p];
  return COMMON[p];
}

function shiftNote(note: string, steps: number, preferFlats?: boolean) {
  const p = notePitch(note);
  if (p === null) return note;
  let out = spell(p + steps, preferFlats);
  if (note.includes('♯') || note.includes('♭')) out = out.replace('#', '♯').replace('b', '♭');
  return out;
}

/** Transpõe um acorde. Texto que não é acorde volta igual. */
export function transposeChord(chord: string, steps: number, preferFlats?: boolean): string {
  if (!Number.isInteger(steps)) throw new Error('A transposição precisa ser um número inteiro de semitons.');
  const parts = parseChord(chord);
  if (!parts || mod12(steps) === 0) return chord;
  const root = shiftNote(parts.root, steps, preferFlats);
  const bass = parts.bass ? '/' + shiftNote(parts.bass, steps, preferFlats) : '';
  return root + parts.suffix + bass;
}

/** Transpõe um tom como "G", "F#m" ou "D menor". */
export function transposeKey(key: string, steps: number): string {
  const m = /^(\s*)([A-G][#b♯♭]?)(m|\s+(?:maior|menor|major|minor))?(\s*)$/.exec(key);
  if (!m) return key;
  const target = mod12((notePitch(m[2].replace('♯', '#').replace('♭', 'b')) ?? 0) + steps);
  const minor = m[3] === 'm' || /menor|minor/.test(m[3] ?? '');
  return m[1] + keyName(target, minor) + (m[3] ?? '') + m[4];
}

/** Nome usual da tônica de um tom: Bb, Eb e Ab em maior; Bbm e Ebm em menor; o resto com sustenido. */
export function keyName(pitch: number, minor: boolean): string {
  const p = mod12(pitch);
  const flats = minor ? p === 10 || p === 3 : p === 10 || p === 3 || p === 8;
  return spell(p, flats);
}

/** Grafia preferida para os acordes de uma música no tom indicado. */
export function flatsForKey(key: string | null | undefined): boolean | undefined {
  const parts = key ? parseChord(key.trim()) : null;
  if (!parts) return undefined;
  const p = notePitch(parts.root.replace('♯', '#').replace('♭', 'b'));
  if (p === null) return undefined;
  const minor = /^m(?!aj)/.test(parts.suffix);
  return minor ? [10, 3, 5, 0, 7].includes(p) : [5, 10, 3, 8, 1].includes(p) && parts.root !== 'C#';
}

/** Distância em semitons de um tom para outro (0 a 11). */
export function semitonesBetween(from: string, to: string): number | null {
  const a = parseChord(from);
  const b = parseChord(to);
  if (!a || !b) return null;
  const pa = notePitch(a.root.replace('♯', '#').replace('♭', 'b'));
  const pb = notePitch(b.root.replace('♯', '#').replace('♭', 'b'));
  if (pa === null || pb === null) return null;
  return mod12(pb - pa);
}

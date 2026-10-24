// Desenhos de acordes para violão, cavaquinho e ukulele.
// O violão usa a tabela de formas conhecidas; os outros instrumentos procuram
// a posição mais baixa que tenha todas as notas do acorde.

import { mod12, notePitch, parseChord } from './chords';
import { guitarShape, type ChordShape } from './shapes';

export type Instrumento = 'violao' | 'cavaco' | 'ukulele';

export const INSTRUMENTOS: { id: Instrumento; nome: string; afinacao: number[] }[] = [
  { id: 'violao', nome: 'Violão/Guitarra', afinacao: [4, 9, 2, 7, 11, 4] }, // E A D G B E
  { id: 'cavaco', nome: 'Cavaco', afinacao: [2, 7, 11, 2] }, // D G B D
  { id: 'ukulele', nome: 'Ukulele', afinacao: [7, 0, 4, 9] }, // G C E A
];

/** Notas (em semitons a partir da fundamental) de um acorde cifrado. */
export function chordIntervals(suffix: string): number[] {
  let s = suffix.replace(/[()]/g, '').replace(/♭/g, 'b').replace(/♯/g, '#');
  const set = new Set<number>([0]);
  let third = 4;
  let fifth = 7;
  if (/^(m(?!aj)|min|-)/.test(s)) { third = 3; s = s.replace(/^(min|m|-)/, ''); }
  if (/^(dim|°|º)/.test(s)) { third = 3; fifth = 6; if (/7/.test(s)) set.add(9); s = s.replace(/^(dim|°|º)7?/, ''); }
  if (/^(ø)/.test(s)) { third = 3; fifth = 6; set.add(10); s = s.slice(1).replace(/^7/, ''); }
  if (/^(aug|\+)/.test(s)) { fifth = 8; s = s.replace(/^(aug|\+)/, ''); }
  if (/sus2/.test(s)) third = 2;
  else if (/sus4?|(^|[^\d])4/.test(s)) third = 5;
  if (/(7M|maj7|M7|Δ|7\+)/.test(s)) set.add(11);
  else if (/(^|[^\d])(7|9|11|13)/.test(s) && !/add/.test(s)) set.add(10);
  if (/(^|[^#b\d])6/.test(s)) set.add(9);
  if (/(^|[^#b\d1])9|add9|add2/.test(s)) set.add(2);
  if (/b9/.test(s)) set.add(1);
  if (/#9/.test(s)) set.add(3);
  if (/(^|[^#b\d])11/.test(s)) set.add(5);
  if (/#11/.test(s)) set.add(6);
  if (/(^|[^#b\d])13/.test(s)) set.add(9);
  if (/b5|-5/.test(s)) fifth = 6;
  if (/#5|\+5/.test(s)) fifth = 8;
  set.add(third);
  set.add(fifth);
  return [...set];
}

function search(chord: string, afinacao: number[]): ChordShape | null {
  const parts = parseChord(chord.replace('♯', '#').replace('♭', 'b'));
  if (!parts) return null;
  const root = notePitch(parts.root);
  if (root === null) return null;
  const tones = chordIntervals(parts.suffix).map(i => mod12(root + i));
  // Com 4 cordas, a quinta pode sair quando o acorde tem muitas notas.
  const required = tones.length > afinacao.length ? tones.filter(t => t !== mod12(root + 7)) : tones;
  let best: { frets: number[]; score: number } | null = null;
  for (let base = 0; base <= 9; base++) {
    const options = afinacao.map(open => {
      const list: number[] = [];
      for (let f = base === 0 ? 0 : base; f <= base + 3; f++) if (tones.includes(mod12(open + f))) list.push(f);
      if (base > 0 && tones.includes(open % 12)) list.push(0);
      return list;
    });
    if (options.some(o => !o.length)) continue;
    const walk = (i: number, acc: number[]) => {
      if (i === afinacao.length) {
        const notes = new Set(acc.map((f, k) => mod12(afinacao[k] + f)));
        if (!required.every(t => notes.has(t))) return;
        const pressed = acc.filter(f => f > 0);
        const span = pressed.length ? Math.max(...pressed) - Math.min(...pressed) : 0;
        if (span > 3) return;
        const score = Math.max(0, ...pressed) * 3 + pressed.length + span + (mod12(afinacao[0] + acc[0]) === root ? 0 : 1);
        if (!best || score < best.score) best = { frets: [...acc], score };
        return;
      }
      for (const f of options[i]) { acc.push(f); walk(i + 1, acc); acc.pop(); }
    };
    walk(0, []);
    if (best) break;
  }
  if (!best) return null;
  const frets = (best as { frets: number[] }).frets;
  const pressed = frets.filter(f => f > 0);
  const max = pressed.length ? Math.max(...pressed) : 0;
  const min = pressed.length ? Math.min(...pressed) : 1;
  return { name: chord, frets, baseFret: max > 4 ? min : 1, simplified: tones.length > required.length };
}

/** Desenho do acorde no instrumento escolhido. `canhoto` espelha as cordas. */
export function chordShape(chord: string, instrumento: Instrumento = 'violao', canhoto = false): ChordShape | null {
  const afinacao = INSTRUMENTOS.find(i => i.id === instrumento)!.afinacao;
  const shape = instrumento === 'violao' ? guitarShape(chord) ?? search(chord, afinacao) : search(chord, afinacao);
  if (!shape) return null;
  return canhoto ? { ...shape, frets: [...shape.frets].reverse() } : shape;
}

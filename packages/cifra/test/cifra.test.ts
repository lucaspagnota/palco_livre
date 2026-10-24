import { describe, expect, it } from 'vitest';
import {
  chordShape, chordsOf, gridFor, isTabLine, layoutBlocks, layoutPages, listChords, paginate, readSource, transposeChord,
  transposeSource, chordIntervals, passosDoShow, layoutRows,
} from '../src';
import { DEMO_MUSICAS } from '../src/demo';

describe('leitura do texto', () => {
  it('reconhece cada tipo de linha', () => {
    const lines = readSource(`[Intro] C  Am7  G
[Primeira Parte]
        C
A minha vida
( C  Am7  G )
| G | D | 2x
e|---3---2---|
// entra a bateria

{refrão}
F9  G9
      Eu quero sempre mais
{/refrão}
{2ª voz}
Segunda voz
{/2ª voz}`);
    expect(lines.map(l => l.kind)).toEqual([
      'labelChords', 'label', 'chords', 'lyric', 'chords', 'chords', 'tab', 'note', 'blank', 'chords', 'lyric', 'lyric',
    ]);
    expect(lines[9].refrao && lines[10].refrao).toBe(true);
    expect(lines[11].voz2).toBe(true);
    expect(lines[7].text).toBe('entra a bateria');
  });

  it('não confunde letra com acorde', () => {
    expect(chordsOf('A minha vida')).toBeNull();
    expect(chordsOf('E os meus sonhos')).toBeNull();
    expect(chordsOf('Em  C  G')).toEqual([{ chord: 'Em', col: 0 }, { chord: 'C', col: 4 }, { chord: 'G', col: 7 }]);
    expect(isTabLine('| G | D |')).toBe(false);
  });

  it('lista os acordes sem repetir', () => {
    expect(listChords('[Intro] C Am7 G\nC  F9\nletra\n( C  G )')).toEqual(['C', 'Am7', 'G', 'F9']);
  });
});

describe('transposição', () => {
  it('mantém a coluna dos acordes', () => {
    const src = 'C       G\nEu quero sempre mais';
    const out = transposeSource(src, 2);
    expect(out).toBe('D       A\nEu quero sempre mais');
    expect(transposeSource('[Intro] C  Am7  G', 1, true)).toBe('[Intro] Db Bbm7 Ab');
  });
  it('não mexe em tablatura nem anotação', () => {
    const src = 'e|---3---|\n// C para D';
    expect(transposeSource(src, 2)).toBe(src);
  });
  it('transpõe acorde com baixo', () => {
    expect(transposeChord('D/F#', 2)).toBe('E/G#');
  });
});

describe('páginas', () => {
  it('quebra a letra junto com o acorde', () => {
    const blocks = layoutBlocks('C             F9            G9\nEu preciso mudar todo dia e sempre', { cols: 20 });
    expect(blocks).toHaveLength(1);
    const rows = blocks[0];
    expect(rows.map(r => r.kind)).toEqual(['chords', 'lyric', 'chords', 'lyric']);
    for (const r of rows) expect(r.text.length).toBeLessThanOrEqual(20);
    expect(rows[2].text.trim().startsWith('G9')).toBe(true);
    // Numa página pequena demais, o bloco se divide entre os pares, nunca no meio de um.
    const pages = paginate(blocks, 3);
    expect(pages.map(p => p.map(r => r.kind))).toEqual([['chords', 'lyric'], ['chords', 'lyric']]);
  });

  it('coloca título e tom na primeira página e nunca separa acorde da letra', () => {
    const song = DEMO_MUSICAS[0];
    const pages = layoutPages(song.letra, { cols: 30, rows: 12, header: { title: song.titulo, key: song.tom, capo: song.capo } });
    expect(pages[0][0]).toMatchObject({ kind: 'title', text: 'Estrada de Terra' });
    expect(pages[0][1].text).toBe('Tom: G  Capo 2ª');
    pages.forEach((p, i) => {
      expect(p.length).toBeLessThanOrEqual(12);
      expect(p[0].kind).not.toBe('blank');
      if (p[p.length - 1].kind === 'chords' && pages[i + 1]) expect(pages[i + 1][0].kind).not.toBe('lyric');
    });
    expect(pages.length).toBeGreaterThan(2);
  });

  it('só letra esconde acordes e tablatura', () => {
    const rows = layoutBlocks(DEMO_MUSICAS[0].letra, { cols: 40, show: 'letra' }).flat();
    expect(rows.some(r => r.kind === 'chords' || r.kind === 'tab')).toBe(false);
  });

  it('calcula a grade da tela', () => {
    const g = gridFor(400, 800, 22);
    expect(g.cols).toBe(30);
    expect(gridFor(400, 800, 22, { cols: 1 }).cols).toBe(31);
    expect(gridFor(400, 800, 22, { rows: -2 }).rows).toBe(g.rows - 2);
  });
});

describe('acordes nos instrumentos', () => {
  it('monta notas do acorde', () => {
    expect(chordIntervals('m7').sort((a, b) => a - b)).toEqual([0, 3, 7, 10]);
    expect(chordIntervals('7M').sort((a, b) => a - b)).toEqual([0, 4, 7, 11]);
    expect(chordIntervals('9').sort((a, b) => a - b)).toEqual([0, 2, 4, 7, 10]);
  });
  it('acha desenhos de cavaco e ukulele', () => {
    expect(chordShape('C', 'ukulele')!.frets).toEqual([0, 0, 0, 3]);
    expect(chordShape('G', 'cavaco')!.frets).toEqual([0, 0, 0, 0]);
    expect(chordShape('D', 'cavaco')!.frets).toEqual([0, 2, 3, 4]);
    expect(chordShape('C', 'violao')!.frets).toEqual([-1, 3, 2, 0, 1, 0]);
    expect(chordShape('C', 'violao', true)!.frets).toEqual([0, 1, 0, 2, 3, -1]);
  });
});

describe('repertório em blocos', () => {
  it('numera dentro de cada bloco e guarda a pausa depois da música', () => {
    const passos = passosDoShow([
      { musicaId: null, momento: 'Bloco 1' },
      { musicaId: 'a', momento: null },
      { musicaId: 'b', momento: null },
      { musicaId: null, momento: null, pausa: 'ÁGUA' },
      { musicaId: 'sumiu', momento: null },
      { musicaId: null, momento: 'Bloco 2' },
      { musicaId: 'c', momento: null },
    ], id => id !== 'sumiu');
    expect(passos.map(p => [p.musicaId, p.indice, p.numero, p.bloco, p.pausaDepois])).toEqual([
      ['a', 0, 1, 'Bloco 1', null],
      ['b', 1, 2, 'Bloco 1', 'ÁGUA'],
      ['c', 2, 1, 'Bloco 2', null],
    ]);
  });
});

describe('texto colado de outros lugares', () => {
  it('reconhece acordes com espaços diferentes e caracteres invisíveis', () => {
    const texto = '\u2800\u2800Gm\u2003\u2003F\u200b\r\nE o congelador\u00a0tá entupido\u2028[Intro]\u3000Gm\u200b  F\ufeff';
    expect(readSource(texto).map(l => [l.kind, l.text])).toEqual([
      ['chords', '  Gm  F'],
      ['lyric', 'E o congelador tá entupido'],
      ['labelChords', '[Intro] Gm  F'],
    ]);
    expect(transposeSource('\u200bGm\u2003\u2003F', 2)).toBe('Am  G');
  });

  it('o leitor não repete título e tom na parte preta: a letra começa do jeito que foi escrita', () => {
    const rows = layoutRows('Flash (Minha Mente)\n\nTom: Gm\n\nGm\nO combinado era', { cols: 40, steps: 2, key: 'Am' });
    expect(rows.map(r => r.text)).toEqual(['Flash (Minha Mente)', '', 'Tom: Gm', '', 'Am', 'O combinado era']);
    expect(layoutRows('Bb\nletra', { cols: 40, steps: 1, key: 'B' })[0].text).toBe('B');
    expect(layoutRows('Bb\nletra', { cols: 40, steps: 1, key: 'Cb' })[0].text).toBe('B');
    expect(layoutRows('A\nletra', { cols: 40, steps: 1, key: 'Bb' })[0].text).toBe('Bb');
  });
});

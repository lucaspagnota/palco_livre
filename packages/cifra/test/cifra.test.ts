import { describe, expect, it } from 'vitest';
import {
  chordShape, chordsOf, gridFor, isTabLine, layoutBlocks, layoutPages, listChords, paginate, readSource, transposeChord,
  transposeSource, chordIntervals, passosDoShow, layoutRows, deToqueFacil,
  molduraDeAjuste,
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

  it('reconhece "Intro:" com acordes, sem colchete', () => {
    const kinds = (t: string) => readSource(t).map(l => l.kind);
    expect(kinds('Intro: Am  F  C  G  C  G')).toEqual(['labelChords']);
    expect(kinds('Solo Am  G  F')).toEqual(['labelChords']);
    expect(kinds('Primeira Parte:')).toEqual(['label']);
    // Continua texto: frase com dois-pontos e palavra comum seguida de letra.
    expect(kinds('Ele disse: vem cá')).toEqual(['lyric']);
    expect(kinds('Base de tudo é você')).toEqual(['lyric']);
    expect(transposeSource('Intro: Am  F  C  G\nCapo: 2', 2)).toBe('Intro: Bm  G  D  A\nCapo: 2');
    expect(listChords('Intro: Am F C G')).toEqual(['Am', 'F', 'C', 'G']);
  });

  it('lista os acordes sem repetir', () => {
    expect(listChords('[Intro] C Am7 G\nC  F9\nletra\n( C  G )')).toEqual(['C', 'Am7', 'G', 'F9']);
  });
});

describe('acordes das músicas do Lucas (prints de 02/11)', () => {
  const kind = (t: string) => readSource(t).map(l => l.kind);
  const acordes = (t: string) => chordsOf(t)?.map(c => c.chord) ?? null;

  it('reconhece a notação brasileira de acordes', () => {
    for (const c of [
      'F#m7(11)', 'B7M(9)', 'B6(9)', 'A#7(4)', 'D#m7M', 'D#m5+', 'D#m6', 'A#/D', 'Bº', 'B°', 'F/C', 'C7(4)', 'F6(11+)',
      'A5(9)', 'C#7', 'Gm/F', 'F/Eb', 'Cm7(b5)', 'G7(#9)', 'C7(9/13)', 'E7/9', 'Bm7/A', 'Gsus4', 'C(add9)', 'Dm7(9)',
      'Bbm', 'Ebº', 'A4', 'E7(b9)', 'C7M(#11)', 'Am(7M)', 'Bø', 'C-7', 'G7(13)', 'D9', 'F9',
    ]) expect(acordes(c), c).toEqual([c]);
  });

  it('acorde com parênteses no fim continua inteiro', () => {
    expect(chordsOf('    F#m7(11)')).toEqual([{ chord: 'F#m7(11)', col: 4 }]);
    expect(acordes('Am         F6(11+)                    C  E7')).toEqual(['Am', 'F6(11+)', 'C', 'E7']);
    expect(acordes('        B7M(9)        B6(9)')).toEqual(['B7M(9)', 'B6(9)']);
    expect(acordes('        C7(4)           C7(4)')).toEqual(['C7(4)', 'C7(4)']);
    expect(acordes('( C7(4) )')).toEqual(['C7(4)']);
  });

  it('acordes grudados', () => {
    expect(chordsOf('     B7M          A#7(4)A#7')).toEqual([
      { chord: 'B7M', col: 5 }, { chord: 'A#7(4)', col: 18 }, { chord: 'A#7', col: 24 },
    ]);
  });

  it('anotações no meio dos acordes não viram letra', () => {
    expect(acordes('Bm                     (riff 1)')).toEqual(['Bm']);
    expect(acordes('A                E          D (Riff 1)')).toEqual(['A', 'E', 'D']);
    expect(acordes('      Cm (Frase 3)')).toEqual(['Cm']);
    expect(acordes(' D#    A#/D  Cm   Fm  (Frase 4)')).toEqual(['D#', 'A#/D', 'Cm', 'Fm']);
    expect(acordes('       D#  A#/D  Cm  Fm (Frase 4)  C# (Frase 6)')).toEqual(['D#', 'A#/D', 'Cm', 'Fm', 'C#']);
    expect(acordes('A#/D  Cm  Fm[Frase 4]  A#7')).toEqual(['A#/D', 'Cm', 'Fm', 'A#7']);
    expect(acordes(' A#7(4)  A#7 (2x) (2x)')).toEqual(['A#7(4)', 'A#7']);
    expect(acordes('        G#m              D#')).toEqual(['G#m', 'D#']);
    expect(kind('[Interlude] Dm7 F Em7 (3x)')).toEqual(['labelChords']);
    expect(kind('[Solo] A#/D  Cm  Fm[Frase 4]  A#7')).toEqual(['labelChords']);
    expect(kind('[Intro] F9  Gm  Bb  Gm  (Bb F)  (Gm/F F)')).toEqual(['labelChords']);
    expect(acordes('[Intro] F9  Gm  Bb  Gm  (Bb F)'.slice(7))).toEqual(['F9', 'Gm', 'Bb', 'Gm', 'Bb', 'F']);
    expect(kind('Introdução: ( C  A  C  A )')).toEqual(['labelChords']);
  });

  it('letra com parênteses continua letra', () => {
    expect(kind('E (eu te amo)')).toEqual(['lyric']);
    expect(kind('A (vida é bela)')).toEqual(['lyric']);
    expect(kind('Radio (radio)')).toEqual(['lyric']);
    expect(kind('(riff 2)')).toEqual(['lyric']);
    expect(kind('A minha vida (2x)')).toEqual(['lyric']);
    expect(kind('Dada Ebe Cada')).toEqual(['lyric']);
    expect(kind('E (2x)')).toEqual(['chords']);
  });

  it('"Tom: A" fica laranja como acorde e muda junto ao transpor', () => {
    expect(kind('Tom: A')).toEqual(['labelChords']);
    expect(kind('Tom: C#m')).toEqual(['labelChords']);
    expect(kind('Afinação: Db  Ab  Db  Gb  Bb  Eb')).toEqual(['tab']);
    expect(transposeSource('Tom: D\n\nIntrodução: ( C  A  C  A )', 2)).toBe('Tom: E\n\nIntrodução: ( D  B  D  B )');
    expect(layoutRows('Maniac\nTom: F', { cols: 40 }).map(r => r.kind)).toEqual(['lyric', 'chords']);
  });

  it('transpõe mantendo anotações e acordes grudados', () => {
    expect(transposeSource('Bm                     (riff 1)', 2)).toBe('C#m                    (riff 1)');
    expect(transposeSource('     B7M          A#7(4)A#7', 1)).toBe('     C7M          B7(4)B7');
    expect(transposeSource('Am         F6(11+)', 2)).toBe('Bm         G6(11+)');
    expect(transposeSource('A#/D  Cm  Fm[Frase 4]', 2)).toBe('C/E   Dm  Gm[Frase 4]');
  });
});

describe('refrão com "|" no começo da linha', () => {
  it('a linha que começa com "|" vira refrão, sem o "|"', () => {
    const linhas = readSource('[Primeira Parte]\n|[Solo] 4T DEPOIS DO SOLO\n|  G      D\n|Eu quero sempre mais\nLetra normal');
    expect(linhas.map(l => [l.kind, l.text, l.refrao])).toEqual([
      ['label', '[Primeira Parte]', false],
      ['label', '[Solo] 4T DEPOIS DO SOLO', true],
      ['chords', '  G      D', true],
      ['lyric', 'Eu quero sempre mais', true],
      ['lyric', 'Letra normal', false],
    ]);
  });

  it('tablatura e compassos com barras continuam como eram', () => {
    expect(readSource('| G | D | 2x').map(l => [l.kind, l.refrao])).toEqual([['chords', false]]);
    expect(readSource('|---3---2---|').map(l => [l.kind, l.refrao])).toEqual([['tab', false]]);
  });

  it('transpõe o refrão e mantém o "|"', () => {
    expect(transposeSource('|[Intro] C  G\n|  Am\n|Eu quero', 2)).toBe('|[Intro] D  A\n|  Bm\n|Eu quero');
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
    // Mudar a largura não muda a altura.
    expect(gridFor(400, 800, 22, { cols: 5 }).rows).toBe(g.rows);
    // A letra não encolhe nem estica: a moldura muda de tamanho na tela.
    expect(gridFor(400, 800, 22, { cols: 5, rows: 3 }).font).toBe(22);
    expect(gridFor(400, 800, 22, { rows: 3 }).line).toBe(g.line);
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
    expect(rows.map(r => r.text)).toEqual(['Flash (Minha Mente)', '', 'Tom: Am', '', 'Am', 'O combinado era']);
    expect(layoutRows('Bb\nletra', { cols: 40, steps: 1, key: 'B' })[0].text).toBe('B');
    expect(layoutRows('Bb\nletra', { cols: 40, steps: 1, key: 'Cb' })[0].text).toBe('B');
    expect(layoutRows('A\nletra', { cols: 40, steps: 1, key: 'Bb' })[0].text).toBe('Bb');
  });
});

describe('letra vinda do Toque Fácil', () => {
  it('troca as marcas de refrão, 2ª voz e anotação pelas do Palco Livre', () => {
    const tf = [
      '[Primeira Parte]',
      '   C',
      'Minha vida',
      '',
      '|     A          C#m',
      '|Não dá! Não dá!',
      '|:Pra ficar',
      '|#repete 2x',
      '',
      ':Só a segunda voz',
      '#entra a bateria',
      'e|---3---2---|',
      '|---0---2---|',
    ].join('\n');
    expect(deToqueFacil(tf).split('\n')).toEqual([
      '[Primeira Parte]',
      '   C',
      'Minha vida',
      '',
      '{refrão}',
      '     A          C#m',
      'Não dá! Não dá!',
      '{2ª voz}',
      'Pra ficar',
      '{/2ª voz}',
      '// repete 2x',
      '{/refrão}',
      '',
      '{2ª voz}',
      'Só a segunda voz',
      '{/2ª voz}',
      '// entra a bateria',
      'e|---3---2---|',
      '|---0---2---|',
    ]);
    const linhas = readSource(deToqueFacil(tf));
    expect(linhas.find(l => l.text.startsWith('Não dá'))?.refrao).toBe(true);
    expect(linhas.find(l => l.text === 'Só a segunda voz')?.voz2).toBe(true);
    expect(linhas.filter(l => l.kind === 'tab')).toHaveLength(2);
  });

  it('não mexe numa letra sem marcas', () => {
    const tf = '100% Você\nTom: A\n\n[Intro] E  A  C#m  D  E\n        A  C#m  D  E\n\n( A  C#m  D  E )';
    expect(deToqueFacil(tf)).toBe(tf);
  });
});

describe('ajustes de resolução', () => {
  it('moldura de X ocupa a grade inteira', () => {
    const m = molduraDeAjuste(10, 4);
    expect(m.map(r => r.text)).toEqual(['XXXXXXXXXX', 'X        X', 'X        X', 'XXXXXXXXXX']);
    expect(m.every(r => r.text.length === 10)).toBe(true);
  });
});

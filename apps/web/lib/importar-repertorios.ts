// Repertórios que o favorito "Exportar do Toque Fácil" baixa da página Meus repertórios.
// O arquivo traz os pedaços do editor de repertório como o Toque Fácil mostra: a sequência das músicas
// (o título e o artista vêm cortados em 20 letras, com um trecho do início e do fim da letra) e as listas
// de impressão (com o título e o artista inteiros). Aqui isso vira a sequência, e cada música é ligada à
// mesma música já importada no Palco Livre.
import { semAcento } from '@palco/cifra';
import type { ItemRepertorio, Musica, MusicaResumo } from './tipos';
import { estiloImportado, tomImportado } from './importar';

export interface MusicaTF {
  tfId: string;
  titulo: string;
  artista: string;
  tom: string;
  capo: number | null;
  /** Começo e fim da letra (uns 100 caracteres cada), para separar músicas com o mesmo título e artista. */
  inicio: string;
  fim: string;
}

export type ItemTF = { musica: MusicaTF } | { momento: string };

export interface RepertorioTF {
  titulo: string;
  estilo: string;
  numerar: boolean;
  itens: ItemTF[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const texto = (x: unknown) => (typeof x === 'string' ? x : '').trim();
const textoDe = (e: Element | null | undefined) => (e?.textContent ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
/** Só letras e números, sem acento: "Don`t Stop" e "Don't stop" ficam iguais. */
const so = (s: string) => semAcento(s).replace(/[^a-z0-9]/g, '');

function lerRepertorio(r: any): RepertorioTF {
  const d = new DOMParser().parseFromString(`<body>${texto(r?.sequencia)}${texto(r?.lista)}${texto(r?.setlist)}</body>`, 'text/html');
  // Impressão "Lista": número, música, artista (cortado), estilo, tom, capo.
  const lista = Array.from(d.querySelectorAll('#imprRep tr'))
    .map(tr => Array.from(tr.querySelectorAll('td')).map(textoDe))
    .filter(c => /^\d+$/.test(c[0] ?? ''));
  // Impressão "Setlist": "1. TÍTULO" e embaixo o artista inteiro.
  const setlist = Array.from(d.querySelectorAll('#imprSL div')).flatMap(div => {
    const m = /^(\d+)\.\s*(.*)$/.exec(textoDe(div.querySelector(':scope > b')));
    return m ? [{ titulo: m[2], artista: textoDe(div.querySelector(':scope > span')).replace(/\s*•\s*$/, '') }] : [];
  });

  const itens: ItemTF[] = [];
  let k = 0;
  for (const o of Array.from(d.querySelectorAll('#SequenciaMusicas option'))) {
    const valor = o.getAttribute('value') ?? '';
    const pop = o.getAttribute('data-content');
    const nome = textoDe(o);
    if (!pop && !/^\d+$/.test(valor)) {
      // Não é música: uma etiqueta no meio da sequência vira bloco.
      const t = nome.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '');
      if (t) itens.push({ momento: t });
      continue;
    }
    // "Título • Artista • Estilo • Tom • Capo 1ª", cortado em 20 letras.
    const partes = nome.split(' • ');
    const linha = lista[k];
    const sl = setlist[k];
    k++;
    // A linha da impressão é desta música? (confere pelo começo do título)
    const bate = !!linha && !!partes[0] && so(linha[1] ?? '').startsWith(so(partes[0]));
    const slBate = bate && !!sl && so(sl.titulo) === so(linha[1]);
    const trechos = pop ? Array.from(new DOMParser().parseFromString(pop, 'text/html').querySelectorAll('.TextoPopover')).map(s => s.textContent ?? '') : [];
    const capo = (bate ? linha[5] : partes.find(p => /^Capo/i.test(p))) ?? '';
    itens.push({
      musica: {
        tfId: valor,
        titulo: bate ? linha[1] : partes[0] ?? '',
        artista: slBate ? sl.artista : bate ? linha[2] ?? '' : partes[1] ?? '',
        tom: tomImportado(bate ? linha[4] : partes[3]),
        capo: parseInt(capo.replace(/\D/g, ''), 10) || null,
        inicio: trechos[0] ?? '',
        fim: trechos[1] ?? '',
      },
    });
  }
  return { titulo: texto(r?.titulo) || 'Sem título', estilo: estiloImportado(r?.estilo), numerar: !!r?.numerar, itens };
}

export function lerRepertoriosTF(dados: any): { repertorios: RepertorioTF[]; falhas: string[] } {
  const lista: any[] = Array.isArray(dados?.repertorios) ? dados.repertorios : [];
  return {
    repertorios: lista.map(lerRepertorio),
    falhas: Array.isArray(dados?.falhas) ? dados.falhas.map((f: any) => texto(f?.titulo) || texto(f?.endereco)).filter(Boolean) : [],
  };
}

export interface PlanoRepertorio {
  titulo: string;
  estilo: string;
  numerar: boolean;
  itens: ItemRepertorio[];
  /** Quantas músicas o repertório tem no Toque Fácil. */
  total: number;
  /** Músicas que não estão no Palco Livre e ficam de fora ("Título – Artista"). */
  faltando: string[];
}

/** Pedaço da letra só com letras e números, sem as marcas de refrão e 2ª voz do Palco Livre. */
const letraSo = (s: string) => so(s.replace(/\{\/?(refrão|refrao|2ª voz)\}/gi, ''));

function comum(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

const invertido = (s: string) => Array.from(s).reverse().join('');

/**
 * Liga cada música dos repertórios a uma música da conta: mesmo título e artista (sem ligar para acento,
 * maiúscula e pontuação). Quando há mais de uma igual, escolhe pelo trecho da letra e pelo tom.
 */
export async function casarRepertorios(
  reps: RepertorioTF[],
  minhas: MusicaResumo[],
  letras: (ids: string[]) => Promise<Pick<Musica, 'id' | 'letra'>[]>,
): Promise<PlanoRepertorio[]> {
  const porTitulo = new Map<string, MusicaResumo[]>();
  for (const m of minhas) {
    const t = so(m.titulo);
    porTitulo.set(t, [...(porTitulo.get(t) ?? []), m]);
  }
  const candidatos = (x: MusicaTF): MusicaResumo[] => {
    const t = so(x.titulo);
    const a = so(x.artista);
    const mesmoTitulo = porTitulo.get(t) ?? [];
    const iguais = mesmoTitulo.filter(m => so(m.artista) === a);
    if (iguais.length) return iguais;
    // O artista pode ter vindo cortado em 20 letras, e às vezes o título também.
    const comeco = minhas.filter(m => so(m.titulo).startsWith(t) && so(m.artista).startsWith(a));
    if (comeco.length) return comeco;
    // Mesmo título com outro artista: só quando não há dúvida.
    return mesmoTitulo.length === 1 ? mesmoTitulo : [];
  };

  const musicasTF = reps.flatMap(r => r.itens.flatMap(i => ('musica' in i ? [i.musica] : [])));
  const duvidas = new Set<string>();
  for (const x of musicasTF) {
    const c = candidatos(x);
    if (c.length > 1) c.forEach(m => duvidas.add(m.id));
  }
  const letraDe = new Map<string, string>();
  if (duvidas.size) for (const m of await letras([...duvidas])) letraDe.set(m.id, letraSo(m.letra));

  const escolhida = new Map<string, string | null>();
  const escolher = (x: MusicaTF): string | null => {
    const c = candidatos(x);
    if (c.length <= 1) return c[0]?.id ?? null;
    const ini = so(x.inicio);
    const fim = invertido(so(x.fim));
    let melhor = c[0];
    let pontos = -1;
    for (const m of c) {
      const l = letraDe.get(m.id) ?? '';
      const p = comum(l, ini) + comum(invertido(l), fim) + (m.tom === x.tom ? 5 : 0) + (m.capo === x.capo ? 1 : 0);
      if (p > pontos) { melhor = m; pontos = p; }
    }
    return melhor.id;
  };

  return reps.map(r => {
    const itens: ItemRepertorio[] = [];
    const faltando: string[] = [];
    let total = 0;
    for (const i of r.itens) {
      if ('momento' in i) { itens.push({ musicaId: null, momento: i.momento, pausa: null }); continue; }
      total++;
      const x = i.musica;
      const chave = x.tfId || `${x.titulo}|${x.artista}|${x.inicio}`;
      if (!escolhida.has(chave)) escolhida.set(chave, escolher(x));
      const id = escolhida.get(chave);
      if (id) itens.push({ musicaId: id, momento: null, pausa: null });
      else faltando.push(x.artista ? `${x.titulo} – ${x.artista}` : x.titulo);
    }
    return { titulo: r.titulo, estilo: r.estilo, numerar: r.numerar, itens, total, faltando };
  });
}

/** O arquivo é de repertórios do Toque Fácil? Devolve null quando é de músicas. */
export function lerArquivoDeRepertorios(conteudo: string, nomeArquivo: string) {
  if (!/\.json$/i.test(nomeArquivo) && !/^\s*\{/.test(conteudo)) return null;
  let dados: any;
  try { dados = JSON.parse(conteudo); } catch { return null; }
  return dados?.origem === 'toque-facil' && dados?.tipo === 'repertorios' ? lerRepertoriosTF(dados) : null;
}

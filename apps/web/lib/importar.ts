// Leitura dos arquivos da tela Importar: o .json que o favorito "Exportar para o Palco Livre" baixa
// do Toque Fácil, ou arquivos .txt soltos (um por música).
import { ESTILOS, TONS, expandTabs, limparTexto, semAcento } from '@palco/cifra';
import type { MusicaEditada } from './tipos';

export type MusicaImportada = Omit<MusicaEditada, 'id'>;

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Mesmo título e artista (sem ligar para acento e maiúsculas) = mesma música. */
export const chaveMusica = (titulo: string, artista: string) => semAcento(titulo.trim()) + '|' + semAcento(artista.trim());

const texto = (x: unknown) => (typeof x === 'string' ? x : typeof x === 'number' ? String(x) : '').trim();

function tom(x: unknown) {
  const t = texto(x).replace(/\s+/g, '').replace('♯', '#').replace('♭', 'b');
  return TONS.find(c => c.toLowerCase() === t.toLowerCase()) ?? '';
}

function capo(x: unknown): number | null {
  const n = parseInt(texto(x), 10);
  return n > 0 && n <= 12 ? n : null;
}

/** Usa o nome da lista do Palco Livre quando é o mesmo estilo escrito de outro jeito ("mpb" → "MPB"). */
function estilo(x: unknown) {
  const e = texto(x);
  return ESTILOS.find(s => semAcento(s) === semAcento(e)) ?? e;
}

function musica(r: any): MusicaImportada | null {
  const letra = expandTabs(limparTexto(typeof r?.letra === 'string' ? r.letra : '')).replace(/[ \t]+$/gm, '').replace(/^\n+|\n+$/g, '');
  const titulo = texto(r?.titulo);
  if (!titulo && !letra) return null;
  return { titulo: titulo || 'Sem título', artista: texto(r?.artista), estilo: estilo(r?.estilo), tom: tom(r?.tom), capo: capo(r?.capo), letra, publica: false };
}

/** "Artista - Título.txt" vira artista e título; sem o traço, o nome inteiro é o título. */
function doNomeDoArquivo(nome: string) {
  const base = nome.replace(/\.[^.]+$/, '').trim();
  const partes = base.split(/\s+[-–]\s+/);
  return partes.length === 2 ? { artista: partes[0], titulo: partes[1] } : { artista: '', titulo: base };
}

export function lerArquivo(conteudo: string, nomeArquivo: string): MusicaImportada[] {
  if (/\.json$/i.test(nomeArquivo) || /^\s*[[{]/.test(conteudo)) {
    let dados: any;
    try { dados = JSON.parse(conteudo); } catch { throw new Error(`O arquivo ${nomeArquivo} não é um arquivo de músicas válido.`); }
    const lista = Array.isArray(dados) ? dados : Array.isArray(dados?.musicas) ? dados.musicas : null;
    if (!lista) throw new Error(`Não achei músicas no arquivo ${nomeArquivo}.`);
    return lista.map(musica).filter((m: MusicaImportada | null): m is MusicaImportada => !!m);
  }
  const m = musica({ ...doNomeDoArquivo(nomeArquivo), letra: conteudo });
  return m ? [m] : [];
}

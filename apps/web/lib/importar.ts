// Leitura dos arquivos de músicas da tela Importar: o .json que o favorito "Exportar do Toque Fácil" baixa
// da página Minhas músicas, ou arquivos .txt soltos (um por música). Os repertórios ficam em importar-repertorios.ts.
import { ESTILOS, TONS, deToqueFacil, expandTabs, limparTexto, semAcento } from '@palco/cifra';
import type { MusicaEditada } from './tipos';

export type MusicaImportada = Omit<MusicaEditada, 'id'>;

export interface Leitura {
  musicas: MusicaImportada[];
  /** Títulos que o favorito do Toque Fácil não conseguiu copiar. */
  falhas: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Mesmo título e artista (sem ligar para acento e maiúsculas) = mesma música. */
export const chaveMusica = (titulo: string, artista: string) => semAcento(titulo.trim()) + '|' + semAcento(artista.trim());

const texto = (x: unknown) => (typeof x === 'string' ? x : typeof x === 'number' ? String(x) : '').trim();

export function tomImportado(x: unknown) {
  const t = texto(x).replace(/\s+/g, '').replace('♯', '#').replace('♭', 'b');
  return TONS.find(c => c.toLowerCase() === t.toLowerCase()) ?? '';
}

function capo(x: unknown): number | null {
  const n = parseInt(texto(x), 10);
  return n > 0 && n <= 12 ? n : null;
}

/** Usa o nome da lista do Palco Livre quando é o mesmo estilo escrito de outro jeito ("mpb" → "MPB"). */
export function estiloImportado(x: unknown) {
  const e = texto(x);
  return ESTILOS.find(s => semAcento(s) === semAcento(e)) ?? e;
}

function musica(r: any, doToqueFacil = false): MusicaImportada | null {
  let letra = expandTabs(limparTexto(typeof r?.letra === 'string' ? r.letra : '')).replace(/[ \t]+$/gm, '').replace(/^\n+|\n+$/g, '');
  if (doToqueFacil) letra = deToqueFacil(letra);
  const titulo = texto(r?.titulo);
  if (!titulo && !letra) return null;
  return { titulo: titulo || 'Sem título', artista: texto(r?.artista), estilo: estiloImportado(r?.estilo), tom: tomImportado(r?.tom), capo: capo(r?.capo), letra, publica: false };
}

/** "Artista - Título.txt" vira artista e título; sem o traço, o nome inteiro é o título. */
function doNomeDoArquivo(nome: string) {
  const base = nome.replace(/\.[^.]+$/, '').trim();
  const partes = base.split(/\s+[-–]\s+/);
  return partes.length === 2 ? { artista: partes[0], titulo: partes[1] } : { artista: '', titulo: base };
}

export function lerArquivo(conteudo: string, nomeArquivo: string): Leitura {
  if (/\.json$/i.test(nomeArquivo) || /^\s*[[{]/.test(conteudo)) {
    let dados: any;
    try { dados = JSON.parse(conteudo); } catch { throw new Error(`O arquivo ${nomeArquivo} não é um arquivo de músicas válido.`); }
    const lista = Array.isArray(dados) ? dados : Array.isArray(dados?.musicas) ? dados.musicas : null;
    if (!lista) throw new Error(`Não achei músicas no arquivo ${nomeArquivo}.`);
    const doToqueFacil = dados?.origem === 'toque-facil';
    return {
      musicas: lista.map((r: any) => musica(r, doToqueFacil)).filter((m: MusicaImportada | null): m is MusicaImportada => !!m),
      falhas: Array.isArray(dados?.falhas) ? dados.falhas.map((f: any) => texto(f?.titulo) || texto(f?.endereco)).filter(Boolean) : [],
    };
  }
  const m = musica({ ...doNomeDoArquivo(nomeArquivo), letra: conteudo });
  return { musicas: m ? [m] : [], falhas: [] };
}

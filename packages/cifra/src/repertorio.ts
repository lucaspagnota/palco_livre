import type { ItemRepertorio } from './modelo';

/** Uma música na ordem do show, com o número dentro do bloco e a pausa que vem logo depois dela. */
export interface PassoDoShow {
  musicaId: string;
  /** Posição entre as músicas (0, 1, 2...), usada para navegar no leitor. */
  indice: number;
  /** Número como no setlist impresso: recomeça em 1 a cada bloco. */
  numero: number;
  bloco: string | null;
  pausaDepois: string | null;
}

export function passosDoShow(itens: ItemRepertorio[], existe: (id: string) => boolean = () => true): PassoDoShow[] {
  const out: PassoDoShow[] = [];
  let bloco: string | null = null;
  let numero = 0;
  for (const it of itens) {
    if (it.momento) {
      bloco = it.momento;
      numero = 0;
    } else if (it.pausa) {
      const ultima = out[out.length - 1];
      if (ultima) ultima.pausaDepois = ultima.pausaDepois ? `${ultima.pausaDepois} · ${it.pausa}` : it.pausa;
    } else if (it.musicaId && existe(it.musicaId)) {
      out.push({ musicaId: it.musicaId, indice: out.length, numero: ++numero, bloco, pausaDepois: null });
    }
  }
  return out;
}

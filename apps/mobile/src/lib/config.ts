// Configurações do leitor e do pedal. Ficam só neste aparelho.
import 'expo-sqlite/localStorage/install';
import { APARENCIA_PADRAO, VERSAO_CORES, aparenciaGuardada, type Aparencia, type Instrumento } from '@palco/cifra';

export type AcaoPedal = 'avancar' | 'voltar' | 'proxima' | 'anterior';

export type MapaPedal = Record<AcaoPedal, string[]>;

export interface Ajuste { cols: number; rows: number }

export interface Config {
  aparencia: Aparencia;
  /** 1 a 5; 2 é o normal. */
  tamanho: number;
  mostrar: 'tudo' | 'letra';
  letraMaiuscula: boolean;
  tituloMaiusculo: boolean;
  instrumento: Instrumento;
  canhoto: boolean;
  colunaAcordes: boolean;
  instrucoes: boolean;
  confirmarSaida: boolean;
  modo: 'paginacao' | 'rolagem';
  /** Tablet deitado: duas páginas lado a lado. */
  duasPaginas: boolean;
  retrato: Ajuste;
  paisagem: Ajuste;
  pedal: MapaPedal;
}

export const PEDAL_PADRAO: MapaPedal = {
  avancar: ['PageDown', 'ArrowRight', 'ArrowDown', 'Space', ' ', 'Enter', '87'],
  voltar: ['PageUp', 'ArrowLeft', 'ArrowUp', '88'],
  proxima: [],
  anterior: [],
};

export const NOME_ACAO: Record<AcaoPedal, string> = {
  avancar: 'Avançar página',
  voltar: 'Voltar página',
  proxima: 'Próxima música',
  anterior: 'Música anterior',
};

export const CONFIG_PADRAO: Config = {
  aparencia: APARENCIA_PADRAO,
  tamanho: 2,
  mostrar: 'tudo',
  letraMaiuscula: false,
  tituloMaiusculo: false,
  instrumento: 'violao',
  canhoto: false,
  colunaAcordes: false,
  instrucoes: true,
  confirmarSaida: true,
  modo: 'paginacao',
  duasPaginas: true,
  retrato: { cols: 0, rows: 0 },
  paisagem: { cols: 0, rows: 0 },
  pedal: PEDAL_PADRAO,
};

const CHAVE = 'palco-config-v4';
const CHAVE_TONS = 'palco-tons-v4';

export function lerConfig(): Config {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
    if (c) return { ...CONFIG_PADRAO, ...c, aparencia: aparenciaGuardada(c.aparencia, c.versaoCores), pedal: { ...PEDAL_PADRAO, ...c.pedal } };
  } catch { /* usa o padrão */ }
  return CONFIG_PADRAO;
}

export const salvarConfig = (c: Config) => localStorage.setItem(CHAVE, JSON.stringify({ ...c, versaoCores: VERSAO_CORES }));

/**
 * Até a versão 4.0.0 o tom mudado no leitor ficava guardado no aparelho. Agora ele vale só enquanto o
 * repertório está aberto (o tom de verdade só muda no site), então apaga o que ficou guardado.
 */
export function esquecerTonsGuardados() {
  try { localStorage.removeItem(CHAVE_TONS); } catch { /* nada guardado */ }
}

export function acaoDaTecla(mapa: MapaPedal, tecla: string): AcaoPedal | null {
  for (const a of Object.keys(mapa) as AcaoPedal[]) if (mapa[a].includes(tecla)) return a;
  return null;
}

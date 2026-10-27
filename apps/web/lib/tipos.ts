import type { Grupo, ItemRepertorio, Musica, Perfil, Repertorio } from '@palco/cifra';

export type { Grupo, ItemRepertorio, Musica, Perfil, Repertorio };

/** Música sem a letra, para as listas. */
export type MusicaResumo = Omit<Musica, 'letra'>;

/** Tudo o que a conta enxerga: o que é seu e o que chegou pelos grupos. */
export interface Dados {
  eu: Perfil;
  musicas: MusicaResumo[];
  repertorios: Repertorio[];
  grupos: Grupo[];
  perfis: Record<string, Perfil>;
  /** Preenchido quando veio da cópia guardada no aparelho (sem internet): quando a cópia foi feita. */
  copiaDe?: string;
}

export interface NovaConta {
  nome: string;
  nick: string;
  email: string;
  uf: string;
  senha: string;
}

export type MusicaEditada = Pick<Musica, 'titulo' | 'artista' | 'estilo' | 'tom' | 'capo' | 'letra' | 'publica'> & { id?: string };
export type RepertorioEditado = Pick<Repertorio, 'titulo' | 'estilo' | 'numerar' | 'publica' | 'itens'> & { id?: string };

export interface Store {
  /** true quando não há banco configurado e tudo fica neste navegador. */
  demo: boolean;
  eu(): Promise<Perfil | null>;
  aoMudarConta(cb: (p: Perfil | null) => void): () => void;
  entrar(email: string, senha: string): Promise<void>;
  /** "confirmar" quando o Supabase pede confirmação por e-mail. */
  criarConta(c: NovaConta): Promise<'ok' | 'confirmar'>;
  recuperarSenha(email: string): Promise<void>;
  novaSenha(senha: string): Promise<void>;
  sair(): Promise<void>;
  salvarPerfil(p: Pick<Perfil, 'nome' | 'uf'>): Promise<void>;

  carregar(): Promise<Dados>;
  /** Músicas completas (com letra). */
  musicas(ids: string[]): Promise<Musica[]>;
  salvarMusica(m: MusicaEditada): Promise<string>;
  apagarMusicas(ids: string[]): Promise<void>;
  copiarMusica(id: string): Promise<string>;
  /** Cadastra várias músicas de uma vez (Importar). Avisa quantas já foram, para mostrar o andamento. */
  importarMusicas(ms: Omit<MusicaEditada, 'id'>[], aoAvancar?: (feitas: number) => void): Promise<number>;

  salvarRepertorio(r: RepertorioEditado): Promise<string>;
  apagarRepertorios(ids: string[]): Promise<void>;
  copiarRepertorio(id: string): Promise<string>;

  salvarGrupo(g: { id?: string; titulo: string }): Promise<string>;
  apagarGrupos(ids: string[]): Promise<void>;
  sairDosGrupos(ids: string[]): Promise<void>;
  adicionarMembro(grupoId: string, busca: string): Promise<Perfil>;
  removerMembros(grupoId: string, perfilIds: string[]): Promise<void>;
  adicionarRepertorioNoGrupo(grupoId: string, repertorioId: string): Promise<void>;
  removerRepertoriosDoGrupo(grupoId: string, repertorioIds: string[]): Promise<void>;
}

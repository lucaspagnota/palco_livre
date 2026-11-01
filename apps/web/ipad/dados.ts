// Conversa com o banco (Supabase) e guarda tudo no iPad.
// Sem a biblioteca do Supabase (moderna demais para o iOS 9): pedidos simples com XMLHttpRequest.
// Os pedidos passam pelo próprio site (/sb, ver next.config.ts), que o iPad já sabe abrir com segurança.
import type { ItemRepertorio } from '@palco/cifra';

declare const __CHAVE_SUPABASE__: string;
declare const __BANCO__: string;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Linha = Record<string, any>;

export const SEM_INTERNET = 'Sem internet agora. O que já está no iPad continua funcionando.';

export interface Sessao {
  acesso: string;
  renovar: string;
  /** Quando o acesso vence (ms). */
  vence: number;
  euId: string;
  email: string;
}

export interface MusicaResumo {
  id: string;
  donoId: string;
  titulo: string;
  artista: string;
  estilo: string;
  tom: string;
  capo: number | null;
  atualizadoEm: string;
}

export interface Repertorio {
  id: string;
  donoId: string;
  titulo: string;
  estilo: string;
  itens: ItemRepertorio[];
}

export interface Conteudo {
  musicas: MusicaResumo[];
  repertorios: Repertorio[];
  /** Nick de cada perfil, para mostrar de quem é o repertório da banda. */
  nicks: Record<string, string>;
  baixadoEm: string;
}

// ---------- Guardar no iPad ----------

const CHAVE_SESSAO = 'pl-ipad-sessao';
const CHAVE_CONTEUDO = 'pl-ipad-conteudo';
const CHAVE_CONFIG = 'pl-ipad-config';
const PREFIXO_LETRA = 'pl-ipad-letra-';

function ler<T>(chave: string): T | null {
  try {
    const v = localStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

/** false quando o espaço do navegador acabou. */
function gravar(chave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export const sessaoGuardada = () => ler<Sessao>(CHAVE_SESSAO);
export const conteudoGuardado = () => ler<Conteudo>(CHAVE_CONTEUDO);

export interface Config {
  /** 1 a 5, como no app. */
  tamanho: number;
  soLetra: boolean;
  duasPaginas: boolean;
  instrucoesVistas: boolean;
}

export function lerConfig(): Config {
  const c = ler<Partial<Config>>(CHAVE_CONFIG) || {};
  return {
    tamanho: c.tamanho || 2,
    soLetra: !!c.soLetra,
    duasPaginas: c.duasPaginas !== false,
    instrucoesVistas: !!c.instrucoesVistas,
  };
}

export const gravarConfig = (c: Config) => gravar(CHAVE_CONFIG, c);

interface LetraGuardada { em: string; t: string }

export function letraGuardada(id: string): string | null {
  const l = ler<LetraGuardada>(PREFIXO_LETRA + id);
  return l ? l.t : null;
}

/** Quantas cifras completas estão no iPad. */
export function letrasNoIpad(): number {
  let n = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf(PREFIXO_LETRA) === 0) n++;
  }
  return n;
}

export function sairDaConta() {
  const apagar: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf('pl-ipad-') === 0 && k !== CHAVE_CONFIG) apagar.push(k);
  }
  for (const k of apagar) localStorage.removeItem(k);
}

// ---------- Pedidos ----------

function traduz(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (/JWT expired|invalid JWT|Refresh Token/i.test(msg)) return 'Sua sessão venceu. Entre de novo.';
  return msg;
}

function pedir(metodo: string, caminho: string, corpo?: unknown, token?: string): Promise<any> {
  return new Promise((ok, erro) => {
    const x = new XMLHttpRequest();
    x.open(metodo, __BANCO__ + caminho, true);
    x.setRequestHeader('apikey', __CHAVE_SUPABASE__);
    if (token) x.setRequestHeader('Authorization', 'Bearer ' + token);
    if (corpo) x.setRequestHeader('Content-Type', 'application/json');
    x.timeout = 30000;
    x.onload = () => {
      let dados: any = null;
      try { dados = x.responseText ? JSON.parse(x.responseText) : null; } catch { /* resposta sem JSON */ }
      if (x.status >= 200 && x.status < 300) { ok(dados); return; }
      const msg = (dados && (dados.error_description || dados.msg || dados.message || dados.error)) || 'Erro ' + x.status + ' no servidor.';
      const e = new Error(traduz(String(msg))) as Error & { status?: number };
      e.status = x.status;
      erro(e);
    };
    x.onerror = () => erro(new Error(SEM_INTERNET));
    x.ontimeout = () => erro(new Error(SEM_INTERNET));
    x.send(corpo ? JSON.stringify(corpo) : null);
  });
}

function guardarSessao(r: Linha): Sessao {
  const s: Sessao = {
    acesso: r.access_token,
    renovar: r.refresh_token,
    vence: Date.now() + (Number(r.expires_in) || 3600) * 1000,
    euId: r.user.id,
    email: r.user.email,
  };
  gravar(CHAVE_SESSAO, s);
  return s;
}

export function entrar(email: string, senha: string): Promise<Sessao> {
  return pedir('POST', '/auth/v1/token?grant_type=password', { email: email.trim(), password: senha }).then(guardarSessao);
}

/** Acesso válido, renovando quando venceu. */
function acesso(): Promise<Sessao> {
  const s = sessaoGuardada();
  if (!s) return Promise.reject(new Error('Entre na sua conta primeiro.'));
  if (s.vence - 60000 > Date.now()) return Promise.resolve(s);
  return pedir('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: s.renovar }).then(guardarSessao);
}

/** Busca em páginas de 1000 (limite do Supabase). */
function tudo(caminho: string, token: string, de = 0, juntos: Linha[] = []): Promise<Linha[]> {
  return pedir('GET', caminho + '&limit=1000&offset=' + de, undefined, token).then((parte: Linha[]) => {
    const todos = juntos.concat(parte || []);
    return parte && parte.length === 1000 ? tudo(caminho, token, de + 1000, todos) : todos;
  });
}

const resumo = (r: Linha): MusicaResumo => ({
  id: r.id, donoId: r.dono_id, titulo: r.titulo || '', artista: r.artista || '', estilo: r.estilo || '', tom: r.tom || '',
  capo: r.capo, atualizadoEm: r.atualizado_em,
});

const repertorio = (r: Linha): Repertorio => ({
  id: r.id, donoId: r.dono_id, titulo: r.titulo || '', estilo: r.estilo || '',
  itens: ((r.repertorio_itens || []) as Linha[])
    .sort((a, b) => a.posicao - b.posicao)
    .map(i => ({ musicaId: i.musica_id, momento: i.momento, pausa: i.pausa })),
});

export interface Andamento { feitas: number; total: number }

/**
 * Baixa repertórios, a lista de músicas e a cifra de todas as músicas que estão em algum repertório.
 * Só baixa de novo a cifra que mudou desde a última vez.
 */
export function baixarConteudo(aoAvancar: (a: Andamento) => void): Promise<{ conteudo: Conteudo; semEspaco: number }> {
  return acesso().then(s => {
    const t = s.acesso;
    return Promise.all([
      tudo('/rest/v1/musicas?select=id,dono_id,titulo,artista,estilo,tom,capo,atualizado_em&order=titulo', t),
      tudo('/rest/v1/repertorios?select=id,dono_id,titulo,estilo,repertorio_itens(posicao,musica_id,momento,pausa)&order=titulo', t),
      pedir('GET', '/rest/v1/perfis?select=id,nick', undefined, t) as Promise<Linha[]>,
    ]).then(([ms, rs, ps]) => {
      const nicks: Record<string, string> = {};
      for (const p of ps || []) nicks[p.id] = p.nick;
      const conteudo: Conteudo = { musicas: ms.map(resumo), repertorios: rs.map(repertorio), nicks, baixadoEm: new Date().toISOString() };

      const porId: Record<string, MusicaResumo> = {};
      for (const m of conteudo.musicas) porId[m.id] = m;
      const precisa: string[] = [];
      const vistas: Record<string, boolean> = {};
      for (const r of conteudo.repertorios) {
        for (const it of r.itens) {
          const id = it.musicaId;
          if (!id || vistas[id] || !porId[id]) continue;
          vistas[id] = true;
          const g = ler<LetraGuardada>(PREFIXO_LETRA + id);
          if (!g || g.em !== porId[id].atualizadoEm) precisa.push(id);
        }
      }
      apagarLetrasSobrando(porId);
      if (!gravar(CHAVE_CONTEUDO, conteudo)) throw new Error('O iPad ficou sem espaço para guardar a lista de músicas.');
      return baixarLetras(precisa, t, aoAvancar).then(semEspaco => ({ conteudo, semEspaco }));
    });
  });
}

/** Cifras de músicas que não existem mais (apagadas no site) saem do iPad. */
function apagarLetrasSobrando(porId: Record<string, MusicaResumo>) {
  const apagar: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf(PREFIXO_LETRA) === 0 && !porId[k.slice(PREFIXO_LETRA.length)]) apagar.push(k);
  }
  for (const k of apagar) localStorage.removeItem(k);
}

/** Baixa em lotes. Devolve quantas não couberam no iPad. */
function baixarLetras(ids: string[], token: string, aoAvancar: (a: Andamento) => void): Promise<number> {
  const LOTE = 40;
  let semEspaco = 0;
  function lote(de: number): Promise<number> {
    aoAvancar({ feitas: Math.min(de, ids.length), total: ids.length });
    if (de >= ids.length) return Promise.resolve(semEspaco);
    const parte = ids.slice(de, de + LOTE);
    return pedir('GET', '/rest/v1/musicas?select=id,letra,atualizado_em&id=in.(' + parte.join(',') + ')', undefined, token)
      .then((linhas: Linha[]) => {
        for (const l of linhas || []) {
          if (!gravar(PREFIXO_LETRA + l.id, { em: l.atualizado_em, t: l.letra || '' })) semEspaco++;
        }
        return lote(de + LOTE);
      });
  }
  return lote(0);
}

/** Cifra de uma música avulsa (aba Músicas): do iPad, ou da internet quando ainda não foi baixada. */
export function cifraDe(m: MusicaResumo): Promise<string> {
  const g = letraGuardada(m.id);
  if (g !== null) return Promise.resolve(g);
  return acesso().then(s => pedir('GET', '/rest/v1/musicas?select=id,letra,atualizado_em&id=eq.' + m.id, undefined, s.acesso))
    .then((linhas: Linha[]) => {
      const l = linhas && linhas[0];
      if (!l) throw new Error('Música não encontrada.');
      gravar(PREFIXO_LETRA + l.id, { em: l.atualizado_em, t: l.letra || '' });
      return l.letra || '';
    });
}

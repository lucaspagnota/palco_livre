// Conta e download do conteúdo. O app só lê; quem edita é o site.
// Tudo que a conta pode ver é baixado de uma vez e fica guardado no aparelho,
// então o leitor funciona sem internet no palco.
import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Grupo, Musica, Perfil, Repertorio } from '@palco/cifra';
import { DEMO_EU, DEMO_GRUPOS, DEMO_MUSICAS, DEMO_OUTROS, DEMO_REPERTORIOS } from '@palco/cifra/demo';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chave = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const sb: SupabaseClient | null = url && chave
  ? createClient(url, chave, { auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
  : null;

export const demo = !sb;

export interface Conteudo {
  eu: Perfil;
  musicas: Musica[];
  repertorios: Repertorio[];
  grupos: Grupo[];
  perfis: Record<string, Perfil>;
  baixadoEm: string;
}

const CHAVE = 'palco-conteudo-v4';
const CHAVE_EMAIL = 'palco-ultimo-email';

export function lerConteudo(): Conteudo | null {
  try {
    const c = localStorage.getItem(CHAVE);
    return c ? (JSON.parse(c) as Conteudo) : null;
  } catch {
    return null;
  }
}

export const ultimoEmail = () => localStorage.getItem(CHAVE_EMAIL) ?? '';

/** Apaga o conteúdo baixado deste aparelho (a conta continua no site). */
export async function limparConteudo() {
  localStorage.removeItem(CHAVE);
  if (sb) await sb.auth.signOut();
}

/** Já existe uma sessão salva para este e-mail? Aí dá para baixar sem digitar a senha. */
export async function temSessao(email: string) {
  if (!sb) return true;
  const { data } = await sb.auth.getSession();
  return !!data.session && data.session.user.email?.toLowerCase() === email.trim().toLowerCase();
}

function traduz(msg: string) {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (/Failed to fetch|Network request failed|NetworkError/i.test(msg)) return 'Sem conexão com a internet. O conteúdo já baixado continua no aparelho.';
  if (/permission denied for (table|function|schema)/i.test(msg)) return 'O banco de dados ainda não liberou o acesso às tabelas (falta rodar permissoes.sql no Supabase).';
  return msg;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function ok<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(traduz(res.error.message));
  return res.data as NonNullable<T>;
}

async function tudo(q: (de: number, ate: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>) {
  const out: Row[] = [];
  for (let de = 0; ; de += 1000) {
    const parte = ok(await q(de, de + 999)) ?? [];
    out.push(...parte);
    if (parte.length < 1000) return out;
  }
}

/**
 * Entra (se precisar) e baixa todo o conteúdo da conta.
 * Sem senha, usa a última sessão salva para esse e-mail.
 */
export async function baixarConteudo(email: string, senha: string): Promise<Conteudo> {
  email = email.trim().toLowerCase();
  if (!email) throw new Error('Digite o e-mail da sua conta.');
  localStorage.setItem(CHAVE_EMAIL, email);
  let c: Conteudo;
  if (!sb) {
    const perfis: Record<string, Perfil> = {};
    for (const p of [DEMO_EU, ...DEMO_OUTROS]) perfis[p.id] = p;
    c = { eu: DEMO_EU, musicas: DEMO_MUSICAS, repertorios: DEMO_REPERTORIOS, grupos: DEMO_GRUPOS, perfis, baixadoEm: new Date().toISOString() };
  } else {
    if (senha) {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw new Error(traduz(error.message));
    } else if (!(await temSessao(email))) {
      throw new Error('Digite a senha da conta.');
    }
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('Não foi possível entrar. Tente de novo.');
    const [ms, rs, gs, ps] = await Promise.all([
      tudo((de, ate) => sb.from('musicas').select('*').order('titulo').range(de, ate)),
      tudo((de, ate) => sb.from('repertorios').select('*, repertorio_itens(posicao, musica_id, momento, pausa)').order('titulo').range(de, ate)),
      tudo((de, ate) => sb.from('grupos').select('*, grupo_membros(perfil_id), grupo_repertorios(repertorio_id, adicionado_por)').order('titulo').range(de, ate)),
      tudo((de, ate) => sb.from('perfis').select('*').range(de, ate)),
    ]);
    const perfis: Record<string, Perfil> = {};
    for (const p of ps) perfis[p.id] = { id: p.id, nome: p.nome, nick: p.nick, email: p.email, uf: p.uf };
    const eu = perfis[id];
    if (!eu) throw new Error('Não achei o seu perfil. Entre no site uma vez e tente de novo.');
    c = {
      eu,
      perfis,
      baixadoEm: new Date().toISOString(),
      musicas: ms.map(r => ({
        id: r.id, donoId: r.dono_id, titulo: r.titulo, artista: r.artista, estilo: r.estilo, tom: r.tom, capo: r.capo,
        letra: r.letra, publica: r.publica, copias: r.copias, atualizadoEm: r.atualizado_em,
      })),
      repertorios: rs.map(r => ({
        id: r.id, donoId: r.dono_id, titulo: r.titulo, estilo: r.estilo, numerar: r.numerar, publica: r.publica,
        copias: r.copias, atualizadoEm: r.atualizado_em,
        itens: ((r.repertorio_itens ?? []) as Row[]).sort((a, b) => a.posicao - b.posicao).map(i => ({ musicaId: i.musica_id, momento: i.momento, pausa: i.pausa })),
      })),
      grupos: gs.map(r => ({
        id: r.id, donoId: r.dono_id, titulo: r.titulo, atualizadoEm: r.atualizado_em,
        membros: ((r.grupo_membros ?? []) as Row[]).map(m => m.perfil_id),
        repertorios: ((r.grupo_repertorios ?? []) as Row[]).map(x => ({ repertorioId: x.repertorio_id, adicionadoPor: x.adicionado_por })),
      })),
    };
  }
  localStorage.setItem(CHAVE, JSON.stringify(c));
  return c;
}

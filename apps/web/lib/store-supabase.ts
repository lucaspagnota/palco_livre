// Versão online: conversa com o Supabase. As permissões de verdade ficam nas
// políticas do banco (supabase/migrations); aqui só montamos as consultas.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Dados, Grupo, Musica, MusicaResumo, Perfil, Repertorio, Store } from './tipos';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function ok<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(traduz(res.error.message));
  return res.data as NonNullable<T>;
}

function falha(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(traduz(res.error.message));
}

export const SEM_CONEXAO = 'Sem conexão com a internet.';

export function traduz(msg: string) {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (/User already registered/i.test(msg)) return 'Já existe uma conta com esse e-mail.';
  if (/Password should be/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/permission denied for (table|function|schema)/i.test(msg)) return 'O banco de dados ainda não liberou o acesso às tabelas (falta rodar permissoes.sql no Supabase).';
  if (/row-level security|Sem permiss/i.test(msg)) return 'Você não tem permissão para fazer isso.';
  if (/duplicate key.*grupo_membros/i.test(msg)) return 'Essa pessoa já está no grupo.';
  if (/duplicate key.*grupo_repertorios/i.test(msg)) return 'Esse repertório já está no grupo.';
  // "Load failed" é como o Safari (iPhone) avisa que a internet caiu.
  if (/Failed to fetch|NetworkError|Load failed|Network request failed/i.test(msg)) return SEM_CONEXAO;
  return msg;
}

const perfil = (r: Row): Perfil => ({ id: r.id, nome: r.nome, nick: r.nick, email: r.email, uf: r.uf });

const resumo = (r: Row): MusicaResumo => ({
  id: r.id, donoId: r.dono_id, titulo: r.titulo, artista: r.artista, estilo: r.estilo, tom: r.tom, capo: r.capo,
  publica: r.publica, copias: r.copias, atualizadoEm: r.atualizado_em,
});

const musica = (r: Row): Musica => ({ ...resumo(r), letra: r.letra });

const repertorio = (r: Row): Repertorio => ({
  id: r.id, donoId: r.dono_id, titulo: r.titulo, estilo: r.estilo, numerar: r.numerar, publica: r.publica,
  copias: r.copias, atualizadoEm: r.atualizado_em,
  itens: ((r.repertorio_itens ?? []) as Row[]).sort((a, b) => a.posicao - b.posicao).map(i => ({ musicaId: i.musica_id, momento: i.momento, pausa: i.pausa })),
});

const grupo = (r: Row): Grupo => ({
  id: r.id, donoId: r.dono_id, titulo: r.titulo, atualizadoEm: r.atualizado_em,
  membros: ((r.grupo_membros ?? []) as Row[]).map(m => m.perfil_id),
  repertorios: ((r.grupo_repertorios ?? []) as Row[]).map(x => ({ repertorioId: x.repertorio_id, adicionadoPor: x.adicionado_por })),
});

const RESUMO = 'id, dono_id, titulo, artista, estilo, tom, capo, publica, copias, atualizado_em';

/** Busca em páginas de 1000 (limite do Supabase). */
async function tudo(q: (de: number, ate: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>) {
  const out: Row[] = [];
  for (let de = 0; ; de += 1000) {
    const parte = ok(await q(de, de + 999)) ?? [];
    out.push(...parte);
    if (parte.length < 1000) return out;
  }
}

export function createSupabaseStore(url: string, key: string): Store {
  const sb: SupabaseClient = createClient(url, key);

  async function meuId() {
    const { data, error } = await sb.auth.getSession();
    if (error) throw new Error(traduz(error.message));
    const id = data.session?.user.id;
    if (!id) throw new Error('Entre na sua conta primeiro.');
    return id;
  }

  async function lerPerfil(id: string): Promise<Perfil | null> {
    const r = ok(await sb.from('perfis').select('*').eq('id', id).maybeSingle());
    return r ? perfil(r) : null;
  }

  const store: Store = {
    demo: false,
    async eu() {
      // Sem internet a sessão não renova e vem com erro: isso não é "saiu da conta".
      const { data, error } = await sb.auth.getSession();
      if (error) throw new Error(traduz(error.message));
      return data.session ? lerPerfil(data.session.user.id) : null;
    },
    aoMudarConta(cb) {
      let saidas = 0;
      const { data } = sb.auth.onAuthStateChange((e, s) => {
        // Só sai de verdade com SIGNED_OUT; sem internet a sessão inicial pode vir vazia, e o eu() já cuida dela.
        if (!s) { if (e === 'SIGNED_OUT') { saidas++; cb(null); } return; }
        // O perfil chega depois; se nesse meio-tempo a pessoa saiu da conta, ele não vale mais.
        const antes = saidas;
        setTimeout(() => { lerPerfil(s.user.id).then(p => { if (antes === saidas) cb(p); }, () => { /* sem internet: continua como está */ }); }, 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async entrar(email, senha) {
      const res = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
      falha(res);
      // Confere o perfil já aqui: se o banco recusar, a tela mostra o motivo em vez de ficar parada.
      try {
        if (!(await lerPerfil(res.data.user!.id))) throw new Error('Não achei o seu perfil. Crie a conta de novo ou fale com quem cuida do site.');
      } catch (e) {
        await sb.auth.signOut();
        throw e;
      }
    },
    async criarConta(c) {
      const nick = c.nick.trim().toLowerCase();
      const res = ok(await sb.auth.signUp({
        email: c.email.trim(), password: c.senha,
        options: { data: { nome: c.nome.trim(), nick, uf: c.uf }, emailRedirectTo: location.origin + '/musicas' },
      }));
      return res.session ? 'ok' : 'confirmar';
    },
    async recuperarSenha(email) {
      ok(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + '/entrar?modo=nova-senha' }));
    },
    async novaSenha(senha) {
      falha(await sb.auth.updateUser({ password: senha }));
    },
    async sair() {
      // Sem internet o Supabase não consegue encerrar no servidor; aí sai só deste aparelho.
      const { error } = await sb.auth.signOut();
      if (error) await sb.auth.signOut({ scope: 'local' });
    },
    async salvarPerfil(p) {
      ok(await sb.from('perfis').update({ nome: p.nome, uf: p.uf }).eq('id', await meuId()));
    },

    async carregar(): Promise<Dados> {
      const id = await meuId();
      const [ms, rs, gs] = await Promise.all([
        tudo((de, ate) => sb.from('musicas').select(RESUMO).order('titulo').range(de, ate)),
        tudo((de, ate) => sb.from('repertorios').select('*, repertorio_itens(posicao, musica_id, momento, pausa)').order('titulo').range(de, ate)),
        tudo((de, ate) => sb.from('grupos').select('*, grupo_membros(perfil_id), grupo_repertorios(repertorio_id, adicionado_por)').order('titulo').range(de, ate)),
      ]);
      const perfis: Record<string, Perfil> = {};
      for (const p of ok(await sb.from('perfis').select('*')) ?? []) perfis[p.id] = perfil(p);
      const eu = perfis[id] ?? (await lerPerfil(id));
      if (!eu) throw new Error('Não achei o seu perfil. Saia e entre de novo.');
      return { eu, musicas: ms.map(resumo), repertorios: rs.map(repertorio), grupos: gs.map(grupo), perfis };
    },
    async musicas(ids) {
      const out: Musica[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        out.push(...(ok(await sb.from('musicas').select('*').in('id', ids.slice(i, i + 200))) ?? []).map(musica));
      }
      return out;
    },
    async salvarMusica(m) {
      const campos = { titulo: m.titulo, artista: m.artista, estilo: m.estilo, tom: m.tom, capo: m.capo, letra: m.letra, publica: m.publica };
      if (m.id) {
        const r = ok(await sb.from('musicas').update(campos).eq('id', m.id).select('id'));
        if (!r?.length) throw new Error('Você não tem permissão para editar esta música.');
        return m.id;
      }
      return ok(await sb.from('musicas').insert(campos).select('id').single()).id;
    },
    async apagarMusicas(ids) {
      ok(await sb.from('musicas').delete().in('id', ids));
    },
    async importarMusicas(ms, aoAvancar) {
      // Em lotes, para não mandar centenas de letras num pedido só.
      let feitas = 0;
      for (let i = 0; i < ms.length; i += 50) {
        const lote = ms.slice(i, i + 50).map(m => ({ titulo: m.titulo, artista: m.artista, estilo: m.estilo, tom: m.tom, capo: m.capo, letra: m.letra, publica: m.publica }));
        ok(await sb.from('musicas').insert(lote));
        feitas += lote.length;
        aoAvancar?.(feitas);
      }
      return feitas;
    },
    async copiarMusica(id) {
      const [m] = await store.musicas([id]);
      if (!m) throw new Error('Música não encontrada.');
      const eu = await meuId();
      const novo = await store.salvarMusica({ ...m, id: undefined, titulo: m.donoId === eu ? m.titulo + ' (cópia)' : m.titulo });
      if (m.donoId !== eu) await sb.rpc('contar_copia', { tabela: 'musicas', alvo: id });
      return novo;
    },

    async salvarRepertorio(r) {
      const campos = { titulo: r.titulo, estilo: r.estilo, numerar: r.numerar, publica: r.publica };
      let id = r.id;
      if (id) {
        const res = ok(await sb.from('repertorios').update(campos).eq('id', id).select('id'));
        if (!res?.length) throw new Error('Você não tem permissão para editar este repertório.');
      } else {
        id = ok(await sb.from('repertorios').insert(campos).select('id').single()).id as string;
      }
      ok(await sb.rpc('salvar_itens', { rep: id, itens: r.itens }));
      return id;
    },
    async apagarRepertorios(ids) {
      ok(await sb.from('repertorios').delete().in('id', ids));
    },
    async copiarRepertorio(id) {
      const eu = await meuId();
      const r = ok(await sb.from('repertorios').select('*, repertorio_itens(posicao, musica_id, momento, pausa)').eq('id', id).single());
      const rep = repertorio(r);
      const ids = rep.itens.map(i => i.musicaId).filter((x): x is string => !!x);
      const trocas = new Map<string, string>();
      for (const m of await store.musicas(ids)) {
        if (m.donoId !== eu) {
          trocas.set(m.id, await store.salvarMusica({ ...m, id: undefined }));
          await sb.rpc('contar_copia', { tabela: 'musicas', alvo: m.id });
        }
      }
      const novo = await store.salvarRepertorio({
        titulo: rep.donoId === eu ? rep.titulo + ' (cópia)' : rep.titulo, estilo: rep.estilo, numerar: rep.numerar, publica: false,
        itens: rep.itens.map(i => ({ ...i, musicaId: i.musicaId ? trocas.get(i.musicaId) ?? i.musicaId : null })),
      });
      if (rep.donoId !== eu) await sb.rpc('contar_copia', { tabela: 'repertorios', alvo: id });
      return novo;
    },

    async salvarGrupo(g) {
      if (g.id) {
        ok(await sb.from('grupos').update({ titulo: g.titulo }).eq('id', g.id));
        return g.id;
      }
      return ok(await sb.from('grupos').insert({ titulo: g.titulo }).select('id').single()).id;
    },
    async apagarGrupos(ids) {
      ok(await sb.from('grupos').delete().in('id', ids).eq('dono_id', await meuId()));
    },
    async sairDosGrupos(ids) {
      const eu = await meuId();
      ok(await sb.from('grupo_repertorios').delete().in('grupo_id', ids).eq('adicionado_por', eu));
      ok(await sb.from('grupo_membros').delete().in('grupo_id', ids).eq('perfil_id', eu));
    },
    async adicionarMembro(grupoId, busca) {
      const achado = ok(await sb.rpc('achar_perfil', { busca })) as Row[] | null;
      if (!achado?.length) throw new Error('Nenhuma conta com esse nick ou e-mail. A pessoa precisa criar a conta primeiro.');
      const p = perfil(achado[0]);
      ok(await sb.from('grupo_membros').insert({ grupo_id: grupoId, perfil_id: p.id }));
      return p;
    },
    async removerMembros(grupoId, perfilIds) {
      ok(await sb.from('grupo_repertorios').delete().eq('grupo_id', grupoId).in('adicionado_por', perfilIds));
      ok(await sb.from('grupo_membros').delete().eq('grupo_id', grupoId).in('perfil_id', perfilIds));
    },
    async adicionarRepertorioNoGrupo(grupoId, repertorioId) {
      ok(await sb.from('grupo_repertorios').insert({ grupo_id: grupoId, repertorio_id: repertorioId }));
    },
    async removerRepertoriosDoGrupo(grupoId, repertorioIds) {
      ok(await sb.from('grupo_repertorios').delete().eq('grupo_id', grupoId).in('repertorio_id', repertorioIds));
    },
  };
  return store;
}

// Modo demonstração: tudo fica no localStorage deste navegador.
// Serve para ver o site funcionando antes de configurar o Supabase.
import { DEMO_EU, DEMO_GRUPOS, DEMO_MUSICAS, DEMO_OUTROS, DEMO_REPERTORIOS } from '@palco/cifra/demo';
import type { Dados, Grupo, Musica, Perfil, Repertorio, Store } from './tipos';

interface Banco {
  eu: string | null;
  perfis: Perfil[];
  musicas: Musica[];
  repertorios: Repertorio[];
  grupos: Grupo[];
}

const CHAVE = 'palco-livre-demo-v4';

function inicial(): Banco {
  return {
    eu: DEMO_EU.id,
    perfis: [DEMO_EU, ...DEMO_OUTROS],
    musicas: structuredClone(DEMO_MUSICAS),
    repertorios: structuredClone(DEMO_REPERTORIOS),
    grupos: structuredClone(DEMO_GRUPOS),
  };
}

function ler(): Banco {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) return JSON.parse(raw) as Banco;
  } catch { /* sem localStorage: começa do exemplo */ }
  return inicial();
}

function gravar(b: Banco) {
  try { localStorage.setItem(CHAVE, JSON.stringify(b)); } catch { /* cheio ou bloqueado */ }
}

const novoId = (p: string) => p + '-' + Math.random().toString(36).slice(2, 10);
const agora = () => new Date().toISOString();

export function createLocalStore(): Store {
  const ouvintes = new Set<(p: Perfil | null) => void>();
  const avisar = (b: Banco) => {
    const p = b.perfis.find(x => x.id === b.eu) ?? null;
    ouvintes.forEach(cb => cb(p));
  };

  function mudar<T>(fn: (b: Banco, eu: string) => T): T {
    const b = ler();
    if (!b.eu) throw new Error('Entre na sua conta primeiro.');
    const out = fn(b, b.eu);
    gravar(b);
    return out;
  }

  const noGrupo = (g: Grupo, id: string) => g.donoId === id || g.membros.includes(id);
  const veRep = (b: Banco, r: Repertorio, eu: string) =>
    r.donoId === eu || b.grupos.some(g => noGrupo(g, eu) && g.repertorios.some(x => x.repertorioId === r.id));
  const veMusica = (b: Banco, m: Musica, eu: string) =>
    m.donoId === eu || b.repertorios.some(r => veRep(b, r, eu) && r.itens.some(i => i.musicaId === m.id));

  const store: Store = {
    demo: true,
    async eu() {
      const b = ler();
      return b.perfis.find(p => p.id === b.eu) ?? null;
    },
    aoMudarConta(cb) {
      ouvintes.add(cb);
      return () => { ouvintes.delete(cb); };
    },
    async entrar(email) {
      const b = ler();
      const p = b.perfis.find(x => x.email.toLowerCase() === email.trim().toLowerCase()) ?? b.perfis.find(x => x.id === DEMO_EU.id)!;
      b.eu = p.id;
      gravar(b);
      avisar(b);
    },
    async criarConta(c) {
      const b = ler();
      if (b.perfis.some(p => p.email.toLowerCase() === c.email.toLowerCase())) throw new Error('Já existe uma conta com esse e-mail.');
      if (b.perfis.some(p => p.nick.toLowerCase() === c.nick.toLowerCase())) throw new Error('Esse nick já está em uso.');
      const p: Perfil = { id: novoId('u'), nome: c.nome, nick: c.nick, email: c.email, uf: c.uf };
      b.perfis.push(p);
      b.eu = p.id;
      gravar(b);
      avisar(b);
      return 'ok';
    },
    async recuperarSenha() { /* nada a fazer na demonstração */ },
    async novaSenha() { /* nada a fazer na demonstração */ },
    async sair() {
      const b = ler();
      b.eu = null;
      gravar(b);
      avisar(b);
    },
    async salvarPerfil(dados) {
      mudar((b, eu) => {
        const p = b.perfis.find(x => x.id === eu)!;
        Object.assign(p, dados);
      });
      avisar(ler());
    },

    async carregar(): Promise<Dados> {
      const b = ler();
      const eu = b.perfis.find(p => p.id === b.eu);
      if (!eu) throw new Error('Entre na sua conta primeiro.');
      const grupos = b.grupos.filter(g => noGrupo(g, eu.id));
      const repertorios = b.repertorios.filter(r => veRep(b, r, eu.id));
      const musicas = b.musicas.filter(m => veMusica(b, m, eu.id)).map(({ letra: _l, ...resto }) => resto);
      const ids = new Set<string>([eu.id]);
      grupos.forEach(g => { ids.add(g.donoId); g.membros.forEach(m => ids.add(m)); });
      const perfis: Record<string, Perfil> = {};
      b.perfis.filter(p => ids.has(p.id)).forEach(p => { perfis[p.id] = p; });
      return { eu, musicas, repertorios, grupos, perfis };
    },
    async musicas(ids) {
      const b = ler();
      return b.musicas.filter(m => ids.includes(m.id) && veMusica(b, m, b.eu ?? ''));
    },
    async salvarMusica(m) {
      return mudar((b, eu) => {
        const atual = m.id ? b.musicas.find(x => x.id === m.id) : undefined;
        if (atual) {
          if (atual.donoId !== eu && !atual.publica) throw new Error('Só o dono pode editar esta música.');
          const { id: _id, ...campos } = m;
          Object.assign(atual, campos, { atualizadoEm: agora() });
          if (atual.donoId !== eu) atual.publica = true;
          return atual.id;
        }
        const nova: Musica = { ...m, id: novoId('m'), donoId: eu, copias: 0, atualizadoEm: agora() };
        b.musicas.push(nova);
        return nova.id;
      });
    },
    async apagarMusicas(ids) {
      mudar((b, eu) => {
        const apagar = new Set(b.musicas.filter(m => ids.includes(m.id) && m.donoId === eu).map(m => m.id));
        b.musicas = b.musicas.filter(m => !apagar.has(m.id));
        b.repertorios.forEach(r => { r.itens = r.itens.filter(i => !i.musicaId || !apagar.has(i.musicaId)); });
      });
    },
    async copiarMusica(id) {
      return mudar((b, eu) => {
        const m = b.musicas.find(x => x.id === id);
        if (!m) throw new Error('Música não encontrada.');
        if (m.donoId !== eu) m.copias++;
        const nova: Musica = { ...m, id: novoId('m'), donoId: eu, copias: 0, atualizadoEm: agora(), titulo: m.donoId === eu ? m.titulo + ' (cópia)' : m.titulo };
        b.musicas.push(nova);
        return nova.id;
      });
    },

    async salvarRepertorio(r) {
      return mudar((b, eu) => {
        const atual = r.id ? b.repertorios.find(x => x.id === r.id) : undefined;
        if (atual) {
          if (atual.donoId !== eu && !atual.publica) throw new Error('Só o dono pode editar este repertório.');
          const { id: _id, ...campos } = r;
          Object.assign(atual, campos, { atualizadoEm: agora() });
          return atual.id;
        }
        const novo: Repertorio = { ...r, id: novoId('r'), donoId: eu, copias: 0, atualizadoEm: agora() };
        b.repertorios.push(novo);
        return novo.id;
      });
    },
    async apagarRepertorios(ids) {
      mudar((b, eu) => {
        const apagar = new Set(b.repertorios.filter(r => ids.includes(r.id) && r.donoId === eu).map(r => r.id));
        b.repertorios = b.repertorios.filter(r => !apagar.has(r.id));
        b.grupos.forEach(g => { g.repertorios = g.repertorios.filter(x => !apagar.has(x.repertorioId)); });
      });
    },
    async copiarRepertorio(id) {
      return mudar((b, eu) => {
        const r = b.repertorios.find(x => x.id === id);
        if (!r) throw new Error('Repertório não encontrado.');
        if (r.donoId !== eu) r.copias++;
        const trocas = new Map<string, string>();
        for (const item of r.itens) {
          const m = item.musicaId ? b.musicas.find(x => x.id === item.musicaId) : undefined;
          if (m && m.donoId !== eu && !trocas.has(m.id)) {
            m.copias++;
            const nova: Musica = { ...m, id: novoId('m'), donoId: eu, copias: 0, atualizadoEm: agora() };
            b.musicas.push(nova);
            trocas.set(m.id, nova.id);
          }
        }
        const novo: Repertorio = {
          ...r, id: novoId('r'), donoId: eu, copias: 0, atualizadoEm: agora(),
          titulo: r.donoId === eu ? r.titulo + ' (cópia)' : r.titulo,
          itens: r.itens.map(i => ({ ...i, musicaId: i.musicaId ? trocas.get(i.musicaId) ?? i.musicaId : null })),
        };
        b.repertorios.push(novo);
        return novo.id;
      });
    },

    async salvarGrupo(g) {
      return mudar((b, eu) => {
        const atual = g.id ? b.grupos.find(x => x.id === g.id) : undefined;
        if (atual) {
          if (atual.donoId !== eu) throw new Error('Só o responsável pode mudar o grupo.');
          atual.titulo = g.titulo;
          atual.atualizadoEm = agora();
          return atual.id;
        }
        const novo: Grupo = { id: novoId('g'), donoId: eu, titulo: g.titulo, atualizadoEm: agora(), membros: [], repertorios: [] };
        b.grupos.push(novo);
        return novo.id;
      });
    },
    async apagarGrupos(ids) {
      mudar((b, eu) => { b.grupos = b.grupos.filter(g => !(ids.includes(g.id) && g.donoId === eu)); });
    },
    async sairDosGrupos(ids) {
      mudar((b, eu) => {
        b.grupos.forEach(g => {
          if (ids.includes(g.id) && g.donoId !== eu) {
            g.membros = g.membros.filter(m => m !== eu);
            g.repertorios = g.repertorios.filter(r => r.adicionadoPor !== eu);
          }
        });
      });
    },
    async adicionarMembro(grupoId, busca) {
      return mudar((b, eu) => {
        const g = b.grupos.find(x => x.id === grupoId);
        if (!g || g.donoId !== eu) throw new Error('Só o responsável pode adicionar membros.');
        const q = busca.trim().toLowerCase();
        const p = b.perfis.find(x => x.nick.toLowerCase() === q || x.email.toLowerCase() === q);
        if (!p) throw new Error('Nenhuma conta com esse nick ou e-mail.');
        if (p.id === g.donoId || g.membros.includes(p.id)) throw new Error(p.nick + ' já está no grupo.');
        g.membros.push(p.id);
        g.atualizadoEm = agora();
        return p;
      });
    },
    async removerMembros(grupoId, perfilIds) {
      mudar((b, eu) => {
        const g = b.grupos.find(x => x.id === grupoId);
        if (!g || g.donoId !== eu) throw new Error('Só o responsável pode remover membros.');
        g.membros = g.membros.filter(m => !perfilIds.includes(m));
        g.repertorios = g.repertorios.filter(r => !perfilIds.includes(r.adicionadoPor));
        g.atualizadoEm = agora();
      });
    },
    async adicionarRepertorioNoGrupo(grupoId, repertorioId) {
      mudar((b, eu) => {
        const g = b.grupos.find(x => x.id === grupoId);
        if (!g || !noGrupo(g, eu)) throw new Error('Você não está neste grupo.');
        if (g.repertorios.some(r => r.repertorioId === repertorioId)) throw new Error('Esse repertório já está no grupo.');
        g.repertorios.push({ repertorioId, adicionadoPor: eu });
        g.atualizadoEm = agora();
      });
    },
    async removerRepertoriosDoGrupo(grupoId, repertorioIds) {
      mudar((b, eu) => {
        const g = b.grupos.find(x => x.id === grupoId);
        if (!g) return;
        g.repertorios = g.repertorios.filter(r => !(repertorioIds.includes(r.repertorioId) && (g.donoId === eu || r.adicionadoPor === eu)));
        g.atualizadoEm = agora();
      });
    },
  };
  return store;
}

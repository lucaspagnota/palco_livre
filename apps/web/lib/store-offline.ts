// Guarda no aparelho uma cópia de tudo o que a conta vê (listas, repertórios e a letra de cada música),
// para o site instalado na tela de início do iPhone abrir e tocar sem internet.
// Escrever (salvar, apagar, grupos) continua precisando de internet.
import { apagarCopias, chavesDaCopia, gravarCopias, lerCopia, lerCopias, limparCopia } from './offline';
import { SEM_CONEXAO } from './store-supabase';
import type { Dados, Musica, Store } from './tipos';

const SEM_INTERNET_PARA_SALVAR = 'Sem internet agora. Dá para ver e tocar o que está guardado neste aparelho, mas para salvar é preciso estar conectado.';
const LETRA = 'musica:';
// Sem internet, o Supabase fica uns 30 segundos tentando renovar o login antes de desistir.
// Com uma cópia guardada, não esperamos tanto: depois desse prazo abre a cópia.
const PRAZO = 6000;
// Só para confirmar a conta (a cópia já diz quem é): se demorar, segue com a cópia.
const PRAZO_CONTA = 2500;
// Depois de cair na cópia, as próximas telas abrem direto nela por esse tempo, sem esperar a internet
// (sem internet, trocar de tela recarrega a página). Enquanto isso, o site tenta o banco a cada 30 segundos.
const PAUSA = 30000;
const CHAVE_PAUSA = 'palco-sem-internet-desde';

type Guardado = Dados & { guardadoEm: string };

const desconectado = () => typeof navigator !== 'undefined' && navigator.onLine === false;
const semRede = (e: unknown) => (e as Error)?.message === SEM_CONEXAO || desconectado();

function comPrazo<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((ok, falha) => {
    const t = setTimeout(() => falha(new Error(SEM_CONEXAO)), ms);
    p.then(x => { clearTimeout(t); ok(x); }, e => { clearTimeout(t); falha(e); });
  });
}

/** `alcancavel` responde rápido se o banco está ao alcance, para não deixar o "Salvar" esperando à toa. */
export function comCopiaOffline(base: Store, alcancavel: () => Promise<boolean>): Store {
  /** A última lista carregada, para saber se a letra guardada está na versão mais nova. */
  let ultimo: Dados | null = null;
  /** Quando caiu na cópia pela última vez (0 = está com internet). Fica guardado entre uma tela e outra. */
  let semInternetDesde = lerPausa();
  let proxima: Dados | null = null;
  let baixando = false;
  /** Muda ao sair ou trocar de conta: o que ainda estava baixando não grava mais nada. */
  let geracao = 0;

  async function limpar() {
    geracao++;
    ultimo = null;
    proxima = null;
    await limparCopia();
  }

  const marcar = (quando: number) => { semInternetDesde = quando; gravarPausa(quando); };
  // O aparelho avisou que a internet voltou: a próxima leitura já tenta o banco.
  if (typeof window !== 'undefined') window.addEventListener('online', () => marcar(0));

  const caiuAgora = () => semInternetDesde > 0 && Date.now() - semInternetDesde < PAUSA;
  const usarCopia = () => desconectado() || caiuAgora();

  /** Baixa a letra das músicas novas ou alteradas e apaga as que a conta não vê mais. */
  async function baixarLetras(d: Dados) {
    const g = geracao;
    const versoes = (await lerCopia<Record<string, string>>('versoes')) ?? {};
    const faltam = d.musicas.filter(m => versoes[m.id] !== m.atualizadoEm).map(m => m.id);
    for (let i = 0; i < faltam.length; i += 100) {
      const lote = await base.musicas(faltam.slice(i, i + 100));
      if (g !== geracao) return;
      for (const m of lote) versoes[m.id] = m.atualizadoEm;
      await gravarCopias([...lote.map(m => [LETRA + m.id, m] as [string, unknown]), ['versoes', versoes]]);
    }
    const vivas = new Set(d.musicas.map(m => m.id));
    const sobras = (await chavesDaCopia()).filter(c => c.startsWith(LETRA) && !vivas.has(c.slice(LETRA.length)));
    if (!sobras.length || g !== geracao) return;
    for (const c of sobras) delete versoes[c.slice(LETRA.length)];
    await apagarCopias(sobras);
    await gravarCopias([['versoes', versoes]]);
  }

  async function sincronizar(d: Dados) {
    proxima = d;
    if (baixando) return;
    baixando = true;
    try {
      while (proxima) {
        const x = proxima;
        proxima = null;
        await baixarLetras(x).catch(() => { /* tenta de novo no próximo carregamento */ });
      }
    } finally {
      baixando = false;
    }
  }

  function precisaInternet<A extends unknown[], R>(f: (...a: A) => Promise<R>) {
    return async (...a: A): Promise<R> => {
      if (desconectado()) throw new Error(SEM_INTERNET_PARA_SALVAR);
      // Está mostrando a cópia: confere rápido se a internet voltou antes de tentar salvar.
      if (semInternetDesde) {
        if (!(await alcancavel())) throw new Error(SEM_INTERNET_PARA_SALVAR);
        marcar(0);
      }
      try {
        return await f(...a);
      } catch (e) {
        throw semRede(e) ? new Error(SEM_INTERNET_PARA_SALVAR) : e;
      }
    };
  }

  return {
    demo: base.demo,
    async eu() {
      const c = await lerCopia<Guardado>('dados');
      if (!c) return base.eu();
      if (usarCopia()) return c.eu;
      try {
        const p = await comPrazo(base.eu(), PRAZO_CONTA);
        if (!p) await limpar();
        return p;
      } catch (e) {
        if (!semRede(e)) throw e;
        return c.eu;
      }
    },
    aoMudarConta(cb) {
      return base.aoMudarConta(p => {
        if (!p) void limpar();
        cb(p);
      });
    },
    // Cada conta começa a própria cópia do zero.
    async entrar(email, senha) {
      await limpar();
      await base.entrar(email, senha);
    },
    criarConta: base.criarConta,
    recuperarSenha: base.recuperarSenha,
    novaSenha: base.novaSenha,
    async sair() {
      await limpar();
      await base.sair();
    },
    salvarPerfil: precisaInternet(base.salvarPerfil),

    async carregar() {
      const c = await lerCopia<Guardado>('dados');
      const daCopia = (falhou: boolean): Dados => {
        if (falhou) marcar(Date.now());
        const { guardadoEm, ...d } = c!;
        ultimo = d;
        return { ...d, copiaDe: guardadoEm };
      };
      if (c && usarCopia()) return daCopia(false);
      // Mesmo se passar do prazo, quando a resposta chegar ela vira a nova cópia.
      const g = geracao;
      const pedido = base.carregar().then(async d => {
        marcar(0);
        if (g !== geracao) return d;
        ultimo = d;
        await gravarCopias([['dados', { ...d, guardadoEm: new Date().toISOString() } satisfies Guardado]]);
        void sincronizar(d);
        return d;
      });
      try {
        return c ? await comPrazo(pedido, PRAZO) : await pedido;
      } catch (e) {
        if (c && semRede(e)) return daCopia(true);
        throw e;
      }
    },
    /** Usa a letra guardada quando ela está na mesma versão da lista; só busca na internet o que falta. */
    async musicas(ids) {
      const unicos = [...new Set(ids)];
      const guardadas = await lerCopias<Musica>(unicos.map(id => LETRA + id));
      const versao = new Map((ultimo?.musicas ?? []).map(m => [m.id, m.atualizadoEm]));
      const achadas = new Map<string, Musica>();
      for (const m of guardadas) if (m && versao.get(m.id) === m.atualizadoEm) achadas.set(m.id, m);
      const faltam = unicos.filter(id => !achadas.has(id));
      if (faltam.length) {
        try {
          if (usarCopia()) throw new Error(SEM_CONEXAO);
          const g = geracao;
          const ms = await comPrazo(base.musicas(faltam), PRAZO);
          if (g === geracao) void gravarCopias(ms.map(m => [LETRA + m.id, m] as [string, unknown]));
          for (const m of ms) achadas.set(m.id, m);
        } catch (e) {
          if (!semRede(e)) throw e;
          // Sem internet, uma versão mais antiga da letra é melhor do que nada.
          for (const m of guardadas) if (m && !achadas.has(m.id)) achadas.set(m.id, m);
          if (!achadas.size) throw new Error('Sem internet, e as letras destas músicas ainda não foram guardadas neste aparelho.');
        }
      }
      return unicos.map(id => achadas.get(id)).filter((m): m is Musica => !!m);
    },
    salvarMusica: precisaInternet(base.salvarMusica),
    apagarMusicas: precisaInternet(base.apagarMusicas),
    copiarMusica: precisaInternet(base.copiarMusica),
    importarMusicas: precisaInternet(base.importarMusicas),

    salvarRepertorio: precisaInternet(base.salvarRepertorio),
    apagarRepertorios: precisaInternet(base.apagarRepertorios),
    copiarRepertorio: precisaInternet(base.copiarRepertorio),

    salvarGrupo: precisaInternet(base.salvarGrupo),
    apagarGrupos: precisaInternet(base.apagarGrupos),
    sairDosGrupos: precisaInternet(base.sairDosGrupos),
    adicionarMembro: precisaInternet(base.adicionarMembro),
    removerMembros: precisaInternet(base.removerMembros),
    adicionarRepertorioNoGrupo: precisaInternet(base.adicionarRepertorioNoGrupo),
    removerRepertoriosDoGrupo: precisaInternet(base.removerRepertoriosDoGrupo),
  };
}

function lerPausa() {
  try { return Number(sessionStorage.getItem(CHAVE_PAUSA)) || 0; } catch { return 0; }
}

function gravarPausa(quando: number) {
  try {
    if (quando) sessionStorage.setItem(CHAVE_PAUSA, String(quando));
    else sessionStorage.removeItem(CHAVE_PAUSA);
  } catch { /* sem sessionStorage: só não lembra entre as telas */ }
}

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APARENCIA_PADRAO, CORES, TAMANHOS, TIPOS_REFRAO, VERSAO_CORES, aparenciaGuardada, gridFor, layoutPages, passosDoShow, transposeKey,
  type Aparencia,
} from '@palco/cifra';
import { Tela, recuoDoMarcador } from '@/components/Tela';
import { useDados } from '@/lib/dados';
import type { Musica } from '@/lib/tipos';

interface Prefs {
  tamanho: number;
  ajusteCols: number;
  ajusteLinhas: number;
  aparencia: Aparencia;
  mostrar: 'tudo' | 'letra';
  letraMaiuscula: boolean;
  tituloMaiusculo: boolean;
  duasPaginas: boolean;
}

const PADRAO: Prefs = {
  tamanho: 2, ajusteCols: 0, ajusteLinhas: 0, aparencia: APARENCIA_PADRAO, mostrar: 'tudo',
  letraMaiuscula: false, tituloMaiusculo: false, duasPaginas: false,
};
const CHAVE = 'palco-livre-leitor';

function lerPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
    if (p) return { ...PADRAO, ...p, aparencia: aparenciaGuardada(p.aparencia, p.versaoCores) };
  } catch { /* usa o padrão */ }
  return PADRAO;
}

const margem = 10;
const AVANCAR = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'MediaTrackNext']);
const VOLTAR = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'MediaTrackPrevious']);

function Leitor() {
  const { dados, store, conta, pronto } = useDados();
  const router = useRouter();
  const params = useSearchParams();
  const repId = params.get('repertorio');
  const musicaId = params.get('musica');
  const [prefs, setPrefs] = useState<Prefs>(PADRAO);
  const [musicas, setMusicas] = useState<Musica[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atual, setAtual] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [tons, setTons] = useState<Record<string, number>>({});
  const [menu, setMenu] = useState(false);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [hora, setHora] = useState('');
  const [caixa, setCaixa] = useState<HTMLDivElement | null>(null);
  const irParaFim = useRef(false);

  useEffect(() => { setPrefs(lerPrefs()); }, []);
  const mudar = (p: Partial<Prefs>) => setPrefs(x => {
    const n = { ...x, ...p };
    try { localStorage.setItem(CHAVE, JSON.stringify({ ...n, versaoCores: VERSAO_CORES })); } catch { /* sem espaço */ }
    return n;
  });

  useEffect(() => {
    if (pronto && !conta) router.replace('/entrar');
  }, [pronto, conta, router]);

  const repertorio = repId ? dados?.repertorios.find(r => r.id === repId) : undefined;
  const ids = useMemo(() => {
    if (repertorio) return repertorio.itens.map(i => i.musicaId).filter((x): x is string => !!x);
    if (musicaId) return [musicaId];
    return [];
  }, [repertorio, musicaId]);

  useEffect(() => {
    if (!ids.length) { setMusicas(null); return; }
    let vivo = true;
    store.musicas(ids).then(lista => {
      if (!vivo) return;
      const porId = new Map(lista.map(m => [m.id, m]));
      setMusicas(ids.map(id => porId.get(id)).filter((m): m is Musica => !!m));
    }, e => setErro((e as Error).message));
    return () => { vivo = false; };
  }, [ids, store]);

  // Bloco, número e pausa de cada música do repertório, na mesma ordem da lista de músicas.
  const show = useMemo(() => {
    if (!repertorio || !musicas) return [];
    const tem = new Set(musicas.map(m => m.id));
    return passosDoShow(repertorio.itens, id => tem.has(id));
  }, [repertorio, musicas]);
  const grupos = useMemo(() => {
    const out: { bloco: string | null; itens: number[] }[] = [];
    (musicas ?? []).forEach((_, i) => {
      const bloco = show[i]?.bloco ?? null;
      const ultimo = out[out.length - 1];
      if (ultimo && ultimo.bloco === bloco) ultimo.itens.push(i); else out.push({ bloco, itens: [i] });
    });
    return out;
  }, [musicas, show]);

  useEffect(() => {
    const el = caixa;
    if (!el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth - margem * 2, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [caixa]);

  useEffect(() => {
    const t = () => setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    t();
    const i = setInterval(t, 15000);
    return () => clearInterval(i);
  }, []);

  const musica = musicas?.[atual];
  const passos = musica ? tons[musica.id] ?? 0 : 0;
  const duas = prefs.duasPaginas && area.w > 700;
  const larguraPagina = duas ? (area.w - margem) / 2 : area.w;
  const tamanho = TAMANHOS[prefs.tamanho - 1] ?? 22;
  const recuo = recuoDoMarcador(prefs.aparencia, tamanho);
  const grade = gridFor(Math.max(100, larguraPagina - recuo), Math.max(100, area.h - 8), tamanho, { cols: prefs.ajusteCols, rows: prefs.ajusteLinhas });
  const tom = musica?.tom ? transposeKey(musica.tom, passos) : '';
  const paginas = useMemo(() => musica ? layoutPages(musica.letra, {
    cols: grade.cols, rows: grade.rows, steps: passos, show: prefs.mostrar, upperLyrics: prefs.letraMaiuscula, upperTitle: prefs.tituloMaiusculo,
    key: tom,
  }) : [], [musica, grade.cols, grade.rows, passos, prefs.mostrar, prefs.letraMaiuscula, prefs.tituloMaiusculo, tom]);
  const porVez = duas ? 2 : 1;
  const total = paginas.length;

  useEffect(() => {
    if (irParaFim.current) { irParaFim.current = false; setPagina(Math.max(0, Math.floor((total - 1) / porVez) * porVez)); }
    else setPagina(p => Math.min(p, Math.max(0, total - 1)));
  }, [total, porVez]);

  const avancar = useCallback(() => {
    if (!musicas) return;
    if (pagina + porVez < total) setPagina(pagina + porVez);
    else if (atual + 1 < musicas.length) { setAtual(atual + 1); setPagina(0); }
  }, [musicas, pagina, porVez, total, atual]);

  const voltar = useCallback(() => {
    if (!musicas) return;
    if (pagina > 0) setPagina(Math.max(0, pagina - porVez));
    else if (atual > 0) { irParaFim.current = true; setAtual(atual - 1); }
  }, [musicas, pagina, porVez, atual]);

  const proxima = () => { if (musicas && atual + 1 < musicas.length) { setAtual(atual + 1); setPagina(0); } };
  const sair = () => (history.length > 1 ? history.back() : router.push('/repertorios'));
  // O que vem depois desta música no show: pausa (água) e começo de outro bloco. Aparece no meio da barra de cima.
  const pausa = show[atual]?.pausaDepois ?? null;
  const blocoSeguinte = musicas?.[atual + 1] && show[atual + 1]?.bloco && show[atual + 1].bloco !== show[atual]?.bloco ? show[atual + 1].bloco : null;
  const anterior = () => { if (atual > 0) { setAtual(atual - 1); setPagina(0); } };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (menu || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (AVANCAR.has(e.key)) { e.preventDefault(); avancar(); }
      else if (VOLTAR.has(e.key)) { e.preventDefault(); voltar(); }
      else if (e.key === 'Escape') setMenu(true);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [avancar, voltar, menu]);

  // Mantém a tela acesa enquanto o leitor está aberto (quando o navegador permite).
  useEffect(() => {
    let trava: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then(t => { trava = t; }, () => undefined);
    return () => { trava?.release(); };
  }, []);

  const a = prefs.aparencia;
  const verde = '#ff8a3d';

  if (!pronto || !dados) return <div style={{ background: '#000', color: '#999', height: '100vh', padding: 30 }}>Carregando…</div>;

  if (!ids.length) {
    return (
      <div style={{ background: '#111', color: '#eee', minHeight: '100vh', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Leitor</h1>
        <p>Escolha um repertório para tocar:</p>
        <ul>{dados.repertorios.map(r => <li key={r.id}><Link style={{ color: verde }} href={'/tocar?repertorio=' + r.id}>{r.titulo}</Link></li>)}</ul>
        <p><Link style={{ color: '#9cf' }} href="/repertorios">Voltar ao site</Link></p>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: a.fundo, display: 'flex', flexDirection: 'column', userSelect: 'none', fontFamily: 'var(--ui)' }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #2f4f4f', cursor: 'pointer', padding: '2px 8px 4px' }}>
        <div style={{ flex: 3, minWidth: 0 }} onClick={anterior} title="Música anterior">
          <div style={{ color: verde, fontWeight: 900, fontSize: 19, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{musica?.titulo.toUpperCase() ?? '…'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, color: verde, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
            {musica?.artista ? <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{musica.artista}</span> : null}
            {tom ? <span style={{ fontWeight: 900, fontSize: 16 }}>Tom: {tom}</span> : null}
            {musica?.capo ? <span>Capo {musica.capo}ª</span> : null}
          </div>
        </div>
        {pausa || blocoSeguinte ? (
          <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 8px', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {pausa ? <span style={{ color: '#ffd43b', fontSize: 17, border: '1.5px solid #ffd43b', borderRadius: 14, padding: '0 12px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pausa.toUpperCase()}</span> : null}
            {blocoSeguinte ? <span style={{ color: '#8ce99a', fontSize: 14, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>▸ {blocoSeguinte.toUpperCase()}</span> : null}
          </div>
        ) : null}
        <div style={{ textAlign: 'right', color: '#bbb', fontWeight: 700, fontSize: 17, minWidth: 110 }} onClick={proxima} title="Próxima música">
          <div>♫ {musicas ? atual + 1 : 0} / {musicas?.length ?? 0}</div>
          <div style={{ fontSize: 15 }}>▤ {Math.min(total, Math.floor(pagina / porVez) + 1)} / {Math.ceil(total / porVez)}</div>
          {musicas?.[atual + 1] ? (
            <div style={{ fontSize: 13, fontWeight: 500, maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>▶ {musicas[atual + 1].titulo}</div>
          ) : null}
        </div>
      </div>

      <div ref={setCaixa} style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: `4px ${margem}px` }}>
        {erro ? <p style={{ color: '#f88' }}>{erro}</p> : null}
        {!musicas ? <p style={{ color: '#888' }}>Carregando…</p> : musicas.length === 0 ? <p style={{ color: '#888' }}>Este repertório ainda não tem músicas.</p> : (
          <div style={{ display: 'flex', gap: margem }}>
            {area.w > 0 && paginas.slice(pagina, pagina + porVez).map((p, i) => (
              <Tela key={pagina + i} linhas={p} aparencia={a} fonte={grade.font} altura={grade.line} largura={larguraPagina} recuo={recuo} />
            ))}
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ flex: 1 }} onClick={voltar} aria-label="Página anterior" role="button" />
          <div style={{ flex: 1 }} onClick={avancar} aria-label="Próxima página" role="button" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', borderTop: '2px solid #2f4f4f', padding: '3px 10px', color: verde, fontWeight: 700, fontSize: 14 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 18, whiteSpace: 'nowrap' }}>
          <span>PalcoLivre</span>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{repertorio?.titulo.toUpperCase() ?? ''}</span>
        </div>
        <button
          type="button"
          onClick={sair}
          title="Sair do leitor"
          aria-label="Sair do leitor"
          style={{ height: 30, borderRadius: 15, border: `1.5px solid ${verde}`, background: 'transparent', color: verde, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', margin: '0 12px', font: 'inherit', fontWeight: 800 }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 8l-4 4 4 4M6 12h10" />
          </svg>
          SAIR
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 18 }}>
          <button
            type="button"
            onClick={() => setMenu(true)}
            title="Opções do leitor"
            aria-label="Opções do leitor"
            style={{ width: 30, height: 30, borderRadius: 15, border: `1.5px solid ${verde}`, background: 'transparent', color: verde, cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              {[0, 45, 90, 135, 180, 225, 270, 315].map(g => <rect key={g} x="10.4" y="1.6" width="3.2" height="4.2" rx="0.9" fill="currentColor" stroke="none" transform={`rotate(${g} 12 12)`} />)}
              <circle cx="12" cy="12" r="6.4" /><circle cx="12" cy="12" r="2.4" />
            </svg>
          </button>
          <span>{hora}</span>
        </div>
      </div>

      {menu ? (
        <div className="fundo-modal" onClick={() => setMenu(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2>Opções do leitor</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px 14px', alignItems: 'center' }}>
              <span>Tom desta música</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn ciano pq" onClick={() => musica && setTons({ ...tons, [musica.id]: passos - 1 })}>- Tom</button>
                <button className="btn ciano pq" onClick={() => musica && setTons({ ...tons, [musica.id]: passos + 1 })}>+ Tom</button>
              </span>
              <span>Tamanho da fonte</span>
              <select className="campo" value={prefs.tamanho} onChange={e => mudar({ tamanho: Number(e.target.value) })}>
                {TAMANHOS.map((_, i) => <option key={i} value={i + 1}>{i + 1}{i === 1 ? ' (normal)' : ''}</option>)}
              </select>
              <span>Caracteres por linha ({grade.cols})</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn verde pq" onClick={() => mudar({ ajusteCols: prefs.ajusteCols - 1 })}>−</button>
                <button className="btn verde pq" onClick={() => mudar({ ajusteCols: prefs.ajusteCols + 1 })}>+</button>
              </span>
              <span>Linhas por página ({grade.rows})</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn verde pq" onClick={() => mudar({ ajusteLinhas: prefs.ajusteLinhas - 1 })}>−</button>
                <button className="btn verde pq" onClick={() => mudar({ ajusteLinhas: prefs.ajusteLinhas + 1 })}>+</button>
              </span>
              <span>Letra e cifras</span>
              <select className="campo" value={prefs.mostrar} onChange={e => mudar({ mostrar: e.target.value as Prefs['mostrar'] })}>
                <option value="tudo">Exibir a letra e as cifras</option>
                <option value="letra">Só a letra</option>
              </select>
              <span>Duas páginas lado a lado</span>
              <input type="checkbox" checked={prefs.duasPaginas} onChange={e => mudar({ duasPaginas: e.target.checked })} />
              <span>Letras em maiúsculo</span>
              <input type="checkbox" checked={prefs.letraMaiuscula} onChange={e => mudar({ letraMaiuscula: e.target.checked })} />
              {(['fundo', 'letra', 'cifra', 'refrao', 'tablatura', 'voz2', 'anotacao'] as const).map(k => (
                <FragmentoCor key={k} rotulo={{ fundo: 'Fundo', letra: 'Letra', cifra: 'Cifra', refrao: 'Refrão', tablatura: 'Tablatura', voz2: 'Segunda voz', anotacao: 'Anotação' }[k]} valor={a[k]} mudar={v => mudar({ aparencia: { ...a, [k]: v } })} />
              ))}
              <span>Tipo de refrão</span>
              <select className="campo" value={a.tipoRefrao} onChange={e => mudar({ aparencia: { ...a, tipoRefrao: e.target.value as Aparencia['tipoRefrao'] } })}>
                {TIPOS_REFRAO.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            {musicas && musicas.length > 1 ? (
              <>
                <h2 style={{ marginTop: 18 }}>Ir para</h2>
                <select className="campo" style={{ width: '100%' }} value={atual} onChange={e => { setAtual(Number(e.target.value)); setPagina(0); setMenu(false); }}>
                  {grupos.map((g, gi) => {
                    const opcoes = g.itens.map(i => (
                      <option key={musicas[i].id + i} value={i}>
                        {show[i]?.numero ?? i + 1}. {musicas[i].titulo}{show[i]?.pausaDepois ? `   (depois: ${show[i].pausaDepois})` : ''}
                      </option>
                    ));
                    return g.bloco ? <optgroup key={'g' + gi} label={g.bloco}>{opcoes}</optgroup> : opcoes;
                  })}
                </select>
              </>
            ) : null}
            <p style={{ color: 'var(--suave)', fontSize: 14 }}>Toque na metade direita para avançar e na esquerda para voltar. No topo, o canto direito pula para a próxima música e o título volta para a anterior. O botão redondo ao lado da hora abre estas opções. Pedal e teclado: setas, Page Up/Down, Espaço e Enter.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <button className="btn laranja-claro" onClick={() => mudar({ ...PADRAO })}>Restaurar padrão</button>
              <span style={{ display: 'flex', gap: 8 }}>
                <button className="btn escuro" onClick={sair}>Sair</button>
                <button className="btn azul" onClick={() => setMenu(false)}>Fechar</button>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FragmentoCor({ rotulo, valor, mudar }: { rotulo: string; valor: string; mudar: (v: string) => void }) {
  return (
    <>
      <span>{rotulo}</span>
      <select className="campo" value={valor} onChange={e => mudar(e.target.value)} style={{ borderLeft: `14px solid ${valor}` }}>
        {CORES.map(c => <option key={c.valor} value={c.valor}>{c.nome}</option>)}
      </select>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={null}><Leitor /></Suspense>;
}

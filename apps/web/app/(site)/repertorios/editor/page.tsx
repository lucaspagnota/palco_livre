'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ESTILOS, notePitch, parseChord, semAcento } from '@palco/cifra';
import { Ajuda, RodapeAjuda } from '@/components/Ajuda';
import { Icone } from '@/components/Icone';
import { useDados } from '@/lib/dados';
import { imprimirSetlist } from '@/lib/setlist';
import type { ItemRepertorio, MusicaResumo, Repertorio } from '@/lib/tipos';

interface Linha extends ItemRepertorio { chave: string }

let contador = 0;
const chave = () => 'k' + ++contador;
const comChave = (itens: ItemRepertorio[]): Linha[] => itens.map(i => ({ ...i, chave: chave() }));
/** Mesmo formato para comparar o que está salvo com o que está na tela. */
const limpo = (i: ItemRepertorio): ItemRepertorio => ({ musicaId: i.musicaId, momento: i.momento, pausa: i.pausa ?? null });
const ehMusica = (l: ItemRepertorio) => !!l.musicaId;

type Filtro = '' | 'titulo' | 'artista' | 'estilo' | 'tom' | 'dono';

function alturaDoTom(tom: string) {
  const p = parseChord(tom);
  return p ? (notePitch(p.root.replace('♯', '#').replace('♭', 'b')) ?? 99) + (/^m(?!aj)/.test(p.suffix) ? 0.5 : 0) : 99;
}

function EditorRepertorio() {
  const { store, dados, recarregar } = useDados();
  const router = useRouter();
  const id = useSearchParams().get('id');
  const original: Repertorio | undefined = id ? dados?.repertorios.find(r => r.id === id) : undefined;

  const [titulo, setTitulo] = useState('');
  const [estilo, setEstilo] = useState('');
  const [numerar, setNumerar] = useState(true);
  const [publica, setPublica] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [nomeBloco, setNomeBloco] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [selEsq, setSelEsq] = useState<Set<string>>(new Set());
  const [selDir, setSelDir] = useState<Set<string>>(new Set());
  const [ancora, setAncora] = useState<{ lado: 'esq' | 'dir'; i: number } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('');
  const [valor, setValor] = useState('');
  const [salvo, setSalvo] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const carregado = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!dados) return;
    if (carregado.current === (id ?? null)) return;
    carregado.current = id ?? null;
    const r = id ? dados.repertorios.find(x => x.id === id) : undefined;
    setTitulo(r?.titulo ?? '');
    setEstilo(r?.estilo ?? '');
    setNumerar(r?.numerar ?? true);
    setPublica(r?.publica ?? false);
    setLinhas(comChave(r?.itens ?? []));
    setSelEsq(new Set());
    setSelDir(new Set());
    setSalvo(JSON.stringify([r?.titulo ?? '', r?.estilo ?? '', r?.numerar ?? true, r?.publica ?? false, (r?.itens ?? []).map(limpo)]));
    if (id && !r) setMsg({ tipo: 'erro', texto: 'Repertório não encontrado.' });
  }, [dados, id]);

  const eu = dados?.eu.id;
  const musicas = useMemo(() => new Map((dados?.musicas ?? []).map(m => [m.id, m])), [dados]);
  const itensAtuais: ItemRepertorio[] = linhas.map(limpo);
  const alterado = JSON.stringify([titulo, estilo, numerar, publica, itensAtuais]) !== salvo;
  const somenteLeitura = !!original && original.donoId !== eu && !original.publica;

  useEffect(() => {
    if (!alterado) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [alterado]);

  // Lista da direita: minhas músicas (e as recebidas, se pedir), com o filtro escolhido.
  const disponiveis = useMemo(() => {
    const todas = [...musicas.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base', numeric: true }));
    const q = semAcento(valor.trim());
    return todas.filter(m => {
      if (filtro === 'dono') return valor === 'recebidas' ? m.donoId !== eu : valor === 'todas' ? true : m.donoId === eu;
      if (m.donoId !== eu) return false;
      if (!filtro || !q) return true;
      if (filtro === 'titulo') return semAcento(m.titulo).includes(q);
      if (filtro === 'artista') return semAcento(m.artista) === q;
      if (filtro === 'estilo') return semAcento(m.estilo) === q;
      return semAcento(m.tom) === q;
    });
  }, [musicas, filtro, valor, eu]);

  const opcoesFiltro = useMemo(() => {
    const minhas = [...musicas.values()].filter(m => m.donoId === eu);
    const unicos = (f: (m: MusicaResumo) => string) => [...new Set(minhas.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return { artista: unicos(m => m.artista), estilo: unicos(m => m.estilo), tom: unicos(m => m.tom) };
  }, [musicas, eu]);

  const naSequencia = new Set(linhas.map(l => l.musicaId).filter(Boolean));

  // Clicar e arrastar o mouse por cima das músicas seleciona várias de uma vez.
  const varrendo = useRef<{ lado: 'esq' | 'dir'; inicio: number } | null>(null);
  const ignorarClique = useRef(false);
  useEffect(() => {
    const soltarMouse = () => { varrendo.current = null; };
    window.addEventListener('mouseup', soltarMouse);
    return () => window.removeEventListener('mouseup', soltarMouse);
  }, []);

  function apertar(lado: 'esq' | 'dir', lista: string[], i: number, e: React.MouseEvent) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const sel = lado === 'esq' ? selEsq : selDir;
    // Em cima de uma selecionada da esquerda, segurar e arrastar muda a ordem (como antes).
    if (sel.has(lista[i])) return;
    e.preventDefault();
    (lado === 'esq' ? setSelEsq : setSelDir)(new Set([lista[i]]));
    setAncora({ lado, i });
    varrendo.current = { lado, inicio: i };
    ignorarClique.current = true;
  }

  function passar(lado: 'esq' | 'dir', lista: string[], i: number) {
    const v = varrendo.current;
    if (!v || v.lado !== lado) return;
    const [a, b] = [Math.min(v.inicio, i), Math.max(v.inicio, i)];
    (lado === 'esq' ? setSelEsq : setSelDir)(new Set(lista.slice(a, b + 1)));
  }

  /** Perto da borda de cima ou de baixo, a lista rola enquanto seleciona. */
  function rolarVarrendo(e: React.MouseEvent<HTMLDivElement>) {
    if (!varrendo.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientY < r.top + 30) e.currentTarget.scrollTop -= 14;
    else if (e.clientY > r.bottom - 30) e.currentTarget.scrollTop += 14;
  }

  /** Seleciona todas as linhas de um lado; se já estiverem todas, tira a seleção. */
  function selecionarTodas(lado: 'esq' | 'dir') {
    const lista = lado === 'esq' ? linhas.map(l => l.chave) : disponiveis.map(m => m.id);
    const sel = lado === 'esq' ? selEsq : selDir;
    (lado === 'esq' ? setSelEsq : setSelDir)(lista.every(x => sel.has(x)) ? new Set() : new Set(lista));
  }

  function clicar(lado: 'esq' | 'dir', lista: string[], i: number, e: React.MouseEvent) {
    if (ignorarClique.current) { ignorarClique.current = false; return; }
    const sel = lado === 'esq' ? selEsq : selDir;
    const set = lado === 'esq' ? setSelEsq : setSelDir;
    const id = lista[i];
    if (e.shiftKey && ancora?.lado === lado) {
      const [a, b] = [Math.min(ancora.i, i), Math.max(ancora.i, i)];
      set(new Set(lista.slice(a, b + 1)));
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      const n = new Set(sel);
      if (n.has(id)) n.delete(id); else n.add(id);
      set(n);
    } else set(sel.has(id) && sel.size === 1 ? new Set() : new Set([id]));
    setAncora({ lado, i });
  }

  /** Posição onde entram itens novos: depois do último selecionado à esquerda, ou no fim. */
  function pontoDeEntrada() {
    const idx = linhas.map((l, i) => (selEsq.has(l.chave) ? i : -1)).filter(i => i >= 0);
    return idx.length ? Math.max(...idx) + 1 : linhas.length;
  }

  function incluir(ids: string[]) {
    if (!ids.length) return;
    const novas = ids.map(musicaId => ({ musicaId, momento: null, pausa: null, chave: chave() }));
    const p = pontoDeEntrada();
    setLinhas([...linhas.slice(0, p), ...novas, ...linhas.slice(p)]);
    setSelDir(new Set());
    setSelEsq(new Set(novas.map(n => n.chave)));
  }

  function retirar() {
    setLinhas(linhas.filter(l => !selEsq.has(l.chave)));
    setSelEsq(new Set());
  }

  function mover(passo: -1 | 1) {
    const out = [...linhas];
    const ordem = passo < 0 ? out.map((_, i) => i) : out.map((_, i) => out.length - 1 - i);
    for (const i of ordem) {
      const j = i + passo;
      if (selEsq.has(out[i].chave) && j >= 0 && j < out.length && !selEsq.has(out[j].chave)) [out[i], out[j]] = [out[j], out[i]];
    }
    setLinhas(out);
  }

  /** Reorganiza só as músicas entre um bloco (ou pausa) e outro. */
  function porBloco(fn: (bloco: Linha[]) => Linha[]) {
    const out: Linha[] = [];
    let bloco: Linha[] = [];
    for (const l of linhas) {
      if (!ehMusica(l)) { out.push(...fn(bloco), l); bloco = []; } else bloco.push(l);
    }
    out.push(...fn(bloco));
    setLinhas(out);
  }

  const tituloDe = (l: Linha) => (l.musicaId ? musicas.get(l.musicaId)?.titulo ?? '(música indisponível)' : '');

  /** O bloco entra depois da música selecionada (ou no fim), como as músicas. Sem nome, vira "Bloco 1", "Bloco 2"... */
  function adicionarBloco() {
    const nome = nomeBloco.trim() || `Bloco ${linhas.filter(l => l.momento !== null).length + 1}`;
    const novo: Linha = { musicaId: null, momento: nome, pausa: null, chave: chave() };
    const p = pontoDeEntrada();
    setLinhas([...linhas.slice(0, p), novo, ...linhas.slice(p)]);
    setSelEsq(new Set());
    setNomeBloco('');
  }

  /** A pausa (ÁGUA) entra logo depois da música selecionada (ou no fim). */
  function adicionarPausa() {
    const novo: Linha = { musicaId: null, momento: null, pausa: 'ÁGUA', chave: chave() };
    const p = pontoDeEntrada();
    setLinhas([...linhas.slice(0, p), novo, ...linhas.slice(p)]);
    setSelEsq(new Set());
  }

  function renomear(alvo: string, texto: string) {
    setEditando(null);
    const t = texto.trim();
    if (t) setLinhas(linhas.map(x => (x.chave !== alvo ? x : x.momento !== null ? { ...x, momento: t } : { ...x, pausa: t })));
  }

  function soltar(sobre: string) {
    if (!arrastando || arrastando === sobre) return;
    const movidas = selEsq.has(arrastando) ? linhas.filter(l => selEsq.has(l.chave)) : linhas.filter(l => l.chave === arrastando);
    const chaves = new Set(movidas.map(l => l.chave));
    const resto = linhas.filter(l => !chaves.has(l.chave));
    const p = sobre === '__fim' ? resto.length : resto.findIndex(l => l.chave === sobre);
    setLinhas([...resto.slice(0, p), ...movidas, ...resto.slice(p)]);
  }

  async function salvar() {
    if (somenteLeitura) return;
    if (!titulo.trim()) { setMsg({ tipo: 'erro', texto: 'Dê um título para o repertório.' }); return; }
    setOcupado(true);
    setMsg(null);
    try {
      const novoId = await store.salvarRepertorio({ id: id ?? undefined, titulo: titulo.trim(), estilo, numerar, publica, itens: itensAtuais });
      setSalvo(JSON.stringify([titulo.trim(), estilo, numerar, publica, itensAtuais]));
      setTitulo(titulo.trim());
      setMsg({ tipo: 'ok', texto: 'Repertório salvo.' });
      carregado.current = novoId;
      await recarregar();
      if (!id) router.replace('/repertorios/editor?id=' + novoId);
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); salvarRef.current(); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  /** Setlist do que está na tela (mesmo sem salvar), para imprimir ou salvar em PDF. */
  function setlist() {
    if (!dados) return;
    const dono = dados.perfis[original?.donoId ?? dados.eu.id] ?? dados.eu;
    imprimirSetlist({
      titulo: titulo.trim(), estilo, numerar, itens: itensAtuais, musicas,
      edicao: dono.nome || dono.nick,
      revisao: alterado ? undefined : original?.atualizadoEm,
    });
  }

  function novo() {
    if (alterado && !confirm('Descartar as alterações que não foram salvas?')) return;
    carregado.current = undefined;
    router.push('/repertorios/editor');
  }

  const estilos = useMemo(() => [...new Set([...ESTILOS, ...(dados?.repertorios ?? []).map(r => r.estilo).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [dados]);
  const grupos = (dados?.grupos ?? []).filter(g => id && g.repertorios.some(x => x.repertorioId === id));
  const totalMusicas = linhas.filter(l => l.musicaId).length;
  let n = 0;

  if (!dados) return <p>Carregando…</p>;

  return (
    <>
      <h1 className="titulo-pagina">Editor de Repertório</h1>
      <div className="barra">
        <Ajuda titulo="Editor de repertório">
          <ul>
            <li>À direita ficam as suas músicas. Use <b>Filtrar por</b> para achar mais rápido.</li>
            <li>Selecione músicas à direita e clique em <b>‹</b> (ou dê dois cliques) para colocar na sequência. Elas entram depois da música selecionada à esquerda.</li>
            <li>Selecione à esquerda e use <b>›</b> para tirar, <b>˄ ˅</b> para subir e descer, ou arraste com o mouse.</li>
            <li>Segure <b>Ctrl</b> para selecionar várias, ou <b>Shift</b> para selecionar um intervalo.</li>
            <li>Clique e arraste o mouse por cima das músicas para selecionar várias de uma vez. Depois, segure em cima das selecionadas e arraste para mudar a ordem.</li>
            <li>Os botões laranja embaralham, ordenam de A a Z e ordenam pelo tom. <b>‹ Todas</b> seleciona tudo da sequência e <b>Todas ›</b> seleciona todas as músicas da direita (clique de novo para desmarcar).</li>
            <li><b>+ Bloco</b> separa o show em blocos, como no setlist impresso. Escreva o nome antes (ex.: &quot;Bloco 2 (Rock Nacional e Pop)&quot;) ou deixe em branco para virar Bloco 1, Bloco 2... Ele entra depois da música selecionada, ou no fim.</li>
            <li><b>+ Pausa</b> marca uma parada depois da música selecionada, como a água. No leitor ela aparece antes do nome da próxima música.</li>
            <li>Dê dois cliques num bloco ou numa pausa para mudar o nome.</li>
            <li><b>123</b> mostra a numeração das músicas, que recomeça em cada bloco.</li>
            <li><b>Setlist</b> abre a impressão da lista, com os blocos e as pausas. Escolha <b>Salvar como PDF</b> para mandar para alguém.</li>
            <li>Atalho: <b>Ctrl+S</b> salva.</li>
          </ul>
        </Ajuda>
        <button type="button" className="btn verde" onClick={novo}>Novo</button>
        <button type="button" className="btn azul" onClick={salvar} disabled={ocupado || somenteLeitura}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
        <button type="button" className="btn pessego" onClick={setlist} disabled={!linhas.some(ehMusica)} title="Imprimir ou salvar em PDF para mandar">Setlist</button>
        {alterado ? <span style={{ color: 'var(--suave)', fontSize: 15 }}>Alterações não salvas</span> : null}
        {msg ? <span className={msg.tipo === 'ok' ? 'ok' : 'erro'} style={{ margin: 0, padding: '6px 12px' }}>{msg.texto}</span> : null}
        {id ? <a className="btn escuro pq" href={'/tocar?repertorio=' + id} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto' }}><Icone nome="tocar" tamanho={16} /> Abrir no leitor</a> : null}
      </div>
      {somenteLeitura ? <div className="aviso-demo">Este repertório é de <b>{dados.perfis[original!.donoId]?.nick}</b> e chegou pelo grupo. Só o dono pode editar.</div> : null}

      <div className="editor-rep" style={{ marginBottom: 12 }}>
        <div>
          <div className="linha-campos" style={{ flexWrap: 'nowrap' }}>
            <input className="campo" placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} style={{ flex: 1, minWidth: 0 }} aria-label="Título" autoFocus={!id} />
            <select className="campo" value={estilo} onChange={e => setEstilo(e.target.value)} aria-label="Estilo" style={{ width: 220 }}>
              <option value="">Estilo</option>
              {estilos.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="linha-campos" style={{ flexWrap: 'nowrap' }}>
            <input className="campo verdinho" placeholder="Nome do bloco (opcional)" value={nomeBloco} onChange={e => setNomeBloco(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') adicionarBloco(); }} style={{ flex: 1, minWidth: 0 }} aria-label="Nome do bloco" disabled={somenteLeitura} />
            <button type="button" className="btn bloco" onClick={adicionarBloco} disabled={somenteLeitura} title="Colocar um bloco na sequência">+ Bloco</button>
            <button type="button" className="btn pausa" onClick={adicionarPausa} disabled={somenteLeitura} title="Colocar uma pausa (água) depois da música selecionada">+ Pausa</button>
          </div>
        </div>
        <div />
        <div>
          <div className="linha-campos">
            <select className="campo azulado" style={{ width: '100%' }} value={filtro} onChange={e => { setFiltro(e.target.value as Filtro); setValor(e.target.value === 'dono' ? 'minhas' : ''); }} aria-label="Filtrar por">
              <option value="">Filtrar por</option>
              <option value="titulo">Título</option>
              <option value="artista">Artista</option>
              <option value="estilo">Estilo</option>
              <option value="tom">Tom</option>
              <option value="dono">Minhas / recebidas</option>
            </select>
          </div>
          <div className="linha-campos">
            {filtro === 'titulo' ? (
              <input className="campo" style={{ width: '100%' }} placeholder="Parte do título" value={valor} onChange={e => setValor(e.target.value)} aria-label="Título" />
            ) : filtro === 'dono' ? (
              <select className="campo" style={{ width: '100%' }} value={valor} onChange={e => setValor(e.target.value)} aria-label="De quem">
                <option value="minhas">Minhas músicas</option>
                <option value="recebidas">Recebidas dos grupos</option>
                <option value="todas">Todas</option>
              </select>
            ) : filtro ? (
              <select className="campo" style={{ width: '100%' }} value={valor} onChange={e => setValor(e.target.value)} aria-label="Valor do filtro">
                <option value="">Todos</option>
                {opcoesFiltro[filtro].map(v => <option key={v}>{v}</option>)}
              </select>
            ) : (
              <input className="campo" style={{ width: '100%' }} disabled aria-label="Valor do filtro" />
            )}
          </div>
        </div>
      </div>

      <div className="editor-rep">
        <div>
          <div className="cabeca">
            <label className="check esq"><input type="checkbox" checked={numerar} onChange={e => setNumerar(e.target.checked)} /> 123</label>
            Sequência das músicas <span className="num-vermelho">{totalMusicas}</span>
          </div>
          <div className="caixa-lista" role="listbox" aria-label="Sequência das músicas" aria-multiselectable onMouseMove={rolarVarrendo} onDragOver={e => { e.preventDefault(); }} onDrop={() => { if (alvo === '__fim') soltar('__fim'); setArrastando(null); setAlvo(null); }}>
            {linhas.map((l, i) => {
              const m = l.musicaId ? musicas.get(l.musicaId) : undefined;
              if (l.momento !== null) n = 0;
              if (l.musicaId) n++;
              const tipo = l.momento !== null ? 'momento' : l.pausa ? 'pausa' : '';
              return (
                <div
                  key={l.chave}
                  role="option"
                  aria-selected={selEsq.has(l.chave)}
                  className={['item-lista', tipo, selEsq.has(l.chave) ? 'sel' : '', arrastando === l.chave ? 'arrastando' : '', alvo === l.chave ? 'alvo' : ''].join(' ')}
                  draggable={!somenteLeitura && selEsq.has(l.chave)}
                  onDragStart={() => setArrastando(l.chave)}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setAlvo(l.chave); }}
                  onDrop={e => { e.stopPropagation(); soltar(l.chave); setArrastando(null); setAlvo(null); }}
                  onDragEnd={() => { setArrastando(null); setAlvo(null); }}
                  onMouseDown={e => apertar('esq', linhas.map(x => x.chave), i, e)}
                  onMouseEnter={() => passar('esq', linhas.map(x => x.chave), i)}
                  onClick={e => clicar('esq', linhas.map(x => x.chave), i, e)}
                  onDoubleClick={() => {
                    if (somenteLeitura) return;
                    if (tipo) setEditando(l.chave);
                    else { setLinhas(linhas.filter(x => x.chave !== l.chave)); setSelEsq(new Set()); }
                  }}
                >
                  {editando === l.chave ? (
                    <input
                      className="campo-linha"
                      autoFocus
                      defaultValue={l.momento ?? l.pausa ?? ''}
                      aria-label={tipo === 'momento' ? 'Nome do bloco' : 'Nome da pausa'}
                      onClick={e => e.stopPropagation()}
                      onBlur={e => renomear(l.chave, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditando(null); }}
                    />
                  ) : tipo ? <span>{l.momento ?? l.pausa}</span> : (
                    <>
                      {numerar ? <span className="n">{n}</span> : null}
                      <span>{tituloDe(l)}</span>
                      {m ? <span className="info">{[m.tom, m.capo ? 'Capo ' + m.capo + 'ª' : ''].filter(Boolean).join(' · ')}</span> : null}
                    </>
                  )}
                </div>
              );
            })}
            <div style={{ height: 40 }} onDragOver={e => { e.preventDefault(); setAlvo('__fim'); }} />
          </div>
        </div>

        <div className="botoes-meio">
          <button type="button" className="btn ciano" onClick={() => incluir(disponiveis.filter(m => selDir.has(m.id)).map(m => m.id))} disabled={!selDir.size || somenteLeitura} aria-label="Colocar na sequência" title="Colocar na sequência"><Icone nome="esquerda" traco={3} /></button>
          <button type="button" className="btn ciano" onClick={retirar} disabled={!selEsq.size || somenteLeitura} aria-label="Tirar da sequência" title="Tirar da sequência"><Icone nome="direita" traco={3} /></button>
          <span className="esp" />
          <button type="button" className="btn verde" onClick={() => mover(-1)} disabled={!selEsq.size} aria-label="Subir" title="Subir"><Icone nome="cima" traco={3} /></button>
          <button type="button" className="btn verde" onClick={() => mover(1)} disabled={!selEsq.size} aria-label="Descer" title="Descer"><Icone nome="baixo" traco={3} /></button>
          <span className="esp" />
          <button type="button" className="btn laranja-claro" onClick={() => { if (confirm('Embaralhar as músicas da sequência?')) porBloco(b => [...b].sort(() => Math.random() - 0.5)); }} disabled={totalMusicas < 2} aria-label="Embaralhar" title="Embaralhar"><Icone nome="embaralhar" /></button>
          <button type="button" className="btn laranja-claro" onClick={() => porBloco(b => [...b].sort((x, y) => tituloDe(x).localeCompare(tituloDe(y), 'pt-BR', { sensitivity: 'base', numeric: true })))} disabled={totalMusicas < 2} aria-label="Ordenar de A a Z" title="Ordenar de A a Z"><Icone nome="az" /></button>
          <button type="button" className="btn laranja-claro" onClick={() => porBloco(b => [...b].sort((x, y) => alturaDoTom(musicas.get(x.musicaId ?? '')?.tom ?? '') - alturaDoTom(musicas.get(y.musicaId ?? '')?.tom ?? '')))} disabled={totalMusicas < 2} aria-label="Ordenar pelo tom" title="Ordenar pelo tom"><Icone nome="numero" /></button>
          <button type="button" className="btn laranja-claro todas" onClick={() => selecionarTodas('esq')} disabled={!linhas.length} aria-label="Selecionar todas da sequência" title="Selecionar todas da sequência (esquerda)"><Icone nome="esquerda" tamanho={15} traco={3} /> Todas</button>
          <button type="button" className="btn laranja-claro todas" onClick={() => selecionarTodas('dir')} disabled={!disponiveis.length} aria-label="Selecionar todas as minhas músicas" title="Selecionar todas as minhas músicas (direita)">Todas <Icone nome="direita" tamanho={15} traco={3} /></button>
        </div>

        <div>
          <div className="cabeca">Minhas músicas <span className="contador" style={{ background: 'var(--ciano)' }}>{disponiveis.length}</span></div>
          <div className="caixa-lista direita" role="listbox" aria-label="Minhas músicas" aria-multiselectable onMouseMove={rolarVarrendo}>
            {disponiveis.map((m, i) => (
              <div
                key={m.id}
                role="option"
                aria-selected={selDir.has(m.id)}
                className={'item-lista' + (selDir.has(m.id) ? ' sel' : '')}
                style={naSequencia.has(m.id) && !selDir.has(m.id) ? { opacity: 0.55 } : undefined}
                onMouseDown={e => apertar('dir', disponiveis.map(x => x.id), i, e)}
                onMouseEnter={() => passar('dir', disponiveis.map(x => x.id), i)}
                onClick={e => clicar('dir', disponiveis.map(x => x.id), i, e)}
                onDoubleClick={() => !somenteLeitura && incluir([m.id])}
                title={naSequencia.has(m.id) ? 'Já está na sequência' : undefined}
              >
                <span>{m.titulo}{naSequencia.has(m.id) ? ' ✓' : ''}</span>
                <span className="info">{[m.artista, m.tom].filter(Boolean).join(' · ')}</span>
              </div>
            ))}
            {!disponiveis.length ? <div style={{ padding: 16, color: 'var(--suave)' }}>{musicas.size ? 'Nenhuma música com esse filtro.' : 'Cadastre músicas em Músicas → Nova.'}</div> : null}
          </div>
        </div>
      </div>

      <div className="barra" style={{ marginTop: 18 }}>
        <label className="check"><input type="checkbox" checked={publica} onChange={e => setPublica(e.target.checked)} disabled={!!original && original.donoId !== eu} /> Edição pública.</label>
      </div>

      <section className="caixa">
        <h2>Grupos que o repertório faz parte</h2>
        <table className="lista" style={{ maxWidth: 1000 }}>
          <thead><tr><th className="sem-ordem">Título</th><th className="sem-ordem">Responsável</th><th className="sem-ordem">Membros</th><th className="sem-ordem">Repertórios</th></tr></thead>
          <tbody>
            {grupos.length ? grupos.map(g => (
              <tr key={g.id}>
                <td><Link className="forte" href={'/grupos/editor?id=' + g.id}>{g.titulo}</Link></td>
                <td>{dados.perfis[g.donoId]?.nome || dados.perfis[g.donoId]?.nick}</td>
                <td>{g.membros.length + 1}</td>
                <td>{g.repertorios.length}</td>
              </tr>
            )) : <tr><td colSpan={4}><div className="vazio">Nenhum grupo.</div></td></tr>}
          </tbody>
        </table>
      </section>
      <RodapeAjuda />
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<p>Carregando…</p>}><EditorRepertorio /></Suspense>;
}

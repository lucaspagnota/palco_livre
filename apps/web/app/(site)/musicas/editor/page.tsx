'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  APARENCIA_PADRAO, ESTILOS, INSTRUMENTOS, MARK, TONS, chordShape, flatsForKey, layoutPages, limparTexto, listChords, transposeKey,
  transposeSource, type Instrumento,
} from '@palco/cifra';
import { Ajuda, RodapeAjuda } from '@/components/Ajuda';
import { CampoArtista } from '@/components/CampoArtista';
import { Diagrama } from '@/components/Diagrama';
import { Icone } from '@/components/Icone';
import { Tela, recuoDoMarcador } from '@/components/Tela';
import { useDados } from '@/lib/dados';
import type { Musica } from '@/lib/tipos';

const VAZIA = { titulo: '', artista: '', estilo: '', tom: '', capo: null as number | null, letra: '', publica: true };

const PREVIAS = [
  { id: 'celular', nome: 'Celular em pé', cols: 30, rows: 27 },
  { id: 'tablet', nome: 'Tablet em pé', cols: 42, rows: 34 },
  { id: 'deitado', nome: 'Tablet deitado', cols: 60, rows: 22 },
];

const TABLATURAS: Record<string, string> = {
  'Violão / Guitarra': 'e|----------------|\nB|----------------|\nG|----------------|\nD|----------------|\nA|----------------|\nE|----------------|',
  Baixo: 'G|----------------|\nD|----------------|\nA|----------------|\nE|----------------|',
  Cavaco: 'D|----------------|\nB|----------------|\nG|----------------|\nD|----------------|',
  Ukulele: 'A|----------------|\nE|----------------|\nC|----------------|\nG|----------------|',
};

function EditorMusica() {
  const { store, dados, recarregar } = useDados();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [m, setM] = useState(VAZIA);
  const [original, setOriginal] = useState<Musica | null>(null);
  const [salvo, setSalvo] = useState(JSON.stringify(VAZIA));
  const [carregando, setCarregando] = useState(!!id);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [previa, setPrevia] = useState(PREVIAS[0]);
  const [textoPrevia, setTextoPrevia] = useState('');
  const [instrumento, setInstrumento] = useState<Instrumento>('violao');
  const [canhoto, setCanhoto] = useState(false);
  const [menu, setMenu] = useState<'tab' | 'aaa' | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) { setM(VAZIA); setOriginal(null); setSalvo(JSON.stringify(VAZIA)); setCarregando(false); return; }
    let vivo = true;
    setCarregando(true);
    store.musicas([id]).then(([mus]) => {
      if (!vivo) return;
      if (!mus) { setMsg({ tipo: 'erro', texto: 'Música não encontrada.' }); setCarregando(false); return; }
      const campos = { titulo: mus.titulo, artista: mus.artista, estilo: mus.estilo, tom: mus.tom, capo: mus.capo, letra: mus.letra, publica: mus.publica };
      setM(campos);
      setOriginal(mus);
      setSalvo(JSON.stringify(campos));
      setTextoPrevia(mus.letra);
      setCarregando(false);
    }, e => { setMsg({ tipo: 'erro', texto: (e as Error).message }); setCarregando(false); });
    return () => { vivo = false; };
  }, [id, store]);

  // A prévia acompanha o texto com um pequeno atraso.
  useEffect(() => {
    const t = setTimeout(() => setTextoPrevia(m.letra), 350);
    return () => clearTimeout(t);
  }, [m.letra]);

  const alterada = JSON.stringify(m) !== salvo;
  const eu = dados?.eu.id;
  const somenteLeitura = !!original && original.donoId !== eu && !original.publica;

  useEffect(() => {
    if (!alterada) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [alterada]);

  async function salvar() {
    if (somenteLeitura) return;
    if (!m.titulo.trim()) { setMsg({ tipo: 'erro', texto: 'Dê um título para a música.' }); return; }
    setOcupado(true);
    setMsg(null);
    try {
      const novoId = await store.salvarMusica({ ...m, titulo: m.titulo.trim(), artista: m.artista.trim(), id: id ?? undefined });
      setSalvo(JSON.stringify(m));
      setMsg({ tipo: 'ok', texto: 'Música salva.' });
      await recarregar();
      if (!id) router.replace('/musicas/editor?id=' + novoId);
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  // Ctrl+S salva.
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); salvarRef.current(); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  function nova() {
    if (alterada && !confirm('Descartar as alterações que não foram salvas?')) return;
    router.push('/musicas/editor');
    if (!id) { setM(VAZIA); setSalvo(JSON.stringify(VAZIA)); setTextoPrevia(''); }
  }

  /** Troca o trecho selecionado (ou as linhas inteiras dele) e mantém o foco no texto. */
  function trocar(fn: (texto: string, ini: number, fim: number) => { texto: string; ini: number; fim: number }) {
    const el = area.current;
    if (!el) return;
    const r = fn(m.letra, el.selectionStart, el.selectionEnd);
    setM(x => ({ ...x, letra: r.texto }));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.ini, r.fim); });
  }

  function marcarBloco(inicio: string, fim: string) {
    trocar((texto, s, e) => {
      const ini = texto.lastIndexOf('\n', s - 1) + 1;
      let ate = e > s && texto[e - 1] === '\n' ? e - 1 : e;
      const quebra = texto.indexOf('\n', ate);
      ate = quebra < 0 ? texto.length : quebra;
      const bloco = texto.slice(ini, ate);
      const antes = texto.slice(0, ini);
      const depois = texto.slice(ate);
      // Se já está marcado, desmarca.
      if (antes.endsWith(inicio + '\n') && depois.startsWith('\n' + fim)) {
        const a = antes.slice(0, -(inicio.length + 1));
        return { texto: a + bloco + depois.slice(fim.length + 1), ini: a.length, fim: a.length + bloco.length };
      }
      const novo = inicio + '\n' + bloco + '\n' + fim;
      return { texto: antes + novo + depois, ini: ini, fim: ini + novo.length };
    });
  }

  function inserir(trecho: string) {
    trocar((texto, s, e) => {
      const ini = texto.lastIndexOf('\n', s - 1) + 1;
      const antes = texto.slice(0, ini);
      const novo = trecho + '\n';
      return { texto: antes + novo + texto.slice(ini), ini: ini, fim: ini + novo.length - 1 + (e - s) * 0 };
    });
  }

  function caixa(tipo: 'maiusculas' | 'minusculas' | 'primeira') {
    trocar((texto, s, e) => {
      if (s === e) { s = 0; e = texto.length; }
      const trecho = texto.slice(s, e);
      const novo = tipo === 'maiusculas' ? trecho.toUpperCase() : tipo === 'minusculas' ? trecho.toLowerCase()
        : trecho.toLowerCase().replace(/(^|\n)(\s*)(\S)/g, (_x, a: string, b: string, c: string) => a + b + c.toUpperCase());
      return { texto: texto.slice(0, s) + novo + texto.slice(e), ini: s, fim: s + novo.length };
    });
  }

  function transpor(passos: number) {
    const novoTom = m.tom ? transposeKey(m.tom, passos) : '';
    const letra = transposeSource(m.letra, passos, flatsForKey(novoTom || null));
    setM(x => ({ ...x, letra, tom: novoTom }));
  }

  // A caixa da letra cresce junto com a música, então não tem rolagem dentro dela.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const rolagem = window.scrollY;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 2 + 'px';
    window.scrollTo(window.scrollX, rolagem);
  }, [m.letra, carregando]);

  const paginas = useMemo(
    () => layoutPages(textoPrevia, { cols: previa.cols, rows: previa.rows, key: m.tom }),
    [textoPrevia, previa, m.tom],
  );
  const largura = 380;
  const recuo = recuoDoMarcador(APARENCIA_PADRAO, 22 * largura / 400);
  const fonte = ((largura - recuo) / (previa.cols * 0.6)) * 0.98;
  const alturaLinha = Math.round(fonte * 1.3 * 10) / 10;

  const acordes = useMemo(() => listChords(textoPrevia), [textoPrevia]);
  const artistas = useMemo(() => [...new Set((dados?.musicas ?? []).map(x => x.artista).filter(Boolean))].sort(), [dados]);
  const estilos = useMemo(() => [...new Set([...ESTILOS, ...(dados?.musicas ?? []).map(x => x.estilo).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [dados]);
  const repertorios = useMemo(() => (dados?.repertorios ?? []).flatMap(r => {
    const musicas = r.itens.filter(i => i.musicaId);
    const pos = musicas.findIndex(i => i.musicaId === id);
    return id && pos >= 0 ? [{ r, total: musicas.length, pos: pos + 1 }] : [];
  }), [dados, id]);

  const ferramentas = (
    <div className="ferramentas">
      <button type="button" className="btn pessego pq" onClick={() => { area.current?.focus(); area.current?.select(); }}>Selec tudo</button>
      <button type="button" className="btn pessego pq" onClick={() => marcarBloco(MARK.refraoStart, MARK.refraoEnd)} title="Marca as linhas selecionadas como refrão">Refrão</button>
      <button type="button" className="btn pessego pq" onClick={() => marcarBloco(MARK.voz2Start, MARK.voz2End)} title="Marca as linhas selecionadas como 2ª voz">2ª Voz</button>
      <span className="sep" />
      <button type="button" className="btn ciano pq" onClick={() => transpor(-1)} title="Desce meio tom">- Tom</button>
      <button type="button" className="btn ciano pq" onClick={() => transpor(1)} title="Sobe meio tom">+ Tom</button>
      <span className="sep" />
      <span style={{ position: 'relative' }}>
        <button type="button" className="btn roxo pq" onClick={() => setMenu(x => (x === 'tab' ? null : 'tab'))}>Tablaturas ▾</button>
        {menu === 'tab' ? (
          <span className="menu" style={{ left: 0, right: 'auto' }}>
            {Object.keys(TABLATURAS).map(k => <button key={k} type="button" onClick={() => { setMenu(null); inserir(TABLATURAS[k]); }}>{k}</button>)}
          </span>
        ) : null}
      </span>
      <span className="sep" />
      <span style={{ position: 'relative' }}>
        <button type="button" className="btn ciano pq" onClick={() => setMenu(x => (x === 'aaa' ? null : 'aaa'))} title="Maiúsculas e minúsculas do trecho selecionado">Aaaa</button>
        {menu === 'aaa' ? (
          <span className="menu" style={{ left: 0, right: 'auto' }}>
            <button type="button" onClick={() => { setMenu(null); caixa('maiusculas'); }}>TUDO MAIÚSCULO</button>
            <button type="button" onClick={() => { setMenu(null); caixa('minusculas'); }}>tudo minúsculo</button>
            <button type="button" onClick={() => { setMenu(null); caixa('primeira'); }}>Primeira letra da linha maiúscula</button>
          </span>
        ) : null}
      </span>
    </div>
  );

  if (carregando) return <p>Carregando…</p>;

  return (
    <>
      <h1 className="titulo-pagina">Editor de Música</h1>
      <div className="barra">
        <Ajuda titulo="Editor de música">
          <ul>
            <li>Escreva ou cole a letra cifrada à esquerda, com os acordes na linha de cima da letra. Use espaços para alinhar o acorde em cima da sílaba.</li>
            <li>Partes entre colchetes, como <code>[Refrão]</code> ou <code>[Intro] C G Am</code>, aparecem como no leitor.</li>
            <li>Selecione linhas e clique em <b>Refrão</b> ou <b>2ª Voz</b> para destacar. Clique de novo para tirar.</li>
            <li><b>- Tom</b> e <b>+ Tom</b> mudam todos os acordes e o tom da música.</li>
            <li><b>Tablaturas</b> coloca um modelo de tablatura na linha do cursor.</li>
            <li>Comece uma linha com <code>//</code> para escrever uma anotação (aparece em cinza no leitor).</li>
            <li>A prévia à direita mostra as páginas exatamente como vão aparecer no app.</li>
            <li><b>Edição pública</b>: quem receber a música pelos grupos também pode editar.</li>
            <li>Atalho: <b>Ctrl+S</b> salva.</li>
          </ul>
          <pre>{`[Intro] C  Am7  G

[Primeira Parte]
        C
A minha vida
{refrão}
F9  G9
      Eu quero sempre mais
{/refrão}`}</pre>
        </Ajuda>
        <button type="button" className="btn verde" onClick={nova}>Nova</button>
        <button type="button" className="btn azul" onClick={salvar} disabled={ocupado || somenteLeitura}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
        {alterada ? <span style={{ color: 'var(--suave)', fontSize: 15 }}>Alterações não salvas</span> : null}
        {msg ? <span className={msg.tipo === 'ok' ? 'ok' : 'erro'} style={{ margin: 0, padding: '6px 12px' }}>{msg.texto}</span> : null}
      </div>
      {somenteLeitura ? (
        <div className="aviso-demo">Esta música é de <b>{dados?.perfis[original!.donoId]?.nick}</b> e chegou pelo grupo. Só o dono pode editar. Para ter a sua versão, use <b>•••</b> → Copiar na lista de músicas.</div>
      ) : null}

      <div className="linha-campos">
        <input className="campo" placeholder="Título" value={m.titulo} onChange={e => setM({ ...m, titulo: e.target.value })} style={{ flex: '2 1 360px' }} autoFocus={!id} aria-label="Título" />
        <CampoArtista valor={m.artista} aoMudar={artista => setM(x => ({ ...x, artista }))} meus={artistas} estilo={{ flex: '1.4 1 260px' }} />
        <select className="campo" value={m.tom} onChange={e => setM({ ...m, tom: e.target.value })} aria-label="Tom" style={{ width: 100 }}>
          <option value="">Tom</option>
          {TONS.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="campo" value={m.estilo} onChange={e => setM({ ...m, estilo: e.target.value })} aria-label="Estilo" style={{ flex: '1 1 220px' }}>
          <option value="">Estilo</option>
          {estilos.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="linha-campos">
        <label className="check" style={{ cursor: 'default' }}>
          Usar capotraste na
          <input className="campo" type="number" min={1} max={12} value={m.capo ?? ''} onChange={e => setM({ ...m, capo: e.target.value ? Math.min(12, Math.max(1, Number(e.target.value))) : null })} style={{ width: 66, height: 40, padding: '0 8px' }} aria-label="Casa do capotraste" />
          ª casa.
        </label>
        <span className="sep" style={{ width: 10 }} />
        {ferramentas}
      </div>

      <div className="editor-musica">
        <div>
          <div className="rotulo">Letra cifrada</div>
          <textarea
            ref={area}
            className="texto-cifra"
            placeholder="Digite ou cole a letra cifrada aqui..."
            value={m.letra}
            onChange={e => setM({ ...m, letra: e.target.value })}
            onPaste={e => {
              // Texto copiado de outros sites pode trazer espaços diferentes e caracteres invisíveis: já cola limpo.
              const colado = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
              const limpo = limparTexto(colado);
              if (limpo === colado) return;
              e.preventDefault();
              if (!document.execCommand('insertText', false, limpo)) {
                trocar((texto, s, f) => ({ texto: texto.slice(0, s) + limpo + texto.slice(f), ini: s + limpo.length, fim: s + limpo.length }));
              }
            }}
            readOnly={somenteLeitura}
            spellCheck={false}
            aria-label="Letra cifrada"
            onKeyDown={e => {
              if (e.key === 'Tab') {
                e.preventDefault();
                trocar((texto, s, f) => ({ texto: texto.slice(0, s) + '  ' + texto.slice(f), ini: s + 2, fim: s + 2 }));
              }
            }}
          />
        </div>
        <div className="previa">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="button" className="atualizar" onClick={() => setTextoPrevia(m.letra)}>Atualizar</button>
            <select className="campo" style={{ height: 32, fontSize: 14 }} value={previa.id} onChange={e => setPrevia(PREVIAS.find(p => p.id === e.target.value)!)} aria-label="Tamanho da prévia">
              {PREVIAS.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="previa-paginas">
            {paginas.map((p, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                <Tela linhas={p} aparencia={APARENCIA_PADRAO} fonte={fonte} altura={alturaLinha} largura={largura} linhasPorPagina={previa.rows} recuo={recuo} />
                <span className="previa-num">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="barra" style={{ marginTop: 18 }}>
        <label className="check"><input type="checkbox" checked={m.publica} onChange={e => setM({ ...m, publica: e.target.checked })} disabled={!!original && original.donoId !== eu} /> Edição pública.</label>
        {ferramentas}
      </div>

      <section className="caixa">
        <h2>Acordes relacionados <span title="Desenhos dos acordes usados na música" style={{ color: 'var(--ciano)' }}><Icone nome="info" tamanho={18} /></span></h2>
        <div className="barra" style={{ marginBottom: 12 }}>
          {INSTRUMENTOS.map(i => (
            <label key={i.id} className="check"><input type="radio" name="instrumento" checked={instrumento === i.id} onChange={() => setInstrumento(i.id)} /> {i.id === 'violao' ? 'violão' : i.id === 'cavaco' ? 'cavaco' : 'ukulele'}</label>
          ))}
          <label className="check" style={{ marginLeft: 30 }}><input type="checkbox" checked={canhoto} onChange={e => setCanhoto(e.target.checked)} /> Acordes invertidos (canhoto)</label>
        </div>
        {acordes.length ? (
          <div className="acordes">
            {acordes.map(c => {
              const f = chordShape(c, instrumento, canhoto);
              return (
                <div key={c} className="acorde">
                  <span>{c}</span>
                  {f ? <Diagrama forma={f} /> : <span style={{ color: 'var(--suave)', fontWeight: 400, fontSize: 13, padding: 20 }}>sem desenho</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="vazio">Nenhum acorde encontrado.<br /><span style={{ fontWeight: 400 }}>Adicione cifras na letra da música para que os desenhos dos acordes apareçam aqui.</span></div>
        )}
      </section>

      <section className="caixa">
        <h2>Repertórios que a música faz parte</h2>
        <table className="lista">
          <thead><tr><th className="sem-ordem">Título</th><th className="sem-ordem">Estilo</th><th className="sem-ordem">Músicas</th><th className="sem-ordem">Posição</th></tr></thead>
          <tbody>
            {repertorios.length ? repertorios.map(({ r, total, pos }) => (
              <tr key={r.id}>
                <td><Link className="forte" href={'/repertorios/editor?id=' + r.id}>{r.titulo}</Link></td>
                <td>{r.estilo}</td><td>{total}</td><td>{pos}</td>
              </tr>
            )) : <tr><td colSpan={4}><div className="vazio">Nenhum repertório.</div></td></tr>}
          </tbody>
        </table>
      </section>
      <RodapeAjuda />
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<p>Carregando…</p>}><EditorMusica /></Suspense>;
}

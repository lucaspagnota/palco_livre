'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { semAcento } from '@palco/cifra';
import { Ajuda, RodapeAjuda } from '@/components/Ajuda';
import { FavoritoToqueFacil } from '@/components/FavoritoToqueFacil';
import { useDados } from '@/lib/dados';
import { chaveMusica, lerArquivo, type MusicaImportada } from '@/lib/importar';
import { casarRepertorios, lerArquivoDeRepertorios, type PlanoRepertorio } from '@/lib/importar-repertorios';

/** Arquivo salvo no Bloco de Notas antigo vem em ANSI (Windows-1252), não em UTF-8: os acentos se perdem se ler errado. */
async function lerTexto(f: File) {
  const bytes = await f.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return new TextDecoder('windows-1252').decode(bytes); }
}

const nomeRepertorio = (t: string) => semAcento(t.trim()).replace(/\s+/g, ' ');

export default function Importar() {
  const { dados, store, recarregar } = useDados();
  const [lidas, setLidas] = useState<MusicaImportada[] | null>(null);
  const [reps, setReps] = useState<PlanoRepertorio[] | null>(null);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [comRepetidas, setComRepetidas] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [feitas, setFeitas] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const eu = dados?.eu.id;
  const minhas = useMemo(() => (dados?.musicas ?? []).filter(m => m.donoId === eu), [dados, eu]);
  const naConta = useMemo(() => new Set(minhas.map(m => chaveMusica(m.titulo, m.artista))), [minhas]);
  const repsNaConta = useMemo(() => new Set((dados?.repertorios ?? []).filter(r => r.donoId === eu).map(r => nomeRepertorio(r.titulo))), [dados, eu]);
  const repetida = (m: MusicaImportada) => naConta.has(chaveMusica(m.titulo, m.artista));
  const repRepetido = (r: PlanoRepertorio) => repsNaConta.has(nomeRepertorio(r.titulo));
  const qtdRepetidas = lidas ? lidas.filter(repetida).length : reps ? reps.filter(repRepetido).length : 0;
  const entrar = (lidas ?? []).filter(m => comRepetidas || !repetida(m));
  const entrarReps = (reps ?? []).filter(r => comRepetidas || !repRepetido(r));
  const faltando = useMemo(() => [...new Set((reps ?? []).flatMap(r => r.faltando))].sort((a, b) => a.localeCompare(b)), [reps]);
  const importando = feitas !== null;
  const qtd = lidas ? entrar.length : entrarReps.length;
  const coisa = (n: number) => (lidas ? (n === 1 ? 'música' : 'músicas') : n === 1 ? 'repertório' : 'repertórios');

  async function escolher(arquivos: File[]) {
    setMsg(null);
    setLidas(null);
    setReps(null);
    if (!arquivos.length) return;
    setLendo(true);
    try {
      const todas: MusicaImportada[] = [];
      const naoVieram: string[] = [];
      for (const f of arquivos) {
        const conteudo = await lerTexto(f);
        const r = lerArquivoDeRepertorios(conteudo, f.name);
        if (r) {
          if (arquivos.length > 1) throw new Error('O arquivo de repertórios vai sozinho: escolha só ele.');
          if (!r.repertorios.length) throw new Error('Não achei repertórios nesse arquivo.');
          // Liga cada música do repertório à mesma música que já está no Palco Livre.
          setReps(await casarRepertorios(r.repertorios, minhas, ids => store.musicas(ids)));
          setFalhas(r.falhas);
          setNomeArquivo(f.name);
          return;
        }
        const l = lerArquivo(conteudo, f.name);
        todas.push(...l.musicas);
        naoVieram.push(...l.falhas);
      }
      if (!todas.length) throw new Error('Não achei nenhuma música nesse arquivo.');
      setLidas(todas);
      setFalhas(naoVieram);
      setNomeArquivo(arquivos.length === 1 ? arquivos[0].name : arquivos.length + ' arquivos');
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setLendo(false);
    }
  }

  async function importar() {
    if (!qtd) return;
    setMsg(null);
    setFeitas(0);
    let n = 0;
    try {
      if (lidas) {
        n = await store.importarMusicas(entrar, x => { n = x; setFeitas(x); });
        setLidas(null);
      } else {
        for (const r of entrarReps) {
          await store.salvarRepertorio({ titulo: r.titulo, estilo: r.estilo, numerar: r.numerar, publica: false, itens: r.itens });
          setFeitas(++n);
        }
        setReps(null);
      }
      setMsg({ tipo: 'ok', texto: `Pronto: ${n} ${coisa(n)} ${lidas ? (n === 1 ? 'importada' : 'importadas') : n === 1 ? 'importado' : 'importados'}.` });
    } catch (e) {
      // Os que já entraram aparecem como "já está na conta" e não se repetem se tentar de novo.
      setMsg({ tipo: 'erro', texto: (e as Error).message + (n ? ` Entraram ${n} de ${qtd}; clique em Importar de novo para continuar de onde parou.` : '') });
    } finally {
      setFeitas(null);
      await recarregar();
    }
  }

  return (
    <>
      <h1 className="titulo-pagina">Importar músicas e repertórios</h1>
      <div className="barra">
        <Ajuda titulo="Importar músicas e repertórios">
          <ul>
            <li>Para trazer as músicas e os repertórios do Toque Fácil, siga o passo 1 e depois escolha o arquivo que ele baixou. Importe primeiro as músicas e depois os repertórios.</li>
            <li>Cada música do repertório é ligada à música com o mesmo título e artista que você já tem aqui. As que não estiverem aqui ficam de fora, e a tela avisa quais são.</li>
            <li>Também dá para escolher arquivos <b>.txt</b>, um por música. Se o nome do arquivo for &quot;Artista - Título.txt&quot;, o artista e o título são preenchidos sozinhos.</li>
            <li>Músicas com o mesmo título e artista de uma que você já tem (e repertórios com o mesmo nome) ficam de fora, para não duplicar. Marque <b>Importar também as repetidas</b> se quiser os dois.</li>
            <li>O que você importa entra em <b>Minhas músicas</b> e em <b>Repertórios</b>, e dá para editar depois.</li>
          </ul>
        </Ajuda>
        <Link href="/musicas" className="btn escuro">Voltar para Músicas</Link>
        {msg ? <span className={msg.tipo === 'ok' ? 'ok' : 'erro'} style={{ margin: 0, padding: '6px 12px' }}>{msg.texto}</span> : null}
      </div>

      <section className="caixa">
        <h2>1. Tirar as músicas e os repertórios do Toque Fácil</h2>
        <FavoritoToqueFacil />
      </section>

      <section className="caixa">
        <h2>2. Escolher o arquivo</h2>
        <input type="file" accept=".json,.txt,application/json,text/plain" multiple disabled={importando || lendo} onChange={e => { escolher(Array.from(e.target.files ?? [])); e.target.value = ''; }} aria-label="Arquivo de músicas ou repertórios" />
        {lendo ? <p style={{ margin: '10px 0 0' }}>Lendo o arquivo e procurando as suas músicas…</p> : null}
      </section>

      {lidas || reps ? (
        <section className="caixa">
          <h2>3. Conferir e importar</h2>
          <p style={{ marginTop: 0 }}>
            <b>{nomeArquivo}</b>: {(lidas ?? reps ?? []).length} {coisa((lidas ?? reps ?? []).length)}.
            {qtdRepetidas
              ? lidas
                ? ` ${qtdRepetidas === 1 ? '1 já está' : qtdRepetidas + ' já estão'} na sua conta com o mesmo título e artista.`
                : ` ${qtdRepetidas === 1 ? '1 já está' : qtdRepetidas + ' já estão'} na sua conta com o mesmo nome.`
              : ''}
          </p>
          {reps && !minhas.length ? (
            <div className="erro">
              Você ainda não tem músicas no Palco Livre, então os repertórios entrariam vazios. Importe primeiro o arquivo de músicas (<b>musicas-toque-facil.json</b>) e depois este.
            </div>
          ) : reps && faltando.length ? (
            <div className="aviso-demo">
              {faltando.length === 1 ? '1 música dos repertórios não está' : faltando.length + ' músicas dos repertórios não estão'} no Palco Livre e {faltando.length === 1 ? 'vai ficar' : 'vão ficar'} de fora:{' '}
              <b>{faltando.join(', ')}</b>.
            </div>
          ) : null}
          {falhas.length ? (
            <div className="aviso-demo">
              {falhas.length === 1 ? (lidas ? '1 música não veio' : '1 repertório não veio') : falhas.length + (lidas ? ' músicas não vieram' : ' repertórios não vieram')} do Toque Fácil (não abriram na hora de copiar):{' '}
              <b>{falhas.join(', ')}</b>. Dá para rodar o favorito de novo depois; o que já estiver aqui não se repete.
            </div>
          ) : null}
          <div className="mini-barra" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
            {qtdRepetidas ? (
              <label className="check"><input type="checkbox" checked={comRepetidas} onChange={e => setComRepetidas(e.target.checked)} disabled={importando} /> Importar também {lidas ? 'as repetidas' : 'os repetidos'}</label>
            ) : null}
            {qtd ? (
              <button type="button" className="btn verde" onClick={importar} disabled={importando || (!!reps && !minhas.length)}>
                {importando ? `Importando… ${feitas} de ${qtd}` : `Importar ${qtd} ${coisa(qtd)}`}
              </button>
            ) : <b>Nada novo para importar.</b>}
          </div>
          <div className="tabela-rolagem" style={{ maxHeight: 460, overflowY: 'auto', background: 'var(--painel)' }}>
            {lidas ? (
              <table className="lista" style={{ fontSize: 16 }}>
                <thead><tr><th className="sem-ordem">Título</th><th className="sem-ordem">Artista</th><th className="sem-ordem">Tom</th><th className="sem-ordem some-cel">Estilo</th></tr></thead>
                <tbody>
                  {lidas.map((m, i) => (
                    <tr key={i} style={repetida(m) && !comRepetidas ? { opacity: 0.5 } : undefined}>
                      <td>{m.titulo}{repetida(m) ? <span className="selo">já está na conta</span> : null}</td>
                      <td>{m.artista}</td>
                      <td>{m.tom}</td>
                      <td className="some-cel">{m.estilo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="lista" style={{ fontSize: 16 }}>
                <thead><tr><th className="sem-ordem">Repertório</th><th className="sem-ordem">Músicas</th><th className="sem-ordem some-cel">Estilo</th></tr></thead>
                <tbody>
                  {(reps ?? []).map((r, i) => {
                    const achadas = r.itens.filter(x => x.musicaId).length;
                    return (
                      <tr key={i} style={repRepetido(r) && !comRepetidas ? { opacity: 0.5 } : undefined}>
                        <td>{r.titulo}{repRepetido(r) ? <span className="selo">já está na conta</span> : null}</td>
                        <td title={r.faltando.length ? 'Ficam de fora: ' + r.faltando.join(', ') : undefined} style={achadas < r.total ? { color: 'var(--vermelho, #c0392b)', fontWeight: 700 } : undefined}>
                          {achadas < r.total ? `${achadas} de ${r.total}` : r.total}
                        </td>
                        <td className="some-cel">{r.estilo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : null}
      <RodapeAjuda />
    </>
  );
}

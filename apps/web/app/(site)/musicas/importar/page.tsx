'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Ajuda, RodapeAjuda } from '@/components/Ajuda';
import { FavoritoToqueFacil } from '@/components/FavoritoToqueFacil';
import { useDados } from '@/lib/dados';
import { chaveMusica, lerArquivo, type MusicaImportada } from '@/lib/importar';

/** Arquivo salvo no Bloco de Notas antigo vem em ANSI (Windows-1252), não em UTF-8: os acentos se perdem se ler errado. */
async function lerTexto(f: File) {
  const bytes = await f.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return new TextDecoder('windows-1252').decode(bytes); }
}

export default function Importar() {
  const { dados, store, recarregar } = useDados();
  const [lidas, setLidas] = useState<MusicaImportada[] | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [comRepetidas, setComRepetidas] = useState(false);
  const [feitas, setFeitas] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const eu = dados?.eu.id;
  const naConta = useMemo(() => new Set((dados?.musicas ?? []).filter(m => m.donoId === eu).map(m => chaveMusica(m.titulo, m.artista))), [dados, eu]);
  const repetida = (m: MusicaImportada) => naConta.has(chaveMusica(m.titulo, m.artista));
  const qtdRepetidas = (lidas ?? []).filter(repetida).length;
  const entrar = (lidas ?? []).filter(m => comRepetidas || !repetida(m));
  const importando = feitas !== null;

  async function escolher(arquivos: File[]) {
    setMsg(null);
    setLidas(null);
    if (!arquivos.length) return;
    try {
      const todas: MusicaImportada[] = [];
      for (const f of arquivos) todas.push(...lerArquivo(await lerTexto(f), f.name));
      if (!todas.length) throw new Error('Não achei nenhuma música nesse arquivo.');
      setLidas(todas);
      setNomeArquivo(arquivos.length === 1 ? arquivos[0].name : arquivos.length + ' arquivos');
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  async function importar() {
    if (!entrar.length) return;
    setMsg(null);
    setFeitas(0);
    let n = 0;
    try {
      n = await store.importarMusicas(entrar, x => { n = x; setFeitas(x); });
      setLidas(null);
      setMsg({ tipo: 'ok', texto: n === 1 ? 'Pronto: 1 música importada.' : `Pronto: ${n} músicas importadas.` });
    } catch (e) {
      // As que já entraram aparecem como "já está na conta" e não se repetem se tentar de novo.
      setMsg({ tipo: 'erro', texto: (e as Error).message + (n ? ` Entraram ${n} de ${entrar.length}; clique em Importar de novo para continuar de onde parou.` : '') });
    } finally {
      setFeitas(null);
      await recarregar();
    }
  }

  return (
    <>
      <h1 className="titulo-pagina">Importar músicas</h1>
      <div className="barra">
        <Ajuda titulo="Importar músicas">
          <ul>
            <li>Para trazer as músicas do Toque Fácil, siga o passo 1 e depois escolha o arquivo que ele baixou.</li>
            <li>Também dá para escolher arquivos <b>.txt</b>, um por música. Se o nome do arquivo for &quot;Artista - Título.txt&quot;, o artista e o título são preenchidos sozinhos.</li>
            <li>Músicas com o mesmo título e artista de uma que você já tem ficam de fora, para não duplicar. Marque <b>Importar também as repetidas</b> se quiser as duas.</li>
            <li>As músicas importadas entram em <b>Minhas músicas</b>, e dá para editar cada uma depois.</li>
          </ul>
        </Ajuda>
        <Link href="/musicas" className="btn escuro">Voltar para Músicas</Link>
        {msg ? <span className={msg.tipo === 'ok' ? 'ok' : 'erro'} style={{ margin: 0, padding: '6px 12px' }}>{msg.texto}</span> : null}
      </div>

      <section className="caixa">
        <h2>1. Tirar as músicas do Toque Fácil</h2>
        <FavoritoToqueFacil />
      </section>

      <section className="caixa">
        <h2>2. Escolher o arquivo</h2>
        <input type="file" accept=".json,.txt,application/json,text/plain" multiple disabled={importando} onChange={e => { escolher(Array.from(e.target.files ?? [])); e.target.value = ''; }} aria-label="Arquivo de músicas" />
      </section>

      {lidas ? (
        <section className="caixa">
          <h2>3. Conferir e importar</h2>
          <p style={{ marginTop: 0 }}>
            <b>{nomeArquivo}</b>: {lidas.length === 1 ? '1 música' : lidas.length + ' músicas'}.
            {qtdRepetidas ? ` ${qtdRepetidas === 1 ? '1 já está' : qtdRepetidas + ' já estão'} na sua conta com o mesmo título e artista.` : ''}
          </p>
          <div className="mini-barra" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
            {qtdRepetidas ? (
              <label className="check"><input type="checkbox" checked={comRepetidas} onChange={e => setComRepetidas(e.target.checked)} disabled={importando} /> Importar também as repetidas</label>
            ) : null}
            {entrar.length ? (
              <button type="button" className="btn verde" onClick={importar} disabled={importando}>
                {importando ? `Importando… ${feitas} de ${entrar.length}` : entrar.length === 1 ? 'Importar 1 música' : `Importar ${entrar.length} músicas`}
              </button>
            ) : <b>Nada novo para importar.</b>}
          </div>
          <div className="tabela-rolagem" style={{ maxHeight: 460, overflowY: 'auto', background: 'var(--painel)' }}>
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
          </div>
        </section>
      ) : null}
      <RodapeAjuda />
    </>
  );
}

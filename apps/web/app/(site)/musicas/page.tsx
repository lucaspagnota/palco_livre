'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { revisao, semAcento } from '@palco/cifra';
import { Ajuda, RodapeAjuda } from '@/components/Ajuda';
import { Icone } from '@/components/Icone';
import { MenuMais } from '@/components/MenuMais';
import { useDados } from '@/lib/dados';
import { abrir, naMesmaTelaSeInstalado } from '@/lib/instalado';
import { useTabela } from '@/lib/tabela';

export default function Musicas() {
  const { dados, store, recarregar } = useDados();
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [estilo, setEstilo] = useState('');
  const [artista, setArtista] = useState('');
  const [de, setDe] = useState<'minhas' | 'recebidas' | 'todas'>('minhas');
  const [erro, setErro] = useState<string | null>(null);

  const eu = dados?.eu.id;
  const todas = dados?.musicas ?? [];
  const daVez = todas.filter(m => (de === 'minhas' ? m.donoId === eu : de === 'recebidas' ? m.donoId !== eu : true));
  const estilos = useMemo(() => [...new Set(daVez.map(m => m.estilo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [daVez]);
  const artistas = useMemo(() => [...new Set(daVez.map(m => m.artista).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [daVez]);

  const reps = useMemo(() => {
    const n = new Map<string, number>();
    for (const r of dados?.repertorios ?? []) {
      if (r.donoId !== eu) continue;
      for (const id of new Set(r.itens.map(i => i.musicaId).filter(Boolean) as string[])) n.set(id, (n.get(id) ?? 0) + 1);
    }
    return n;
  }, [dados, eu]);

  const q = semAcento(busca.trim());
  const filtradas = daVez.filter(m =>
    (!q || semAcento(m.titulo).includes(q) || semAcento(m.artista).includes(q)) &&
    (!estilo || m.estilo === estilo) && (!artista || m.artista === artista));

  const t = useTabela(filtradas, {
    titulo: m => m.titulo, artista: m => m.artista, tom: m => m.tom, capo: m => m.capo ?? 0, estilo: m => m.estilo,
    copias: m => m.copias, revisao: m => m.atualizadoEm, rep: m => reps.get(m.id) ?? 0,
  }, 'titulo');

  async function excluir(ids: string[]) {
    const minhas = ids.filter(id => todas.find(m => m.id === id)?.donoId === eu);
    if (!minhas.length) { setErro('Selecione músicas suas para excluir. As que você recebeu pelos grupos só o dono pode excluir.'); return; }
    if (!confirm(minhas.length === 1 ? 'Excluir esta música? Ela também sai dos repertórios.' : `Excluir ${minhas.length} músicas? Elas também saem dos repertórios.`)) return;
    try {
      await store.apagarMusicas(minhas);
      t.limpar();
      await recarregar();
    } catch (e) { setErro((e as Error).message); }
  }

  async function copiar(id: string) {
    try {
      const novo = await store.copiarMusica(id);
      await recarregar();
      router.push('/musicas/editor?id=' + novo);
    } catch (e) { setErro((e as Error).message); }
  }

  return (
    <>
      <h1 className="titulo-pagina">Minhas músicas</h1>
      <div className="barra">
        <Ajuda titulo="Minhas músicas">
          <ul>
            <li><b>Nova</b> abre o editor para cadastrar uma música.</li>
            <li><b>Importar</b> traz várias músicas de uma vez, como as que você tem no Toque Fácil.</li>
            <li>Clique no <b>título</b> para editar. Clique no <b>artista</b> para ver só as músicas dele.</li>
            <li>Clique no nome de uma coluna para ordenar por ela.</li>
            <li>O botão escuro abre a música no leitor, igual à tela do app.</li>
            <li><b>Rep</b> mostra em quantos repertórios seus a música está. <b>Cópias</b> conta quantas vezes outras pessoas copiaram a música.</li>
            <li>Marque as caixinhas e use <b>Excluir</b> para apagar várias de uma vez.</li>
            <li>Em &quot;Recebidas&quot; ficam as músicas dos repertórios que chegaram pelos seus grupos. Use <b>•••</b> → Copiar para ter uma cópia sua.</li>
          </ul>
        </Ajuda>
        <input className="campo busca" placeholder="Título" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar por título ou artista" />
        <button type="button" className="btn lupa" aria-label="Buscar"><Icone nome="lupa" tamanho={22} traco={2.6} /></button>
        <select className="campo" value={estilo} onChange={e => setEstilo(e.target.value)} aria-label="Estilo">
          <option value="">Todos os Estilos</option>
          {estilos.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="campo" value={artista} onChange={e => setArtista(e.target.value)} aria-label="Artista" style={{ minWidth: 300 }}>
          <option value="">Todos os Artistas</option>
          {artistas.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="campo" value={de} onChange={e => { setDe(e.target.value as typeof de); setArtista(''); setEstilo(''); }} aria-label="De quem">
          <option value="minhas">Minhas músicas</option>
          <option value="recebidas">Recebidas dos grupos</option>
          <option value="todas">Todas</option>
        </select>
        <Link href="/musicas/editor" className="btn verde">Nova</Link>
        <Link href="/musicas/importar" className="btn ciano">Importar</Link>
        <button type="button" className="btn vermelho" onClick={() => excluir(t.selecionadas)} disabled={!t.selecionadas.length}>Excluir</button>
      </div>
      {erro ? <div className="erro">{erro}</div> : null}

      {!dados ? <p>Carregando…</p> : filtradas.length === 0 ? (
        <div className="vazio">{daVez.length ? 'Nenhuma música com esses filtros.' : de === 'minhas' ? 'Nenhuma música ainda. Clique em Nova para cadastrar a primeira, ou em Importar para trazer as do Toque Fácil.' : 'Nenhuma música recebida.'}</div>
      ) : (
        <div className="tabela-rolagem">
          <table className="lista">
            <thead>
              <tr>
                <th className="chk sem-ordem"><input type="checkbox" checked={t.todas} onChange={t.alternarTodas} aria-label="Marcar todas" /></th>
                <t.Th col="titulo">Título</t.Th>
                <t.Th col="artista">Artista</t.Th>
                <t.Th col="tom">Tom</t.Th>
                <t.Th col="capo" className="some-cel">Capo</t.Th>
                <t.Th col="estilo" className="some-cel">Estilo</t.Th>
                <t.Th col="copias" className="some-cel">Cópias</t.Th>
                <t.Th col="revisao" className="some-cel">Revisão</t.Th>
                <t.Th col="rep" className="some-cel">Rep</t.Th>
                <th className="sem-ordem" />
              </tr>
            </thead>
            <tbody>
              {t.linhas.map(m => (
                <tr key={m.id} className={t.marcadas.has(m.id) ? 'marcada' : undefined}>
                  <td className="chk"><input type="checkbox" checked={t.marcadas.has(m.id)} onChange={() => t.alternar(m.id)} aria-label={'Marcar ' + m.titulo} /></td>
                  <td>
                    <Link href={'/musicas/editor?id=' + m.id} className="forte">{m.titulo}</Link>
                    {m.donoId !== eu ? <span className="selo">{dados.perfis[m.donoId]?.nick ?? 'recebida'}</span> : null}
                  </td>
                  <td><a href="#" onClick={e => { e.preventDefault(); setArtista(m.artista); }}>{m.artista}</a></td>
                  <td>{m.tom}</td>
                  <td className="some-cel">{m.capo ? m.capo + 'ª' : 'não'}</td>
                  <td className="some-cel">{m.estilo}</td>
                  <td className="some-cel">{m.copias}</td>
                  <td className="some-cel">{revisao(m.atualizadoEm)}</td>
                  <td className="some-cel">{reps.get(m.id) ?? 0}</td>
                  <td className="acoes">
                    <a className="pilula escura" href={'/tocar?musica=' + m.id} target="_blank" rel="noreferrer" onClick={naMesmaTelaSeInstalado} aria-label={'Tocar ' + m.titulo} title="Abrir no leitor"><Icone nome="tocar" tamanho={15} /></a>
                    <MenuMais opcoes={[
                      { rotulo: 'Editar', acao: () => router.push('/musicas/editor?id=' + m.id) },
                      { rotulo: 'Abrir no leitor', acao: () => abrir('/tocar?musica=' + m.id) },
                      { rotulo: m.donoId === eu ? 'Duplicar' : 'Copiar para minhas músicas', acao: () => copiar(m.id) },
                      m.donoId === eu ? { rotulo: 'Excluir', perigo: true, acao: () => excluir([m.id]) } : null,
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="contagem">{filtradas.length} {filtradas.length === 1 ? 'música' : 'músicas'}</p>
        </div>
      )}
      <RodapeAjuda />
    </>
  );
}

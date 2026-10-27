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

export default function Repertorios() {
  const { dados, store, recarregar } = useDados();
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [estilo, setEstilo] = useState('');
  const [de, setDe] = useState<'meus' | 'recebidos' | 'todos'>('meus');
  const [erro, setErro] = useState<string | null>(null);

  const eu = dados?.eu.id;
  const todos = dados?.repertorios ?? [];
  const daVez = todos.filter(r => (de === 'meus' ? r.donoId === eu : de === 'recebidos' ? r.donoId !== eu : true));
  const estilos = useMemo(() => [...new Set(daVez.map(r => r.estilo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [daVez]);
  const q = semAcento(busca.trim());
  const filtrados = daVez.filter(r => (!q || semAcento(r.titulo).includes(q)) && (!estilo || r.estilo === estilo));
  const qtd = (id: string) => todos.find(r => r.id === id)!.itens.filter(i => i.musicaId).length;

  const t = useTabela(filtrados, {
    titulo: r => r.titulo, estilo: r => r.estilo, musicas: r => qtd(r.id), copias: r => r.copias, revisao: r => r.atualizadoEm,
  }, 'titulo');

  async function excluir(ids: string[]) {
    const meus = ids.filter(id => todos.find(r => r.id === id)?.donoId === eu);
    if (!meus.length) { setErro('Selecione repertórios seus para excluir. Os recebidos pelos grupos só o dono pode excluir.'); return; }
    if (!confirm(meus.length === 1 ? 'Excluir este repertório? As músicas continuam na sua lista.' : `Excluir ${meus.length} repertórios? As músicas continuam na sua lista.`)) return;
    try {
      await store.apagarRepertorios(meus);
      t.limpar();
      await recarregar();
    } catch (e) { setErro((e as Error).message); }
  }

  async function copiar(id: string) {
    try {
      const novo = await store.copiarRepertorio(id);
      await recarregar();
      router.push('/repertorios/editor?id=' + novo);
    } catch (e) { setErro((e as Error).message); }
  }

  return (
    <>
      <h1 className="titulo-pagina">Meus repertórios</h1>
      <div className="barra">
        <Ajuda titulo="Meus repertórios">
          <ul>
            <li><b>Novo</b> abre o editor para montar a sequência de músicas de um show, missa ou ensaio.</li>
            <li><b>Importar</b> traz os repertórios do Toque Fácil. Importe as músicas antes, pela mesma tela.</li>
            <li>Clique no título para editar. O botão escuro abre o repertório no leitor.</li>
            <li>Para a banda receber um repertório, coloque-o num grupo (menu <b>Grupos</b>). Quem está no grupo recebe o repertório e todas as músicas dele.</li>
            <li>Em &quot;Recebidos dos grupos&quot; ficam os repertórios que outras pessoas compartilharam com você. Use <b>•••</b> → Copiar para ter uma cópia sua, com as músicas.</li>
          </ul>
        </Ajuda>
        <input className="campo busca" placeholder="Título" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar por título" />
        <button type="button" className="btn lupa" aria-label="Buscar"><Icone nome="lupa" tamanho={22} traco={2.6} /></button>
        <select className="campo" value={estilo} onChange={e => setEstilo(e.target.value)} aria-label="Estilo">
          <option value="">Todos os estilos</option>
          {estilos.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="campo" value={de} onChange={e => { setDe(e.target.value as typeof de); setEstilo(''); }} aria-label="De quem" style={{ minWidth: 220 }}>
          <option value="meus">Meus repertórios</option>
          <option value="recebidos">Recebidos dos grupos</option>
          <option value="todos">Todos</option>
        </select>
        <Link href="/repertorios/editor" className="btn verde">Novo</Link>
        <Link href="/musicas/importar" className="btn ciano">Importar</Link>
        <button type="button" className="btn vermelho" onClick={() => excluir(t.selecionadas)} disabled={!t.selecionadas.length}>Excluir</button>
      </div>
      {erro ? <div className="erro">{erro}</div> : null}

      {!dados ? <p>Carregando…</p> : filtrados.length === 0 ? (
        <div className="vazio">{daVez.length ? 'Nenhum repertório com esses filtros.' : de === 'meus' ? 'Nenhum repertório ainda. Clique em Novo para montar o primeiro.' : 'Nenhum repertório recebido.'}</div>
      ) : (
        <div className="tabela-rolagem">
          <table className="lista">
            <thead>
              <tr>
                <th className="chk sem-ordem"><input type="checkbox" checked={t.todas} onChange={t.alternarTodas} aria-label="Marcar todos" /></th>
                <t.Th col="titulo">Título</t.Th>
                <t.Th col="estilo">Estilo</t.Th>
                <t.Th col="musicas">Músicas</t.Th>
                <t.Th col="copias" className="some-cel">Cópias</t.Th>
                <t.Th col="revisao" className="some-cel">Revisão</t.Th>
                <th className="sem-ordem" />
              </tr>
            </thead>
            <tbody>
              {t.linhas.map(r => (
                <tr key={r.id} className={t.marcadas.has(r.id) ? 'marcada' : undefined}>
                  <td className="chk"><input type="checkbox" checked={t.marcadas.has(r.id)} onChange={() => t.alternar(r.id)} aria-label={'Marcar ' + r.titulo} /></td>
                  <td>
                    <Link href={'/repertorios/editor?id=' + r.id} className="forte">{r.titulo}</Link>
                    {r.donoId !== eu ? <span className="selo">{dados.perfis[r.donoId]?.nick ?? 'recebido'}</span> : null}
                  </td>
                  <td>{r.estilo}</td>
                  <td>{qtd(r.id)}</td>
                  <td className="some-cel">{r.copias}</td>
                  <td className="some-cel">{revisao(r.atualizadoEm)}</td>
                  <td className="acoes">
                    <a className="pilula escura" href={'/tocar?repertorio=' + r.id} target="_blank" rel="noreferrer" onClick={naMesmaTelaSeInstalado} aria-label={'Tocar ' + r.titulo} title="Abrir no leitor"><Icone nome="tocar" tamanho={15} /></a>
                    <MenuMais opcoes={[
                      { rotulo: 'Editar', acao: () => router.push('/repertorios/editor?id=' + r.id) },
                      { rotulo: 'Abrir no leitor', acao: () => abrir('/tocar?repertorio=' + r.id) },
                      { rotulo: r.donoId === eu ? 'Duplicar' : 'Copiar para meus repertórios', acao: () => copiar(r.id) },
                      r.donoId === eu ? { rotulo: 'Excluir', perigo: true, acao: () => excluir([r.id]) } : null,
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="contagem">{filtrados.length} {filtrados.length === 1 ? 'repertório' : 'repertórios'}</p>
        </div>
      )}
      <RodapeAjuda />
    </>
  );
}

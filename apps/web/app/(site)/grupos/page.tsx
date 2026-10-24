'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { revisao } from '@palco/cifra';
import { Ajuda, RodapeAjuda } from '@/components/Ajuda';
import { MenuMais } from '@/components/MenuMais';
import { useDados } from '@/lib/dados';
import { useTabela } from '@/lib/tabela';

export default function Grupos() {
  const { dados, store, recarregar } = useDados();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const eu = dados?.eu.id;
  const grupos = dados?.grupos ?? [];
  const nome = (id: string) => dados?.perfis[id]?.nome || dados?.perfis[id]?.nick || '—';

  const t = useTabela(grupos, {
    titulo: g => g.titulo, responsavel: g => nome(g.donoId), membros: g => g.membros.length + 1,
    repertorios: g => g.repertorios.length, revisao: g => g.atualizadoEm,
  }, 'titulo');

  async function excluir(ids: string[]) {
    const meus = ids.filter(id => grupos.find(g => g.id === id)?.donoId === eu);
    if (!meus.length) { setErro('Só o responsável pode excluir um grupo. Para sair de um grupo, use Deixar grupo.'); return; }
    if (!confirm(meus.length === 1 ? 'Excluir este grupo? Os membros deixam de receber os repertórios dele.' : `Excluir ${meus.length} grupos?`)) return;
    try { await store.apagarGrupos(meus); t.limpar(); await recarregar(); } catch (e) { setErro((e as Error).message); }
  }

  async function sair(ids: string[]) {
    const deOutros = ids.filter(id => grupos.find(g => g.id === id)?.donoId !== eu);
    if (!deOutros.length) { setErro('Você é o responsável pelos grupos selecionados. Para acabar com um grupo, use Excluir.'); return; }
    if (!confirm(deOutros.length === 1 ? 'Sair deste grupo? Você deixa de receber os repertórios dele.' : `Sair de ${deOutros.length} grupos?`)) return;
    try { await store.sairDosGrupos(deOutros); t.limpar(); await recarregar(); } catch (e) { setErro((e as Error).message); }
  }

  return (
    <>
      <h1 className="titulo-pagina">Meus grupos</h1>
      <div className="barra">
        <Ajuda titulo="Meus grupos">
          <ul>
            <li>Um grupo é a sua banda (ou equipe). Quem está no grupo recebe os repertórios dele, com todas as músicas, no site e no app.</li>
            <li><b>Novo</b> cria um grupo. No editor, adicione os integrantes pelo nick ou e-mail da conta deles e escolha os repertórios.</li>
            <li>Só 1 ou 2 pessoas precisam montar os repertórios. O resto da banda só entra no app e baixa o conteúdo.</li>
            <li><b>Deixar grupo</b> tira você de um grupo de outra pessoa.</li>
          </ul>
        </Ajuda>
        <Link href="/grupos/editor" className="btn verde">Novo</Link>
        <button type="button" className="btn vermelho" onClick={() => excluir(t.selecionadas)} disabled={!t.selecionadas.length}>Excluir</button>
        <button type="button" className="btn laranja-claro" onClick={() => sair(t.selecionadas)} disabled={!t.selecionadas.length}>Deixar grupo</button>
      </div>
      {erro ? <div className="erro">{erro}</div> : null}
      {!dados ? <p>Carregando…</p> : grupos.length === 0 ? (
        <div className="vazio">Nenhum grupo ainda. Clique em Novo para criar o grupo da sua banda.</div>
      ) : (
        <div className="tabela-rolagem">
          <table className="lista">
            <thead>
              <tr>
                <th className="chk sem-ordem"><input type="checkbox" checked={t.todas} onChange={t.alternarTodas} aria-label="Marcar todos" /></th>
                <t.Th col="titulo">Título</t.Th>
                <t.Th col="responsavel">Responsável</t.Th>
                <t.Th col="membros">Membros</t.Th>
                <t.Th col="repertorios">Repertórios</t.Th>
                <t.Th col="revisao" className="some-cel">Revisão</t.Th>
                <th className="sem-ordem" />
              </tr>
            </thead>
            <tbody>
              {t.linhas.map(g => (
                <tr key={g.id} className={t.marcadas.has(g.id) ? 'marcada' : undefined}>
                  <td className="chk"><input type="checkbox" checked={t.marcadas.has(g.id)} onChange={() => t.alternar(g.id)} aria-label={'Marcar ' + g.titulo} /></td>
                  <td><Link href={'/grupos/editor?id=' + g.id} className="forte">{g.titulo}</Link></td>
                  <td>{nome(g.donoId)}</td>
                  <td>{g.membros.length + 1}</td>
                  <td>{g.repertorios.length}</td>
                  <td className="some-cel">{revisao(g.atualizadoEm)}</td>
                  <td className="acoes">
                    <MenuMais opcoes={[
                      { rotulo: 'Abrir', acao: () => router.push('/grupos/editor?id=' + g.id) },
                      g.donoId === eu ? { rotulo: 'Excluir', perigo: true, acao: () => excluir([g.id]) } : { rotulo: 'Deixar grupo', perigo: true, acao: () => sair([g.id]) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <RodapeAjuda />
    </>
  );
}

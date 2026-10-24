'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Ajuda, RodapeAjuda } from '@/components/Ajuda';
import { useDados } from '@/lib/dados';

function EditorGrupo() {
  const { store, dados, recarregar } = useDados();
  const router = useRouter();
  const id = useSearchParams().get('id');
  const grupo = id ? dados?.grupos.find(g => g.id === id) : undefined;
  const [titulo, setTitulo] = useState('');
  const [busca, setBusca] = useState('');
  const [repEscolhido, setRepEscolhido] = useState('');
  const [selMembros, setSelMembros] = useState<Set<string>>(new Set());
  const [selReps, setSelReps] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { setTitulo(grupo?.titulo ?? ''); }, [grupo?.id, grupo?.titulo]);

  if (!dados) return <p>Carregando…</p>;
  const eu = dados.eu.id;
  const souDono = !grupo || grupo.donoId === eu;
  const p = (pid: string) => dados.perfis[pid];

  async function acao(fn: () => Promise<unknown>, ok?: string) {
    setOcupado(true);
    setMsg(null);
    try {
      await fn();
      await recarregar();
      if (ok) setMsg({ tipo: 'ok', texto: ok });
    } catch (e) {
      setMsg({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  async function salvar() {
    if (!titulo.trim()) { setMsg({ tipo: 'erro', texto: 'Dê um título para o grupo.' }); return; }
    await acao(async () => {
      const novo = await store.salvarGrupo({ id: grupo?.id, titulo: titulo.trim() });
      if (!grupo) router.replace('/grupos/editor?id=' + novo);
    }, 'Grupo salvo.');
  }

  /** Membros e repertórios só podem ser mexidos depois do grupo existir. */
  async function garantirGrupo(): Promise<string | null> {
    if (grupo) return grupo.id;
    if (!titulo.trim()) { setMsg({ tipo: 'erro', texto: 'Dê um título e salve o grupo primeiro.' }); return null; }
    const novo = await store.salvarGrupo({ titulo: titulo.trim() });
    router.replace('/grupos/editor?id=' + novo);
    return novo;
  }

  const membros = grupo ? [grupo.donoId, ...grupo.membros] : [eu];
  const repsNoGrupo = grupo?.repertorios ?? [];
  const meusReps = dados.repertorios.filter(r => r.donoId === eu && !repsNoGrupo.some(x => x.repertorioId === r.id))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

  return (
    <>
      <h1 className="titulo-pagina">Editor de Grupo</h1>
      <div className="barra">
        <Ajuda titulo="Editor de grupo">
          <ul>
            <li>Escreva o título e clique em <b>Salvar</b>.</li>
            <li><b>Membros</b>: digite o nick ou o e-mail da conta de cada integrante e clique em <b>Adicionar</b>. A pessoa precisa ter criado a conta antes.</li>
            <li><b>Repertórios</b>: escolha um repertório seu e clique em <b>Adicionar</b>. Todos do grupo recebem o repertório com as músicas.</li>
            <li>Qualquer integrante pode colocar repertórios dele no grupo. Só o responsável adiciona ou remove membros.</li>
          </ul>
        </Ajuda>
        <button type="button" className="btn verde" onClick={() => router.push('/grupos/editor')}>Novo</button>
        <button type="button" className="btn azul" onClick={salvar} disabled={ocupado || !souDono}>Salvar</button>
        {msg ? <span className={msg.tipo === 'ok' ? 'ok' : 'erro'} style={{ margin: 0, padding: '6px 12px' }}>{msg.texto}</span> : null}
      </div>
      {id && !grupo ? <div className="erro">Grupo não encontrado.</div> : null}

      <div className="linha-campos" style={{ marginBottom: 18 }}>
        <input className="campo" placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} readOnly={!souDono} style={{ width: 360, maxWidth: '100%' }} aria-label="Título" autoFocus={!id} />
        <input className="campo" value={p(grupo?.donoId ?? eu)?.nome || p(grupo?.donoId ?? eu)?.nick || ''} readOnly style={{ width: 250, maxWidth: '100%' }} aria-label="Responsável" />
      </div>

      <div className="duas-caixas">
        <section className="caixa">
          <h2>Membros</h2>
          {souDono ? (
            <form className="mini-barra" onSubmit={e => {
              e.preventDefault();
              if (!busca.trim()) return;
              acao(async () => {
                const gid = await garantirGrupo();
                if (!gid) return;
                const novo = await store.adicionarMembro(gid, busca);
                setBusca('');
                setMsg({ tipo: 'ok', texto: novo.nick + ' entrou no grupo.' });
              });
            }}>
              <button type="button" className="btn vermelho-claro pq" disabled={!selMembros.size || ocupado} onClick={() => {
                if (!grupo || !confirm('Tirar os membros selecionados do grupo?')) return;
                acao(() => store.removerMembros(grupo.id, [...selMembros]).then(() => setSelMembros(new Set())));
              }}>Remover</button>
              <input className="campo" placeholder="Nick ou email" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Nick ou email" />
              <button className="btn verde-claro pq" disabled={ocupado}>Adicionar</button>
            </form>
          ) : null}
          <table className="lista" style={{ fontSize: 16 }}>
            <thead><tr><th className="chk sem-ordem" /><th className="sem-ordem">Nick</th><th className="sem-ordem">Email</th><th className="sem-ordem">UF</th></tr></thead>
            <tbody>
              {membros.map(mid => (
                <tr key={mid}>
                  <td className="chk">{souDono && mid !== eu ? <input type="checkbox" checked={selMembros.has(mid)} onChange={() => setSelMembros(s => { const n = new Set(s); if (n.has(mid)) n.delete(mid); else n.add(mid); return n; })} aria-label={'Marcar ' + (p(mid)?.nick ?? '')} /> : null}</td>
                  <td>{p(mid)?.nick ?? '—'}{mid === (grupo?.donoId ?? eu) ? <span className="selo">responsável</span> : null}</td>
                  <td>{p(mid)?.email}</td>
                  <td>{p(mid)?.uf}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {membros.length === 1 ? <div className="vazio" style={{ marginTop: 8 }}>Nenhum membro neste grupo.</div> : null}
        </section>

        <section className="caixa">
          <h2>Repertórios</h2>
          <form className="mini-barra" onSubmit={e => {
            e.preventDefault();
            if (!repEscolhido) return;
            acao(async () => {
              const gid = await garantirGrupo();
              if (!gid) return;
              await store.adicionarRepertorioNoGrupo(gid, repEscolhido);
              setRepEscolhido('');
            }, 'Repertório adicionado. Quem está no grupo já pode baixar no app.');
          }}>
            <button type="button" className="btn vermelho-claro pq" disabled={!selReps.size || ocupado} onClick={() => {
              if (!grupo || !confirm('Tirar os repertórios selecionados do grupo?')) return;
              acao(() => store.removerRepertoriosDoGrupo(grupo.id, [...selReps]).then(() => setSelReps(new Set())));
            }}>Remover</button>
            <select className="campo" value={repEscolhido} onChange={e => setRepEscolhido(e.target.value)} aria-label="Repertório">
              <option value="">Meus repertórios</option>
              {meusReps.map(r => <option key={r.id} value={r.id}>{r.titulo}</option>)}
            </select>
            <button className="btn verde-claro pq" disabled={ocupado || !repEscolhido}>Adicionar</button>
          </form>
          {repsNoGrupo.length ? (
            <table className="lista" style={{ fontSize: 16 }}>
              <thead><tr><th className="chk sem-ordem" /><th className="sem-ordem">Título</th><th className="sem-ordem">Estilo</th><th className="sem-ordem">Músicas</th><th className="sem-ordem">Nick</th></tr></thead>
              <tbody>
                {repsNoGrupo.map(x => {
                  const r = dados.repertorios.find(y => y.id === x.repertorioId);
                  const pode = souDono || x.adicionadoPor === eu;
                  return (
                    <tr key={x.repertorioId}>
                      <td className="chk">{pode ? <input type="checkbox" checked={selReps.has(x.repertorioId)} onChange={() => setSelReps(s => { const n = new Set(s); if (n.has(x.repertorioId)) n.delete(x.repertorioId); else n.add(x.repertorioId); return n; })} aria-label={'Marcar ' + (r?.titulo ?? '')} /> : null}</td>
                      <td>{r ? <Link className="forte" href={'/repertorios/editor?id=' + r.id}>{r.titulo}</Link> : '—'}</td>
                      <td>{r?.estilo}</td>
                      <td>{r ? r.itens.filter(i => i.musicaId).length : ''}</td>
                      <td>{p(x.adicionadoPor)?.nick}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div className="vazio">Nenhum repertório neste grupo.</div>}
        </section>
      </div>
      <RodapeAjuda />
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<p>Carregando…</p>}><EditorGrupo /></Suspense>;
}

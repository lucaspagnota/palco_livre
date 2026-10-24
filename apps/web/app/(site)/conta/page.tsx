'use client';

import { useEffect, useState } from 'react';
import { UFS } from '@palco/cifra';
import { useDados } from '@/lib/dados';

export default function Conta() {
  const { conta, store, recarregar } = useDados();
  const [nome, setNome] = useState('');
  const [uf, setUf] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => { setNome(conta?.nome ?? ''); setUf(conta?.uf ?? ''); }, [conta]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await store.salvarPerfil({ nome: nome.trim(), uf });
      if (senha) {
        if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
        await store.novaSenha(senha);
        setSenha('');
      }
      await recarregar();
      setMsg({ tipo: 'ok', texto: 'Dados salvos.' });
    } catch (err) {
      setMsg({ tipo: 'erro', texto: (err as Error).message });
    }
  }

  return (
    <>
      <h1 className="titulo-pagina">Minha conta</h1>
      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460 }}>
        <label>Nick (para os amigos te adicionarem nos grupos)<br /><input className="campo" value={conta?.nick ?? ''} readOnly style={{ width: '100%' }} /></label>
        <label>E-mail<br /><input className="campo" value={conta?.email ?? ''} readOnly style={{ width: '100%' }} /></label>
        <label>Nome<br /><input className="campo" value={nome} onChange={e => setNome(e.target.value)} style={{ width: '100%' }} /></label>
        <label>UF<br />
          <select className="campo" value={uf} onChange={e => setUf(e.target.value)} style={{ width: 120 }}>
            <option value="">—</option>
            {UFS.map(u => <option key={u}>{u}</option>)}
          </select>
        </label>
        {!store.demo ? <label>Senha nova (deixe em branco para manter)<br /><input className="campo" type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="new-password" style={{ width: '100%' }} /></label> : null}
        {msg ? <div className={msg.tipo}>{msg.texto}</div> : null}
        <div><button className="btn azul">Salvar</button></div>
      </form>
    </>
  );
}

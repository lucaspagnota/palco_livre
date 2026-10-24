'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UFS } from '@palco/cifra';
import { Marca } from '@/components/Icone';
import { useDados } from '@/lib/dados';

type Modo = 'entrar' | 'criar' | 'esqueci' | 'nova-senha';

export default function Entrar() {
  const { store, conta } = useDados();
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('entrar');
  const [f, setF] = useState({ nome: '', nick: '', email: '', uf: '', senha: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const m = new URLSearchParams(location.search).get('modo');
    if (m === 'nova-senha' || m === 'criar') setModo(m);
  }, []);

  useEffect(() => {
    if (conta && modo !== 'nova-senha') router.replace('/musicas');
  }, [conta, modo, router]);

  const campo = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value }) });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      if (modo === 'entrar') await store.entrar(f.email, f.senha);
      else if (modo === 'criar') {
        if (!/^[a-z0-9_.]{3,20}$/i.test(f.nick)) throw new Error('O nick precisa ter de 3 a 20 letras, números, ponto ou _.');
        if (f.senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
        const r = await store.criarConta(f);
        if (r === 'confirmar') setAviso('Conta criada! Enviamos um e-mail de confirmação. Abra o link e depois entre aqui.');
      } else if (modo === 'esqueci') {
        await store.recuperarSenha(f.email);
        setAviso('Se existir uma conta com esse e-mail, enviamos um link para criar uma senha nova.');
      } else {
        await store.novaSenha(f.senha);
        router.replace('/musicas');
      }
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const titulos: Record<Modo, [string, string]> = {
    entrar: ['Entrar', 'Use o mesmo e-mail e senha no site e no app.'],
    criar: ['Criar conta', 'Cada integrante da banda tem a sua conta.'],
    esqueci: ['Esqueci a senha', 'Digite seu e-mail para receber um link.'],
    'nova-senha': ['Nova senha', 'Escolha a senha nova da sua conta.'],
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--topo)', paddingTop: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span className="logo"><Marca /><span>Palco<b>Livre</b></span></span>
      </div>
      <div className="entrar">
        <h1>{titulos[modo][0]}</h1>
        <p>{titulos[modo][1]}</p>
        {store.demo && modo === 'entrar' ? (
          <div className="aviso-demo">
            Modo demonstração: o banco ainda não foi configurado.{' '}
            <button type="button" className="btn verde pq" style={{ marginTop: 8 }} onClick={() => store.entrar('voce@palcolivre.app', '')}>Entrar na demonstração</button>
          </div>
        ) : null}
        <form onSubmit={enviar}>
          {modo === 'criar' ? (
            <>
              <input className="campo" placeholder="Seu nome" required {...campo('nome')} />
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="campo" placeholder="Nick (ex.: lucas)" required style={{ flex: 1 }} {...campo('nick')} />
                <select className="campo" style={{ width: 100 }} {...campo('uf')}>
                  <option value="">UF</option>
                  {UFS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </>
          ) : null}
          {modo !== 'nova-senha' ? <input className="campo" type="email" placeholder="E-mail" autoComplete="email" required {...campo('email')} /> : null}
          {modo !== 'esqueci' ? (
            <input className="campo" type="password" placeholder={modo === 'nova-senha' ? 'Senha nova' : 'Senha'} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required={!store.demo || modo !== 'entrar'} {...campo('senha')} />
          ) : null}
          {erro ? <div className="erro">{erro}</div> : null}
          {aviso ? <div className="ok">{aviso}</div> : null}
          <button className="btn azul" disabled={ocupado}>{ocupado ? 'Aguarde…' : titulos[modo][0]}</button>
        </form>
        <div className="links">
          {modo === 'entrar' ? (
            <>
              <button type="button" onClick={() => setModo('criar')}>Criar conta</button>
              <button type="button" onClick={() => setModo('esqueci')}>Esqueci a senha</button>
            </>
          ) : (
            <button type="button" onClick={() => setModo('entrar')}>Voltar para entrar</button>
          )}
        </div>
      </div>
    </div>
  );
}

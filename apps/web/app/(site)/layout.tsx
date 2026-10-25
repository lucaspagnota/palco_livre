'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Topo } from '@/components/Topo';
import { useDados } from '@/lib/dados';

export default function LayoutSite({ children }: { children: React.ReactNode }) {
  const { conta, pronto, store, erro, dados } = useDados();
  const router = useRouter();

  useEffect(() => {
    if (pronto && !conta) router.replace('/entrar');
  }, [pronto, conta, router]);

  if (!pronto || !conta) return <div className="folha" style={{ textAlign: 'center', paddingTop: 80 }}>Carregando…</div>;

  return (
    <>
      <Topo />
      <main className="folha">
        {store.demo ? (
          <div className="aviso-demo">
            <b>Modo demonstração.</b> O banco de dados ainda não foi configurado, então tudo fica guardado só neste navegador.
          </div>
        ) : null}
        {dados?.copiaDe ? (
          <div className="aviso-demo">
            <b>Sem internet.</b> Mostrando o que está guardado neste aparelho (atualizado em {quando(dados.copiaDe)}).
            Dá para ver e tocar; para salvar, conecte de novo.
          </div>
        ) : null}
        {erro ? <div className="erro">{erro}</div> : null}
        {children}
      </main>
    </>
  );
}

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

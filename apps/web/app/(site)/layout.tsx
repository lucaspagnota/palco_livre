'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Topo } from '@/components/Topo';
import { useDados } from '@/lib/dados';

export default function LayoutSite({ children }: { children: React.ReactNode }) {
  const { conta, pronto, store, erro } = useDados();
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
        {erro ? <div className="erro">{erro}</div> : null}
        {children}
      </main>
    </>
  );
}

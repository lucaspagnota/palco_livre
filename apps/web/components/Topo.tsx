'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDados } from '@/lib/dados';
import { BotaoTema } from './BotaoTema';
import { Marca } from './Icone';

export function Topo() {
  const { dados, conta, store } = useDados();
  const rota = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const fechar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [menu]);

  const eu = conta?.id;
  const n = {
    musicas: dados ? dados.musicas.filter(m => m.donoId === eu).length : null,
    repertorios: dados ? dados.repertorios.filter(r => r.donoId === eu).length : null,
    grupos: dados ? dados.grupos.length : null,
  };
  const item = (href: string, nome: string, qtd: number | null) => (
    <Link href={href} className={rota.startsWith(href) ? 'ativo' : undefined}>
      {nome} {qtd !== null ? <span className="contador">{qtd}</span> : null}
    </Link>
  );

  return (
    <header className="topo">
      <div className="topo-dentro">
        <Link href="/musicas" className="logo"><Marca /><span>Palco<b>Livre</b></span></Link>
        <nav className="menu-topo">
          {item('/musicas', 'Músicas', n.musicas)}
          {item('/repertorios', 'Repertórios', n.repertorios)}
          {item('/grupos', 'Grupos', n.grupos)}
          <div className="usuario" ref={ref}>
            <button type="button" onClick={() => setMenu(m => !m)} aria-expanded={menu}>{conta?.nome || conta?.nick || 'Conta'}</button>
            {menu ? (
              <div className="menu">
                <Link href="/conta" onClick={() => setMenu(false)}>Minha conta</Link>
                <Link href="/tocar" onClick={() => setMenu(false)}>Abrir o leitor</Link>
                <hr />
                <button type="button" className="perigo" onClick={async () => { setMenu(false); await store.sair(); router.replace('/entrar'); }}>Sair</button>
              </div>
            ) : null}
          </div>
          <BotaoTema />
        </nav>
      </div>
    </header>
  );
}

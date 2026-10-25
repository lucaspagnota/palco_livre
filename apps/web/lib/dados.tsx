'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createLocalStore } from './store-local';
import { comCopiaOffline } from './store-offline';
import { createSupabaseStore } from './store-supabase';
import type { Dados, Perfil, Store } from './tipos';

interface Ctx {
  store: Store;
  conta: Perfil | null;
  /** false enquanto ainda não sabemos se há alguém logado. */
  pronto: boolean;
  dados: Dados | null;
  erro: string | null;
  recarregar: () => Promise<void>;
}

const Contexto = createContext<Ctx | null>(null);

function criarStore(): Store {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return createLocalStore();
  // Qualquer resposta do banco (mesmo de erro) quer dizer que a internet está funcionando.
  const alcancavel = () => Promise.race([
    fetch(url + '/auth/v1/health', { mode: 'no-cors', cache: 'no-store' }).then(() => true, () => false),
    new Promise<boolean>(ok => setTimeout(() => ok(false), 4000)),
  ]);
  return comCopiaOffline(createSupabaseStore(url, key), alcancavel);
}

export function DadosProvider({ children }: { children: ReactNode }) {
  const store = useMemo(criarStore, []);
  const [conta, setConta] = useState<Perfil | null>(null);
  const [pronto, setPronto] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    store.eu().then(
      p => { if (vivo) { setConta(p); setPronto(true); } },
      () => { if (vivo) setPronto(true); },
    );
    const parar = store.aoMudarConta(p => { setConta(p); if (!p) setDados(null); });
    return () => { vivo = false; parar(); };
  }, [store]);

  const recarregar = useCallback(async () => {
    try {
      const d = await store.carregar();
      // Continua sem internet e com a mesma cópia: não redesenha a tela à toa.
      setDados(antes => (d.copiaDe && antes?.copiaDe === d.copiaDe ? antes : d));
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    }
  }, [store]);

  useEffect(() => {
    if (conta) recarregar();
  }, [conta, recarregar]);

  // Mostrando a cópia guardada: tenta o banco de novo quando a internet voltar e, por garantia, a cada 30 segundos.
  const naCopia = !!dados?.copiaDe;
  useEffect(() => {
    if (!conta || !naCopia) return;
    const tentar = () => { recarregar(); };
    window.addEventListener('online', tentar);
    const t = setInterval(tentar, 30000);
    return () => { window.removeEventListener('online', tentar); clearInterval(t); };
  }, [conta, naCopia, recarregar]);

  return <Contexto.Provider value={{ store, conta, pronto, dados, erro, recarregar }}>{children}</Contexto.Provider>;
}

export function useDados() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useDados fora do DadosProvider');
  return c;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createLocalStore } from './store-local';
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
  return url && key ? createSupabaseStore(url, key) : createLocalStore();
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
      setDados(await store.carregar());
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    }
  }, [store]);

  useEffect(() => {
    if (conta) recarregar();
  }, [conta, recarregar]);

  return <Contexto.Provider value={{ store, conta, pronto, dados, erro, recarregar }}>{children}</Contexto.Provider>;
}

export function useDados() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useDados fora do DadosProvider');
  return c;
}

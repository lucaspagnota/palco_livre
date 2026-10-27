import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CONFIG_PADRAO, esquecerTonsGuardados, lerConfig, salvarConfig, type Config } from './config';
import { baixarConteudo, lerConteudo, limparConteudo, type Conteudo } from './conteudo';

interface Ctx {
  conteudo: Conteudo | null;
  baixar: (email: string, senha: string) => Promise<Conteudo>;
  limpar: () => Promise<void>;
  config: Config;
  mudarConfig: (c: Partial<Config>) => void;
  restaurarConfig: () => void;
}

const Contexto = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [conteudo, setConteudo] = useState<Conteudo | null>(() => lerConteudo());
  const [config, setConfig] = useState<Config>(() => lerConfig());
  useEffect(esquecerTonsGuardados, []);

  const baixar = useCallback(async (email: string, senha: string) => {
    const c = await baixarConteudo(email, senha);
    setConteudo(c);
    return c;
  }, []);

  const valor: Ctx = {
    conteudo,
    baixar,
    limpar: async () => { await limparConteudo(); setConteudo(null); },
    config,
    mudarConfig: c => setConfig(atual => { const n = { ...atual, ...c }; salvarConfig(n); return n; }),
    restaurarConfig: () => { salvarConfig(CONFIG_PADRAO); setConfig(CONFIG_PADRAO); },
  };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useStore() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useStore fora do StoreProvider');
  return c;
}

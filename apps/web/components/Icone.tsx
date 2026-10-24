// Ícones desenhados para o Palco Livre (traço simples, herdam a cor do texto).
const CAMINHOS: Record<string, React.ReactNode> = {
  lupa: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
  tocar: <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" fill="currentColor" stroke="none" />,
  mais: <><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>,
  esquerda: <path d="m15 5-7 7 7 7" />,
  direita: <path d="m9 5 7 7-7 7" />,
  cima: <path d="m5 15 7-7 7 7" />,
  baixo: <path d="m5 9 7 7 7-7" />,
  embaralhar: <><path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6C14.3 16 15.5 17 17.5 17H21" /><path d="M3 17h3.5c1.4 0 2.4-.5 3.2-1.4" /><path d="M14.3 8.4c.8-.9 1.8-1.4 3.2-1.4H21" /><path d="m18.5 4.5 2.5 2.5-2.5 2.5" /><path d="m18.5 14.5 2.5 2.5-2.5 2.5" /></>,
  az: <><path d="M6 4v15" /><path d="m3 16 3 3 3-3" /><path d="M13 10.5 15.5 4 18 10.5" /><path d="M14 8.5h3" /><path d="M13 14h5l-5 6h5" /></>,
  numero: <><path d="M6 4v15" /><path d="m3 16 3 3 3-3" /><path d="M13 9.5h7M12.5 14.5h7M15.5 6l-1 11M18.5 6l-1 11" /></>,
  mais1: <><path d="M12 5v14M5 12h14" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.6" r="1" fill="currentColor" /></>,
  nota: <><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>,
  sol: <><circle cx="12" cy="12" r="4.2" fill="currentColor" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.55 1.55M17.15 17.15l1.55 1.55M5.3 18.7l1.55-1.55M17.15 6.85l1.55-1.55" /></>,
  lua: <path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" fill="currentColor" stroke="none" />,
};

export function Icone({ nome, tamanho = 20, traco = 2.2 }: { nome: keyof typeof CAMINHOS | string; tamanho?: number; traco?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={traco} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {CAMINHOS[nome]}
    </svg>
  );
}

/** Marca do Palco Livre: palheta de guitarra com o "tocar" dentro, num quadrado amarelo. */
export function Marca({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <svg className="logo-marca" width={tamanho} height={tamanho} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="24" fill="#ffd23f" />
      <path d="M50 89C45.5 89 42 86.6 39 83 29 71 16 53 16 35 16 20 32 12 50 12s34 8 34 23c0 18-13 36-23 48-3 3.6-6.5 6-11 6z" fill="#0b1d33" />
      <path d="M41 31v28l23-14z" fill="#ffd23f" stroke="#ffd23f" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

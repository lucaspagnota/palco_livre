import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type NomeIcone =
  | 'nuvem' | 'musica' | 'lista' | 'play' | 'pedal' | 'sair' | 'engrenagem' | 'voltar' | 'check' | 'baixo' | 'direita'
  | 'mais' | 'menos' | 'lixo' | 'trocar' | 'sol' | 'lua';

/** Ícones próprios do Palco Livre, desenhados em traço. */
export function Icone({ nome, tamanho = 24, cor = '#fff', traco = 2 }: { nome: NomeIcone; tamanho?: number; cor?: string; traco?: number }) {
  const p = { stroke: cor, strokeWidth: traco, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      {nome === 'nuvem' ? (
        <>
          <Path {...p} d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1 0 9.5" />
          <Path {...p} d="M12 11v9M8.5 16.5 12 20l3.5-3.5" />
        </>
      ) : nome === 'musica' ? (
        <>
          <Path {...p} d="M9 18V5l11-2v13" />
          <Circle {...p} cx={6} cy={18} r={3} />
          <Circle {...p} cx={17} cy={16} r={3} />
        </>
      ) : nome === 'lista' ? (
        <Path {...p} d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth={traco + 0.6} />
      ) : nome === 'play' ? (
        <Path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" fill={cor} />
      ) : nome === 'pedal' ? (
        <>
          <Path {...p} d="M5 19h14a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 19 16H5a1.5 1.5 0 0 0-1.5 1.5v0A1.5 1.5 0 0 0 5 19Z" />
          <Path {...p} d="M6 16 17 6.5a1.8 1.8 0 0 1 2.6 2.4L12 16" />
          <Circle cx={8.5} cy={17.5} r={0.9} fill={cor} />
        </>
      ) : nome === 'sair' ? (
        <>
          <Path {...p} d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
          <Path {...p} d="M10 8l-4 4 4 4M6 12h10" />
        </>
      ) : nome === 'engrenagem' ? (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map(g => (
            <Rect key={g} x={10.4} y={1.6} width={3.2} height={4.2} rx={0.9} fill={cor} transform={`rotate(${g} 12 12)`} />
          ))}
          <Circle {...p} cx={12} cy={12} r={6.4} />
          <Circle {...p} cx={12} cy={12} r={2.4} />
        </>
      ) : nome === 'voltar' ? (
        <Path {...p} d="M15 5l-7 7 7 7" />
      ) : nome === 'direita' ? (
        <Path {...p} d="M9 5l7 7-7 7" />
      ) : nome === 'check' ? (
        <Path {...p} d="M5 12.5l4.5 4.5L19 7.5" />
      ) : nome === 'baixo' ? (
        <Path {...p} d="M6 9l6 6 6-6" />
      ) : nome === 'mais' ? (
        <Path {...p} d="M12 5v14M5 12h14" />
      ) : nome === 'menos' ? (
        <Path {...p} d="M5 12h14" />
      ) : nome === 'lixo' ? (
        <>
          <Path {...p} d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
        </>
      ) : nome === 'sol' ? (
        <>
          <Circle cx={12} cy={12} r={4.2} fill={cor} />
          <Path {...p} d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.55 1.55M17.15 17.15l1.55 1.55M5.3 18.7l1.55-1.55M17.15 6.85l1.55-1.55" />
        </>
      ) : nome === 'lua' ? (
        <Path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" fill={cor} />
      ) : nome === 'trocar' ? (
        <>
          <Path {...p} d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5" />
        </>
      ) : (
        <Rect x={4} y={4} width={16} height={16} {...p} />
      )}
    </Svg>
  );
}

/** Marca do Palco Livre: palheta de guitarra com o "tocar" dentro, num quadrado amarelo. */
export function Marca({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
      <Rect width={100} height={100} rx={24} fill="#ffd23f" />
      <Path d="M50 89C45.5 89 42 86.6 39 83 29 71 16 53 16 35 16 20 32 12 50 12s34 8 34 23c0 18-13 36-23 48-3 3.6-6.5 6-11 6z" fill="#0b1d33" />
      <Path d="M41 31v28l23-14z" fill="#ffd23f" stroke="#ffd23f" strokeWidth={4} strokeLinejoin="round" />
    </Svg>
  );
}

import type { ChordShape } from '@palco/cifra';

/** Desenho de um acorde: cordas na vertical, casas na horizontal. Usa a cor do texto (serve no claro e no escuro). */
export function Diagrama({ forma, tamanho = 92 }: { forma: ChordShape; tamanho?: number }) {
  const cordas = forma.frets.length;
  const casas = 4;
  const w = tamanho;
  const h = tamanho * 1.15;
  const margemX = 14;
  const topo = 22;
  const passoX = (w - margemX * 2) / (cordas - 1);
  const passoY = (h - topo - 8) / casas;
  const base = forma.baseFret;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={'Acorde ' + forma.name} style={{ color: 'var(--texto)' }}>
      {base > 1 ? <text x={2} y={topo + passoY * 0.65} fontSize={11} fill="currentColor" opacity={0.8}>{base}ª</text> : null}
      <line x1={margemX} x2={w - margemX} y1={topo} y2={topo} stroke="currentColor" strokeWidth={base > 1 ? 1 : 4} />
      {Array.from({ length: casas }, (_, i) => (
        <line key={'c' + i} x1={margemX} x2={w - margemX} y1={topo + passoY * (i + 1)} y2={topo + passoY * (i + 1)} stroke="currentColor" opacity={0.4} />
      ))}
      {forma.frets.map((_, i) => (
        <line key={'s' + i} x1={margemX + passoX * i} x2={margemX + passoX * i} y1={topo} y2={topo + passoY * casas} stroke="currentColor" opacity={0.6} />
      ))}
      {forma.frets.map((f, i) => {
        const x = margemX + passoX * i;
        if (f < 0) return <text key={'x' + i} x={x} y={topo - 7} fontSize={11} textAnchor="middle" fill="currentColor" opacity={0.7}>×</text>;
        if (f === 0) return <circle key={'o' + i} cx={x} cy={topo - 10} r={3.6} fill="none" stroke="currentColor" strokeWidth={1.3} opacity={0.7} />;
        const casa = f - (base > 1 ? base - 1 : 0);
        return <circle key={'d' + i} cx={x} cy={topo + passoY * (casa - 0.5)} r={Math.min(passoX, passoY) * 0.36} fill="var(--marca-escura)" />;
      })}
    </svg>
  );
}

import type { ChordShape } from '@palco/cifra';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { fonte } from '@/lib/tema';

/** Desenho de um acorde: cordas na vertical, casas na horizontal. */
export function Diagrama({ forma, tamanho = 76, cor = '#ff7a45', tinta = '#dcdcdc' }: { forma: ChordShape; tamanho?: number; cor?: string; tinta?: string }) {
  const cordas = forma.frets.length;
  const casas = 4;
  const w = tamanho;
  const h = tamanho * 1.25;
  const margemX = 12;
  const topo = 34;
  const passoX = (w - margemX * 2) / (cordas - 1);
  const passoY = (h - topo - 6) / casas;
  const base = forma.baseFret;
  return (
    <Svg width={w} height={h}>
      <SvgText x={w / 2} y={13} fontSize={14} fontFamily={fonte.negrito} fill={cor} textAnchor="middle">{forma.name}</SvgText>
      {base > 1 ? <SvgText x={0} y={topo + passoY * 0.7} fontSize={10} fontFamily={fonte.normal} fill={tinta}>{base}</SvgText> : null}
      <Line x1={margemX} x2={w - margemX} y1={topo} y2={topo} stroke={tinta} strokeWidth={base > 1 ? 1 : 3} />
      {Array.from({ length: casas }, (_, i) => (
        <Line key={'c' + i} x1={margemX} x2={w - margemX} y1={topo + passoY * (i + 1)} y2={topo + passoY * (i + 1)} stroke="#666" />
      ))}
      {forma.frets.map((_, i) => (
        <Line key={'s' + i} x1={margemX + passoX * i} x2={margemX + passoX * i} y1={topo} y2={topo + passoY * casas} stroke="#888" />
      ))}
      {forma.frets.map((f, i) => {
        const x = margemX + passoX * i;
        if (f < 0) return <SvgText key={'x' + i} x={x} y={topo - 5} fontSize={10} fill={tinta} textAnchor="middle">×</SvgText>;
        if (f === 0) return <Circle key={'o' + i} cx={x} cy={topo - 8} r={3} fill="none" stroke={tinta} strokeWidth={1.2} />;
        const casa = f - (base > 1 ? base - 1 : 0);
        return <Circle key={'d' + i} cx={x} cy={topo + passoY * (casa - 0.5)} r={Math.min(passoX, passoY) * 0.36} fill={cor} />;
      })}
    </Svg>
  );
}

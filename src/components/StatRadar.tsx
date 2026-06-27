import React from 'react';
import Svg, { Polygon, Line, Circle, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors, gradients } from '../theme/system';

type Stat = { label: string; value: number };

/**
 * StatRadar — radar poligonal del "Sistema" para las stats RPG (STR/AGI/VIT/STA).
 * Polígono de datos relleno con gradiente brand + borde glow. La firma Solo Leveling.
 */
export function StatRadar({ stats, max = 10, size = 200 }: { stats: Stat[]; max?: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28; // margen para labels
  const n = stats.length;

  // Ángulo por eje: arriba primero (-90°), en sentido horario
  const angleAt = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pointAt = (i: number, radius: number) => {
    const a = angleAt(i);
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  };

  const ringLevels = [0.25, 0.5, 0.75, 1];
  const gridPolys = ringLevels.map((lvl) =>
    stats.map((_, i) => { const p = pointAt(i, r * lvl); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ')
  );
  const dataPoly = stats
    .map((s, i) => { const p = pointAt(i, r * Math.min(s.value / max, 1)); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; })
    .join(' ');

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={gradients.brand[0]} stopOpacity={0.45} />
          <Stop offset="100%" stopColor={gradients.brand[1]} stopOpacity={0.45} />
        </SvgGradient>
      </Defs>

      {/* Rejilla concéntrica */}
      {gridPolys.map((pts, i) => (
        <Polygon key={i} points={pts} fill="none" stroke={colors.panelBorder} strokeWidth={1} />
      ))}
      {/* Ejes */}
      {stats.map((_, i) => {
        const p = pointAt(i, r);
        return <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={colors.panelBorder} strokeWidth={1} />;
      })}

      {/* Polígono de datos */}
      <Polygon points={dataPoly} fill="url(#radarFill)" stroke={colors.glow} strokeWidth={2} />

      {/* Vértices + labels + valores */}
      {stats.map((s, i) => {
        const vertex = pointAt(i, r * Math.min(s.value / max, 1));
        const labelP = pointAt(i, r + 16);
        return (
          <React.Fragment key={s.label}>
            <Circle cx={vertex.x} cy={vertex.y} r={3.5} fill={colors.glow} />
            <SvgText
              x={labelP.x} y={labelP.y - 2}
              fill={colors.textDim} fontSize={10} fontWeight="700"
              textAnchor="middle"
            >
              {s.label}
            </SvgText>
            <SvgText
              x={labelP.x} y={labelP.y + 10}
              fill={colors.glow} fontSize={11} fontWeight="900"
              textAnchor="middle"
            >
              {s.value}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

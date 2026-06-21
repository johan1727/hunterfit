import React from 'react';
import { Pill, colors, rankColors } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24, display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>{children}</div>
);

export function RankTags() {
  return (
    <Dark>
      {(['E', 'D', 'C', 'B', 'A', 'S'] as const).map((r) => (
        <Pill key={r} dotColor={rankColors[r]}>Rango {r}</Pill>
      ))}
    </Dark>
  );
}

export function StatusLabels() {
  return (
    <Dark>
      <Pill dotColor={colors.primary}>Sistema de cazadores</Pill>
      <Pill dotColor={colors.success}>Activo</Pill>
      <Pill dotColor={colors.warning}>Hoy · lunes 16 jun</Pill>
      <Pill dotColor={colors.danger}>Meta crítica</Pill>
    </Dark>
  );
}

export function Single() {
  return (
    <div style={{ background: '#07080B', padding: 24 }}>
      <Pill dotColor={colors.accent}>Plan semanal</Pill>
    </div>
  );
}

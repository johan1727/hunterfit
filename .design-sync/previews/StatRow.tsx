import React from 'react';
import { StatRow, SystemPanel, SystemLabel } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function ProfileInfo() {
  return (
    <Dark>
      <SystemPanel>
        <SystemLabel>Información</SystemLabel>
        <StatRow label="Objetivo" value="Ganar masa" />
        <StatRow label="Nivel de forma" value="Intermedio" />
        <StatRow label="Días por semana" value="4 días" />
        <StatRow label="Edad" value="24 años" />
        <StatRow label="Peso" value="72 kg" />
        <StatRow label="Meta calórica" value="2400 kcal" />
      </SystemPanel>
    </Dark>
  );
}

export function HunterStats() {
  return (
    <Dark>
      <SystemPanel>
        <SystemLabel>Estadísticas del cazador</SystemLabel>
        <StatRow label="XP total" value="340" />
        <StatRow label="Racha actual" value="3 días 🔥" />
        <StatRow label="Nivel" value="4" />
        <StatRow label="Rango" value="E" />
      </SystemPanel>
    </Dark>
  );
}

export function Single() {
  return (
    <Dark>
      <SystemPanel style={{ paddingBottom: 0, marginBottom: 0 }}>
        <StatRow label="Meta proteína" value="160 g" />
      </SystemPanel>
    </Dark>
  );
}

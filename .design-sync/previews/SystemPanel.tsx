import React from 'react';
import { SystemPanel, SystemText, StatRow } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function Basic() {
  return (
    <Dark>
      <SystemPanel>
        <SystemText>Panel surface — near-black with hairline border.</SystemText>
      </SystemPanel>
    </Dark>
  );
}

export function WithStats() {
  return (
    <Dark>
      <SystemPanel>
        <StatRow label="Nivel" value="4" />
        <StatRow label="Rango" value="E" />
        <StatRow label="Racha" value="3 días" />
        <StatRow label="XP total" value="340" />
      </SystemPanel>
    </Dark>
  );
}

export function Compact() {
  return (
    <Dark>
      <SystemPanel style={{ padding: 12, marginBottom: 0 }}>
        <SystemText dim style={{ fontSize: 13 }}>Modo compacto — sin margen inferior.</SystemText>
      </SystemPanel>
    </Dark>
  );
}

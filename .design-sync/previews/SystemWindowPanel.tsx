import React from 'react';
import { SystemWindowPanel, SystemText, GradientText, Pill } from 'hunterfit-ds';
import { colors } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function HeroCard() {
  return (
    <Dark>
      <SystemWindowPanel>
        <Pill dotColor={colors.primary}>Cazador · Nivel 4</Pill>
        <GradientText style={{ fontSize: 32, marginTop: 8, display: 'block' }}>
          Jhonatan
        </GradientText>
        <SystemText dim style={{ marginTop: 8, display: 'block' }}>
          340 XP · racha 3 días 🔥
        </SystemText>
      </SystemWindowPanel>
    </Dark>
  );
}

export function Minimal() {
  return (
    <Dark>
      <SystemWindowPanel>
        <SystemText>Gradient border 1.5 px — the Aurora differentiator.</SystemText>
      </SystemWindowPanel>
    </Dark>
  );
}

export function ThickBorder() {
  return (
    <Dark>
      <SystemWindowPanel borderWidth={3}>
        <SystemText>Border width 3 px — accent visual más fuerte.</SystemText>
      </SystemWindowPanel>
    </Dark>
  );
}

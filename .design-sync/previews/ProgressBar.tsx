import React from 'react';
import { ProgressBar, SystemPanel, SystemText, colors } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function GradientFill() {
  return (
    <Dark>
      <SystemPanel>
        <SystemText dim style={{ marginBottom: 12, display: 'block' }}>XP hacia siguiente rango</SystemText>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ProgressBar progress={0.68} height={8} />
          <span style={{ color: colors.glow, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' as const }}>68%</span>
        </div>
      </SystemPanel>
    </Dark>
  );
}

export function MacroStats() {
  return (
    <Dark>
      <SystemPanel>
        {([
          { label: 'Proteína', pct: 0.78, color: colors.danger },
          { label: 'Carbohidratos', pct: 0.52, color: colors.warning },
          { label: 'Grasas', pct: 0.65, color: colors.accent },
        ] as const).map(({ label, pct, color }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <SystemText style={{ fontSize: 13 }}>{label}</SystemText>
              <span style={{ color, fontSize: 13, fontWeight: 700 }}>{Math.round(pct * 100)}%</span>
            </div>
            <div style={{ display: 'flex' }}>
              <ProgressBar progress={pct} color={color} height={5} />
            </div>
          </div>
        ))}
      </SystemPanel>
    </Dark>
  );
}

export function CalorieProgress() {
  return (
    <Dark>
      <SystemPanel>
        <SystemText dim style={{ marginBottom: 8, display: 'block', fontSize: 12 }}>
          1780 / 2400 kcal
        </SystemText>
        <div style={{ display: 'flex' }}>
          <ProgressBar progress={0.74} height={10} />
        </div>
      </SystemPanel>
    </Dark>
  );
}

export function NearFull() {
  return (
    <Dark>
      <SystemPanel>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SystemText dim style={{ fontSize: 12, width: 60 }}>25%</SystemText>
            <div style={{ flex: 1, display: 'flex' }}><ProgressBar progress={0.25} height={6} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SystemText dim style={{ fontSize: 12, width: 60 }}>50%</SystemText>
            <div style={{ flex: 1, display: 'flex' }}><ProgressBar progress={0.50} height={6} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SystemText dim style={{ fontSize: 12, width: 60 }}>100%</SystemText>
            <div style={{ flex: 1, display: 'flex' }}><ProgressBar progress={1} color={colors.success} height={6} /></div>
          </div>
        </div>
      </SystemPanel>
    </Dark>
  );
}

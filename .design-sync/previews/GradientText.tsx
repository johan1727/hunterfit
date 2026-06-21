import React from 'react';
import { GradientText, gradients } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function DisplayHero() {
  return (
    <Dark>
      <GradientText style={{ fontSize: 56, lineHeight: 1 }}>
        HunterFit
      </GradientText>
    </Dark>
  );
}

export function SectionTitle() {
  return (
    <Dark>
      <GradientText style={{ fontSize: 38 }}>Plan semanal</GradientText>
    </Dark>
  );
}

export function ManaGradient() {
  return (
    <Dark>
      <GradientText colors={gradients.mana} style={{ fontSize: 40 }}>
        Sistema
      </GradientText>
    </Dark>
  );
}

export function CustomPink() {
  return (
    <Dark>
      <GradientText
        colors={['#FB7185', '#FBBF24'] as const}
        style={{ fontSize: 40 }}
      >
        Nutrición
      </GradientText>
    </Dark>
  );
}

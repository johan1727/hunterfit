import React from 'react';
import { AuroraBackground, GradientText, Pill, colors } from 'hunterfit-ds';

export function FullScreen() {
  return (
    <div style={{ position: 'relative', background: '#07080B', height: 300, overflow: 'hidden' }}>
      <AuroraBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: 32 }}>
        <Pill dotColor={colors.primary}>Sistema de cazadores</Pill>
        <GradientText style={{ fontSize: 48, display: 'block', marginTop: 16 }}>
          HunterFit
        </GradientText>
      </div>
    </div>
  );
}

export function Standalone() {
  return (
    <div style={{ position: 'relative', background: '#07080B', height: 200, overflow: 'hidden', borderRadius: 24 }}>
      <AuroraBackground />
    </div>
  );
}

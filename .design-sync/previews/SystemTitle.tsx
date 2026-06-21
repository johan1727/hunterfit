import React from 'react';
import { SystemTitle, SystemPanel } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function Default() {
  return (
    <Dark>
      <SystemPanel>
        <SystemTitle>Estadísticas</SystemTitle>
        <SystemTitle>Compañero activo</SystemTitle>
        <SystemTitle>Información</SystemTitle>
      </SystemPanel>
    </Dark>
  );
}

export function Large() {
  return (
    <Dark>
      <SystemTitle style={{ fontSize: 28, fontWeight: 900 }}>Plan semanal</SystemTitle>
    </Dark>
  );
}

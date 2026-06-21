import React from 'react';
import { SystemButton } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24, display: 'flex', flexDirection: 'column' as const, gap: 0 }}>{children}</div>
);

export function AllVariants() {
  return (
    <Dark>
      <SystemButton title="Generar plan" variant="gradient" />
      <SystemButton title="Comenzar entrenamiento" variant="primary" />
      <SystemButton title="Ver detalles" variant="ghost" />
      <SystemButton title="Cerrar sesión" variant="danger" />
    </Dark>
  );
}

export function GradientButton() {
  return (
    <Dark>
      <SystemButton title="Crear cuenta" variant="gradient" />
    </Dark>
  );
}

export function LoadingState() {
  return (
    <Dark>
      <SystemButton title="Generando…" variant="gradient" loading />
      <SystemButton title="Guardando…" variant="primary" loading />
    </Dark>
  );
}

export function DisabledState() {
  return (
    <Dark>
      <SystemButton title="No disponible" variant="gradient" disabled />
      <SystemButton title="Sin permisos" variant="ghost" disabled />
    </Dark>
  );
}

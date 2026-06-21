import React from 'react';
import { SystemLabel, SystemPanel } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function FormLabels() {
  return (
    <Dark>
      <SystemPanel>
        <SystemLabel>Correo electrónico</SystemLabel>
        <SystemLabel>Contraseña</SystemLabel>
        <SystemLabel>Confirmar contraseña</SystemLabel>
      </SystemPanel>
    </Dark>
  );
}

export function SectionLabels() {
  return (
    <Dark>
      <SystemPanel>
        <SystemLabel>Macronutrientes</SystemLabel>
        <SystemLabel>Estadísticas</SystemLabel>
        <SystemLabel>Información del cazador</SystemLabel>
      </SystemPanel>
    </Dark>
  );
}

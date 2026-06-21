import React from 'react';
import { SystemInput, SystemLabel, SystemPanel } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function LoginForm() {
  return (
    <Dark>
      <SystemPanel>
        <SystemLabel>Correo</SystemLabel>
        <SystemInput placeholder="tu@email.com" type="email" />
        <SystemLabel>Contraseña</SystemLabel>
        <SystemInput placeholder="Mínimo 6 caracteres" type="password" />
      </SystemPanel>
    </Dark>
  );
}

export function SingleField() {
  return (
    <Dark>
      <SystemPanel>
        <SystemLabel>Nombre de usuario</SystemLabel>
        <SystemInput placeholder="Cazador123" />
      </SystemPanel>
    </Dark>
  );
}

export function WithValue() {
  return (
    <Dark>
      <SystemPanel>
        <SystemLabel>Correo (prellenado)</SystemLabel>
        <SystemInput value="jhonatanvillagomez38@gmail.com" />
      </SystemPanel>
    </Dark>
  );
}

import React from 'react';
import { SystemText } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function Regular() {
  return (
    <Dark>
      <SystemText>
        Tu plan se genera según tu personaje, nivel y días disponibles.
      </SystemText>
    </Dark>
  );
}

export function Dim() {
  return (
    <Dark>
      <SystemText dim>
        Modo exploración · crea una cuenta para guardar tu progreso
      </SystemText>
    </Dark>
  );
}

export function BothVariants() {
  return (
    <Dark>
      <SystemText style={{ display: 'block', marginBottom: 8 }}>
        Texto principal — casi blanco (#F4F6FB)
      </SystemText>
      <SystemText dim style={{ display: 'block' }}>
        Texto secundario — gris suave (#9BA3B4)
      </SystemText>
    </Dark>
  );
}

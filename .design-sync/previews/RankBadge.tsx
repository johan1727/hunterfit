import React from 'react';
import { RankBadge } from 'hunterfit-ds';

const Dark = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#07080B', padding: 24 }}>{children}</div>
);

export function AllRanks() {
  return (
    <Dark>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        {(['E', 'D', 'C', 'B', 'A', 'S'] as const).map((r) => (
          <div key={r} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6 }}>
            <RankBadge rank={r} size={44} />
            <span style={{ color: '#9BA3B4', fontSize: 11 }}>Rango {r}</span>
          </div>
        ))}
      </div>
    </Dark>
  );
}

export function Large() {
  return (
    <Dark>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <RankBadge rank="S" size={80} />
        <RankBadge rank="A" size={64} />
        <RankBadge rank="B" size={48} />
      </div>
    </Dark>
  );
}

export function ProfileHero() {
  return (
    <Dark>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <RankBadge rank="E" size={64} />
        <div>
          <div style={{ color: '#F4F6FB', fontSize: 24, fontWeight: 900 }}>Cazador</div>
          <div style={{ color: '#9BA3B4', fontSize: 14 }}>340 XP · Nivel 4</div>
        </div>
      </div>
    </Dark>
  );
}

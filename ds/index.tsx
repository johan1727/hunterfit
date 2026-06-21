/**
 * HunterFit Web Design System — Aurora Maximalism
 *
 * Web-native (DOM/CSS) port of the React Native design system.
 * Source of truth for visual identity: dark saturated near-black surfaces,
 * gradient text blue→violet→pink, gradient-border hero panels, floating
 * aurora capsule decorations.
 *
 * Usage:
 *   import { SystemPanel, GradientText, SystemButton } from 'hunterfit-ds';
 *   // All styling is inline — no CSS class names to learn.
 */

import React, { type CSSProperties, type ReactNode, type InputHTMLAttributes } from 'react';

// ─── Design Tokens ────────────────────────────────────────────────────────────

export const colors = {
  bg:           '#07080B',
  bgElevated:   '#101319',
  panel:        '#0C0E13',
  panelBorder:  'rgba(255,255,255,0.08)',
  glow:         '#8AB4FF',
  primary:      '#5B7CFF',
  primaryDark:  '#3B5BDB',
  accent:       '#C084FC',
  accentDark:   '#9333EA',
  success:      '#4ADE80',
  danger:       '#FB7185',
  warning:      '#FBBF24',
  gold:         '#F5B942',
  text:         '#F4F6FB',
  textDim:      '#9BA3B4',
  textFaint:    '#5A6172',
  white:        '#FFFFFF',
} as const;

export const gradients = {
  brand:        ['#5B7CFF', '#C084FC', '#FB7185'] as const,
  mana:         ['#5B7CFF', '#8AB4FF'] as const,
  capsuleCool:  ['#1E3A8A', '#0B1020'] as const,
  capsuleWarm:  ['#3B1F2E', '#0B0810'] as const,
  capsuleViolet:['#3B2A6B', '#0B0816'] as const,
} as const;

export const rankColors: Record<string, string> = {
  E: '#9CA3AF',
  D: '#CD7F32',
  C: '#C0C0C0',
  B: '#FFD700',
  A: '#FB7185',
  S: '#C084FC',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius  = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

export type HunterRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function grad(stops: readonly string[], dir = '135deg') {
  return `linear-gradient(${dir}, ${stops.join(', ')})`;
}

const panelBase: CSSProperties = {
  backgroundColor: colors.panel,
  border:          `1px solid ${colors.panelBorder}`,
  borderRadius:    radius.lg,
  padding:         spacing.lg,
  boxShadow:       '0 12px 24px rgba(0,0,0,0.5)',
};

// ─── Components ───────────────────────────────────────────────────────────────

/** Dark elevated panel with subtle hairline border. */
export function SystemPanel({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ ...panelBase, marginBottom: spacing.md, ...style }}>
      {children}
    </div>
  );
}

/** Hero panel with 1.5 px gradient border — the Aurora Maximalism differentiator. */
export function SystemWindowPanel({
  children,
  style,
  borderWidth = 1.5,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  borderWidth?: number;
}) {
  return (
    <div style={{
      background:    grad(gradients.brand),
      padding:       borderWidth,
      borderRadius:  radius.lg + borderWidth,
    }}>
      <div style={{
        backgroundColor: colors.panel,
        borderRadius:    radius.lg,
        padding:         spacing.lg,
        ...style,
      }}>
        {children}
      </div>
    </div>
  );
}

/** Section heading — 20 px, weight 800. */
export function SystemTitle({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <p style={{
      color:         colors.text,
      fontSize:      20,
      fontWeight:    800,
      letterSpacing: 0.2,
      margin:        `0 0 ${spacing.sm}px`,
      lineHeight:    1.3,
      ...style,
    }}>
      {children}
    </p>
  );
}

/** Uppercase dim label — 11 px, tracking 1.5. */
export function SystemLabel({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <p style={{
      color:          colors.textDim,
      fontSize:       11,
      letterSpacing:  1.5,
      textTransform:  'uppercase',
      margin:         `0 0 6px`,
      ...style,
    }}>
      {children}
    </p>
  );
}

/** Body text. Pass `dim` for secondary/muted content. */
export function SystemText({
  children,
  dim,
  style,
}: {
  children?: ReactNode;
  dim?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span style={{
      color:      dim ? colors.textDim : colors.text,
      fontSize:   15,
      lineHeight: 1.6,
      ...style,
    }}>
      {children}
    </span>
  );
}

/** Display headline with brand gradient fill (blue→violet→pink). */
export function GradientText({
  children,
  style,
  colors: stops = gradients.brand,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  /** Color stops for the gradient. Defaults to brand (blue→violet→pink). */
  colors?: readonly string[];
}) {
  return (
    <span style={{
      background:             grad(stops),
      WebkitBackgroundClip:   'text',
      WebkitTextFillColor:    'transparent',
      backgroundClip:         'text',
      color:                  'transparent',
      fontSize:               40,
      fontWeight:             900,
      letterSpacing:          -1,
      lineHeight:             1.1,
      display:                'inline-block',
      ...style,
    }}>
      {children}
    </span>
  );
}

/** Small pill/chip with a colored dot — used for rank tags, status labels. */
export function Pill({
  children,
  dotColor = colors.danger,
  style,
}: {
  children?: ReactNode;
  dotColor?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      display:         'inline-flex',
      alignItems:      'center',
      gap:             7,
      backgroundColor: 'rgba(255,255,255,0.06)',
      border:          `1px solid ${colors.panelBorder}`,
      borderRadius:    radius.pill,
      padding:         '6px 12px',
      alignSelf:       'flex-start',
    }}>
      <div style={{
        width:           7,
        height:          7,
        borderRadius:    '50%',
        backgroundColor: dotColor,
        flexShrink:      0,
      }} />
      <span style={{
        color:         colors.text,
        fontSize:      13,
        fontWeight:    600,
        letterSpacing: 0.2,
        ...style,
      }}>
        {children}
      </span>
    </div>
  );
}

/**
 * Decorative aurora background: three large rotated gradient capsules floating
 * behind the screen content. Place as the first child of a `position:relative` container.
 */
export function AuroraBackground() {
  const capsule = (
    color: readonly string[],
    pos: CSSProperties,
  ): React.ReactElement => (
    <div style={{
      position:     'absolute',
      width:        340,
      height:       150,
      borderRadius: radius.pill,
      background:   grad(color),
      opacity:      0.55,
      ...pos,
    }} />
  );

  return (
    <div style={{
      position:      'absolute',
      inset:         0,
      overflow:      'hidden',
      pointerEvents: 'none',
      zIndex:        0,
    }}>
      {capsule(gradients.capsuleCool,   { top: -40,    left: -60,  transform: 'rotate(-28deg)' })}
      {capsule(gradients.capsuleViolet, { top: '34%',  right: -90, transform: 'rotate(18deg)'  })}
      {capsule(gradients.capsuleWarm,   { bottom: 40,  left: -50,  transform: 'rotate(-12deg)' })}
    </div>
  );
}

/** Pill-shaped button with four variants. */
export function SystemButton({
  title,
  variant = 'primary',
  loading,
  disabled,
  onClick,
  style,
}: {
  title: string;
  variant?: 'primary' | 'gradient' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    borderRadius:    radius.pill,
    padding:         '16px 24px',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       spacing.sm,
    cursor:          disabled || loading ? 'not-allowed' : 'pointer',
    opacity:         disabled || loading ? 0.65 : 1,
    border:          'none',
    fontWeight:      700,
    fontSize:        16,
    letterSpacing:   0.2,
    transition:      'opacity 0.15s',
    width:           '100%',
    boxSizing:       'border-box',
    ...style,
  };

  const variants: Record<string, CSSProperties> = {
    primary: { backgroundColor: colors.white,  color: '#0A0A0A' },
    gradient:{ background: grad(gradients.brand, '90deg'), color: colors.white },
    ghost:   { backgroundColor: 'transparent', border: `1px solid ${colors.panelBorder}`, color: colors.text },
    danger:  { backgroundColor: 'rgba(251,113,133,0.14)', border: `1px solid ${colors.danger}`, color: colors.danger },
  };

  return (
    <button disabled={disabled || loading} onClick={onClick} style={{ ...base, ...variants[variant] }}>
      {loading ? '…' : title}
    </button>
  );
}

/** Underline-only text input (Savee-style — no visible box, just a bottom border). */
export function SystemInput({
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled,
  style,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        backgroundColor: 'transparent',
        border:          'none',
        borderBottom:    `1px solid ${colors.panelBorder}`,
        padding:         '12px 2px',
        color:           colors.text,
        fontSize:        17,
        marginBottom:    spacing.sm,
        outline:         'none',
        width:           '100%',
        boxSizing:       'border-box',
        ...style,
      }}
    />
  );
}

/** Circular rank badge with glow shadow matching the rank color. */
export function RankBadge({ rank, size = 44 }: { rank: HunterRank; size?: number }) {
  const color = rankColors[rank] ?? colors.glow;
  return (
    <div style={{
      width:           size,
      height:          size,
      borderRadius:    '50%',
      border:          `2px solid ${color}`,
      backgroundColor: colors.bgElevated,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      boxShadow:       `0 0 10px ${color}80`,
      flexShrink:      0,
    }}>
      <span style={{ color, fontSize: size * 0.45, fontWeight: 900 }}>{rank}</span>
    </div>
  );
}

/** Horizontal progress bar. Defaults to brand gradient fill; pass `color` for a solid fill. */
export function ProgressBar({
  progress,
  color,
  height = 8,
}: {
  /** 0–1 */
  progress: number;
  /** Solid fill color. Omit to use the brand gradient. */
  color?: string;
  height?: number;
}) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius:    height / 2,
      overflow:        'hidden',
      height,
      flex:            1,
    }}>
      <div style={{
        width:        `${pct}%`,
        height:       '100%',
        borderRadius: height / 2,
        background:   color ?? grad(gradients.brand, '90deg'),
        transition:   'width 0.3s ease',
      }} />
    </div>
  );
}

/** Label/value pair with a hairline separator — used in stat grids and info rows. */
export function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display:       'flex',
      justifyContent:'space-between',
      alignItems:    'center',
      padding:       '10px 0',
      borderBottom:  `0.5px solid ${colors.panelBorder}`,
    }}>
      <span style={{ color: colors.textDim, fontSize: 14 }}>{label}</span>
      <span style={{ color: colors.text, fontSize: 14, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

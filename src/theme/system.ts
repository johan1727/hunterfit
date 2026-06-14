// Tema "Sistema" — negro minimalista (estilo Savee) con acentos de gradiente
// azul→violeta→rosa y cápsulas de luz flotantes (estilo Kokonut).
// Mantiene la identidad Solo Leveling: el azul "mana" sigue siendo el acento.
export const colors = {
  // Superficies — casi negro, mucho aire negativo
  bg: '#07080B',
  bgElevated: '#101319',
  panel: '#0C0E13',
  panelBorder: 'rgba(255,255,255,0.08)',

  // Acentos
  glow: '#8AB4FF',        // azul eléctrico suave (texto/acento "Sistema")
  primary: '#5B7CFF',     // índigo (gradiente brand)
  primaryDark: '#3B5BDB',
  accent: '#C084FC',      // violeta
  accentDark: '#9333EA',

  // Estados
  success: '#4ADE80',
  danger: '#FB7185',
  warning: '#FBBF24',
  gold: '#F5B942',

  // Texto
  text: '#F4F6FB',        // casi blanco
  textDim: '#9BA3B4',
  textFaint: '#5A6172',
  white: '#FFFFFF',
} as const;

// Gradientes reutilizables (para LinearGradient: array de stops)
export const gradients = {
  brand: ['#5B7CFF', '#C084FC', '#FB7185'] as const,   // azul→violeta→rosa (titular Kokonut)
  mana: ['#5B7CFF', '#8AB4FF'] as const,               // azul "Sistema"
  capsuleCool: ['#1E3A8A', '#0B1020'] as const,        // cápsula fría (aurora)
  capsuleWarm: ['#3B1F2E', '#0B0810'] as const,        // cápsula cálida (aurora)
  capsuleViolet: ['#3B2A6B', '#0B0816'] as const,      // cápsula violeta (aurora)
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

// Radios — pill = totalmente redondeado (botones/chips estilo Savee)
export const radius = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

export const panel = {
  backgroundColor: colors.panel,
  borderWidth: 1,
  borderColor: colors.panelBorder,
  borderRadius: radius.lg,
  padding: spacing.lg,
  shadowColor: '#000',
  shadowOpacity: 0.5,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 6,
} as const;

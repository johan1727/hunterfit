# HunterFit Design System — Aurora Maximalism

## Visual identity

HunterFit uses **Aurora Maximalism**: a near-black background (#07080B) with saturated gradient accents. Every screen feels like a gamified "Hunter System" — inspired by the Solo Leveling manhwa aesthetic.

Key tokens (all in `colors` and `gradients` from the DS bundle):
- **Background**: `#07080B` — almost black, never pure black
- **Panel surface**: `#0E1117` — slightly lighter card background
- **Brand gradient**: blue `#5B7CFF` → violet `#8B5CF6` → pink `#F472B6` (135°)
- **Rank colors**: E=gray, D=green, C=blue, B=yellow/gold, A=pink/red, S=purple gradient

## Component usage rules

### Layout containers
- **`SystemPanel`** — default card surface. Use for any grouped content section.
- **`SystemWindowPanel`** — hero panels only. Has a 1.5px gradient border (the Aurora differentiator). Use for profile headers, featured cards. `borderWidth` prop: 1.5 (default) or 3 for emphasis.
- **`AuroraBackground`** — full-screen or section background with floating aurora capsules. Always place behind content as a `position: relative` wrapper.

### Typography
- **`GradientText`** — for display headings and feature names only. Pass `stops` array from `gradients.*`. Not for body text.
- **`SystemTitle`** — section headings inside panels (white, semi-bold).
- **`SystemLabel`** — form field labels and category labels (dim color, small caps feel).
- **`SystemText`** — body copy. Add `dim` prop for secondary/helper text.

### Interactive
- **`SystemButton`** — always full-width within its container. Variants: `gradient` (primary CTA), `primary` (white fill), `ghost` (outline), `danger` (destructive). Loading state: add `loading` prop.
- **`SystemInput`** — text inputs with dark styling. Always pair with `SystemLabel` above.

### Data display
- **`RankBadge`** — circular badge with rank letter and colored glow border. Use `size` prop: `sm`/`md`/`lg`. In profile headers, pair with name + subtitle.
- **`Pill`** — small status/tag chips with colored dot indicator. Use `rankColors[rank]` for rank dots.
- **`ProgressBar`** — always full-width inside its container (use `flex: 1` or a wrapping div). Default gradient fill; pass `color` prop for macro-specific colors (danger=protein, warning=carbs, accent=fats).
- **`StatRow`** — label+value rows inside `SystemPanel`. Stack multiple rows for data tables.

## Composition patterns

### Profile header
```tsx
<SystemWindowPanel>
  <RankBadge rank="E" size="lg" />
  <GradientText stops={gradients.brand}>Jhonatan</GradientText>
  <SystemText dim>340 XP · Nivel 4</SystemText>
</SystemWindowPanel>
```

### Macro bars
```tsx
<SystemPanel>
  <StatRow label="Proteína" value="128 / 160 g" />
  <ProgressBar progress={0.8} color={colors.danger} />
</SystemPanel>
```

### CTA screen footer
```tsx
<SystemButton variant="gradient" onPress={handleSubmit}>Generar plan</SystemButton>
<SystemButton variant="ghost" onPress={handleSkip}>Más tarde</SystemButton>
```

## What to avoid
- Never use a white or light background — everything lives on `#07080B` or `#0E1117`
- Don't use `GradientText` for body copy or labels — reserve it for hero/display moments
- Don't stack multiple `SystemWindowPanel` components — one per screen at most
- `AuroraBackground` should always be the outermost element, never nested inside panels

# HunterFit Design Sync — Notes

## First sync completed: 2026-06-20

### Stack quirks

- **React Native → web**: The DS bundle (`ds/index.tsx`) is a pure DOM/CSS reimplementation of all RN components. No `react-native` imports. Any change to the real RN components (`theme/system.ts`, `components/system.tsx`) must also be mirrored here.
- **`--inputs ./ds` flag**: Required because the package lives in `./ds/` not the project root. The converter looks for `package.json` + `dist/index.d.ts` there.
- **TypeScript declarations**: Regenerate with `npx tsc -p ds/tsconfig.json` whenever `ds/index.tsx` exports change. This populates `ds/dist/index.d.ts` which the converter needs for type extraction.
- **Playwright**: `playwright@1.59.0` installed in `.ds-sync/` — matches cached chromium-1217 in `%LOCALAPPDATA%\ms-playwright\`. Do not upgrade without checking chromium build compatibility.

### CSS note

`cssEntry: ./ds/styles.css` logs a "not found" warning during build but is non-blocking — the CSS is still auto-discovered and included correctly in the output bundle.

### Preview dark background

All authored previews (`previews/*.tsx`) wrap content in:
```tsx
const Dark = ({ children }) => <div style={{ background: '#07080B', padding: 24 }}>{children}</div>;
```
This is necessary because the preview HTML embeds `body { background: #fff }` that overrides `styles.css`.

### Re-sync command

```
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --inputs ./ds --entry ./ds/index.tsx --out ./ds-bundle
```

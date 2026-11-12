// Palette from the web STYLE_GUIDE, under the web names.
const palette = {
  ink: '#1d2a2e',
  paper: '#fff9ef',
  cardPaper: '#ffffff',
  line: '#e7dcc5',
  muted: '#5b6a6e',
  teal: '#4fd1c7',
  tealDeep: '#0f5f5c',
  tealWash: '#dcf5f1',
  tangerine: '#f6ad55',
  tangerineWash: '#fdeeda',
  purple: '#6d5698',
  purpleWash: '#ece6f5',
  emerald: '#198754',
  danger: '#9d2b2b',
  dangerWash: '#fee6e3',
  white: '#ffffff',
  scrim: 'rgba(29,42,46,0.45)',
} as const;

export const colors = {
  ...palette,

  // Deprecated aliases so the old names recolor with the palette.
  // Remove once no component references them.
  primary: palette.teal,
  primaryDark: palette.tealDeep,
  secondary: palette.muted,
  warning: palette.tangerine,
  success: palette.emerald,
  background: palette.paper,
  surface: palette.cardPaper,
  border: palette.line,
  text: palette.ink,
  heroBackground: palette.tangerine,
  errorSurface: palette.dangerWash,
  errorLabel: palette.danger,
  errorText: palette.danger,
  inputPlaceholder: palette.muted,
  onPrimaryText: palette.white,
  secondaryBackground: palette.tealWash,
} as const;

import { fonts } from './fonts';

// Every preset picks a family for its weight and never sets fontWeight.
const presets = {
  h1: {
    fontFamily: fonts.display[700],
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.2,
  },
  h2: { fontFamily: fonts.display[600], fontSize: 24, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.display[600], fontSize: 20, letterSpacing: -0.2 },
  cardTitle: {
    fontFamily: fonts.display[600],
    fontSize: 19,
    letterSpacing: -0.2,
  },
  dialogTitle: {
    fontFamily: fonts.display[600],
    fontSize: 21,
    letterSpacing: -0.2,
  },
  body: { fontFamily: fonts.body[400], fontSize: 17, lineHeight: 27 },
  meta: { fontFamily: fonts.body[600], fontSize: 14 },
  caption: { fontFamily: fonts.body[400], fontSize: 13, lineHeight: 20 },
  micro: { fontFamily: fonts.body[600], fontSize: 12 },
  // The web's 650 for buttons and badges maps to 600 until a variable font.
  button: { fontFamily: fonts.body[600], fontSize: 16 },
  buttonSmall: { fontFamily: fonts.body[600], fontSize: 14 },
  tag: { fontFamily: fonts.body[700], fontSize: 13 },
  kicker: {
    fontFamily: fonts.body[700],
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  label: { fontFamily: fonts.body[600], fontSize: 15 },
} as const;

export const typography = {
  ...presets,
  // Deprecated aliases.
  eyebrow: presets.kicker,
  title: presets.h1,
  value: presets.h2,
  itemName: presets.cardTitle,
  itemMeta: presets.caption,
  buttonLarge: presets.button,
} as const;

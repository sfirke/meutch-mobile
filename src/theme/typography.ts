// Text presets derived from the styles previously inlined in AppShell.
export const typography = {
  eyebrow: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    fontSize: 15,
    lineHeight: 22,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonLarge: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonSmall: {
    fontSize: 15,
    fontWeight: '700',
  },
} as const;

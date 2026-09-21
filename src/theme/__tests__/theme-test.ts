import { colors, radii, shadows } from '../index';

// Regression guard: these values must keep matching the original brand
// styles inlined in AppShell before the theme extraction.
describe('theme', () => {
  test('pins the brand colors', () => {
    expect(colors.primary).toBe('#4fd1c7');
    expect(colors.primaryDark).toBe('#319795');
    expect(colors.secondary).toBe('#718096');
    expect(colors.warning).toBe('#f6ad55');
    expect(colors.background).toBe('#fffffe');
    expect(colors.surface).toBe('#f7fafc');
    expect(colors.border).toBe('#e2e8f0');
    expect(colors.text).toBe('#2d3748');
  });

  test('pins the status colors', () => {
    expect(colors.success).toBe('#198754');
  });

  test('pins the card radii', () => {
    expect(radii.lg).toBe(24);
    expect(radii.md).toBe(20);
    expect(radii.sm).toBe(14);
  });

  test('pins the card shadow', () => {
    expect(shadows.card).toEqual({
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
    });
  });
});

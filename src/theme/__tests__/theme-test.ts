import {
  colors,
  focusRing,
  hardShadow,
  offsets,
  outline,
  radii,
  stitch,
  tilt,
} from '../index';

describe('theme', () => {
  test('legacy color aliases point at the new palette', () => {
    expect(colors.primary).toBe(colors.teal);
    expect(colors.primaryDark).toBe(colors.tealDeep);
    expect(colors.secondary).toBe(colors.muted);
    expect(colors.warning).toBe(colors.tangerine);
    expect(colors.success).toBe(colors.emerald);
    expect(colors.background).toBe(colors.paper);
    expect(colors.surface).toBe(colors.cardPaper);
    expect(colors.border).toBe(colors.line);
    expect(colors.text).toBe(colors.ink);
    expect(colors.heroBackground).toBe(colors.tangerine);
    expect(colors.errorSurface).toBe(colors.dangerWash);
    expect(colors.errorLabel).toBe(colors.danger);
    expect(colors.errorText).toBe(colors.danger);
    expect(colors.inputPlaceholder).toBe(colors.muted);
    expect(colors.onPrimaryText).toBe(colors.white);
    expect(colors.secondaryBackground).toBe(colors.tealWash);
  });

  test('legacy radii aliases map to the new radii', () => {
    expect(radii.sm).toBe(radii.control);
    expect(radii.md).toBe(radii.card);
    expect(radii.lg).toBe(radii.card);
  });

  test('hardShadow is an unblurred ink offset', () => {
    const shadow = hardShadow(offsets.lg);
    expect(shadow.shadowColor).toBe(colors.ink);
    expect(shadow.shadowOffset).toEqual({
      width: offsets.lg,
      height: offsets.lg,
    });
    expect(shadow.shadowRadius).toBe(0);
    expect(shadow.shadowOpacity).toBe(1);
  });

  test('offsets grow with size', () => {
    const { sm, md, lg, dialog, xl } = offsets;
    expect([sm, md, lg, dialog, xl]).toEqual(
      [sm, md, lg, dialog, xl].slice().sort((a, b) => a - b),
    );
  });

  test('tilts stay within 1 to 5 degrees', () => {
    for (const degrees of Object.values(tilt)) {
      expect(Math.abs(degrees)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(degrees)).toBeLessThanOrEqual(5);
    }
  });

  test('outline and stitch use the shared palette', () => {
    expect(outline).toBeGreaterThan(0);
    expect(focusRing).toBeGreaterThan(0);
    expect(stitch.color).toBe(colors.tangerine);
  });
});

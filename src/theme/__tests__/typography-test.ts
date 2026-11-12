import { fonts, typography } from '../index';

const families: string[] = [
  ...Object.values(fonts.display),
  ...Object.values(fonts.body),
];

describe('typography', () => {
  test.each(Object.entries(typography))(
    '%s picks a loaded family instead of a fontWeight',
    (_name, preset) => {
      expect(families).toContain(preset.fontFamily);
      expect(preset).not.toHaveProperty('fontWeight');
    },
  );
});

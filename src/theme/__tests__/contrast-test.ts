import { colors } from '../index';

function channel(value: number) {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) =>
    channel(parseInt(hex.slice(i, i + 2), 16)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: string, bg: string) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

type Name = keyof typeof colors;

const pairs: [Name, Name][] = [
  ['ink', 'teal'],
  ['ink', 'tangerine'],
  ['ink', 'paper'],
  ['ink', 'white'],
  ['ink', 'tealWash'],
  ['ink', 'tangerineWash'],
  ['ink', 'purpleWash'],
  ['ink', 'dangerWash'],
  ['white', 'purple'],
  ['white', 'emerald'],
  ['white', 'danger'],
  ['white', 'tealDeep'],
  ['white', 'ink'],
  ['tealDeep', 'paper'],
  ['tealDeep', 'white'],
  ['muted', 'paper'],
  ['muted', 'white'],
  ['purple', 'paper'],
  ['purple', 'white'],
];

describe('text contrast', () => {
  test.each(pairs)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(ratio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

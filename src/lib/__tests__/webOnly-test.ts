import { WEB_SITE, webOnlyNote } from '../webOnly';

describe('webOnlyNote', () => {
  test('formats the action as a sentence pointing at the website', () => {
    expect(webOnlyNote('Leave this circle')).toBe(
      'Leave this circle on meutch.com.',
    );
  });

  test('uses the shared WEB_SITE constant', () => {
    expect(webOnlyNote('Do a thing')).toBe(`Do a thing on ${WEB_SITE}.`);
  });
});

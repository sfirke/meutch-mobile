import { hasLinks, splitLinks } from '../linkify';

const text = (t: string) => ({ kind: 'text', text: t });
const link = (t: string, href = t) => ({ kind: 'link', text: t, href });

describe('splitLinks', () => {
  test('links an http url and keeps the surrounding text', () => {
    expect(
      splitLinks('You can see it here: https://meutch.com/item/abc'),
    ).toEqual([
      text('You can see it here: '),
      link('https://meutch.com/item/abc'),
    ]);
  });

  test('plain text is a single text segment', () => {
    expect(splitLinks('<script>alert(1)</script> hello')).toEqual([
      text('<script>alert(1)</script> hello'),
    ]);
  });

  test('empty string yields no segments', () => {
    expect(splitLinks('')).toEqual([]);
  });

  test('does not link javascript: or data: uris', () => {
    expect(splitLinks('javascript:alert(1)')).toEqual([
      text('javascript:alert(1)'),
    ]);
    expect(splitLinks('data:text/html;base64,PHNjcmlwdD4=')).toEqual([
      text('data:text/html;base64,PHNjcmlwdD4='),
    ]);
  });

  test('does not link ftp:, mailto: or email addresses', () => {
    expect(hasLinks('ftp://example.com/file')).toBe(false);
    expect(hasLinks('mailto:me@example.com')).toBe(false);
    expect(hasLinks('write to me@example.com')).toBe(false);
  });

  test('keeps newlines in the text segments', () => {
    expect(splitLinks('first\nhttps://a.example.com\nsecond')).toEqual([
      text('first\n'),
      link('https://a.example.com'),
      text('\nsecond'),
    ]);
  });

  test('trailing sentence punctuation is not part of the link', () => {
    expect(splitLinks('See https://meutch.com/item/abc.')).toEqual([
      text('See '),
      link('https://meutch.com/item/abc'),
      text('.'),
    ]);
  });

  test.each([',', ';', ':', '!', '?', ']', '}', '…', '.…'])(
    'trims trailing %s',
    (punct) => {
      expect(splitLinks(`https://example.com/a${punct}`)).toEqual([
        link('https://example.com/a'),
        text(punct),
      ]);
    },
  );

  test('balanced parentheses are kept in the link', () => {
    expect(splitLinks('https://example.com/wiki/Foo_(bar)')).toEqual([
      link('https://example.com/wiki/Foo_(bar)'),
    ]);
  });

  test('unbalanced closing paren is dropped', () => {
    expect(splitLinks('(see https://meutch.com/item/abc)')).toEqual([
      text('(see '),
      link('https://meutch.com/item/abc'),
      text(')'),
    ]);
  });

  test('keeps query strings and trims an unbalanced paren after a balanced one', () => {
    expect(splitLinks('https://meutch.com/items?a=1&b=2')).toEqual([
      link('https://meutch.com/items?a=1&b=2'),
    ]);
    expect(splitLinks('(https://example.com/Foo_(bar))')).toEqual([
      text('('),
      link('https://example.com/Foo_(bar)'),
      text(')'),
    ]);
  });

  test('a quote ends the link', () => {
    expect(splitLinks('https://meutch.com/a"onmouseover="alert(1)')).toEqual([
      link('https://meutch.com/a'),
      text('"onmouseover="alert(1)'),
    ]);
  });

  test('links several urls in one body', () => {
    expect(
      splitLinks('https://a.example.com and https://b.example.com'),
    ).toEqual([
      link('https://a.example.com'),
      text(' and '),
      link('https://b.example.com'),
    ]);
  });

  test('links a scheme-less www url with an https href and unchanged text', () => {
    expect(splitLinks('Found it at www.example.com/dp/B012345')).toEqual([
      text('Found it at '),
      link('www.example.com/dp/B012345', 'https://www.example.com/dp/B012345'),
    ]);
  });

  test('www url with a multi-label domain is matched whole', () => {
    expect(splitLinks('www.example.co.uk/dp/B012345')).toEqual([
      link(
        'www.example.co.uk/dp/B012345',
        'https://www.example.co.uk/dp/B012345',
      ),
    ]);
  });

  test('www url with a port and trailing period', () => {
    expect(splitLinks('www.example.com:8080/x.')).toEqual([
      link('www.example.com:8080/x', 'https://www.example.com:8080/x'),
      text('.'),
    ]);
  });

  test('www without a tld is not a link', () => {
    expect(hasLinks('www.example')).toBe(false);
  });

  test('bare hostname without www is not a link', () => {
    expect(splitLinks('Ask me about example.com sometime')).toEqual([
      text('Ask me about example.com sometime'),
    ]);
  });

  test('matches case-insensitively', () => {
    expect(splitLinks('HTTPS://EXAMPLE.COM and WWW.Example.com')).toEqual([
      link('HTTPS://EXAMPLE.COM'),
      text(' and '),
      link('WWW.Example.com', 'https://WWW.Example.com'),
    ]);
  });

  test('a lone scheme is not a link', () => {
    expect(hasLinks('https://')).toBe(false);
  });
});

describe('hasLinks', () => {
  test('is true only when a link is present', () => {
    expect(hasLinks('see https://meutch.com')).toBe(true);
    expect(hasLinks('see meutch.com')).toBe(false);
    expect(hasLinks('')).toBe(false);
  });
});

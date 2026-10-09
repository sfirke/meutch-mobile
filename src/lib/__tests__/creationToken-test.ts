import { createCreationToken } from '../creationToken';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createCreationToken', () => {
  it('returns a v4 UUID', () => {
    expect(createCreationToken()).toMatch(UUID_V4);
  });

  it('returns a different token on each call', () => {
    expect(createCreationToken()).not.toBe(createCreationToken());
  });
});

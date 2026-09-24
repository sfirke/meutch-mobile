import {
  buildQueryString,
  isUuid,
  matchEnum,
  normalizeImageUrl,
  parseLoanSummary,
  parsePagination,
  parseUserSummary,
} from '../parse';

const USER_ID = 'a1111111-1111-4111-8111-111111111111';
const LOAN_ID = 'b2222222-2222-4222-8222-222222222222';
const MESSAGE = 'Invalid test payload.';

function createUserPayload(overrides?: Record<string, unknown>) {
  return {
    id: USER_ID,
    first_name: 'Ada',
    last_name: 'Example',
    full_name: 'Ada Example',
    profile_image_url: null,
    ...overrides,
  };
}

describe('parseUserSummary', () => {
  test('parses a valid payload', () => {
    const user = parseUserSummary(createUserPayload(), MESSAGE);

    expect(user).toEqual({
      id: USER_ID,
      first_name: 'Ada',
      last_name: 'Example',
      full_name: 'Ada Example',
      profile_image_url: null,
    });
  });

  test('normalizes a relative profile image url to null', () => {
    const user = parseUserSummary(
      createUserPayload({ profile_image_url: '/static/img/default.png' }),
      MESSAGE,
    );

    expect(user.profile_image_url).toBeNull();
  });

  test('treats an absent profile image the same as null', () => {
    const payload = createUserPayload();
    delete (payload as Record<string, unknown>).profile_image_url;

    const user = parseUserSummary(payload, MESSAGE);

    expect(user.profile_image_url).toBeNull();
  });

  test('throws the given message when full_name is missing', () => {
    const payload = createUserPayload();
    delete (payload as Record<string, unknown>).full_name;

    expect(() => parseUserSummary(payload, MESSAGE)).toThrow(MESSAGE);
  });
});

describe('matchEnum', () => {
  const allowed = ['pending', 'approved'] as const;

  test('returns a known value', () => {
    expect(matchEnum('approved', allowed)).toBe('approved');
  });

  test('returns null for an unknown value', () => {
    expect(matchEnum('renegotiating', allowed)).toBeNull();
  });

  test('returns null for undefined', () => {
    expect(matchEnum(undefined, allowed)).toBeNull();
  });
});

describe('parseLoanSummary', () => {
  function createLoanPayload(overrides?: Record<string, unknown>) {
    return {
      id: LOAN_ID,
      start_date: '2026-06-01',
      end_date: '2026-06-08',
      status: 'approved',
      borrower: createUserPayload(),
      ...overrides,
    };
  }

  test('parses a valid payload', () => {
    const loan = parseLoanSummary(createLoanPayload(), MESSAGE);

    expect(loan).toEqual({
      id: LOAN_ID,
      start_date: '2026-06-01',
      end_date: '2026-06-08',
      status: 'approved',
      borrower: createUserPayload(),
    });
  });

  test('maps an unknown status to null', () => {
    const loan = parseLoanSummary(
      createLoanPayload({ status: 'renegotiating' }),
      MESSAGE,
    );

    expect(loan.status).toBeNull();
  });

  test('treats an absent borrower as null', () => {
    const payload = createLoanPayload();
    delete (payload as Record<string, unknown>).borrower;

    const loan = parseLoanSummary(payload, MESSAGE);

    expect(loan.borrower).toBeNull();
  });

  test('treats a null borrower as null', () => {
    const loan = parseLoanSummary(
      createLoanPayload({ borrower: null }),
      MESSAGE,
    );

    expect(loan.borrower).toBeNull();
  });

  test('throws the given message for a malformed payload', () => {
    expect(() => parseLoanSummary({ id: LOAN_ID }, MESSAGE)).toThrow(MESSAGE);
  });
});

describe('isUuid', () => {
  test('accepts a lowercase uuid', () => {
    expect(isUuid(USER_ID)).toBe(true);
  });

  test('accepts an uppercase uuid', () => {
    expect(isUuid(USER_ID.toUpperCase())).toBe(true);
  });

  test('rejects a short string', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  test('rejects undefined', () => {
    expect(isUuid(undefined)).toBe(false);
  });
});

describe('normalizeImageUrl', () => {
  test('keeps an absolute url', () => {
    expect(normalizeImageUrl('https://cdn.example.test/img/drill.jpg')).toBe(
      'https://cdn.example.test/img/drill.jpg',
    );
  });

  test('normalizes a relative url to null', () => {
    expect(normalizeImageUrl('/static/img/default.png')).toBeNull();
  });

  test('normalizes null to null', () => {
    expect(normalizeImageUrl(null)).toBeNull();
  });

  test('normalizes undefined to null', () => {
    expect(normalizeImageUrl(undefined)).toBeNull();
  });
});

describe('buildQueryString', () => {
  test('returns an empty string for no params', () => {
    expect(buildQueryString([])).toBe('');
  });

  test('encodes ampersands and spaces', () => {
    expect(buildQueryString([['q', 'drill & bits']])).toBe(
      '?q=drill%20%26%20bits',
    );
  });
});

describe('parsePagination', () => {
  test('throws on a malformed payload', () => {
    expect(() => parsePagination({ page: 1 })).toThrow(
      'Invalid pagination payload.',
    );
  });
});

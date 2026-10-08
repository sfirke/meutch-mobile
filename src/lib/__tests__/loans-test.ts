import type { ApiFetch } from '../api';
import {
  describeLoanDue,
  describeLoanStatus,
  fetchLoanDetail,
  fetchMyLoans,
  parseLoanActivity,
  parseLoanDetail,
  parseLoanListPage,
  type LoanActivity,
} from '../loans';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

const LOAN_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';

const ana = {
  id: '44444444-4444-4444-8444-444444444444',
  first_name: 'Ana',
  last_name: 'Example',
  full_name: 'Ana Example',
  profile_image_url: null,
  profile_viewable: true,
};

const ben = {
  ...ana,
  id: '55555555-5555-4555-8555-555555555555',
  first_name: 'Ben',
  full_name: 'Ben Example',
};

function createLoan(overrides?: Record<string, unknown>) {
  return {
    id: LOAN_ID,
    status: 'approved',
    start_date: '2026-06-01',
    end_date: '2026-06-10',
    item: {
      id: ITEM_ID,
      name: 'Extension ladder',
      available: false,
      image_url: 'https://example.com/ladder.jpg',
    },
    owner: ana,
    borrower: ben,
    latest_conversation_message_id: MESSAGE_ID,
    due_state: 'due_soon',
    days_until_due: 3,
    days_overdue: null,
    ...overrides,
  };
}

const pagination = {
  page: 1,
  per_page: 20,
  total: 1,
  pages: 1,
  has_next: false,
  has_prev: false,
};

function mockFetch(body: unknown, status = 200) {
  return jest.fn(async () =>
    createMockResponse(body, status),
  ) as unknown as jest.MockedFunction<ApiFetch>;
}

describe('fetchMyLoans', () => {
  it.each(['borrowing', 'lending'] as const)(
    'requests the %s list',
    async (role) => {
      const fetchImpl = mockFetch({ loans: [createLoan()], pagination });
      const signal = new AbortController().signal;

      const result = await fetchMyLoans(fetchImpl, { role, page: 2, signal });

      expect(fetchImpl).toHaveBeenCalledWith(
        `/me/loans?role=${role}&status=all&page=2`,
        { signal },
      );
      expect(result.loans).toHaveLength(1);
    },
  );

  it('adds per_page when given', async () => {
    const fetchImpl = mockFetch({ loans: [], pagination });

    await fetchMyLoans(fetchImpl, { role: 'lending', page: 1, perPage: 10 });

    expect(fetchImpl).toHaveBeenCalledWith(
      '/me/loans?role=lending&status=all&page=1&per_page=10',
      { signal: undefined },
    );
  });

  it('rejects on a non-2xx response', async () => {
    const fetchImpl = mockFetch({ error: 'nope' }, 500);

    await expect(
      fetchMyLoans(fetchImpl, { role: 'borrowing', page: 1 }),
    ).rejects.toThrow();
  });
});

describe('fetchLoanDetail', () => {
  it('requests the detail path and forwards signal', async () => {
    const fetchImpl = mockFetch({
      loan: createLoan({ created_at: '2026-05-30T12:00:00' }),
    });
    const signal = new AbortController().signal;

    const result = await fetchLoanDetail(fetchImpl, LOAN_ID, { signal });

    expect(fetchImpl).toHaveBeenCalledWith(`/loans/${LOAN_ID}`, { signal });
    expect(result.loan.created_at).toBe('2026-05-30T12:00:00');
  });

  it('rejects on a non-2xx response', async () => {
    const fetchImpl = mockFetch({ error: 'missing' }, 404);

    await expect(fetchLoanDetail(fetchImpl, LOAN_ID)).rejects.toThrow();
  });
});

describe('parseLoanActivity', () => {
  it('parses a full payload', () => {
    expect(parseLoanActivity(createLoan())).toEqual(createLoan());
  });

  it('accepts null owner and borrower', () => {
    const loan = parseLoanActivity(createLoan({ owner: null, borrower: null }));

    expect(loan.owner).toBeNull();
    expect(loan.borrower).toBeNull();
  });

  it('maps unknown status and due_state to null', () => {
    const loan = parseLoanActivity(
      createLoan({ status: 'mystery', due_state: 'whenever' }),
    );

    expect(loan.status).toBeNull();
    expect(loan.due_state).toBeNull();
  });

  it('throws when item is missing or id is not a string', () => {
    expect(() => parseLoanActivity(createLoan({ item: undefined }))).toThrow(
      'Invalid loan payload.',
    );
    expect(() => parseLoanActivity(createLoan({ id: 5 }))).toThrow(
      'Invalid loan payload.',
    );
  });

  it('requires created_at on details', () => {
    expect(() => parseLoanDetail(createLoan())).toThrow(
      'Invalid loan payload.',
    );
  });

  it('rejects a list without a loans array', () => {
    expect(() => parseLoanListPage({ pagination })).toThrow();
  });
});

describe('describeLoanStatus', () => {
  it.each([
    ['pending', 'Loan request pending', 'warning'],
    ['approved', 'Loan approved', 'success'],
    ['completed', 'Completed', 'neutral'],
    [null, 'Loan', 'neutral'],
  ] as const)('describes %s', (status, label, tone) => {
    expect(describeLoanStatus({ status })).toEqual({ label, tone });
  });
});

describe('describeLoanDue', () => {
  function loan(overrides: Partial<LoanActivity>): LoanActivity {
    return { ...parseLoanActivity(createLoan()), ...overrides };
  }

  it('describes overdue loans', () => {
    expect(
      describeLoanDue(loan({ due_state: 'overdue', days_overdue: 4 })),
    ).toBe('Overdue by 4 days');
    expect(
      describeLoanDue(loan({ due_state: 'overdue', days_overdue: 1 })),
    ).toBe('Overdue by 1 day');
  });

  it('describes loans due today', () => {
    expect(describeLoanDue(loan({ due_state: 'due_today' }))).toBe('Due today');
  });

  it('describes upcoming due dates', () => {
    expect(
      describeLoanDue(loan({ due_state: 'due_soon', days_until_due: 2 })),
    ).toBe('Due in 2 days');
    expect(
      describeLoanDue(loan({ due_state: 'on_time', days_until_due: 1 })),
    ).toBe('Due in 1 day');
  });

  it('returns null when counts are missing or state is unknown', () => {
    expect(
      describeLoanDue(loan({ due_state: 'overdue', days_overdue: null })),
    ).toBeNull();
    expect(
      describeLoanDue(loan({ due_state: 'on_time', days_until_due: null })),
    ).toBeNull();
    expect(describeLoanDue(loan({ due_state: null }))).toBeNull();
  });

  it('returns null for non-approved loans', () => {
    expect(
      describeLoanDue(loan({ status: 'pending', due_state: 'due_today' })),
    ).toBeNull();
  });
});

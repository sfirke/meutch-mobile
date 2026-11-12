import type { ApiFetch } from '../api';
import {
  describeLoanDue,
  describeLoanStatus,
  extendLoan,
  fetchLoanDetail,
  fetchMyLoans,
  LOAN_ACTIONS,
  parseLoanActivity,
  parseLoanDetail,
  parseLoanExtendResponse,
  parseLoanListPage,
  parseLoanMutationResponse,
  performLoanAction,
  requestLoan,
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

function buildMessageSummary(overrides?: Record<string, unknown>) {
  return {
    id: MESSAGE_ID,
    body: 'Loan request approved.',
    timestamp: '2026-05-30T12:00:00+00:00',
    is_read: false,
    sender: ana,
    recipient: ben,
    ...overrides,
  };
}

function buildMutationPayload(overrides?: Record<string, unknown>) {
  return {
    loan: createLoan({ created_at: '2026-05-30T12:00:00' }),
    message: buildMessageSummary(),
    ...overrides,
  };
}

function getRequestInit(fetchImpl: jest.MockedFunction<ApiFetch>): RequestInit {
  return fetchImpl.mock.calls[0][1] as RequestInit;
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

describe('requestLoan', () => {
  it('posts the request body to the item path', async () => {
    const fetchImpl = mockFetch(buildMutationPayload(), 201);
    const input = {
      start_date: '2026-06-01',
      end_date: '2026-06-10',
      message: 'Could I borrow this for a week?',
    };

    const result = await requestLoan(fetchImpl, 'item/1', input);

    expect(fetchImpl.mock.calls[0][0]).toBe('/items/item%2F1/loan-requests');
    const init = getRequestInit(fetchImpl);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(input);
    expect(result.loan.id).toBe(LOAN_ID);
    expect(result.message.id).toBe(MESSAGE_ID);
  });

  it('rejects on a non-2xx response', async () => {
    const fetchImpl = mockFetch({ error: 'invalid' }, 422);

    await expect(
      requestLoan(fetchImpl, ITEM_ID, {
        start_date: '2026-06-01',
        end_date: '2026-06-10',
        message: 'Could I borrow this?',
      }),
    ).rejects.toThrow();
  });
});

describe('performLoanAction', () => {
  it.each(LOAN_ACTIONS)('posts %s with no body', async (action) => {
    const fetchImpl = mockFetch(buildMutationPayload());

    const result = await performLoanAction(fetchImpl, LOAN_ID, action);

    expect(fetchImpl.mock.calls[0][0]).toBe(`/loans/${LOAN_ID}/${action}`);
    const init = getRequestInit(fetchImpl);
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(result.loan.created_at).toBe('2026-05-30T12:00:00');
  });

  it('encodes the loan id', async () => {
    const fetchImpl = mockFetch(buildMutationPayload());

    await performLoanAction(fetchImpl, 'a/b', 'approve');

    expect(fetchImpl.mock.calls[0][0]).toBe('/loans/a%2Fb/approve');
  });
});

describe('extendLoan', () => {
  const payload = { ...buildMutationPayload(), is_extension: true };

  it('sends the trimmed message when given', async () => {
    const fetchImpl = mockFetch(payload);

    const result = await extendLoan(fetchImpl, LOAN_ID, {
      new_end_date: '2026-06-20',
      message: '  Need a few more days.  ',
    });

    expect(fetchImpl.mock.calls[0][0]).toBe(`/loans/${LOAN_ID}/extend`);
    const init = getRequestInit(fetchImpl);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      new_end_date: '2026-06-20',
      message: 'Need a few more days.',
    });
    expect(result.is_extension).toBe(true);
  });

  it.each([undefined, '', '   '])(
    'omits message when it is %p',
    async (message) => {
      const fetchImpl = mockFetch(payload);

      await extendLoan(fetchImpl, LOAN_ID, {
        new_end_date: '2026-06-20',
        message,
      });

      expect(JSON.parse(getRequestInit(fetchImpl).body as string)).toEqual({
        new_end_date: '2026-06-20',
      });
    },
  );
});

describe('parseLoanMutationResponse', () => {
  it('parses a full payload', () => {
    const result = parseLoanMutationResponse(buildMutationPayload());

    expect(result.loan).toEqual(
      createLoan({ created_at: '2026-05-30T12:00:00' }),
    );
    expect(result.message).toEqual(buildMessageSummary());
  });

  it('throws on a malformed payload', () => {
    expect(() => parseLoanMutationResponse(null)).toThrow(
      'Invalid loan mutation payload.',
    );
    expect(() =>
      parseLoanMutationResponse(buildMutationPayload({ message: undefined })),
    ).toThrow('Invalid message payload.');
    expect(() =>
      parseLoanMutationResponse(buildMutationPayload({ loan: createLoan() })),
    ).toThrow('Invalid loan payload.');
  });
});

describe('parseLoanExtendResponse', () => {
  it('parses is_extension', () => {
    const result = parseLoanExtendResponse({
      ...buildMutationPayload(),
      is_extension: false,
    });

    expect(result.is_extension).toBe(false);
    expect(result.message.id).toBe(MESSAGE_ID);
  });

  it('requires is_extension', () => {
    expect(() => parseLoanExtendResponse(buildMutationPayload())).toThrow(
      'Invalid loan extend payload.',
    );
  });
});

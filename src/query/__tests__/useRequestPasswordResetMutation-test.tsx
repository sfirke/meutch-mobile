import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { apiFetch, isApiError } from '../../lib/api';
import {
  createTestQueryClient,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
} from '../../test-utils/renderWithProviders';
import { useRequestPasswordResetMutation } from '../useRequestPasswordResetMutation';

jest.mock('../../lib/api', () => ({
  ...jest.requireActual('../../lib/api'),
  apiFetch: jest.fn(),
}));

function renderMutation() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useRequestPasswordResetMutation(), { wrapper });
}

describe('useRequestPasswordResetMutation', () => {
  test('posts the trimmed email and resolves the message without a session', async () => {
    const fetchMock = mockApiFetch({
      'POST /auth/forgot-password': { message: 'Check your email.' },
    });
    jest.mocked(apiFetch).mockImplementation(fetchMock);

    const { result } = renderMutation();

    act(() => {
      result.current.mutate('  member@example.com ');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.message).toBe('Check your email.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/auth/forgot-password');
    expect(getRequestBody(fetchMock.mock.calls[0][1])).toEqual({
      email: 'member@example.com',
    });
  });

  test('surfaces a rate limit error', async () => {
    jest.mocked(apiFetch).mockImplementation(
      mockApiFetch({
        'POST /auth/forgot-password': () =>
          jsonResponse(
            { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many.' } },
            429,
          ),
      }),
    );

    const { result } = renderMutation();

    act(() => {
      result.current.mutate('member@example.com');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const { error } = result.current;
    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

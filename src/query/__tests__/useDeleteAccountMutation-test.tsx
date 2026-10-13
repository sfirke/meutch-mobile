import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import {
  createTestQueryClient,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import {
  ACCOUNT_DELETED_NOTICE,
  useDeleteAccountMutation,
} from '../useDeleteAccountMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

function setup(response: unknown) {
  const authenticatedApiFetch = mockApiFetch({ 'DELETE /me': response });
  const session = mockSession({ authenticatedApiFetch });

  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { authenticatedApiFetch, session, wrapper };
}

describe('useDeleteAccountMutation', () => {
  test('deletes the account then discards the session with a notice', async () => {
    const { authenticatedApiFetch, session, wrapper } = setup({
      deleted: true,
    });

    const { result } = renderHook(() => useDeleteAccountMutation(), {
      wrapper,
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [path, init] = authenticatedApiFetch.mock.calls[0];
    expect(path).toBe('/me');
    expect(init?.method).toBe('DELETE');
    expect(getRequestBody(init)).toEqual({
      confirmation: 'DELETE MY ACCOUNT',
    });
    expect(session.discardSession).toHaveBeenCalledTimes(1);
    expect(session.discardSession).toHaveBeenCalledWith(ACCOUNT_DELETED_NOTICE);
    expect(ACCOUNT_DELETED_NOTICE).toBe('Your account has been deleted.');
  });

  test.each([422, 500])(
    'keeps the session and sets error on a %i response',
    async (status) => {
      const { session, wrapper } = setup(
        jsonResponse(
          { error: { code: 'ERROR', message: 'Request failed.' } },
          status,
        ),
      );

      const { result } = renderHook(() => useDeleteAccountMutation(), {
        wrapper,
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(session.discardSession).not.toHaveBeenCalled();
    },
  );
});

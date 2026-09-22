import { useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { readJsonOrThrow } from '../../lib/api';
import { useSession } from '../../session/SessionProvider';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../renderWithProviders';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

function Profile() {
  const { authenticatedApiFetch, user } = useSession();
  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const response = await authenticatedApiFetch('/profile');
      return readJsonOrThrow<{ name: string }>(response);
    },
  });

  if (query.isPending) {
    return <Text>Loading</Text>;
  }

  if (query.isError) {
    return <Text>Something went wrong</Text>;
  }

  return <Text>{query.data.name}</Text>;
}

describe('renderWithProviders', () => {
  test('renders query data resolved through the mocked session', async () => {
    const authenticatedApiFetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ name: 'Fake Member' }));

    mockSession({ authenticatedApiFetch });
    renderWithProviders(<Profile />);

    expect(screen.getByText('Loading')).toBeTruthy();
    expect(await screen.findByText('Fake Member')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledWith('/profile');
  });

  test('surfaces a failed query without retrying, since the test client disables retries', async () => {
    const authenticatedApiFetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ error: { message: 'Nope' } }, 404));

    mockSession({ authenticatedApiFetch });
    renderWithProviders(<Profile />);

    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
  });
});

import { useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { readJsonOrThrow } from '../../lib/api';
import { useSession } from '../../session/SessionProvider';
import {
  emptyApiFetch,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
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

describe('emptyApiFetch', () => {
  test('routes /messages to an empty conversations page', async () => {
    const response = await emptyApiFetch()('/messages?status=inbox&page=1');
    const body = await response.json();

    expect(body).toMatchObject({ conversations: [] });
  });

  test('routes /me/profile to the session fixture wrapped as { user }', async () => {
    const response = await emptyApiFetch()('/me/profile');
    const body = await response.json();

    expect(body.user.full_name).toBe('Fake Member');
  });

  test('routes /me/settings to the settings fixture wrapped as { settings }', async () => {
    const response = await emptyApiFetch()('/me/settings');
    const body = await response.json();

    expect(body.settings.digest_frequency).toBe('weekly');
  });

  test('leaves /feed and /circles routed as before', async () => {
    const fetch = emptyApiFetch();

    expect(await (await fetch('/feed')).json()).toMatchObject({ events: [] });
    expect(await (await fetch('/circles')).json()).toMatchObject({
      circles: [],
    });
  });

  test('still routes everything else in the collection branch to items', async () => {
    const response = await emptyApiFetch()('/items');
    const body = await response.json();

    expect(body).toMatchObject({ items: [] });
  });
});

describe('mockApiFetch', () => {
  test('an exact match wins over a stripped-query match', async () => {
    const fetch = mockApiFetch({
      'GET /circles': { circles: ['stripped'] },
      'GET /circles?membership=mine&page=1': { circles: ['exact'] },
    });

    const response = await fetch('/circles?membership=mine&page=1');

    expect(await response.json()).toEqual({ circles: ['exact'] });
  });

  test('a stripped-query match is used when no exact match exists', async () => {
    const fetch = mockApiFetch({ 'GET /circles': { circles: ['stripped'] } });

    const response = await fetch('/circles?membership=mine&page=1');

    expect(await response.json()).toEqual({ circles: ['stripped'] });
  });

  test('POST and GET on the same path are distinct routes', async () => {
    const fetch = mockApiFetch({
      'GET /circles/1': { circle: { id: '1' } },
      'POST /circles/1': { circle: { id: '1', joined: true } },
    });

    const getResponse = await fetch('/circles/1');
    const postResponse = await fetch('/circles/1', { method: 'POST' });

    expect(await getResponse.json()).toEqual({ circle: { id: '1' } });
    expect(await postResponse.json()).toEqual({
      circle: { id: '1', joined: true },
    });
  });

  test('a function route receives init and can return a non-2xx Response', async () => {
    const routeHandler = jest.fn((init?: RequestInit) =>
      jsonResponse({ error: { message: 'boom', method: init?.method } }, 422),
    );
    const fetch = mockApiFetch({ 'POST /messages/1/reply': routeHandler });

    const response = await fetch('/messages/1/reply', {
      method: 'POST',
      body: JSON.stringify({ body: 'hi' }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(response.ok).toBe(false);
    expect(body.error.method).toBe('POST');
    expect(routeHandler).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('a plain body from a route wraps as a 200 response', async () => {
    const fetch = mockApiFetch({ 'GET /me/profile': { user: { id: '1' } } });

    const response = await fetch('/me/profile');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: { id: '1' } });
  });

  test('an unmatched route 404s with the method and path in the message', async () => {
    const fetch = mockApiFetch({});

    const response = await fetch('/circles', { method: 'DELETE' });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe('No mock route for DELETE /circles');
  });
});

describe('getRequestBody', () => {
  test('parses a JSON string body', () => {
    expect(getRequestBody({ body: JSON.stringify({ ok: true }) })).toEqual({
      ok: true,
    });
  });

  test('returns undefined for a missing body', () => {
    expect(getRequestBody()).toBeUndefined();
    expect(getRequestBody({})).toBeUndefined();
  });
});

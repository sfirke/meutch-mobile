import { fireEvent, render, screen } from '@testing-library/react-native';

import type { RequestSummary } from '../../lib/requests';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { RequestRow } from '../RequestRow';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const NOW = new Date('2026-06-01T12:00:00Z');

function buildRequest(overrides: Partial<RequestSummary> = {}): RequestSummary {
  return {
    id: 'a1111111-1111-4111-8111-111111111111',
    title: 'Looking for a ladder',
    description: null,
    seeking: 'loan',
    visibility: 'public',
    status: 'open',
    expires_at: '2026-06-03T00:00:00Z',
    fulfilled_at: null,
    created_at: '2026-05-20T00:00:00Z',
    user: {
      id: 'b2222222-2222-4222-8222-222222222222',
      first_name: 'Ada',
      last_name: 'Example',
      full_name: 'Ada Example',
      profile_image_url: null,
      profile_viewable: false,
    },
    distance: null,
    ...overrides,
  };
}

describe('RequestRow', () => {
  it('renders the title and both labels', () => {
    render(<RequestRow now={NOW} request={buildRequest()} />);

    expect(screen.getByText('Looking for a ladder')).toBeOnTheScreen();
    expect(screen.getByText('Seeking a loan')).toBeOnTheScreen();
    expect(screen.getByText('Public')).toBeOnTheScreen();
  });

  it('shows the expiry date for an open request', () => {
    render(<RequestRow now={NOW} request={buildRequest()} />);

    expect(screen.getByText('Expires Jun 3, 2026')).toBeOnTheScreen();
  });

  it('shows the fulfilled date for a fulfilled request', () => {
    render(
      <RequestRow
        now={NOW}
        request={buildRequest({
          status: 'fulfilled',
          fulfilled_at: '2026-05-20T10:00:00Z',
        })}
      />,
    );

    expect(screen.getByText('Fulfilled May 20, 2026')).toBeOnTheScreen();
  });

  it('shows the expired date for an expired open request', () => {
    render(
      <RequestRow
        now={NOW}
        request={buildRequest({ expires_at: '2026-05-01T00:00:00Z' })}
      />,
    );

    expect(screen.getByText('Expired May 1, 2026')).toBeOnTheScreen();
  });

  it('renders no chips when seeking and visibility are null', () => {
    render(
      <RequestRow
        now={NOW}
        request={buildRequest({ seeking: null, visibility: null })}
      />,
    );

    expect(screen.queryByText('Seeking a loan')).toBeNull();
    expect(screen.queryByText('Public')).toBeNull();
  });

  it('passes the request to onPress', () => {
    const request = buildRequest();
    const onPress = jest.fn();

    render(<RequestRow now={NOW} onPress={onPress} request={request} />);
    fireEvent.press(screen.getByRole('button', { name: request.title }));

    expect(onPress).toHaveBeenCalledWith(request);
  });

  it('renders no button without onPress', () => {
    render(<RequestRow now={NOW} request={buildRequest()} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ApiError } from '../../lib/api';
import { SessionExpiredError } from '../../lib/session';
import { QueryStateView } from '../QueryStateView';

const emptyProps = { title: 'No items yet' };

describe('<QueryStateView />', () => {
  test('shows a labeled activity indicator while pending, regardless of other props', () => {
    render(
      <QueryStateView
        empty={emptyProps}
        error={new Error('should be ignored while pending')}
        isEmpty
        isPending
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.queryByText('content')).toBeNull();
  });

  test('accepts a custom loading label', () => {
    render(
      <QueryStateView
        empty={emptyProps}
        error={null}
        isEmpty={false}
        isPending
        loadingLabel="Loading your circles"
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.getByLabelText('Loading your circles')).toBeTruthy();
  });

  test('renders ErrorState with a retry button for a retryable error with no data', () => {
    const onRetry = jest.fn();

    render(
      <QueryStateView
        empty={emptyProps}
        error={
          new ApiError({ code: 'API_READ_ONLY', message: 'x', status: 503 })
        }
        isEmpty
        isPending={false}
        onRetry={onRetry}
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.queryByText('content')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('omits the retry button for a non-retryable error', () => {
    render(
      <QueryStateView
        empty={emptyProps}
        error={new ApiError({ code: 'NOT_FOUND', message: 'x', status: 404 })}
        isEmpty
        isPending={false}
        onRetry={jest.fn()}
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('disables retry while isRetrying is true', () => {
    render(
      <QueryStateView
        empty={emptyProps}
        error={new TypeError('Network request failed')}
        isEmpty
        isPending={false}
        isRetrying
        onRetry={jest.fn()}
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    const button = screen.getByRole('button', { name: 'Try again' });

    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  test('applies errorOverrides to the rendered copy', () => {
    render(
      <QueryStateView
        empty={emptyProps}
        error={new ApiError({ code: 'NOT_FOUND', message: 'x', status: 404 })}
        errorOverrides={{
          NOT_FOUND: { title: 'This item is gone' },
        }}
        isEmpty
        isPending={false}
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.getByText('This item is gone')).toBeTruthy();
  });

  test('renders the SessionExpiredError copy without a retry button', () => {
    render(
      <QueryStateView
        empty={emptyProps}
        error={new SessionExpiredError()}
        isEmpty
        isPending={false}
        onRetry={jest.fn()}
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  test('renders EmptyState when empty and there is no error', () => {
    render(
      <QueryStateView
        empty={{ title: 'No items yet', message: 'Try a different filter.' }}
        error={null}
        isEmpty
        isPending={false}
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.getByText('No items yet')).toBeTruthy();
    expect(screen.getByText('Try a different filter.')).toBeTruthy();
    expect(screen.queryByText('content')).toBeNull();
  });

  test('uses renderEmpty over empty when both could apply', () => {
    render(
      <QueryStateView
        empty={emptyProps}
        error={null}
        isEmpty
        isPending={false}
        renderEmpty={() => <Text>custom empty view</Text>}
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.getByText('custom empty view')).toBeTruthy();
    expect(screen.queryByText('No items yet')).toBeNull();
  });

  test('renders children when there is data, even if a background refetch failed', () => {
    render(
      <QueryStateView
        empty={emptyProps}
        error={
          new ApiError({ code: 'SERVER_ERROR', message: 'x', status: 500 })
        }
        isEmpty={false}
        isPending={false}
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.getByText('content')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  test('renders children when there is no error and no empty state', () => {
    render(
      <QueryStateView
        empty={emptyProps}
        error={null}
        isEmpty={false}
        isPending={false}
      >
        <Text>content</Text>
      </QueryStateView>,
    );

    expect(screen.getByText('content')).toBeTruthy();
  });
});

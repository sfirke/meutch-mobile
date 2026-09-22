import { fireEvent, render, screen } from '@testing-library/react-native';

import { PagingFooter } from '../PagingFooter';

describe('<PagingFooter />', () => {
  test('renders nothing when idle', () => {
    render(
      <PagingFooter
        hasError={false}
        isFetchingNextPage={false}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.toJSON()).toBeNull();
  });

  test('shows a labelled spinner while the next page loads', () => {
    render(
      <PagingFooter
        hasError={false}
        isFetchingNextPage
        loadingLabel="Loading more items"
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Loading more items')).toBeTruthy();
  });

  test('offers a retry when the next page failed', () => {
    const onRetry = jest.fn();

    render(
      <PagingFooter hasError isFetchingNextPage={false} onRetry={onRetry} />,
    );

    expect(screen.getByText("Couldn't load more")).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

import { describeMembership } from '../circleMembership';
import type { CircleDetail } from '../circles';

function buildCircle(overrides: Partial<CircleDetail> = {}): CircleDetail {
  return {
    id: 'a1111111-1111-4111-8111-111111111111',
    name: 'Oak Street Tool Library',
    description: null,
    circle_type: 'open',
    is_regional: false,
    regional_radius_miles: null,
    created_at: '2026-01-15T09:00:00+00:00',
    image_url: null,
    requires_join_approval: false,
    member_count: 12,
    is_member: false,
    is_admin: false,
    has_pending_join_request: false,
    pending_join_request_count: 0,
    distance_miles: null,
    can_view_members: true,
    is_last_member: false,
    pending_join_request: null,
    members: [],
    members_total: 12,
    members_page: 1,
    members_pages: 1,
    ...overrides,
  };
}

describe('describeMembership', () => {
  test('points an admin at the website for member management', () => {
    const membership = describeMembership(
      buildCircle({ is_member: true, is_admin: true }),
    );

    expect(membership).toEqual({
      status: 'admin',
      label: "You're an admin",
      note: 'Manage members and requests on meutch.com.',
      action: null,
      actionLabel: null,
    });
  });

  test('points a member at the website to leave', () => {
    const membership = describeMembership(buildCircle({ is_member: true }));

    expect(membership.status).toBe('member');
    expect(membership.label).toBe("You're a member");
    expect(membership.note).toBe('Leave this circle on meutch.com.');
    expect(membership.action).toBeNull();
    expect(membership.actionLabel).toBeNull();
  });

  test('offers to cancel a pending request', () => {
    const membership = describeMembership(
      buildCircle({ circle_type: 'closed', has_pending_join_request: true }),
    );

    expect(membership.status).toBe('pending');
    expect(membership.label).toBe('Request pending');
    expect(membership.action).toBe('cancel');
    expect(membership.actionLabel).toBe('Cancel request');
  });

  test('offers an immediate join for an open circle', () => {
    const membership = describeMembership(buildCircle());

    expect(membership.status).toBe('can_join');
    expect(membership.action).toBe('join');
    expect(membership.actionLabel).toBe('Join circle');
  });

  test('offers a join request for a closed circle', () => {
    const membership = describeMembership(
      buildCircle({ circle_type: 'closed' }),
    );

    expect(membership.status).toBe('can_request');
    expect(membership.action).toBe('request');
    expect(membership.actionLabel).toBe('Request to join');
  });

  test('offers a join request whenever approval is required', () => {
    const membership = describeMembership(
      buildCircle({ circle_type: null, requires_join_approval: true }),
    );

    expect(membership.status).toBe('can_request');
    expect(membership.action).toBe('request');
  });

  test('offers nothing for an unknown circle type', () => {
    const membership = describeMembership(buildCircle({ circle_type: null }));

    expect(membership.status).toBe('none');
    expect(membership.label).toBe('Not a member');
    expect(membership.note).toBeNull();
    expect(membership.action).toBeNull();
  });

  test('prefers the admin state over the plain member state', () => {
    const membership = describeMembership(
      buildCircle({ is_member: true, is_admin: true }),
    );

    expect(membership.status).toBe('admin');
  });

  test('prefers membership over a stale pending request', () => {
    const membership = describeMembership(
      buildCircle({ is_member: true, has_pending_join_request: true }),
    );

    expect(membership.status).toBe('member');
  });

  test('prefers a pending request over an open circle join', () => {
    const membership = describeMembership(
      buildCircle({ circle_type: 'open', has_pending_join_request: true }),
    );

    expect(membership.status).toBe('pending');
  });
});

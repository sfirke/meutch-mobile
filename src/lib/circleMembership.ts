import type { CircleDetail } from './circles';

export type MembershipStatus =
  'admin' | 'member' | 'pending' | 'can_join' | 'can_request' | 'none';

export type MembershipAction = 'join' | 'request' | 'cancel';

export type Membership = {
  status: MembershipStatus;
  label: string;
  note: string | null;
  action: MembershipAction | null;
  actionLabel: string | null;
};

const ADMIN_NOTE = 'Manage members and requests on meutch.com.';
const MEMBER_NOTE = 'Leave this circle on meutch.com.';

/**
 * Which membership state the detail screen shows, and which write it offers.
 * Leaving and the admin tools stay on the website, so those states carry a
 * note instead of a button.
 */
export function describeMembership(circle: CircleDetail): Membership {
  if (circle.is_member && circle.is_admin) {
    return {
      status: 'admin',
      label: "You're an admin",
      note: ADMIN_NOTE,
      action: null,
      actionLabel: null,
    };
  }

  if (circle.is_member) {
    return {
      status: 'member',
      label: "You're a member",
      note: MEMBER_NOTE,
      action: null,
      actionLabel: null,
    };
  }

  if (circle.has_pending_join_request) {
    return {
      status: 'pending',
      label: 'Request pending',
      note: 'An admin still has to approve it.',
      action: 'cancel',
      actionLabel: 'Cancel request',
    };
  }

  if (circle.circle_type === 'open') {
    return {
      status: 'can_join',
      label: 'Open circle',
      note: 'Anyone can join, and members share items right away.',
      action: 'join',
      actionLabel: 'Join circle',
    };
  }

  if (circle.circle_type === 'closed' || circle.requires_join_approval) {
    return {
      status: 'can_request',
      label: 'Closed circle',
      note: 'An admin reviews every join request.',
      action: 'request',
      actionLabel: 'Request to join',
    };
  }

  // A secret circle answers 404 for a non-member, so only an unknown
  // circle_type reaches this branch.
  return {
    status: 'none',
    label: 'Not a member',
    note: null,
    action: null,
    actionLabel: null,
  };
}

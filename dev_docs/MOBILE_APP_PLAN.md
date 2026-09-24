# Meutch Mobile App Plan

This is the single roadmap for the mobile app: goals, scope, backend status, and the PR sequence with checklists. Setup, environments, and testing rules live in [DEVELOPMENT.md](DEVELOPMENT.md).

## Goal

Build a single React Native app for Android and iOS that lets Meutch members do on their phone what they already do on the web app. The app uses the existing Meutch backend through its `/api/v1` API and stays in a repo separate from the Python backend (`sfirke/meutch`, expected at `../meutch`).

## Product Principles

1. Keep the architecture simple: one Expo-managed React Native app, not separate Android and iOS codebases.
2. Ship in narrow slices. Read flows first, then the write flows the API already supports, one area at a time.
3. Prefer mobile-native UX over web parity. Keep the same product rules, but redesign navigation and interaction for phones.
4. Develop Android-first. Keep iOS compatibility in code and dependency choices, but don't let iOS release requirements slow the first usable build.
5. Keep the repos separate. Share context through docs and the workspace file, not by coupling Git history.
6. The backend is the source of truth for behavior and data shapes. Link to its API schemas rather than restating them here.

## Stack

- Expo managed workflow, React Native, TypeScript
- Expo Router for navigation
- TanStack Query for server state
- Expo Secure Store for tokens, behind a small session layer
- EAS for builds, with Expo Go as the first development loop

## Backend Status

The `/api/v1` API already covers nearly the whole web app, including writes (`API_V1_WRITE_ENABLED` defaults to on):

- **Auth:** login, refresh, logout, `me`, register, forgot and reset password, resend confirmation
- **Reads:** feed, items, my items, requests, circles, conversations and threads, loans, profile, settings, categories, tags
- **Items:** create, edit, delete, image upload, reorder, and delete
- **Messaging:** start a conversation about an item or request, reply, mark read, archive and unarchive, bulk archive, bulk mark read, mark all read
- **Requests:** create, edit, delete, respond with an item, fulfill
- **Loans:** request, approve, deny, cancel, owner cancel, complete, extend
- **Giveaways:** interest list, select or change recipient, release to all, confirm handoff, mark given away
- **Circles:** create, edit, join, cancel join request, leave, approve or reject join requests, remove member, add or remove admin
- **Profile:** edit profile (about me, photo, links), settings, location, delete account

Backend additions the mobile roadmap still needs, each noted on the PR that depends on it:

| Addition | Needed by |
| --- | --- |
| `GET /categories/<id>/items`, `GET /tags/<id>/items` | PR 5.5 |
| `GET /users/<id>` and per-user `profile_viewable` flags | PR 5.6 |
| `GET /me/requests` (active and recently fulfilled, like the web profile) | PR 10 |
| mark a conversation unread | PR 9 |
| list a circle's pending join requests | PR 12 |
| loan extension requests (borrower asks, owner approves or denies) | PR 14 |
| circle recommendations and secret-circle lookup by ID | PR 17 |
| an email confirmation endpoint, or a decision to open the web page | PR 17 |
| share-token generation and `share_token` on item detail and loan requests | Later |

## Release Milestones

- **MVP 1 (internal testers):** PRs 1 through 6. Sign in, stay signed in, browse the feed, items, categories, and tags, read and reply to messages, see circles and member profiles, edit about me and settings, all from an installable Android build.
- **Web parity:** PRs 7 through 17. Everything a member does on the web, except the web-only features listed below.
- **Store release:** needs sign up, in-app account deletion, and a linked privacy policy before submission.

## PR Sequence

Status: PRs 1 through 4 are merged. PR 5 is open as a draft (#4). Later PR order is a proposal and can be reshuffled; each later PR lists what it needs from the backend.

### PR 1: Repo Foundation (merged)

- planning docs in `dev_docs/`, `.gitignore`, `.nvmrc`, workspace file linking the backend repo, README

### PR 2: Expo Scaffold And Tooling (merged)

- Expo TypeScript project, folder structure, environment configuration
- lint, format, typecheck, Jest with React Native Testing Library
- pre-commit hooks and pull-request CI running `npm run verify`

### PR 3: Auth And Session (merged)

- login, secure token storage, refresh-token rotation, logout, session restore on launch
- a token-injecting wrapper around `apiFetch`; callers never read tokens directly
- `eas.json` with `development`, `preview`, and `production` profiles

### PR 4: Feed, Browse, And Item Detail (merged)

- app shell navigation, feed, browse, item detail, loading, empty, and error states

### PR 5: Messaging, Circles, And Profile (draft)

- inbox and thread detail, with reply and mark read
- circles list, discovery, and detail, with join and cancel join request
- profile (about me, web links) and settings (vacation mode, digest frequency, radius)

### PR 5.5: Category And Tag Browse

- backend: `GET /api/v1/categories/<category_id>/items` and `GET /api/v1/tags/<tag_id>/items`, reusing the `build_category_items_pagination` and `build_tag_items_pagination` helpers in `app/utils/item_queries.py` that back the web app's `/category/<id>` and `/tag/<id>` pages. Today `/categories` and `/tags` only return flat lists, and `/items` filters by category but not by tag.
- make the category chip on item cards and item detail, and each tag chip on item detail, tappable
- add `category/[id]` and `tag/[id]` routes with a paginated item list, reusing the item-card and pagination patterns from browse
- support the loans / giveaways / both filter the web pages offer (`item_type`)
- loading, empty, and error states

Verification: tapping a category or tag chip anywhere opens a paginated list of its items.

### PR 5.6: Member Profiles

- backend: `GET /api/v1/users/<user_id>`, gated by `profile_access_reason` in `app/utils/profile_visibility.py` (shared circle, shared conversation, or a pending join request to a circle the viewer administers). Return not-found on denial so the route does not confirm which IDs exist.
- return avatar, name, about me, web links, shared circles, and the access reason; like the web page, do not list the member's items
- backend: add a `profile_viewable` flag to nested user payloads (item owner, conversation partner, message sender, circle member, join requester), computed with `viewable_profile_user_ids`, following the feed's existing `actor_profile_viewable`
- add a `user/[id]` route, reusing `Avatar` and `WebLinkRow`
- make names and avatars tappable only when the payload marks them viewable
- loading, not-found, and error states

Verification: tapping a member's name or avatar on item detail, the feed, a thread, or circle detail opens their profile, and members the viewer cannot see are not tappable.

### PR 6: Android Internal Distribution

- produce an internal Android build from the `preview` EAS profile
- verify testers can install it and reach the staging API

### PR 7: Request Detail

Requests reach members through the home feed, as on the web, so there is no separate request list.

- request detail (`GET /requests/<id>`), opened from feed request cards and from a thread's request context
- message the requester (`POST /messages` with `request_id`), which opens the thread
- the owner sees conversations about the request, each opening its thread
- offering an item, fulfill, edit, and delete point to the web until PR 16

### PR 8: Filters And Sorting

All supported by the API today; the app currently sends only a search term.

- browse: item type, categories, circles, sort by date or distance (`ItemListQuerySchema`)
- feed: all or my circles, event types, distance, show my own activity, show claimed giveaways (`FeedQuerySchema`)
- circle discovery: radius (`CircleListQuerySchema`)

### PR 9: Starting Conversations And Inbox Management

- "Message owner" on item detail (`POST /messages` with `item_id`). On a giveaway, this is also how a member records interest. Messaging a requester landed in PR 7.
- archive and unarchive, bulk archive, bulk mark read, mark all read, inbox sort
- backend: mark a conversation unread (the web app supports it; the API does not)
- make URLs in messages, item descriptions, request text, and bios tappable, matching the web app

### PR 10: My Items And My Activity

- my listings, with search (`GET /me/items?q=`), split into items for lending and active and past giveaways
- items I'm borrowing and items I'm lending (`GET /me/loans?role=borrowing|lending`), with loan detail (`GET /loans/<id>`)
- my requests, active and recently fulfilled. Backend: `GET /me/requests`, mirroring `GET /me/items`

### PR 11: Account And Profile Editing

- "Forgot password" on sign in, reset password, resend confirmation email (`/auth/forgot-password`, `/auth/reset-password`, `/auth/resend-confirmation`)
- profile photo upload and removal, web link editing (`PATCH /me/profile`)
- location by address (`PATCH /me/location`)
- account deletion (`DELETE /me`), showing outstanding loans first like the web page

### PR 12: Circle Membership And Admin

- leave a circle
- create and edit a circle, with image and location
- admin: approve or reject join requests, remove a member, add or remove an admin
- backend: an endpoint that lists a circle's pending join requests; circle detail returns only a count today

### PR 13: Item Posting And Editing

- create, edit, and delete items
- image upload, reorder, and delete

### PR 14: Loans

- request to borrow, approve, deny, cancel, owner cancel, mark returned, extend the due date
- loan extension requests: the borrower asks for more time and the owner approves or denies (web #493). Backend: no API endpoints or loan-schema fields exist for this yet.

### PR 15: Giveaways

- interest list, select or change recipient, release to all, confirm handoff, mark given away

### PR 16: Request Writes

- create, edit, and delete requests
- respond with one of my items (`/requests/<id>/respond/<item_id>`), fulfill

### PR 17: Sign Up And Onboarding

- sign up (`POST /auth/register`)
- email confirmation: the web confirms through a page with a button and there is no API endpoint, so either open that page or add a backend route
- new members with no circles land on circle discovery with recommendations and pinned regional circles, as on the web. Backend: no recommendations endpoint.
- find a secret circle by its ID. Backend: `GET /circles/<id>` returns not-found for secret circles to non-members.

### Later

- **Share links:** native share sheet for public giveaway, request, and circle URLs (no API needed). Owner-generated 30-day share links for loan items need backend work (token generation, `share_token` on item detail and loan requests) and deep-link handling.
- **Push notifications:** replacing the emails the web sends, such as message notifications and loan due-soon and overdue reminders.
- **Static pages and contact:** link to About, How it works, Terms, Privacy policy, and the Contact form on the web. The privacy policy link is required for store listings.
- **Store submission** and release automation.

## Web-Only By Design

- admin panel, regional circle settings, and the activity log admin view
- email digest management and unsubscribe pages, reached from email links
- reply by email, handled by the backend's inbound mail webhook
- the logged-out landing page and public share preview pages, which are for people without the app

The web app has no ratings, blocking or reporting, map view, message attachments, or signed-in password or email change, so those are not gaps.

## Risks And Mitigations

### Backend additions gate some PRs

Mitigation: each PR lists the backend change it needs. Land the change in `meutch` first or in parallel, rather than building screens against a placeholder.

### Expo Go is limited

Mitigation: use Expo Go for speed, with EAS already configured so moving to development builds is procedural.

### Staging holds a copy of production data

Mitigation: staging is isolated from production and sends no email, so QA can use it freely. If staging ever gains outbound email or a write path to production, the mobile team needs a different target. See [DEVELOPMENT.md](DEVELOPMENT.md).

### Mobile UX can drift from backend rules

Mitigation: use the API docs and schemas in the backend repo as the source of truth, and don't reimplement permission rules in the client; rely on server flags like `profile_viewable`.

## Success Criteria

MVP 1 succeeds when a tester with the Android build can, without the web app:

- sign in and stay signed in across restarts
- browse the feed, items, categories, and tags
- read and reply to messages
- see circles and the profiles of members they share them with
- update about me and settings

Web parity succeeds when a member can do everything outside [Web-Only By Design](#web-only-by-design) from the app.

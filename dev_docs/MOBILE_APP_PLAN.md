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
- **Reads:** feed, items, my items (`kind=lending|active_giveaways|past_giveaways`), my requests (`status=active|fulfilled`), circles, conversations and threads, loans (pending before approved, with `profile_viewable` on each party), profile, settings, categories, tags
- **Items:** create, edit, delete, image upload, reorder, and delete
- **Messaging:** start a conversation about an item or request, reply, mark read, archive and unarchive, bulk archive, bulk mark read, mark all read, mark unread, bulk unarchive
- **Requests:** create, edit, delete, respond with an item, fulfill
- **Loans:** request, approve, deny, cancel, owner cancel, complete, extend
- **Giveaways:** interest list, select or change recipient, release to all, confirm handoff, mark given away
- **Circles:** create, edit, join, cancel join request, leave, approve or reject join requests, remove member, add or remove admin
- **Profile:** view a member's profile, edit profile (name, about me, photo, links), settings, location, delete account

Backend additions the mobile roadmap still needs, each noted on the PR that depends on it:

| Addition | Needed by |
| --- | --- |
| list a circle's pending join requests | PR 12 |
| loan extension requests (borrower asks, owner approves or denies) | PR 14 |
| circle recommendations and secret-circle lookup by ID | PR 17 |
| an email confirmation endpoint, or a decision to open the web page | PR 17 |
| `GET /categories/<id>/items`, `GET /tags/<id>/items` | PR 18 |
| share-token generation and `share_token` on item detail and loan requests | Later |

## Release Milestones

- **MVP 1 (internal testers):** PRs 1 through 6. Sign in, stay signed in, browse the feed and items, read and reply to messages, see circles and member profiles, edit about me and settings, all from an installable Android build.
- **Web parity:** PRs 7 through 18. Everything a member does on the web, except the web-only features listed below.
- **Store release:** needs sign up, in-app account deletion, and a linked privacy policy before submission.

## PR Sequence

Status: PRs 1 through 5.6, 7, 9, and 10 are merged. Later PR order is a proposal and can be reshuffled; each later PR lists what it needs from the backend.

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

### PR 5: Messaging, Circles, And Profile (merged)

- inbox and thread detail, with reply and mark read
- circles list, discovery, and detail, with join and cancel join request
- profile (about me, web links) and settings (vacation mode, digest frequency, radius)

### PR 5.6: Member Profiles (merged)

- backend: `GET /api/v1/users/<user_id>`, gated by profile access (self, admin, shared circle, shared conversation, or a pending join request to a circle the viewer administers). Return not-found on denial so the route does not confirm which IDs exist.
- return avatar, name, about me, web links, shared circles, and the access reason; like the web page, do not list the member's items or email
- backend: add a `profile_viewable` flag to nested user payloads (item owner, inbox and thread partners, message senders, circle members, and request and request-conversation users), computed with `viewable_profile_user_ids`, following the feed's existing `actor_profile_viewable`
- add a `user/[id]` route, reusing `Avatar` and `WebLinkRow`
- make the feed actor, item "Shared by", thread partner in the thread header, circle `MemberRow`, and request "Requested by" tappable when the payload marks them viewable; inbox rows and request-conversation rows stay whole-row taps to the thread
- loading, not-found, and error states

Circle join requesters are not listed anywhere in the app yet, so they are out of scope here; see PR 12.

Verification: tapping a member's name or avatar on the feed, item detail, a thread header, or circle detail opens their profile, and members the viewer cannot see are not tappable.

### PR 6: Android Internal Distribution

- produce an internal Android build from the `preview` EAS profile
- verify testers can install it and reach the staging API

### PR 7: Request Detail (merged)

Requests reach members through the home feed, as on the web, so there is no separate request list.

- request detail (`GET /requests/<id>`), opened from feed request cards and from a thread's request context
- message the requester (`POST /messages` with `request_id`), which opens the thread
- the owner sees conversations about the request, each opening its thread
- offering an item, fulfill, edit, and delete point to the web until PR 16

### PR 8: Filters And Sorting

All supported by the API today; the app currently sends only a search term. Split into three mobile PRs. Decisions shared by all three:

- a filter sheet holds a draft and sends nothing until Apply is tapped, so one request per visit (the API allows 60 reads a minute)
- filter choices live in screen state and are not remembered across launches
- default values are never sent; list params go as repeated keys; query keys normalise so an omitted filter shares its cache entry with the explicit default
- distance options are disabled, with a hint to set a location on the website, when the profile has no location (location editing arrives in PR 11)
- no new dependencies

#### PR 8a: Browse Filters And Sort

Branch `pr8a-browse-filters`, [PR #17](https://github.com/sfirke/meutch-mobile/pull/17).

- browse: item type (all, loans, giveaways), categories, the member's circles, sort by newest or closest (`ItemListQuerySchema`); "Closest first" is disabled without a location
- shared pieces reused by 8b and 8c: `FilterSheet` (title, scrolling body, Reset and Apply), `SelectList` (single or multi-select rows), `FilterToolbar` (Filters button with an active count, optional Sort button), `disabled` and `hint` options on `OptionSheet`, a `filter` icon
- data: `GET /categories`, all of the member's circles via `membership=mine` pages (50 a page, bounded by the reported page count), `categories`, `circles`, `item_type`, and `sort` on `GET /items`; the category and circle lists are requested only while the sheet is open and stay fresh for five minutes
- a filtered empty state with "Clear filters", shown after the existing no-circles check and before the search empty state; the "Searching..." row now reads "Updating..." since it also shows on filter and sort changes
- the sort picker reads the profile's `has_location`, so Browse now also requests `GET /me/profile` on mount

Verification: `npm run verify` (105 suites, 1065 tests). Browse was run on Expo web with stubbed API data and screenshotted with the sheet open and the sort picker open, with and without a location. Not yet checked against staging: the real `/items` paths with filters applied, and `sort=distance` for a member with a location.

#### PR 8b: Feed Filters

- feed: all activity or my circles, distance, event types, show my own activity, show given-away giveaways (`FeedQuerySchema`)
- distance: leaving it out means 20 miles for a member with a location, so 20 is unsent, "No distance limit" sends `distance=none`, and other choices send the number
- not included: a circle picker on the feed

#### PR 8c: Circle Discovery Radius

- circle discovery: radius on the Discover tab only, starting on any distance (`CircleListQuerySchema`); any distance is unsent since `radius=none` is rejected
- empty state "No circles within N miles" with "Search any distance"; a note that a radius hides circles with no location

Backend follow-up, not part of these PRs: `/items?sort=distance` for a member with no location returns rows in no defined order instead of falling back to date.

### PR 9: Starting Conversations And Inbox Management

Split into two mobile PRs so the first half does not wait on the backend.

#### PR 9a: Message Owner And Links

- "Message owner" on item detail (`POST /messages` with `item_id`), shown to any viewer who is not the owner; the server decides availability and circle rules. On a giveaway, this is also how a member records interest, so the composer carries that hint and the item detail refetches after a send. Messaging a requester landed in PR 7, and its composer is now the shared `MessageComposer`.
- make URLs in messages, item descriptions, request text, circle descriptions, and bios tappable, matching the web app. `splitLinks` ports the backend's `linkify` rules (`http(s)://` and `www.` only, trailing punctuation trimmed); truncated previews stay plain.

#### PR 9b: Inbox Management

- archive and unarchive, bulk archive, bulk unarchive, bulk mark read, mark unread, mark all read, inbox sort (`newest`, `oldest`, `unread`, `name_asc`)
- long-press enters a selection mode with a bottom action bar (archive or unarchive, mark read, mark unread); sort and "Mark all read" sit in a toolbar under the Inbox/Archived switch. No swipe actions.
- one mutation hook patches the cached folder after each action and marks the other folders stale without refetching them, since the API allows 60 reads a minute
- mark unread flips only the latest message the member received in each conversation, as on the web; when fewer conversations were marked than selected, the app says that conversations with no received messages cannot be marked unread
- backend: `POST /conversations/bulk-mark-unread` (returns how many conversations were marked) and `POST /conversations/bulk-unarchive`

### PR 10: My Items And My Activity

- "My activity" group on the Profile tab with three rows: `/profile/items`, `/profile/loans`, `/profile/requests`
- My items: Lending, Giving away, and Given away segments (`GET /me/items?kind=`), search, the Browse grid, paging, pull-to-refresh
- My loans: Borrowing and Lending segments (`GET /me/loans?role=`), a "Requests" (pending) section above "On loan" (approved), paging, refresh on focus
- My requests: Active and Fulfilled segments (`GET /me/requests?status=`)
- loan detail at `/loan/<id>` (`GET /loans/<id>`): status banner with due line, item row, counterpart (tappable when `profile_viewable`), dates, "View conversation", and a role- and status-specific web-only note in place of actions
- shared `NavRow`, `SearchField`, `LoanRow`, `RequestRow`, and `src/lib/loans.ts`, whose label helpers `LoanBanner` now shares
- backend ([meutch#554](https://github.com/sfirke/meutch/pull/554), must merge first): the `kind` filter on `/me/items`, `GET /me/requests`, pending-before-approved ordering on `/me/loans`, and `profile_viewable` on its `owner` and `borrower`
- not included: loan history (completed, denied, canceled), and links to loan detail from the feed or a thread's `LoanBanner`; all write actions stay web-only until PRs 13 to 16

Verification: `npm run verify` (97 suites, 997 tests); backend targeted pytest (169 tests) and pre-commit. Against a local backend on the branch, a seeded member's responses matched the web profile's My Items and Loans & Requests tabs, and the app's parsers and label helpers ran over them. The UI itself was not run (no Android SDK, no Expo web), so screens are covered by Jest screen tests.

### PR 11: Account And Profile Editing

- "Forgot password" on sign in, reset password, resend confirmation email (`/auth/forgot-password`, `/auth/reset-password`, `/auth/resend-confirmation`)
- first and last name editing, profile photo upload and removal, web link editing (`PATCH /me/profile`)
- location by address (`PATCH /me/location`)
- account deletion (`DELETE /me`), showing outstanding loans first like the web page

### PR 12: Circle Membership And Admin

- leave a circle
- create and edit a circle, with image and location
- admin: approve or reject join requests, remove a member, add or remove an admin
- backend: an endpoint that lists a circle's pending join requests; circle detail returns only a count today
- list a circle's pending join requests with `profile_viewable`

### PR 13: Item Posting And Editing

- create, edit, and delete items
- image upload, reorder, and delete

### PR 14: Loans

- request to borrow, approve, deny, cancel, owner cancel, mark returned, extend the due date; loan detail's web-only notes (added in PR 10) become real actions here
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

### PR 18: Category And Tag Browse

Deferred to last: it needs two new backend endpoints.

- backend: `GET /api/v1/categories/<category_id>/items` and `GET /api/v1/tags/<tag_id>/items`, reusing the `build_category_items_pagination` and `build_tag_items_pagination` helpers in `app/utils/item_queries.py` that back the web app's `/category/<id>` and `/tag/<id>` pages. Today `/categories` and `/tags` only return flat lists, and `/items` filters by category but not by tag.
- make the category chip on item cards and item detail, and each tag chip on item detail, tappable
- add `category/[id]` and `tag/[id]` routes with a paginated item list, reusing the item-card and pagination patterns from browse
- support the loans / giveaways / both filter the web pages offer (`item_type`)
- loading, empty, and error states

Verification: tapping a category or tag chip anywhere opens a paginated list of its items.

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
- browse the feed and items
- read and reply to messages
- see circles and the profiles of members they share them with
- update about me and settings

Web parity succeeds when a member can do everything outside [Web-Only By Design](#web-only-by-design) from the app.

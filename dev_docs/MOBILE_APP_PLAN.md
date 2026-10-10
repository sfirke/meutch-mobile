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

Branch `pr8b-feed-filters`, [PR #18](https://github.com/sfirke/meutch-mobile/pull/18), stacked on 8a.

- feed: all activity or my circles, distance, event types, show my own activity, show given-away giveaways (`FeedQuerySchema`); Apply is disabled with no type ticked; both switches start on, matching the backend defaults, so only `false` is ever sent for either
- distance: leaving it out means 20 miles for a member with a location, so 20 is unsent, "No distance limit" sends `distance=none`, and other choices send the number; every type ticked also counts as the default and sends no `types`
- without a location the distance rows are disabled and "No distance limit" shows ticked, since the server applies no distance for that member; the draft keeps the unsent default
- the Filters toolbar sits outside the list's loading, empty, and error states so it stays reachable; the feed query now keeps the previous list on screen while a new filter set loads, with an "Updating..." row
- not included: a circle picker on the feed

Verification: `npm run verify` (107 suites, 1102 tests). The feed was run on Expo web with stubbed API data and screenshotted with the sheet open, after applying "My circles", and with the distance rows disabled for a member without a location. Not yet checked against staging: the real `/feed` paths, in particular `distance=none` and a numeric distance for a member with a location, and the unsent default for a member without one.

#### PR 8c: Circle Discovery Radius

Branch `pr8c-circle-radius`, [PR #19](https://github.com/sfirke/meutch-mobile/pull/19), stacked on 8a.

- circle discovery: radius on the Discover tab only (Any distance, 5, 10, 25, 50, 100 miles, as on the web), starting on any distance (`CircleListQuerySchema`); any distance is unsent since `radius=none` is rejected, and the radius is never sent for `membership=mine`
- empty state "No circles within N miles" with "Search any distance"; a note that a radius hides circles with no location, shown only while a radius is set
- the picker is a plain `OptionSheet`, not a draft sheet, since there is one choice to make

Verification: `npm run verify` (107 suites, 1116 tests). Circles was run on Expo web with stubbed API data and screenshotted on Discover, with the picker open, after choosing 10 miles, and with the options disabled for a member without a location. Not yet checked against staging: the real `/circles?membership=discoverable&radius=N` path.

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

Split into a backend PR and two mobile PRs: 13a (create, edit, delete with the text fields) and 13b (photos), stacked on 13a. Photos come from the library and the camera; reordering is hand-built drag and drop on the installed gesture-handler and reanimated, with no sortable library.

#### Backend ([meutch#557](https://github.com/sfirke/meutch/pull/557), must merge first)

- [x] `POST /items` accepts an optional `creation_token` (UUID): the first request returns 201, a replay of the same token returns 200 with the existing item, so a retry after a timeout cannot create a duplicate
- [x] `PATCH /items/<id>` accepts multipart `images`, `delete_image_ids`, and `image_order` (existing ids or `new-N`, consuming uploads in order) and applies everything in one transaction; capacity is checked before any upload; a JSON PATCH behaves as before
- [x] an unknown `category_id` is a 422 on `category_id` ("Choose a category.") instead of a server error
- [x] docs: `dev_docs/API_PR8s.md` (local only; the backend ignores `dev_docs/`) and `CHANGELOG.md`

#### PR 13a: Create, Edit, And Delete

- [x] Stage 1, foundations: `createItem`, `updateItem`, `deleteItem` in `src/lib/items.ts`; `fetchTags` with a day-long cached query (categories reuse PR 8a's `useCategoriesQuery`, sorted by name in `ItemForm`); `ConfirmDialog` (a `Modal`, since `Alert.alert` does nothing on web); `TagInput`; a scrollable `OptionSheet`; the 422 helpers moved out of Settings into `src/lib/validation.ts` and `FieldError`; `expo-crypto` for the creation token; `plus`, `pen`, `trash` icons and a `danger` colour
- [x] Stage 2: `useCreateItemMutation`, `useUpdateItemMutation`, `useDeleteItemMutation` (set the detail cache, mark item lists and the feed stale without refetching); `ItemForm` (name, description with counter, category sheet, tags, Lend / Give away, My circles / Public with a no-location hint)
- [x] Stage 3: `/item/new` and `/item/[id]/edit` screens with a leave-confirmation on a dirty form (`useDiscardGuard`, a `beforeRemove` listener); Edit and Delete on item detail (delete shows the server's 409 in the dialog); a "+" header action and empty-state buttons on My items; My items and the feed refetch on focus so they pick up writes
- [x] Stage 4: assembled, screenshots, manual checks against a local backend, draft PR

Changes from the plan: the tags hook keeps a day-long `staleTime` but no `gcTime` override, which kept Jest alive; My items and the feed gained `useRefreshOnFocus`, which the plan had not called for but which the stale-without-refetch strategy needs since stack screens stay mounted; the backend's over-capacity and upload-failure errors are 400 `BAD_REQUEST`, not 422, and `describeError` already shows them verbatim.

Verification: `npm run verify` (112 suites, 1108 tests). Headless web screenshots of the new form, the give-away controls with the no-location hint, the category sheet, the edit form prefilled, the empty My items state with its button, the owner's Edit and Delete, and the delete dialog showing a 409. Against a local backend on meutch#557: create returned 201, a replay with the same token returned 200 with the same id and one item in My items, an edit with a type change, an unknown category returned 422 on `category_id`, delete returned 200 then 404, and deleting an item on loan returned the 409 message.

#### PR 13b: Photos

- [x] Stage 5, foundations: per-request timeouts and `buildMultipartRequestInit` in `src/lib/api.ts`; `expo-image-picker` and `expo-image-manipulator`; pure reorder math; `FormData`-aware test utilities; `camera` and `photos` icons; copy for the backend's 413
- [x] Stage 6: `PhotoDraft` model, `preparePhoto` (resize to 1600px, JPEG, which also converts HEIC), `buildItemFormData`; `PhotoGrid` with cover badge, remove, count, add tile (camera or library), long-press drag to reorder, and "Move earlier" / "Move later" accessibility actions
- [x] Stage 7: photos wired into `ItemForm` and the screens; one multipart request per save, JSON when nothing about photos changed; assembled, screenshots, manual checks, draft PR stacked on 13a

Changes from the plan: `preparePhoto` lives in `src/lib/photoPicker.ts` beside the picker calls rather than in `itemPhotos.ts`, so the grid and the form-data code could be built in parallel; the drag commits through `scheduleOnRN` because `runOnJS` is deprecated in reanimated 4; `GestureHandlerRootView` now wraps the app root; the gesture-handler, worklets, and reanimated mocks are global in `jest.setup.js`.

Verification: `npm run verify` (116 suites, 1179 tests). Headless web screenshots of the form with its empty photo section and of the edit form prefilled with an existing photo (cover badge, remove, add tile, count). Against a local backend on meutch#557 with generated JPEGs: a multipart create with two photos returned 201 with both in order; a replay with the same token returned 200 with the existing item and no extra images; one PATCH that deleted one image, added one, and reordered returned the expected order; an over-capacity PATCH was rejected with the item untouched.

Needs a human: on a device, library multi-select, camera capture, an iPhone HEIC photo, permission denial, and the drag feel; confirmation that staging uploads go to a non-production bucket before any write testing against staging.

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

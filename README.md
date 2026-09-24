# Meutch Mobile

React Native mobile client for the Meutch sharing platform.

## Status

PR 5 adds messaging, circles, and profile on top of the read-only foundation from PR 4:

- two more bottom tabs, Inbox and Circles, and a rebuilt Profile tab (five tabs total: Feed, Browse, Inbox, Circles, Profile)
- Inbox: inbox/archived segments, paging, pull-to-refresh, and an unread badge on the tab
- Thread detail (`/message/<uuid>`): full history, reply, mark-read on open, and a context card for the item, circle, or request the conversation is about
- Circles: My circles / Discover segments with name search; circle detail (`/circle/<uuid>`) with a member list, joining an open circle, and requesting to join (or cancelling a request for) a closed one
- Profile: view and edit "about me", web links that open in the browser, a Settings screen (`/profile/settings`) for vacation mode, digest frequency, and radius, and sign out (moved here from the tab header)

The app now performs writes for reply, mark-read, circle join, cancel join request, about-me update, and settings update. Everything else — starting a new conversation, archive/bulk actions, loan actions, circle admin and leave, profile photo, link and location editing, and account deletion — still links out to meutch.com.

The session layer from PR 3 is unchanged: secure JWT persistence via Expo Secure Store, login/refresh/logout/restore against `/api/v1/auth`, and a token-injecting fetch wrapper so components never read tokens directly. See [Auth Flow](#auth-flow).

## Project Layout

```text
app/                      routes only — every file here becomes a route, so no tests or helpers
  _layout.tsx             providers + splash hold
  (auth)/sign-in.tsx      /sign-in
  (tabs)/index.tsx        /        Feed
  (tabs)/browse.tsx       /browse  Browse
  (tabs)/inbox.tsx        /inbox   Inbox
  (tabs)/circles.tsx      /circles Circles
  (tabs)/profile.tsx      /profile Profile
  item/[id].tsx           /item/<uuid>
  message/[id].tsx        /message/<uuid>
  circle/[id].tsx         /circle/<uuid>
  profile/settings.tsx    /profile/settings
src/screens/              screen implementations (most route files re-export these) + __tests__/
src/components/           shared presentational components
src/query/                QueryProvider, use*Query hooks, and use*Mutation hooks
src/lib/                  API request functions, parsers, query keys (session layer lives here too)
src/theme/                colors, spacing, radii, typography, shadows
src/test-utils/           renderWithProviders and fakes
```

Route groups `(auth)` and `(tabs)` don't appear in the URL. The signed-out/signed-in gate is `src/components/RequireSession.tsx`, applied by the `(tabs)` and `item` group layouts.

## Expected Local Repo Layout

This repo is meant to live beside the main Meutch backend repo:

```text
~/git/
	meutch/
	meutch-mobile/
```

Open `meutch-mobile.code-workspace` in VS Code to work on both repos together.

## Prerequisites

- Node 24 LTS, matching `.nvmrc`
- npm
- Expo Go on an Android device, or Android Studio with an emulator

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the example environment file and adjust values for your target backend:

```bash
cp .env.example .env.local
```

Start the Metro development server:

```bash
npm run start
```

Useful commands:

```bash
npm run android
npm run lint
npm run typecheck
npm run test
npm run format:check
npm run verify
```

## Quality Gates

Running `npm install` also installs the repo's Git hook setup.

On each commit, the pre-commit hook runs fast staged-file checks:

- `eslint --fix`
- `prettier --write`
- Jest with `--findRelatedTests`

GitHub Actions runs the full verification suite on pull requests and pushes to `main`:

```bash
npm run verify
```

That command runs format checking, linting, TypeScript typechecking, and the full Jest test suite.

## Environment Targets

The app supports three backend targets:

- `local` — the Flask server running from the sibling `meutch` repo
- `integration` — `https://staging.meutch.com/api/v1`, the shared target for testers
- `production` — `https://meutch.com/api/v1`

When `EXPO_PUBLIC_ENV_NAME` is not set, the app defaults to `local`. Set `EXPO_PUBLIC_ENV_NAME` and the matching URL values in `.env.local` to switch environments cleanly.

Testers and internal `preview` builds point at `staging.meutch.com`. It carries a copy of the production database but is isolated from production and does not send email, which makes it safe for routine mobile QA.

The mobile client talks to the Meutch API under the versioned `/api/v1` prefix.

## Auth Flow

The current foundation assumes the existing Meutch JWT contract from the sibling backend repo:

- `POST /auth/login` returns access and refresh tokens plus the authenticated user
- `POST /auth/refresh` rotates the refresh token and returns a fresh token pair
- `POST /auth/logout` revokes the whole token family for the current mobile session
- `GET /auth/me` restores or refreshes the last valid signed-in state on app launch

Tokens are stored through Expo Secure Store and are only read inside the shared session client. Entries are written with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, so a 30-day refresh token cannot ride an encrypted device backup onto different hardware.

## Security Guardrails

Refresh tokens are long-lived bearer credentials, so a few rules are enforced by tooling rather than left to review:

- `no-restricted-imports` and `no-restricted-syntax` reject AsyncStorage outright. Session data belongs in `src/lib/sessionStorage.ts`, which is also the only file allowed to import `expo-secure-store`.
- `no-console` keeps logging out of the source, and `babel-plugin-transform-remove-console` strips `console.*` from production bundles so a logged response object cannot leak tokens or member PII into device logs or a crash reporter.
- The `dependency-review` CI job lists every dependency addition and version change against the base branch and fails until the pull request body carries an acknowledgement line:

  ```
  Approved-dependency-change: adds expo-image-picker for camera uploads
  ```

  Editing the body re-runs the check, so the acknowledgement takes effect without another push. Run the same check locally with `node scripts/check-dependency-changes.mjs main`.

## Docs

- [dev_docs/MOBILE_APP_PLAN.md](dev_docs/MOBILE_APP_PLAN.md): goals, scope, backend status, and the PR roadmap
- [dev_docs/DEVELOPMENT.md](dev_docs/DEVELOPMENT.md): machine setup, backend targets, EAS builds, and testing rules

## Backend Relationship

The mobile client stays in this separate repo.

The backend, data model, and API contract stay in the sibling `meutch` repo. The app consumes its JWT-backed `/api/v1` API, which already supports nearly every web feature, writes included. The few backend additions the app still needs are listed in the plan.

## Upcoming PRs

Member profiles (PR 5.6) and an internal Android build (PR 6) come next, followed by the web-parity PRs. See the [PR sequence](dev_docs/MOBILE_APP_PLAN.md#pr-sequence).

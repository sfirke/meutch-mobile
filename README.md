# Meutch Mobile

React Native mobile client for the Meutch sharing platform.

## Status

PR 4 adds the first read-only app flows on top of the auth and session foundation:

- an Expo Router app shell with a signed-out/signed-in gate (`src/components/RequireSession.tsx`) that holds the splash screen until the saved session restores
- bottom tabs for Feed and Browse, with an item detail screen pushed from either one and deep-linkable as `meutch://item/<uuid>`
- TanStack Query v5 for server state: pagination, pull-to-refresh, a shared retry policy, and cache cleared on sign-out
- `expo-image` for disk-cached photos, plus shared loading, empty, and error states
- a `src/theme/` token module for colors, spacing, radii, typography, and shadows

Everything is read-only: item detail renders its primary action (request to borrow, express interest) disabled, with a note that writes are still on meutch.com.

The session layer from PR 3 is unchanged: secure JWT persistence via Expo Secure Store, login/refresh/logout/restore against `/api/v1/auth`, and a token-injecting fetch wrapper so components never read tokens directly. See [Auth Flow](#auth-flow).

## Project Layout

```text
app/                      routes only — every file here becomes a route, so no tests or helpers
  _layout.tsx             providers + splash hold
  (auth)/sign-in.tsx      /sign-in
  (tabs)/index.tsx        /        Feed
  (tabs)/browse.tsx       /browse  Browse
  item/[id].tsx           /item/<uuid>
src/screens/              screen implementations (most route files re-export these) + __tests__/
src/components/           shared presentational components
src/query/                QueryProvider and use*Query hooks
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

- [dev_docs/MOBILE_APP_PLAN.md](dev_docs/MOBILE_APP_PLAN.md)
- [dev_docs/MOBILE_INFRASTRUCTURE_AND_MVP_PRS.md](dev_docs/MOBILE_INFRASTRUCTURE_AND_MVP_PRS.md)

## Backend Relationship

The mobile client stays in this separate repo.

The backend, data model, and API contract stay in the sibling `meutch` repo. The current mobile plan assumes the app will consume the JWT-backed `/api/v1` API surface there and that the backend team will finish the remaining write endpoints in follow-on PRs.

## Upcoming PRs

1. PR 5: messaging (inbox, thread detail, replies), circles list and detail, profile and settings.
2. PR 6: an internal Android build through the committed EAS profiles.
3. PR 7 and later: write-side parity (item posting/editing, request create/fulfill, loan and giveaway actions, sign-up and deep-link confirmation) once the backend write endpoints are stable.

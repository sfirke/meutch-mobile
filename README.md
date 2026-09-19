# Meutch Mobile

React Native mobile client for the Meutch sharing platform.

## Status

PR 3 adds the mobile auth and session foundation on top of the Expo baseline:

- secure JWT token persistence with Expo Secure Store
- login, refresh-token rotation, logout, and startup restore against `/api/v1/auth`
- a token-injecting authenticated fetch wrapper so components never read tokens directly
- Expo EAS build profiles for development, preview, and production
- lint, format, typecheck, and Jest-based test commands for day-to-day development
- staged-file pre-commit checks through Husky and lint-staged
- GitHub Actions CI that runs the full verification suite on pull requests

The next implementation PR can build read-side app flows on top of this session layer.

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

Tokens are stored through Expo Secure Store and are only read inside the shared session client.

## Docs

- [dev_docs/MOBILE_APP_PLAN.md](dev_docs/MOBILE_APP_PLAN.md)
- [dev_docs/MOBILE_INFRASTRUCTURE_AND_MVP_PRS.md](dev_docs/MOBILE_INFRASTRUCTURE_AND_MVP_PRS.md)

## Backend Relationship

The mobile client stays in this separate repo.

The backend, data model, and API contract stay in the sibling `meutch` repo. The current mobile plan assumes the app will consume the JWT-backed `/api/v1` API surface there and that the backend team will finish the remaining write endpoints in follow-on PRs.

## Upcoming PRs

1. Build the first MVP read flows: feed, items, messages, circles, and profile.
2. Produce an internal Android build through the committed EAS profiles.

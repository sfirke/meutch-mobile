# Meutch Mobile

React Native mobile client for the Meutch sharing platform.

## Status

PR 2 establishes the Expo-managed TypeScript baseline for the app:

- Expo SDK scaffold committed in this repo
- environment-aware API target configuration for local, integration, and production backends
- a minimal shared API utility for the versioned `/api/v1` surface
- lint, format, and typecheck commands for day-to-day development

The next implementation PR builds the auth and session layer on top of this base.

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
npm run format:check
```

## Environment Targets

The app supports three backend targets:

- `local`
- `integration`
- `production`

By default the app uses the `integration` target. Set `EXPO_PUBLIC_ENV_NAME` and the matching URL values in `.env.local` to switch environments.

The mobile client talks to the Meutch API under the versioned `/api/v1` prefix.

## Docs

- [dev_docs/MOBILE_APP_PLAN.md](dev_docs/MOBILE_APP_PLAN.md)
- [dev_docs/MOBILE_INFRASTRUCTURE_AND_MVP_PRS.md](dev_docs/MOBILE_INFRASTRUCTURE_AND_MVP_PRS.md)

## Backend Relationship

The mobile client stays in this separate repo.

The backend, data model, and API contract stay in the sibling `meutch` repo. The current mobile plan assumes the app will consume the JWT-backed `/api/v1` API surface there and that the backend team will finish the remaining write endpoints in follow-on PRs.

## Upcoming PRs

1. Implement auth and session handling against the existing JWT endpoints.
2. Build the first MVP read flows: feed, items, messages, circles, and profile.
3. Add Android internal distribution through EAS.

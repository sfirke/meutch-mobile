# Meutch Mobile Infrastructure And MVP PR Guide

## Purpose

This document spells out the practical setup needed to build and test the Meutch mobile app from a Linux development machine while the main backend remains in the separate `meutch` repo.

It also defines the first PR sequence so the team can move from planning into implementation without turning the initial mobile work into a broad setup scramble.

## Short Answer To The Database Question

Use the existing staging environment at `https://staging.meutch.com` as the everyday mobile testing target.

The model is:

1. Keep using the existing local Docker Postgres databases in the main `meutch` repo for backend development and tests.
2. Use staging for shared app testing, Android device testing, and routine mobile QA.
3. Never point the app at production except as a production build for real users.

Staging holds a copy of the production database, but it is isolated from production and does not send email, so mobile testing cannot leak writes or mail to real users. That removes the need for a separate mobile integration deployment and its own database — a piece of infrastructure this project would otherwise have to provision, seed, and maintain for no added safety.

## Backend Targets

| Target | What It Is For | Who Uses It Most | Notes |
| --- | --- | --- | --- |
| Local backend | Flask API running from the sibling `meutch` repo against local Docker Postgres | Anyone changing backend code | Best for debugging and contract testing |
| Staging (`https://staging.meutch.com`) | Shared HTTPS deployment for Android device testing and QA | Mobile team and QA | Production data copy, isolated, no outbound email |
| Production (`https://meutch.com`) | Real user traffic | Nobody, for testing | Only ever hit by a production build |

In the mobile app's configuration these map to the `local`, `integration`, and `production` environment names. The `integration` name is kept because it describes the role; the URL behind it is staging.

## Development Box Setup

### Required On Linux

1. Install Node 24 LTS and use the repo-pinned version from `.nvmrc`.
2. Install npm.
3. Install Expo Go on at least one Android device.
4. Create an Expo account for the team, or choose the shared Expo organization account.

### Recommended But Optional At First

1. Android Studio and an emulator.
2. `eas-cli` for build setup.
3. `watchman` if your distro supports it cleanly.

### Why Android First

Android is the simplest real-device path from Linux. You can test the app immediately with Expo Go and move to EAS Android builds without touching Apple tooling.

iOS should stay in mind when choosing libraries and navigation patterns, but it should not drive the first setup wave on a Linux workstation.

## Local Workflow For The Backend Repo

The backend source of truth stays in the sibling `meutch` repo.

Typical local setup there already looks like this:

```bash
docker compose -f docker-compose.test.yml up -d
source venv/bin/activate
cp .env.example .env
flask db upgrade
flask seed data --env development
flask run
```

For mobile work, add these practical rules:

1. If the app runs on a physical Android device, `localhost` in the phone is not your Linux box.
2. To reach your local Flask server from a phone, bind Flask to all interfaces and use your Linux host's LAN IP or a tunnel.
3. To reach your local Flask server from an Android emulator, use the emulator host mapping rather than `localhost`.

Example local backend commands when testing from a phone:

```bash
source venv/bin/activate
flask run --host 0.0.0.0 --port 5000
```

Example API base URLs for local testing:

- Physical Android device on same network: `http://<your-linux-lan-ip>:5000`
- Android emulator: `http://10.0.2.2:5000`

If your network blocks LAN access, use Expo tunnel mode for the app and a secure tunnel for the backend API.

## Shared Staging Environment

This is the backend target the mobile app should use most of the time.

### What Makes It Safe For Mobile QA

1. It is a separate deployment from production with its own database.
2. That database is a copy of production, so the data is realistic without being live.
3. Outbound email is off, so no test action can mail a real member.
4. Writes there never reach production.

Because the data is a production copy, treat it as confidential: it holds real member names, addresses, and messages. Do not paste staging data into issues, screenshots, or external tools.

### Keeping It Safe

The properties above are what make this plan work. Re-check them before any wave of write-side mobile testing:

1. Email sending stays disabled.
2. There is no write path from staging back to production.
3. Uploaded assets go to a non-production storage bucket or prefix.
4. The JWT signing secret is distinct from production's, so tokens are not portable between environments.

### Test Accounts

Keep one small set of known test accounts that testers share. Because the database is a production copy, prefer accounts created specifically for testing over signing in as a real member's mirrored account.

## Mobile App Environment Configuration

The mobile app supports three API targets:

| Name | API base URL |
| --- | --- |
| `local` | `http://10.0.2.2:5000/api/v1` (emulator) or `http://<your-linux-lan-ip>:5000/api/v1` (device) |
| `integration` | `https://staging.meutch.com/api/v1` |
| `production` | `https://meutch.com/api/v1` |

These defaults live in `src/config/env.ts` and are echoed in `.env.example`. Pick one by setting the environment name in `.env.local`:

```bash
EXPO_PUBLIC_ENV_NAME=integration
```

Each target's URL can be overridden with `EXPO_PUBLIC_LOCAL_API_BASE_URL`, `EXPO_PUBLIC_INTEGRATION_API_BASE_URL`, or `EXPO_PUBLIC_PRODUCTION_API_BASE_URL`. `EXPO_PUBLIC_API_BASE_URL` overrides whichever target is selected, for one-off cases like pointing at a tunnel.

Do not hardcode URLs throughout the app; everything goes through `buildApiUrl` from `src/config/env.ts`.

## Expo And EAS Setup

### Day 1 Development Loop

1. Generate the app with the Expo TypeScript template.
2. Run the Metro server with `npx expo start`.
3. Open the app on Android through Expo Go.
4. Use LAN mode when your device and workstation are on the same network.
5. Use `npx expo start --tunnel` only when LAN access fails.

### Set Up EAS Early

Even if the team stays on Expo Go at first, configure EAS near the start.

Suggested commands once the Expo project exists:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Recommended early build profiles:

1. `development` for development builds.
2. `preview` for installable internal Android builds.
3. `production` for later store builds.

### When To Leave Expo Go

Stay on Expo Go while the app is limited to standard Expo-managed capabilities and the team is still proving the first auth and read-only flows.

Move to a development build when:

1. you need a native module not available in Expo Go,
2. you want a more app-like QA flow,
3. or you are preparing for internal distribution.

## Auth And Session Requirements

The mobile app must implement the current Meutch JWT contract correctly.

That means:

1. Store the access token and refresh token securely.
2. Send the access token as a bearer token.
3. Replace the stored refresh token every time refresh succeeds.
4. Treat reuse of a rotated refresh token as a forced sign-out case.
5. Clear local session state on logout.

This is the first technical integration milestone. Do not pile more UI work on top of the app until login, refresh, logout, and startup restore are proven against a real backend target.

## MVP Feature Order

Build the first release in this order.

### PR 1: Repo Foundation

Checklist:

- add planning docs in `dev_docs/`
- add `.gitignore`
- add `.nvmrc`
- update the workspace file to include the sibling backend repo
- rewrite the top-level README

This PR should not contain app scaffold files.

### PR 2: Expo Scaffold And Base Project Setup

Checklist:

- initialize the Expo TypeScript project
- add the base folder structure
- set up environment configuration
- add lint, format, and typecheck commands
- add Jest plus React Native Testing Library for baseline unit and component tests
- add pre-commit hooks for staged-file linting, formatting, and related tests
- add pull-request CI to run the full verification suite
- verify the empty shell opens on Android with Expo Go

### PR 3: Auth And Session

Checklist:

- implement login
- implement secure token storage
- implement refresh-token rotation
- implement logout
- implement session restore on app launch
- add a token-injecting wrapper around `apiFetch` that reads the stored access token and merges the `Authorization: Bearer` header automatically — all authenticated calls go through this wrapper; callers never read the token directly
- run `eas build:configure` and commit `eas.json` with `development`, `preview`, and `production` build profiles (the first actual build artifact is produced in PR 6, but locking in the config here prevents retrofitting it later)

Verification target: existing Meutch accounts can log in and stay signed in.

### PR 4: Feed, Browse, And Item Detail

Checklist:

- add app shell navigation
- add feed and browse screens
- add item detail
- connect loading, empty, and error states to the real API

### PR 5: Messaging, Circles, And Profile

Checklist:

- add inbox and thread detail
- support replying to messages
- add circles list and detail views
- add profile and settings screens

### PR 6: Android Internal Distribution

Checklist:

- produce one internal Android build using the EAS profiles committed in PR 3
- verify testers can install it and hit the staging API

### PR 7 And Later: Write-Side Parity

Start only after the backend write endpoints are merged and stable.

Likely order:

1. item posting and editing
2. request create and fulfill flows
3. loan and giveaway actions
4. sign up and deep-link confirmation improvements

## Testing Rules

1. Use staging for routine mobile QA.
2. Use the local backend only when validating local backend changes or reproducing an API issue.
3. Test auth and session behavior on a physical Android device before calling the foundation done.
4. Do not rely on the web app UI as proof that a mobile API path works.
5. Keep one small set of known test accounts for staging.
6. Never point a development or preview build at production.

## What This Plan Deliberately Avoids

1. A second mobile backend codebase.
2. Separate Android and iOS apps.
3. Store submission setup in the first implementation wave.
4. Push notifications before the core request-response flows are stable.
5. A separate mobile integration deployment and database, since staging already provides an isolated target.

## Exit Criteria For The MVP Foundation

The mobile project is ready to move beyond setup once the team can do all of the following:

1. open both repos together through the workspace,
2. run the app on Android from Linux,
3. switch between the local and staging API targets cleanly,
4. complete login, refresh, logout, and session restore,
5. and share one installable Android build through EAS.

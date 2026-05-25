# Meutch Mobile Infrastructure And MVP PR Guide

## Purpose

This document spells out the practical setup needed to build and test the Meutch mobile app from a Linux development machine while the main backend remains in the separate `meutch` repo.

It also defines the first PR sequence so the team can move from planning into implementation without turning the initial mobile work into a broad setup scramble.

## Short Answer To The Database Question

Do not use the current staging replica database as the everyday mobile testing target.

Use this model instead:

1. Keep using the existing local Docker Postgres databases in the main `meutch` repo for backend development and tests.
2. Create a dedicated mobile integration backend deployment that uses a new, fully isolated Postgres database on the managed cloud staging Postgres server for shared app testing.
3. Reserve the current staging replica environment for late validation only.

Because you control the managed cloud staging Postgres server, the recommended setup is to create the mobile integration database there as a separate database with its own credentials. Keep that database completely outside the production-sync workflow and treat it as a distinct environment even though it lives on the same Postgres server.

## Backend Targets

| Target | What It Is For | Who Uses It Most | Notes |
| --- | --- | --- | --- |
| Local backend | Flask API running from the sibling `meutch` repo against local Docker Postgres | Anyone changing backend code | Best for debugging and contract testing |
| Mobile integration backend | Shared HTTPS deployment for Android device testing | Mobile team and QA | Must use safe, non-production data |
| Existing staging replica | Final validation against production-like data | Release testing | Not for routine mutation testing |

## Development Box Setup

### Required On Linux

1. Install Node 22 LTS and use the repo-pinned version from `.nvmrc`.
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

## Shared Mobile Integration Environment

This is the backend target the mobile app should use most of the time.

### Required Characteristics

1. Its own Postgres database on the managed cloud staging Postgres server.
2. Its own app deployment.
3. A stable HTTPS URL.
4. Production sync disabled.
5. A safe storage target for uploaded assets.
6. Email allowlisting turned on.

### Recommended Naming

- App URL: `https://mobile-int-api.meutch.com`
- Database name: `meutch_mobile_integration`

The exact names are flexible. The important part is isolation and stability.

Use a dedicated database user for this environment rather than sharing credentials with the staging replica workflow.

### Backend Environment Variables For Integration

At minimum, the integration deployment should define:

```bash
FLASK_ENV=staging
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/meutch_mobile_integration
SECRET_KEY=<unique-secret>
JWT_SECRET_KEY=<unique-jwt-secret>
SERVER_NAME=https://mobile-int-api.meutch.com
STORAGE_BACKEND=digitalocean
DO_SPACES_REGION=<region>
DO_SPACES_KEY=<key>
DO_SPACES_SECRET=<secret>
DO_SPACES_BUCKET=<non-production-bucket-or-prefix>
MAILGUN_API_KEY=<key>
MAILGUN_DOMAIN=<domain>
EMAIL_ALLOWLIST=<comma-separated-safe-test-addresses>
```

Notes:

1. `JWT_SECRET_KEY` should be dedicated to the integration environment.
2. The storage target should not mix mobile test assets with production assets unless you have a strict prefixing policy.
3. If Mailgun is configured, `EMAIL_ALLOWLIST` should stay on so only tester addresses receive mail.

### Seed Data Strategy

Use one of these approaches for the integration environment:

1. Seed a controlled set of test users and circles from a script.
2. Load a sanitized fixture snapshot.

Do not continuously replicate production data into the mobile integration environment.

## Mobile App Environment Configuration

The mobile app should support at least three API targets:

- local
- integration
- production

Recommended public Expo environment values:

```bash
EXPO_PUBLIC_ENV_NAME=integration
EXPO_PUBLIC_API_BASE_URL=https://mobile-int-api.meutch.com
```

For local testing, switch only the API base URL and environment name. Do not hardcode URLs throughout the app.

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
- add basic lint and format commands if needed
- verify the empty shell opens on Android with Expo Go

### PR 3: Auth And Session

Checklist:

- implement login
- implement secure token storage
- implement refresh-token rotation
- implement logout
- implement session restore on app launch

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

- configure app identifiers
- configure EAS build profiles
- produce one internal Android build
- verify testers can install it and hit the integration API

### PR 7 And Later: Write-Side Parity

Start only after the backend write endpoints are merged and stable.

Likely order:

1. item posting and editing
2. request create and fulfill flows
3. loan and giveaway actions
4. sign up and deep-link confirmation improvements

## Testing Rules

1. Use the dedicated integration backend for routine mobile QA.
2. Use the local backend only when validating local backend changes or reproducing an API issue.
3. Test auth and session behavior on a physical Android device before calling the foundation done.
4. Do not rely on the web app UI as proof that a mobile API path works.
5. Keep one small set of known test accounts for the integration environment.

## What This Plan Deliberately Avoids

1. A second mobile backend codebase.
2. Separate Android and iOS apps.
3. Store submission setup in the first implementation wave.
4. Push notifications before the core request-response flows are stable.
5. Routine testing against production-like staging data.

## Exit Criteria For The MVP Foundation

The mobile project is ready to move beyond setup once the team can do all of the following:

1. open both repos together through the workspace,
2. run the app on Android from Linux,
3. switch between local and integration API targets cleanly,
4. complete login, refresh, logout, and session restore,
5. and share one installable Android build through EAS.

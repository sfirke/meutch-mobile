# Meutch Mobile Development Guide

How to set up, run, and test the mobile app from a Linux machine against the sibling `meutch` backend. For goals, scope, and the PR roadmap, see [MOBILE_APP_PLAN.md](MOBILE_APP_PLAN.md).

## Backend Targets

| Target | What It Is For | App env name | API base URL |
| --- | --- | --- | --- |
| Local backend | Flask from the sibling `meutch` repo against local Docker Postgres; backend changes and contract debugging | `local` | `http://10.0.2.2:5000/api/v1` (emulator) or `http://<your-linux-lan-ip>:5000/api/v1` (device) |
| Staging | Shared target for device testing and routine QA | `integration` | `https://staging.meutch.com/api/v1` |
| Production | Real users only; never a test target | `production` | `https://meutch.com/api/v1` |

The `integration` name describes the role; the URL behind it is staging. Staging holds a copy of the production database but is isolated from production and sends no email, so a separate mobile test deployment isn't needed.

## Machine Setup

Required:

1. Node 24 LTS, matching `.nvmrc`, and npm.
2. Expo Go on at least one Android device.
3. Access to the team's Expo account or organization.

Optional at first: Android Studio with an emulator, `eas-cli`, and `watchman`.

Android is the simplest real-device path from Linux: Expo Go works immediately and EAS Android builds need no Apple tooling. Keep iOS in mind when choosing libraries, but don't let it drive setup.

## Running The Local Backend

Typical setup in the `meutch` repo:

```bash
docker compose -f docker-compose.test.yml up -d
source venv/bin/activate
cp .env.example .env
flask db upgrade
flask seed data --env development
flask run --host 0.0.0.0 --port 5000
```

A phone's `localhost` is not your Linux box. Bind Flask to all interfaces and use your LAN IP from a device, or `10.0.2.2` from the Android emulator. If your network blocks LAN access, use Expo tunnel mode for the app and a secure tunnel for the API.

## App Environment Configuration

Defaults live in `src/config/env.ts` and are echoed in `.env.example`. Pick a target in `.env.local`:

```bash
EXPO_PUBLIC_ENV_NAME=integration
```

Override a target's URL with `EXPO_PUBLIC_LOCAL_API_BASE_URL`, `EXPO_PUBLIC_INTEGRATION_API_BASE_URL`, or `EXPO_PUBLIC_PRODUCTION_API_BASE_URL`. `EXPO_PUBLIC_API_BASE_URL` overrides whichever target is selected, for one-off cases like a tunnel.

Don't hardcode URLs; everything goes through `buildApiUrl` in `src/config/env.ts`. `EXPO_PUBLIC_*` values ship in the app bundle, so never put a secret there.

## Expo And EAS

Day-to-day loop:

1. `npx expo start`, then open the app in Expo Go.
2. Use LAN mode when the device and workstation share a network; `npx expo start --tunnel` only when LAN fails.

`eas.json` defines three profiles: `development` (development client, local API), `preview` (installable internal build, staging API), and `production`. To build:

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

Move from Expo Go to a development build when you need a native module Expo Go lacks, want a more app-like QA flow, or are preparing internal distribution.

## Auth And Session Contract

The app must follow the Meutch JWT contract:

1. Store the access and refresh tokens only in Expo Secure Store.
2. Send the access token as a bearer token, through the token-injecting fetch wrapper.
3. Replace the stored refresh token every time refresh succeeds.
4. Treat reuse of a rotated refresh token as a forced sign-out.
5. Clear local session state on logout.

## Using Staging Safely

Staging data is a production copy, so treat it as confidential: it holds real member names, addresses, and messages. Don't paste it into issues, screenshots, or external tools.

Before any wave of write-side testing, re-check that:

1. email sending is still disabled,
2. there is no write path from staging to production,
3. uploads go to a non-production storage bucket or prefix,
4. the JWT signing secret differs from production's.

Use a small shared set of accounts created for testing, not real members' mirrored accounts.

## Testing Rules

1. Use staging for routine QA.
2. Use the local backend only to validate backend changes or reproduce an API issue.
3. Test auth and session behavior on a physical Android device.
4. Don't treat the web UI as proof that a mobile API path works.
5. Never point a development or preview build at production.

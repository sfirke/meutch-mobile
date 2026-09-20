# Meutch Mobile App Plan

## Goal

Build a single React Native app for Android and iOS that gives Meutch members a mobile-first way to do the core things they already do on the web app. The mobile app should reuse the existing Meutch backend, data model, and business logic through the new `/api/v1` API surface, while keeping the mobile codebase separate from the Python repo.

This repo should stay focused on the client application. The backend remains in the sibling `meutch` repo, linked for day-to-day work through the shared VS Code workspace.

## Product Principles

1. Keep the architecture simple. Use one Expo-managed React Native app, not separate Android and iOS codebases.
2. Keep the rollout narrow. Start with the flows already supported cleanly by the current API and delay write-heavy workflows until the backend PR sequence lands.
3. Prefer mobile-native UX over web parity. Reuse the same product rules, but redesign navigation and interaction patterns for phone use.
4. Optimize for Android-first development. Preserve iOS compatibility in the code and dependency choices, but do not let iOS release requirements slow the first usable build.
5. Keep the repos separate. Share context through documentation and the workspace file, not by coupling the Git history.

## Known Backend Reality

The main Meutch repo already has:

- JWT auth endpoints for mobile under `/api/v1/auth`
- read endpoints for feed, items, circles, messages, requests, and profile
- a service-layer direction intended to keep business logic shared between web routes and API routes

The main Meutch repo does not yet have the full set of mobile mutation endpoints merged. The backend team is still landing the write-side API PRs for item creation and editing, request creation and fulfillment, and loan and giveaway actions.

That means the mobile plan should treat read-heavy flows as the first release target and make room for write-side parity in a later wave.

## MVP 1 Scope

The first mobile MVP should include:

- existing-account sign in
- JWT refresh and logout
- feed and browse
- item detail
- circles read flows and join-related visibility
- inbox, thread detail, and reply
- profile and settings

The first mobile MVP should explicitly defer:

- in-app sign up
- item creation and editing
- loan and giveaway mutations
- request creation and fulfillment
- push notifications
- deep-link handling for email confirmation
- store submission and growth tooling

## Environment Strategy

Use three backend targets and keep their purposes separate.

| Target | Purpose | Data Safety | Default Mobile Use |
| --- | --- | --- | --- |
| Local backend + local Docker Postgres | Backend development, endpoint debugging, and local contract testing | Safe | Occasional, mainly when changing backend code |
| Staging (`https://staging.meutch.com`) | Shared QA, Android device testing, and routine app development | Safe | Yes |
| Production (`https://meutch.com`) | Real user traffic | Not a test target | No |

The shared mobile testing target is the existing staging environment at `https://staging.meutch.com`, reached by the app through `https://staging.meutch.com/api/v1`.

Staging carries a copy of the production database, but it is isolated from production and does not send email. That makes it safe for routine mobile QA, including write-side testing once the mutation routes land, and it means the mobile project does not need to stand up or maintain a separate integration deployment.

The app still exposes three named targets — `local`, `integration`, and `production` — and the `integration` target resolves to the staging URL.

## Recommended Stack

- Expo managed workflow
- React Native with TypeScript
- Expo Router for navigation
- TanStack Query for server state
- Expo Secure Store for token persistence
- a small auth/session store for boot-time restore and logout handling
- EAS configured early, even if Expo Go remains the first development loop

This keeps the mobile stack approachable for a team that is newer to mobile development while still supporting a clean path from Expo Go to development builds and internal distribution.

## Delivery Phases

### Phase 0: Repo Foundation

Set up the repository so the next app bootstrap PR has a clean base.

- add a real `.gitignore`
- pin the Node version used for the project
- replace the placeholder README with actual contributor guidance
- keep planning docs in `dev_docs/`
- update the workspace file so the mobile and backend repos open side by side

### Phase 1: Infrastructure And Environment Lock-In

Decide the shared testing model before writing app code.

- adopt the existing staging deployment as the shared mobile testing target
- confirm staging keeps email sending disabled
- keep a small set of known test accounts usable on staging
- point the app's `integration` target at `https://staging.meutch.com/api/v1`
- document local-device networking for Linux developers

### Phase 2: App Bootstrap

Generate the Expo app and wire up the core development workflow.

- create the Expo-managed TypeScript project
- set up environment-specific API base URLs
- create the shared API client
- add the auth/session foundation
- verify Android device testing through Expo Go

### Phase 3: MVP Feature Delivery

Build the first feature slices in the order that proves the architecture fastest.

1. app shell and auth gate
2. feed and browse
3. item detail
4. inbox and message thread
5. circles read flows
6. profile and settings

### Phase 4: Android Internal Distribution

Once the MVP shell is stable:

- configure EAS build profiles
- create an Android internal distribution build
- move team QA from Metro-only sessions to installable builds

### Phase 5: Post-MVP Parity

After the backend write endpoints are merged and stable on staging:

- add sign up
- add item posting and editing
- add requests create and fulfill flows
- add loan and giveaway actions
- evaluate push notifications, deep links, and release automation

## Initial PR Sequence

### PR 1: Repo Foundation

Scope:

- planning docs
- `.gitignore`
- `.nvmrc`
- workspace linkage to the backend repo
- README rewrite

This PR intentionally does not add app code.

### PR 2: Expo Scaffold And Base Tooling

Scope:

- initialize the Expo TypeScript app
- commit only the managed-workflow baseline and agreed lint and format tooling
- add environment configuration for local, integration, and production API targets

### PR 3: Auth And Session Foundation

Scope:

- login
- token persistence
- refresh-token rotation
- logout
- app boot-time session restore

### PR 4: Read-Only MVP Screens

Scope:

- feed and browse
- item detail
- circles read flows
- messaging read and reply
- profile and settings

### PR 5: Android Internal Distribution

Scope:

- EAS build configuration
- Android app identifiers and signing workflow
- internal distribution for testers

### PR 6 And Later: Write-Side Parity

Scope follows the backend API merge order.

## Risks And Mitigations

### Backend write endpoints are still landing

Mitigation: keep MVP 1 scoped to the already-supported auth and read-heavy surfaces.

### Expo Go is limited

Mitigation: use Expo Go first for speed, but configure EAS early so moving to development builds is procedural rather than architectural.

### Staging holds a copy of production data

Mitigation: staging is isolated from production and sends no email, so mobile QA can use it freely. Keep it that way — if staging ever gains outbound email or a write path back to production, the mobile team needs a different shared target.

### Mobile UX can drift from backend constraints

Mitigation: use the Meutch API docs and schemas in the backend repo as the source of truth for behavior and data shapes.

## Success Criteria

PR 1 is complete when this repo is ready for mobile scaffolding without further cleanup.

The first MVP is successful when a tester on Android can:

- sign in with an existing account
- stay logged in across app restarts
- browse the feed and item details
- read and reply to messages
- inspect circles and update profile and settings

without needing the web app for those tasks.

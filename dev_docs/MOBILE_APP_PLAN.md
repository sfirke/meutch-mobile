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
| Dedicated mobile integration environment | Shared QA, Android device testing, and routine app development | Safe if isolated | Yes |
| Existing staging replica environment | Final pre-release validation against production-like data | Unsafe for routine mutations | No |

The most important decision in this plan is that the mobile team should not use the current staging replica environment as its everyday testing target. That environment mirrors production data and is the wrong place for write-side mobile testing once the mutation routes land.

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

- provision a dedicated mobile integration deployment for the backend
- give it its own Postgres database
- keep production-data sync disabled there
- set a safe email allowlist
- assign a stable HTTPS base URL for the mobile app
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

After the backend write endpoints are merged and stable in the integration environment:

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

### The current staging environment mirrors production data

Mitigation: create a separate mobile integration environment and treat staging as a final validation target only.

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

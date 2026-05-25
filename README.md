# Meutch Mobile

Mobile app for the Meutch sharing platform.

## Status

This repo is in the planning and foundation stage.

PR 1 in this repo establishes the initial working setup:

- planning docs in `dev_docs/`
- a real `.gitignore`
- Node version pinning with `.nvmrc`
- a multi-root workspace that opens the sibling backend repo
- contributor guidance for the next implementation PRs

The Expo app scaffold is not in this repo yet. That lands in the next implementation PR.

## Expected Local Repo Layout

This repo is meant to live beside the main Meutch backend repo:

```text
~/git/
	meutch/
	meutch-mobile/
```

Open `meutch-mobile.code-workspace` in VS Code to work on both repos together.

## Docs

- [dev_docs/MOBILE_APP_PLAN.md](dev_docs/MOBILE_APP_PLAN.md)
- [dev_docs/MOBILE_INFRASTRUCTURE_AND_MVP_PRS.md](dev_docs/MOBILE_INFRASTRUCTURE_AND_MVP_PRS.md)

## Tooling Baseline

- Node 22 LTS is pinned in `.nvmrc`
- Android is the first testing target
- Expo managed workflow is the planned app stack
- Expo Go is the first local device-testing path
- EAS should be configured early even if the team starts with Expo Go

## Backend Relationship

The mobile client stays in this separate repo.

The backend, data model, and API contract stay in the sibling `meutch` repo. The current mobile plan assumes the app will consume the JWT-backed `/api/v1` surface there and that the backend team will finish the remaining write endpoints in follow-on PRs.

## Next Planned PRs

1. Scaffold the Expo TypeScript app and add base environment configuration.
2. Implement auth and session handling against the existing JWT endpoints.
3. Build the first MVP read flows: feed, items, messages, circles, and profile.
4. Add Android internal distribution through EAS.


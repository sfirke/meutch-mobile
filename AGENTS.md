# Agent Instructions

Guidance for AI coding agents (and humans) working in this repo.

## Everything here is public

This project has an unusual openness profile, and it shapes how you write code,
docs, commits, and PRs:

- **This repo is developed in public on GitHub.** Issues, PRs, commit history,
  CI logs, and planning docs are all world-readable, including drafts and
  abandoned branches.
- **The API it consumes is also public on GitHub.** The Meutch backend
  (`sfirke/meutch`, expected at `../meutch`) is open source, so the API surface,
  auth flow, and data model are already public knowledge.

## Security posture

- **Do not rely on obscurity.** Assume an attacker has read both codebases.
  Security must come from correct server-side enforcement (auth, authorization,
  rate limiting, validation), never from hidden endpoints or an undocumented
  API. Do not treat "the attacker doesn't know the API" as a mitigation.
- **Never commit secrets.** No tokens, passwords, API keys, signing keys,
  keystores, or real `.env*` files. Only `.env.example` with placeholders is
  committed. Note that `EXPO_PUBLIC_*` values are embedded in the shipped app
  bundle and are public by definition; never put a secret there.
- **Treat the mobile client as untrusted and inspectable.** Anything shipped in
  the app can be extracted. Tokens live only in Expo Secure Store and are
  handled through the authenticated fetch wrapper (see the lint/babel/CI
  credential checks).
- **Don't publish sensitive operational detail.** No internal hostnames or
  credentials for non-public infrastructure, real user data, real emails, or
  exploitable vulnerability write-ups. Staging/production URLs that are already
  public are fine.
- Logs, screenshots, test fixtures, and CI output are public too. Scrub tokens,
  emails, and personal data from them.

## Documentation tone and subject matter

- Write for a public audience.
- Keep docs professional and neutral.
- Documenting the backend API contract here is fine since the backend is
  public, but link to the backend source of truth rather than duplicating it
  where it may drift.
- Planning docs in `dev_docs/` are public. Keep them free of private
  business details, credentials, and unannounced third-party information.

## Commits and PRs

Commit messages and PR descriptions are public and permanent. Describe the
change and its rationale; never include secrets or sensitive data.

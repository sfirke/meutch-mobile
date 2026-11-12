# Restyle meutch-mobile in "cut paper and running stitch"

## Context

The meutch web app just shipped a full redesign: PRs #591–#607, all merged to `origin/main` on 2026-11-10. It looks like cut paper and running stitch: flat teal and tangerine shapes, 1.5px ink outlines, hard offset shadows, a tangerine running stitch between blocks of content, and Outfit and Figtree type. `STYLE_GUIDE.md` at the meutch repo root governs it. The web redesign plan deliberately left the mobile app for afterwards, "in its own repo". Mobile still uses the old palette, soft shadows, system fonts and white-on-teal text, which fails contrast at 1.9:1.

**Goal:** meutch-mobile looks and talks like the new web app (same colors, type, shapes, outlines, tags, copy). It keeps mobile-native patterns: bottom tabs, sheets, segmented controls, press states instead of hover. That follows the mobile plan's principle 3, "mobile-native UX over web parity". The change is visual and in the wording only. No behavior or API changes.

**Decisions Sam has made:**
1. **Open PRs land first.** #22 (PR 11, account and profile), #27 (PR 14a) and #28 (PR 14b) must be merged before Phase 1 starts.
2. **One big PR.** One integration branch, one commit per task, and one draft PR at the end.
3. **Checkpoint after the foundation.** Stop after Phase 2 and get Sam's sign-off on a screenshot sheet before restyling the screens.

## Status

Tracked as **PR 19** in `MOBILE_APP_PLAN.md`. Integration branch: `ui-restyle`.

| Task | Status | Commit | Notes |
|---|---|---|---|
| 0 Setup | done | | Gate passed: #22, #27 and #28 are merged. Branched from `main` at `bbcfd53`. File ownership re-inventoried. 21 baseline shots taken from the three existing fixture files (my items, item posting, loans). |
| 1A Tokens | done | `9a910bb` | The deprecated `shadows.card` is now empty instead of removed, so untouched components still compile. All 19 contrast pairs pass; white on emerald is the closest at 4.53. |
| 1B Fonts | done | `4527ac6` | `caption` has a 20 line height and display presets a -0.2 letter spacing. Old `body`, `meta`, `label` and `buttonSmall` take the new values. A failed font load falls back to system fonts. |
| 1C Fixtures I | done | | Fixtures live outside the repo, so there is no commit. |
| 1D Fixtures II | done | | Fixtures live outside the repo, so there is no commit. |
| 2A Buttons | done | `7de28b5` | Pressed looks follow the web `:active` rules (outline presses to ink), not the appendix. `variant` is required. Every variant reserves the 2px strip under the face so buttons line up in a row. |
| 2B Surfaces | done | `993223f` | `Lifted` gained `color`, `showOffset` and `reserveSpace`. `Card` has `content`, `callout` and `attention` variants. Inline `PaperStrip` cannot tilt or round on native; the `block` form can. |
| 2C Tags, chips, badges | done | `a4497da` | `itemBadge.ts` keeps its old behavior until 3B and 3C switch to `itemStatusTag`. `CountBadge` caps at 99+. `DueBadge` reuses `describeLoanDue`, so it also shows for on-time loans. |
| 2D Avatars, photos | done | `74a2d81` | Avatar default size is 34 (was 40). Callers passing 44 or 72 move to design sizes in Phase 3. |
| 2E Form controls | done | `55846ed` | Added `ui/inputStyles` for the raw inputs Phase 3 still has to move, and `UploadTile`. The focus ring is drawn outside the box. |
| 2F Overlays, states | done | `33b15cd` | Added `Banner` and a reduce-motion hook for dialogs and sheets. `EmptyState` gained an icon and a second action. "Discard" dialogs that pass `destructive` now show a red confirm. |
| 2G Nav chrome | done | `ef0a2a9` | One JS header for every stack and the tabs, so the stitch can sit under it. Three switches in `theme/navigation.ts`: `headerStitch`, `tabActivePill`, `tabBarStitch`. `app.json` needed no change. |
| 2H Checkpoint previews | in progress | | Stays on `restyle/2h-preview`, unmerged. |
| Checkpoint | not started | | |
| 3A Feed | not started | | |
| 3B Browse, my items | not started | | |
| 3C Item detail | not started | | |
| 3D Item forms | not started | | |
| 3E Inbox, thread | not started | | |
| 3F Circles | not started | | |
| 3G Profile, settings | not started | | |
| 3H Loans, requests | not started | | |
| 3I Sign-in, auth | not started | | |
| 4A Guard | not started | | |
| 4B Fresh-eyes review | not started | | |
| 4C Copy sweep | not started | | |
| 4D Docs | not started | | |
| 4E PR | not started | | |

### Deviations and decisions

- The plan guessed "PR 15" for this work. PRs 15 to 18 were already allocated, so it is PR 19.
- The screenshot driver gained a `--signed-out` flag so the sign-in and forgot-password screens are reachable.
- Phase 1 gate: `npm run verify` passes and all 79 harness shots render, on both `main` (the "before" set) and `ui-restyle`.
- Several timing-sensitive tests (the "shows a spinner" tests and `LoanActions-test`) fail when the machine is busy, on `main` as well. They pass on a quiet machine. Tasks run only their own test files; the full suite runs at each phase gate.
- Phase 2 runs in two waves, not all at once: 2A to 2E first, then 2F and 2G, which build on the buttons, surfaces and badges. A minimal `Lifted` with its final props was written before wave 1 so tags and photos can use it; 2B owns and finishes it.
- Web hard shadows are diagonal (`4px 4px 0`) except the button's resting offset (`0 2px 0`). `Lifted` and `hardShadow` are diagonal; `Button` draws its own vertical offset.
- A leftover inline `fontWeight` on top of a custom family is faked or ignored, never the real weight. Phase 3 removes every inline `fontWeight`, and anything that copies only `fontSize` from a preset must take the family too.

## Ground rules for everyone (orchestrator and subagents)

- **Source of truth for the design:** `../meutch` at **`origin/main`**. A local `main` there may be stale, so read files with `git show origin/main:STYLE_GUIDE.md` and `git show origin/main:app/static/css/style.css`. Never checkout, pull or reset in `../meutch`, because other work shares that checkout. The Appendix condenses the values for React Native. When the Appendix and the CSS disagree, the CSS wins.
- **Follow meutch-mobile's `AGENTS.md`.** The repo is public, so no secrets and no real user data, including in screenshots and fixtures. Docs stay neutral.
- **Git identity:** the ambient git config. No tool attribution and no `Co-Authored-By` trailers in commits or PRs. Write commit messages in a plain voice and describe the change.
- **Code comments:** few and short.
- **Tests:** don't add tests that assert literal style values or markup. Tests that compute properties from the tokens are fine, such as the contrast test in 1A.
- **Isolation:** every subagent works in its own worktree (`isolation: "worktree"`). The first thing it does is `git switch -c restyle/<task-id> ui-restyle`, because worktrees branch from origin/main by default and the work must be based on the integration branch.
- **Screenshots:** use the local screenshot harness. It lives outside the repo, runs the app on Expo web in a headless browser at phone size, and answers every API call from a fixtures file.
  - Each parallel agent runs its own server: `PORT=81NN serve.sh start`, where NN is the task's number from the port table below. Pass the matching `--base http://localhost:81NN` to `driver.js`.
  - Save shots to `~/.cache/meutch-restyle/<task-id>/`.
  - Stop the server when done.
  - The harness's fixtures live in its own `fixtures/` directory, outside the repo.
- **Dependencies:** any new package needs an `Approved-dependency-change:` line in the PR body, because CI checks for it. Expected new packages are only `@expo-google-fonts/outfit` and `@expo-google-fonts/figtree`. Draw stitches and pinked edges with plain Views (the CSS border-triangle trick works in React Native), not `react-native-svg`.

### Port and model table

Model choice: the larger model (`opus`) for tasks that set a pattern others copy; the smaller one (`sonnet`) for applying an established pattern.

| Task | Port | Model | Task | Port | Model |
|---|---|---|---|---|---|
| 1A tokens | — | sonnet | 3A feed | 8131 | sonnet |
| 1B fonts | 8112 | opus | 3B browse/items | 8132 | sonnet |
| 1C fixtures I | 8113 | sonnet | 3C item detail | 8133 | opus |
| 1D fixtures II | 8114 | sonnet | 3D item forms | 8134 | sonnet |
| 2A buttons | 8121 | opus | 3E inbox/thread | 8135 | opus |
| 2B surfaces | 8122 | opus | 3F circles | 8136 | sonnet |
| 2C tags/chips/badges | 8123 | opus | 3G profile/settings | 8137 | sonnet |
| 2D avatars/photos | 8124 | sonnet | 3H loans/requests | 8138 | sonnet |
| 2E form controls | 8125 | sonnet | 3I sign-in/auth | 8139 | sonnet |
| 2F overlays/states | 8126 | sonnet | 4B fresh-eyes review | 8141 | opus |
| 2G nav chrome | 8127 | opus | 4C copy sweep | — | sonnet |

## Orchestrator role

You coordinate. You do not write the bulk of the code.

- **For each task:** brief a subagent with the template in "Subagent brief". Run a phase's tasks in parallel, in a single message.
- **When a task comes back:** critically review the handoff using the "Orchestrator review" rubric. Look at the screenshots yourself.
  - If a task fails review, send it back with `SendMessage` and specific fixes. Don't fix it yourself unless the fix is a few lines.
  - Once it passes, squash-merge `restyle/<task-id>` into `ui-restyle`, using one commit per task with a descriptive message.
- **Phase gate, after all of a phase's tasks merge:**
  - Run `npm run verify` on `ui-restyle`.
  - Stitch the pieces together: resolve overlaps and unify anything two agents did differently.
  - Push `ui-restyle`. Never push `main`.
- **Status table:** keep it in the repo copy of this plan (`dev_docs/UI_RESTYLE_PLAN.md`). Record task status, deviations, and decisions you made.
- **Taste calls:**
  - Before the checkpoint, collect them for Sam.
  - After the checkpoint, make small ones yourself and record them in the plan doc.
  - Only stop for Sam on something that contradicts the style guide.

---

## Phase 0: Setup (orchestrator alone, no subagents)

1. **Gate.** Run `gh pr view 22 27 28 --json state`. If any are still open, stop and tell Sam: "needs input: land #22/#27/#28 first."
2. `git pull` on `main` in meutch-mobile.
   - First check `git status`. There may be a staged `metro.config.js` and an untracked `plan-to-orchestrator-prompt.txt`. Leave both alone, and ask Sam if they block you.
   - Then run `git switch -c ui-restyle`.
3. Copy this plan to `dev_docs/UI_RESTYLE_PLAN.md`.
   - Drop the session start-up notes and any machine-local tool paths. Describe the screenshot tooling generically, as "the local screenshot harness".
   - Add a status table: Task | Status | Commit | Notes.
   - Add a pointer to it in `dev_docs/MOBILE_APP_PLAN.md`, as the next free PR number. PRs 15 to 18 are already allocated, so this is **PR 19**.
   - Commit.
4. **Re-inventory.** One Explore agent, `effort: lower`. Have it list the components and screens added by #22, #27 and #28, such as `FormTextField`, `ProfilePhotoPicker`, `WebLinksEditor`, `DateField`, `LoanActions`, and the EditProfile, Location, DeleteAccount, ForgotPassword, ExtendLoan, RequestLoan and RequestExtension screens. Then update the Phase 3 file-ownership lists so every file in `src/components`, `src/screens` and `app/` has exactly one owner.
5. **Baseline screenshots.** Shoot every screen the existing fixtures reach (see the harness's notes) into `~/.cache/meutch-restyle/baseline/`.

## Phase 1: Tokens, fonts, fixtures (4 parallel tasks)

**1A Tokens** (`src/theme/*` only)

- **Colors.** Rewrite `colors.ts` with the web palette under the web's names, in camelCase: `ink`, `paper`, `cardPaper`, `line`, `muted`, `teal`, `tealDeep`, `tealWash`, `tangerine`, `tangerineWash`, `purple`, `purpleWash`, `emerald`, `danger`, `dangerWash`, `white`. Add `scrim: 'rgba(29,42,46,0.45)'`.
- **Legacy aliases.** Keep the old names as deprecated aliases in a clearly marked block, so the whole app recolors at once with no codemod:

  | Old name | New value |
  |---|---|
  | `primary` | teal |
  | `primaryDark` | tealDeep |
  | `secondary` | muted |
  | `warning` | tangerine |
  | `success` | emerald |
  | `danger` | danger |
  | `background` | paper |
  | `surface` | cardPaper |
  | `border` | line |
  | `text` | ink |
  | `heroBackground` | tangerine |
  | `errorSurface` | dangerWash |
  | `errorLabel` | danger |
  | `errorText` | danger |
  | `inputPlaceholder` | muted |
  | `onPrimaryText` | white (it currently sits on `primaryDark`, i.e. tealDeep, where white is correct) |
  | `secondaryBackground` | tealWash |

- **Radii:** `control: 10`, `card: 14`, `tag: 6`, `pill: 9999`. Keep `sm`, `md` and `lg` as aliases that all map to the new values: `sm` → 10, `md` → 14, `lg` → 14.
- **New tokens:**
  - `outline: 1.5`
  - `focusRing: 2`
  - `offsets = { sm: 2, md: 3, lg: 4, dialog: 5, xl: 6 }` for hard shadows
  - `stitch = { dash: 14, gap: 9, height: 3, color: tangerine }`
  - `pinked = { toothWidth: 24, toothHeight: 12 }`
  - `tilt = { tag: -3, thumb: 2, photo: -1.5, logo: -4 }`
- **Shadows.** Remove `shadows.card` (soft). Replace it with a `hardShadow(offset)` helper that returns the iOS props (`shadowColor` ink, opacity 1, radius 0). Android can't draw hard shadows; 2B's `Lifted` component handles that.
- **Spacing** is unchanged.
- **Typography:** leave the presets in place, but add the `fonts` import contract below (1B fills it in).
- **Tests:**
  - Update `theme-test.ts`.
  - Add `contrast-test.ts`. It computes WCAG ratios from the tokens and asserts ≥4.5:1 for every approved text-on-fill pair: ink on teal, tangerine, paper, white and the washes; white on purple, emerald, danger, tealDeep and ink; tealDeep on paper and white; muted on paper and white; purple on paper and white.

**1B Fonts** (`app/_layout.tsx`, `src/theme/fonts.ts`, `src/theme/typography.ts`, `package.json`, `jest.setup.js`)

- **Install packages.** Add `@expo-google-fonts/outfit` (500, 600, 700, 800) and `@expo-google-fonts/figtree` (400, 500, 600, 700). Load them with `useFonts` in the root layout, and keep the splash screen up until they load (`expo-splash-screen` is already a dependency).
- **Export a family-per-weight map** from `fonts.ts`: `fonts.display[500|600|700|800]` and `fonts.body[400|500|600|700]`. Android ignores `fontWeight` on custom fonts, so **every text style must pick a family, never set `fontWeight`**. Rewrite the `typography` presets on that rule.
- **New presets:** `h1` (display 700, 32/38), `h2` (display 600, 24), `h3` (display 600, 20), `cardTitle` (display 600, 19), `dialogTitle` (display 600, 21), `body` (body 400, 17/27), `meta` (body 600, 14), `caption` (body 400, 13), `micro` (body 600, 12), `button` (body 600, 16), `buttonSmall` (body 600, 14), `tag` (body 700, 13), `kicker` (body 700, 12, uppercase, letterSpacing 1), `label` (body 600, 15, **sentence case, not uppercase**).
- **Legacy presets:** keep the old preset names as aliases of the nearest new preset.
- **Weight 650:** the web uses Figtree 650 for buttons and badges. Static fonts can't do 650, so map it to **600** for now, and show 600 against 700 at the checkpoint.
- **Mocks and web:** mock font loading in `jest.setup.js` so the tests don't wait. Make sure fonts load on web, because the screenshot harness is web. Prove it with before and after shots of one screen.

**1C Fixtures I** (harness fixtures directory only)

- Write `feed.json`, `browse.json` and `inbox.json` fixtures for the screenshot harness.
- **Generate the response shapes from the parsers** in `src/lib/*.ts` (`parse.ts`, `feed.ts`, `items.ts`, `messages.ts`) and the backend serializers in `../meutch` (`git show origin/main:…`). Don't guess.
- Include enough variety to show every state:
  - every feed event type, including a claimed giveaway and a found request
  - an item with and without a photo, giveaways, items on loan
  - unread and read conversations, and each context type
  - an empty variant of each, in a separate file
- **Done when:** each screen renders with no `FAIL no fixture` line.

**1D Fixtures II:** the same as 1C for circles, circle detail, request detail, user profile, settings, `/profile/requests`, and the PR 11 and PR 14 screens that the existing fixtures don't reach.

**Phase gate:** the app compiles, all tests pass, and every screen is reachable in the harness. The colors are new but the components are unchanged at this point, and that's expected.

## Phase 2: Primitives and chrome (7 parallel tasks)

Put new primitives in `src/components/ui/`. Each task owns only its own files.

**Dev gallery.** Each task also adds `src/dev/gallery/<Name>Section.tsx`, which shows every variant and state. The orchestrator creates `app/dev/components.tsx` before launching Phase 2. It renders all the sections, and redirects to `/` when `!__DEV__`. It mirrors the web's `/admin/components`.

**Rules for primitives:**
- Accessible role and label props pass through.
- Press feedback replaces hover.
- Respect reduce-motion (`AccessibilityInfo.isReduceMotionEnabled` or `useReducedMotion` from reanimated).
- Unit tests check behavior only (press, disabled, which variant renders), not style values.

**2A `Button`, `IconButton`**
- Variants: `primary` (teal fill, ink text, ink outline, resting `0 2px 0` ink offset; pressed: tangerine fill, translateY 2, no offset), `outline`, `danger` (danger fill, white text), `outlineDanger`, `light` (for use on colored bands), `link` (tealDeep text, no box).
- Sizes: `sm`, `md`, `lg`, with padding from Appendix A.3.
- Also `loading` and `disabled` states, and an optional leading icon.
- `IconButton`: a 44×44 hit target, used by the header "+" and the send buttons.

**2B Surfaces:** `Card`, `PressableCard`, `Lifted`, `Stitch`, `PinkedEdge`, `PaperStrip`
- `Card`: white fill, 1.5px `line` border, radius 14, no shadow.
- `PressableCard`: while pressed, an ink border plus a 4px hard offset.
- `Lifted`: an absolutely positioned ink box behind the child, offset by `offsets[x]`, for both platforms. It must not clip. Document the margin the parent needs.
- `Stitch`: a row of 14×3 tangerine dashes with 9px gaps, filling the width. Use `onLayout` to count the dashes.
- `PinkedEdge`: a row of 24×12 triangles made with the border trick, pointing up or down.
- `PaperStrip`: an inline teal strip, rotated -1°.

**2C Tags, chips and badges:** `ItemTag`, `itemStatusTag()`, `FilterChip`/`ChipRow`, `CountBadge`, `ContextBadge`, `DueBadge`, `StatusBadge`
- Port the tag kinds from Appendix A.5 exactly.
- Port `item_status_tag`'s precedence and the feed's tag mapping.
- `onPhoto` variant: absolute position, rotated -3°, with a 2px offset.
- Replace `src/components/itemBadge.ts` and the duplicated `badgeToneColors` (in ItemCard and ItemDetailScreen) with one shared source in `src/components/ui/tags.ts`. Keep the old exports re-exported until Phase 3.
- `FilterChip` is a pill. Selected means ink fill and paper text. `ChipRow` scrolls sideways and handles the multi-select "Everything" logic from Appendix A.6.
- `CountBadge`: purple fill, white text, pill shape. Also an `UnreadDot`.

**2D Avatars and photos:** `Avatar` (restyle in place), `ImagePlaceholder` (restyle in place), `PhotoFrame`
- `Avatar` initials and tone rules follow Appendix A.7: sizes 28, 34, 40 and 120, a 1.5px ink outline, and initials in body 700.
- `ImagePlaceholder`: copy `app/static/img/default_item_photo.png` from meutch `origin/main` into `assets/`. Show it at `contain` on `tangerineWash`. Keep the `accessibilityLabel` "No photo".
- `PhotoFrame`: a 1.5px ink outline, a radius from a prop, optional tilt, and an optional `Lifted`.

**2E Form controls:** restyle in place `FormTextField` (from PR 11), `SearchField`, `RadiusInput`, `SegmentedControl`, `SwitchRow`, `SelectList`, `TagInput` chips, `FieldError`, and `DateField` (+ `.web`)
- Inputs: white fill, 1.5px `muted` border, radius 10; focused: ink border plus a teal ring.
- Labels: body 600 in sentence case.
- Help text: muted.
- Errors: danger text plus a danger border.
- `SegmentedControl`: a 1.5px ink outer border, radius 10; the active segment is ink-filled with paper text.
- Switch: track `tealDeep`, thumb white.
- Upload tile style for 3D to use: a 2px dashed tangerine border on paper.

**2F Overlays and states:** restyle in place `ConfirmDialog`, `FilterSheet`, `OptionSheet`, `EmptyState`, `ErrorState`, `QueryStateView`, `PagingFooter`; new `Banner`
- `ConfirmDialog`: white fill, 1.5px ink border, radius 14, a 5px `Lifted`, title in `dialogTitle`. Cancel (outline) comes first, then confirm (`primary`, or `danger` for deletes). Body copy follows "This will permanently delete X. / This can't be undone."
- Sheets: top radius 14, a 1.5px ink top border, a drag handle in `line`, and the `scrim` token.
- `EmptyState`: a 64px tangerineWash circle with a 1.5px ink outline and an icon, title in display 600, muted body, actions in a centered wrapping row.
- `ErrorState`: calm and straight, in plain words.
- `Banner` tones: success and info on tealWash, warning on tangerineWash, danger on dangerWash. All get a 1.5px ink border, radius 10, a 3px `Lifted`, and body 500 text. These replace the hand-rolled banners in Phase 3.
- Use the 2A `Button`.

**2G Navigation chrome:** `app/(tabs)/_layout.tsx`, every `app/*/_layout.tsx`, `app/_layout.tsx`, `CreateMenu`, `HeaderCancelButton`, `app.json`
- Shared `src/theme/navigation.ts` holds the header and tab options so every stack uses them.
- Headers: paper background, no shadow, ink tint, title in display 600.
- Add a `Stitch` under the header via `headerBackground` or a custom header.
- Tab bar: paper background with a 1.5px `line` top border. Active is ink and inactive is muted. Labels in body 600 at 12. The Inbox badge uses `CountBadge` purple.
- Status bar dark.
- Splash and adaptive icon background stay tangerine `#f6ad55`, which already matches the web.
- `CreateMenu` "+" becomes a primary `IconButton`.
- Also wrap navigation in a theme so default colors don't leak.

**Integration (orchestrator):**
- Wire every gallery section into the gallery.
- Once 2A–2G are merged, run task **2H Checkpoint previews** (sonnet, port 8128). It rough-restyles only `FeedEventCard`, `ItemCard` and `ItemDetailScreen` with the primitives, so Sam sees real screens. Keep the result on branch `restyle/2h-preview`, unmerged. 3A–3C may start from it.
- Shoot the gallery and those three screens at 360 and 320 widths.

### CHECKPOINT: stop for Sam

Publish a screenshot sheet. Use the Artifact tool, or list the paths if it's unavailable. Write `needs input:` with these taste calls, each shown with options:

1. Weight-650 roles at 600 vs 700.
2. Stitch under the header: yes or no. Stitch above the tab bar: yes or no. The web allows at most 1–2 stitches per screen.
3. Tab bar active state: ink tint only, or an ink-filled pill behind the icon.
4. Feed card thumbnail tilt (+2°) and on-photo tag tilt (-3°) on small screens.
5. Where the pinked edge and paper strip appear, if anywhere: proposed only for the sign-in hero.
6. `SegmentedControl` style vs the web's folder tabs.
7. Anything a primitive couldn't match on React Native.

Don't start Phase 3 until Sam replies. Fold his answers into the primitives first, as one orchestrator-run fix-up task.

## Phase 3: Screens (9 parallel tasks, each with disjoint files)

**Each task:**
- Moves its files onto the primitives and the new token names. After this, no legacy alias is used in the task's files.
- Removes hand-rolled buttons, chips, badges, banners and soft shadows.
- Replaces `fontWeight` and size literals with presets.
- Applies the copy rules in Appendix A.9.
- Shoots every state of every screen it owns (loading, error, empty, full, owner and non-owner views where relevant) at 360×760 and 320×640.
- Fixes tests that asserted old colors. Change them to assert behavior or tokens, not literals.
- If a needed change lives in another group's file, reports it rather than editing it.

The table below says what each task does. The complete file list for each owner is under "File ownership" after it.

| Task | Owns |
|---|---|
| 3A Feed | FeedScreen, FeedEventCard (card, compact rehomed row: paper fill, dashed border, 0.6 opacity, grayscale), FeedFilterSheet (→ ChipRow if it fits, else restyle), FilterToolbar |
| 3B Browse and my items | BrowseScreen, ItemCard (photo fills a 210-tall frame, cover, on-photo status tag, title in `cardTitle`, meta "X away · Category"; remove the giveaway ribbon), BrowseFilterSheet, MyItemsScreen |
| 3C Item detail | ItemDetailScreen (whole-photo frame with ink outline, 4px lift, tangerineWash background; owner row between two stitches; "Ask to borrow this" primary), ImageCarousel, MessageComposer |
| 3D Item forms | ItemForm, PhotoGrid (dashed tangerine add tile, overlay buttons per Appendix A.10), NewItemScreen, EditItemScreen |
| 3E Inbox and thread | InboxScreen, ConversationRow (unread: tealWash background, name in body 700, purple dot), InboxToolbar, SelectionBar (ink bar, paper text), ThreadScreen, MessageBubble (radius 14; mine tealWash, others white with a `line` border; unread purple border), ThreadContextCard (thumbnail -1.5°), LoanBanner |
| 3F Circles | CirclesScreen, CircleCard (→ PressableCard row with 64px thumbnail, circle type tags; open circles get no tag), CircleDetailScreen, MemberRow |
| 3G Profile and settings | ProfileScreen, ProfileHeader, ProfileLinksSection, NavRow, WebLinkRow, SettingsScreen, UserProfileScreen, plus the PR 11 screens and components (EditProfile, Location, DeleteAccount (calm and straight), ProfilePhotoPicker, WebLinksEditor). The sign-out button is outline, not danger. |
| 3H Loans and requests | LoanDetailScreen, LoanRow, MyLoansScreen, RequestDetailScreen, RequestRow, MyRequestsScreen, plus the PR 14 screens and components (LoanActions, ExtendLoan, RequestLoan, RequestExtension). Due badges per Appendix A.5. Cancel loan and deny request are outline buttons, not red. |
| 3I Sign-in and auth | SignInScreen, ForgotPassword. Auth card: white, 1.5px ink, radius 14, 4px lift, a 72px logo tile overlapping the top and **not tilted**. "Log in" and "Sign up" in sentence case. A pinked edge or paper strip only if Sam approved it at the checkpoint. |

### File ownership

Re-inventoried in Phase 0 against `main` at `bbcfd53`. Every file in `src/components`, `src/screens` and `app/` has exactly one owner. Tests travel with the file they test. Files restyled in place during Phase 2 stay with their Phase 2 owner; a Phase 3 task that needs a change there reports it.

| Owner | Files |
|---|---|
| 2A Buttons | `Icon.tsx`, `LinkedText.tsx` |
| 2C Tags, chips, badges | `itemBadge.ts` |
| 2D Avatars, photos | `Avatar.tsx`, `ImagePlaceholder.tsx`, `MemberPressable.tsx` |
| 2E Form controls | `FormTextField.tsx`, `SearchField.tsx`, `RadiusInput.tsx`, `SegmentedControl.tsx`, `SwitchRow.tsx`, `SelectList.tsx`, `TagInput.tsx`, `FieldError.tsx`, `DateField.tsx`, `DateField.web.tsx` |
| 2F Overlays, states | `ConfirmDialog.tsx`, `FilterSheet.tsx`, `OptionSheet.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `QueryStateView.tsx`, `PagingFooter.tsx` |
| 2G Nav chrome | `CreateMenu.tsx`, `HeaderCancelButton.tsx`, `RequireSession.tsx`, every file under `app/` (the layouts carry the styling; the route files are thin re-exports) |
| 3A Feed | `FeedScreen.tsx`, `FeedEventCard.tsx`, `FeedFilterSheet.tsx`, `FilterToolbar.tsx` |
| 3B Browse, my items | `BrowseScreen.tsx`, `MyItemsScreen.tsx`, `ItemCard.tsx`, `BrowseFilterSheet.tsx` |
| 3C Item detail | `ItemDetailScreen.tsx`, `ImageCarousel.tsx`, `MessageComposer.tsx` |
| 3D Item forms | `NewItemScreen.tsx`, `EditItemScreen.tsx`, `ItemForm.tsx`, `PhotoGrid.tsx` |
| 3E Inbox, thread | `InboxScreen.tsx`, `ThreadScreen.tsx`, `ConversationRow.tsx`, `InboxToolbar.tsx`, `SelectionBar.tsx`, `MessageBubble.tsx`, `ThreadContextCard.tsx`, `LoanBanner.tsx` |
| 3F Circles | `CirclesScreen.tsx`, `CircleDetailScreen.tsx`, `CircleCard.tsx`, `MemberRow.tsx` |
| 3G Profile, settings | `ProfileScreen.tsx`, `SettingsScreen.tsx`, `UserProfileScreen.tsx`, `EditProfileScreen.tsx`, `LocationScreen.tsx`, `DeleteAccountScreen.tsx`, `ProfileHeader.tsx`, `ProfileLinksSection.tsx`, `NavRow.tsx`, `WebLinkRow.tsx`, `ProfilePhotoPicker.tsx`, `WebLinksEditor.tsx` |
| 3H Loans, requests | `LoanDetailScreen.tsx`, `MyLoansScreen.tsx`, `RequestDetailScreen.tsx`, `MyRequestsScreen.tsx`, `ExtendLoanScreen.tsx`, `RequestLoanScreen.tsx`, `RequestExtensionScreen.tsx`, `LoanRow.tsx`, `RequestRow.tsx`, `LoanActions.tsx`, `loanTone.ts` |
| 3I Sign-in, auth | `SignInScreen.tsx`, `ForgotPasswordScreen.tsx` |

Notes:
- `Icon.tsx`, `MemberPressable.tsx` and `RequireSession.tsx` have no colors or type of their own, so no change is expected. They have an owner only so nothing is unowned.
- `LinkedText.tsx` takes its default link color from the theme. 2A moves it to `tealDeep` along with the `link` button.
- `loanTone.ts` maps loan states to colors and is shared by `LoanBanner` (3E), `LoanRow` and `LoanDetailScreen` (3H). 3H owns it and 3E reports any change it needs.
- `MessageComposer.tsx` is used by item detail and request detail. 3C owns it and 3H reports.
- `SignInScreen.tsx` is tested from `src/__tests__/sign-in-screen-test.tsx`. That test goes with 3I. The other tests in `src/__tests__` (auth gate, detail stacks, router smoke, tabs layout) go with 2G.
- Outside these directories the only styling is the two `backgroundColor` values in `app.json` (2G) and `src/theme` (1A and 1B).

**Phase gate (orchestrator):**
- `grep` for legacy alias names, `shadows.card`, `fontWeight:`, and hex or rgba outside `src/theme`. Each should return nothing, or only a short list of justified exceptions.
- Then delete the legacy aliases from `src/theme`.
- Run `npm run verify`.

## Phase 4: Integration and polish

- **4A Guard (orchestrator, or one sonnet agent).** Add `scripts/check-style-literals.mjs` and wire it into `npm run verify`. It fails on hex or rgba color literals and on `fontWeight` outside `src/theme`. No new dependency.
- **4B Fresh-eyes review (opus).**
  - Give it the diff of `main...ui-restyle` and the web `STYLE_GUIDE.md`. **Don't give it your opinions.**
  - Have it shoot every screen and the gallery, and report deviations from the style guide, inconsistencies between screens, contrast problems, layout overflow at 320px, tap targets under 44, and missing accessibility labels.
  - Triage its findings. Fix the small ones directly; batch the rest into fix-up tasks.
- **4C Copy sweep (sonnet).** Grep all user-facing strings for title case, "Free", "Fulfilled", "Borrowed", "Claimed", "Request to borrow", "Login", "Register" and uppercase labels. Fix them. Check that any client-side text matching "fulfilled" still works now that the feed API says "found".
- **4D Docs (orchestrator).** Add a short "Look and feel" section to README or DEVELOPMENT.md. It points to the web `STYLE_GUIDE.md` as the source of truth, `src/components/ui/` for the primitives, and the `/dev/components` gallery. Note the React Native translations: press replaces hover, `Lifted` replaces box-shadow, family-per-weight fonts. Update the status table in `UI_RESTYLE_PLAN.md`.
- **4E PR (orchestrator).**
  - Run `npm run verify`.
  - Push `ui-restyle` and open a **draft** PR to `main`, titled "Restyle the app to match the new web look (PR 19)".
  - Body:
    - plain description of the change
    - list of user-visible wording changes
    - `Approved-dependency-change:` line for the font packages
    - testing notes
  - Attach before and after screenshots of the main screens with `gh pr edit --attach`, using dummy data only.
  - Note that the splash and icon changes need a native rebuild to see.
- **Final report to Sam:** branch, PR link, decisions made after the checkpoint, known gaps.

---

## Subagent brief (template; fill in for each task)

```
You are implementing task <ID> of the meutch-mobile restyle. Plan: dev_docs/UI_RESTYLE_PLAN.md
(read "Ground rules", your task, and the Appendix). Design source of truth: in ../meutch, run
`git show origin/main:STYLE_GUIDE.md` and `git show origin/main:app/static/css/style.css`.
Never checkout or pull in ../meutch.

First: `git switch -c restyle/<id> ui-restyle`.
You own ONLY these files: <list>. Report needed changes to other files; don't make them.
Use these primitives/tokens: <list from earlier phases, with paths>.
Screenshot server: PORT=<port>. Shots go in ~/.cache/meutch-restyle/<id>/.

Before handing back, verify your own work. All of these must pass:
1. npm run lint && npm run typecheck && npm run format:check
2. npx jest <your test files and the tests of files you changed>
3. Screenshots of every state you own at 360x760 and 320x640. Look at each one and fix what's wrong.
4. Self-check against the "Review rubric" below, item by item.
Then commit on your branch (ambient git identity, a plain descriptive message, no tool attribution).

Hand back:
- branch and commit sha
- files changed
- screenshot paths, with one line per shot saying what it shows
- rubric results (pass or fail, with a note for each fail)
- deviations from the plan, and why
- questions or taste calls for the orchestrator
- changes needed in files you don't own
```

## Orchestrator review rubric (subagents also use it as a self-check)

1. Only owned files changed. No behavior or API changes.
2. No hex, rgba or `fontWeight` literals, and no legacy aliases (Phase 3+). Text uses typography presets.
3. Contrast: ink on teal and tangerine; white on purple, emerald, danger, tealDeep and ink. Bright teal is never text. Purple never signals an error.
4. Ink outline = pressable or deliberately set apart. Content cards use a `line` border. Every ink outline is 1.5px.
5. One primary button per view. Red only for delete and remove.
6. No soft shadows. Lift is a hard ink offset via `Lifted`.
7. Tilts only on tags, thumbnails, avatars, the logo tile and the paper strip, within 1–5°. Forms, safety, privacy, account deletion and loan problems stay straight.
8. At most 1–2 stitches on a screen, and never under running text.
9. Sentence case everywhere. Words table applied. "Free" is never an item label.
10. Fits at 320px with no overflow or clipping, including `Lifted` offsets. Tap targets are at least 44.
11. Accessibility roles and labels kept or improved. Reduce-motion respected.
12. Tests check behavior, not literal styles. No PR-context comments in tests. Comments are few and short.
13. Screenshots actually show the claimed states. Open them; don't trust the report.

When stitching pieces together, also check consistency across tasks: the same spacing rhythm, card padding, tag placement and empty-state wording.

## Verification (end to end)

- `npm run verify` passes on `ui-restyle`, with the new `check-style-literals` guard and the contrast test.
- The harness reaches every screen with fixtures. Before and after sheets for every screen are in `~/.cache/meutch-restyle/`, at 360 and 320 widths.
- The `/dev/components` gallery shows every primitive in every state.
- Grep returns nothing for legacy aliases, `shadows.card` or `fontWeight` outside the theme.
- Sam's checkpoint decisions are reflected and recorded in `UI_RESTYLE_PLAN.md`.
- Sam does a native check on a dev build: fonts on Android (family-per-weight), `Lifted` on Android, splash. The web harness can't prove these.

---

## Appendix: web design system condensed for React Native

Taken from meutch `origin/main` @ 09d5deb. The CSS wins on any conflict.

**A.1 Colors**

| Name | Value |
|---|---|
| ink | `#1d2a2e` |
| paper | `#fff9ef` (screen background) |
| cardPaper | `#ffffff` |
| line | `#e7dcc5` |
| muted | `#5b6a6e` |
| teal | `#4fd1c7` (primary fill only, never text) |
| tealDeep | `#0f5f5c` (links, teal text, info badges) |
| tealWash | `#dcf5f1` (selected, unread, pressed) |
| tangerine | `#f6ad55` (requests, stitch, hero) |
| tangerineWash | `#fdeeda` |
| purple | `#6d5698` (new and unread counts, avatar tone) |
| purpleWash | `#ece6f5` |
| emerald | `#198754` (giveaways) |
| danger | `#9d2b2b` (errors, overdue, delete; use rarely) |
| dangerWash | `#fee6e3` |

- Teal and tangerine are the exact logo colors.
- Text on fills: ink on teal and tangerine; white on purple, emerald, danger, tealDeep and ink. Never purple on teal or tangerine.

**A.2 Type**
- Display: Outfit. Body: Figtree.
- Weights:
  - Outfit 800 for big headlines
  - Outfit 700 for h1
  - Outfit 600 for every other heading, card and dialog title
  - Figtree 400 for body
  - Figtree 500 for alerts
  - Figtree 600 for labels, chips and meta
  - Figtree 650 (→ 600 for now) for buttons and badges
  - Figtree 700 for tags, initials, unread names, sender names and the kicker
- Body text is 17px with 1.6 line height. h1 is 32 on phones. Headings use letterSpacing ≈ -0.2.

**A.3 Buttons**
- Radius 10, 1.5px ink border.
- Padding: md 8×16 at 16px; sm 6×12 at 14px; lg 10×22 at 18px.
- Primary: teal fill, ink text, resting offset `0 2px 0` ink; pressed: tangerine fill, translateY 2, no offset.
- Outline: transparent fill, ink text; pressed: tealWash.
- Danger: danger fill, white text.
- Outline-danger: danger border and text; pressed: dangerWash.
- Light: white fill and ink text, for colored bands.
- Link: tealDeep text.
- Disabled: 0.65 opacity.
- Focus ring: 2px ink.

**A.4 Cards and surfaces**
- Content card: white, 1.5px line border, radius 14, padding 16 on phones.
- Clickable card: pressed state adds an ink border and a 4px ink offset.
- Item card photo: 210 tall, cover.
- Feed card: 34px avatar actor line ("**Name** action · when", muted 15), title 20, 2-line muted description, tag row, 68–84px thumbnail on the right with an ink outline, radius 10, rotated 2°.
- Rehomed compact row: paper fill, dashed border, 0.6 opacity, grayscale, 28px avatar, 32px thumbnail.
- Dialog offset 5. Alert offset 3. Auth card offset 4.
- Callout: tealWash, ink border, offset 4.
- Attention panel: tangerineWash, ink border.

**A.5 Tags**
- Base: padding 2×10, 1.5px ink border, radius 6, 13px weight 700, white fill, ink text.

| Kind | Label | Fill | Text |
|---|---|---|---|
| giveaway | Up for grabs | emerald | white |
| wanted | Wanted | tangerine | — |
| pending | Pending pickup | tangerineWash | — |
| circle | Circle | teal | — |
| regional | Regional circle | tealWash | — |
| found | Found! | ink | paper |
| rehomed | Rehomed | ink | paper |
| on_loan | Out on loan | white | — |
| closed-circle | Closed circle | white | — |
| secret-circle | Secret circle | white | — |
| member | Member | white | — |
| admin | Admin | white | — |
| mine | Your item | white | — |
| expired | Expired | white | — |

- On a photo: top and left 12, rotated -3°, offset 2.
- **One status tag per item**, in this order:
  1. Rehomed (giveaway, claimed)
  2. Pending pickup (giveaway, unavailable)
  3. Up for grabs (giveaway)
  4. Out on loan (unavailable)
  5. Otherwise no tag
- Feed mapping: request → found if fulfilled, else wanted; giveaway → giveaway; lent → on_loan; circle_join → circle. Open circles get no tag.
- Due badge: "Overdue by N day(s)" on danger; "Due today" and "Due in N day(s)" on tangerine with ink text.
- Status badge: pending tangerine, approved emerald, other muted.
- Context badge (inbox): item white, request tangerine, circle teal; 1.5px ink, radius 6, 12.5px.

**A.6 Filter chips**
- Pill, 1.5px line border, white fill, ink text, 15px weight 600, padding 4×14.
- Selected: ink fill and border, paper text. Gap 7, horizontal scroll.
- Feed chips: Everything, Requests, Giveaways, Lending, Circles.
- Selection logic:
  - Tapping a chip from Everything selects just that chip.
  - After that, chips toggle.
  - Turning off the last chip, or turning on all four, returns to Everything.

**A.7 Avatars**
- Circle with a 1.5px ink outline. Sizes 28, 34 (default), 40 and 120. Initials at size × 0.36, weight 700.
- Initials: the first letter of the first word plus the first letter of the last word, uppercased. One word gives one letter; empty gives "?".
- Tone: `name.length % 3` (spaces count): 0 teal with ink text, 1 tangerine with ink text, 2 purple with white text.

**A.8 Decorations**
- Stitch: tangerine, 14 on, 9 off, 3 tall. It goes between blocks, never under text, at most 1–2 per screen.
- Pinked edge: 24×12 triangles, only for big moments (hero bands), never on cards or everyday screens.
- Paper strip: teal inline block, padding 0 × 0.16em, radius 6, rotated -1°, for one emphasized word in a headline.
- Logo tile: `logo_m.png` with a 1.5px ink outline, radius 9 at 36px; the auth tile is 72px at radius 14, untilted.

**A.9 Copy**
- Sentence case everywhere ("Loans & requests").
- Word changes:

  | Say | Instead of |
  |---|---|
  | Up for grabs | Free / Giveaway tag |
  | Giveaways | Free stuff |
  | Wanted | Request badge |
  | Found! | Fulfilled |
  | Out on loan | Borrowed |
  | Rehomed | Claimed |
  | Ask to borrow this | Request to borrow |
  | Log in | Login / Sign in |
  | Sign up | Register |
  | X away | X from you |
  | Photos | Images |
  | What's happening nearby | Community activity (feed title) |
  | What do you need to borrow? | Find items (Find/Browse prompt) |

- Never use "free" on an item.
- Error states can be a little playful ("Ope!") but must say plainly what went wrong and what to do.
- The feed API now sends "found" instead of "fulfilled".

**A.10 Forms and uploads**
- Input: white fill, 1.5px muted border, radius 10, padding 10×14; focused: ink border plus a 3px teal ring; disabled: paper fill.
- Label: 600, margin-bottom 8.
- Help: muted 14. Error: danger.
- Checkbox and switch checked: ink, or a tealDeep track.
- Upload and add tile: 2px dashed tangerine on paper; with a file: emerald border on tealWash.
- Photo thumbnails: radius 10.
- Overlay buttons: 28px circles. Crop is white at 0.9 opacity with ink; delete is danger with white. Always visible.

**A.11 Inbox and messages**
- List: white, 1.5px line border, radius 14. Rows: padding 16×18, 1px line dividers.
- Unread: tealWash background, name 700, preview ink 600, an 8px purple dot.
- Bubble: max 85%, padding 10×14, radius 14, 1.5px line border, white fill; mine is tealWash with a tealWash border; unread has a purple border. Sender 14/700, time muted 12.5.
- Bulk bar: ink fill, paper text, radius 10.

# Play Tennis Event Tournament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Play Tennis as a fully functional `/pt` club and preload the locked `제2회 임진강 나룻배` event with its exact 32-player, 32-match draw while preserving all existing club behavior.

**Architecture:** Persist generic per-tournament policies in PostgreSQL, map them through the existing repository, and centralize policy decisions in pure domain helpers. Existing tournaments receive backward-compatible defaults; only the seeded Play Tennis event is locked, excluded from club records, and configured with two ranking-excluded members. An optional match `roundNumber` preserves the exact eight-round layout without changing existing schedules.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, Vitest, Testing Library, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-21-play-tennis-event-tournament-design.md`

## Global Constraints

- `Play Tennis` is a normal club at `/pt`; all member and tournament creation features remain available.
- Only `제2회 임진강 나룻배` is locked and excluded from annual records.
- `유태주` and `감독진` are omitted from this event ranking only; match results still count for partners and opponents.
- Existing tournaments default to editable, ranking all members, and included in records.
- Never run the destructive `npm run db:seed` against production data.
- Use an additive, idempotent Prisma migration for the club, members, tournament, group, participants, and matches.
- The locked event allows score save and score reset only; all structural mutations are rejected server-side.
- The event public URL is `/public/pt/2822`, derived from tournament ID `pt-tournament-20260822` by the existing four-digit slug rule.

---

### Task 1: Domain Policy and Round Metadata

**Files:**
- Modify: `lib/domain/types.ts`
- Create: `lib/domain/tournament-policy.ts`
- Create: `lib/domain/tournament-policy.test.ts`
- Modify: `lib/store/tournament-store.ts`

**Interfaces:**
- Produces: `isScheduleLocked(tournament)`, `rankingMembersForTournament(tournament, members)`, `isIncludedInClubRecords(tournament)`.
- Produces: optional `Tournament.scheduleLocked`, `Tournament.rankingExcludedMemberIds`, `Tournament.includeInClubRecords`, and `Match.roundNumber`.

- [ ] **Step 1: Write failing policy tests**

```ts
import { describe, expect, it } from "vitest";
import { isIncludedInClubRecords, isScheduleLocked, rankingMembersForTournament } from "./tournament-policy";
import type { Member, Tournament } from "./types";

const base: Tournament = { id: "t1", name: "일반대회", date: "2026-08-22", publicSlug: "1234", status: "active" };
const members: Member[] = [
  { id: "m1", name: "감독진", notes: "" },
  { id: "m2", name: "유태주", notes: "" },
  { id: "m3", name: "김성훈", notes: "" }
];

describe("tournament policy defaults", () => {
  it("keeps existing tournaments editable and in records", () => {
    expect(isScheduleLocked(base)).toBe(false);
    expect(isIncludedInClubRecords(base)).toBe(true);
    expect(rankingMembersForTournament(base, members)).toEqual(members);
  });

  it("applies only persisted event exceptions", () => {
    const event = { ...base, scheduleLocked: true, includeInClubRecords: false, rankingExcludedMemberIds: ["m1", "m2"] };
    expect(isScheduleLocked(event)).toBe(true);
    expect(isIncludedInClubRecords(event)).toBe(false);
    expect(rankingMembersForTournament(event, members).map((member) => member.id)).toEqual(["m3"]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- lib/domain/tournament-policy.test.ts`

Expected: FAIL because `tournament-policy.ts` and the policy fields do not exist.

- [ ] **Step 3: Add backward-compatible domain fields and helpers**

```ts
export function isScheduleLocked(tournament: Tournament) {
  return tournament.scheduleLocked === true;
}

export function rankingMembersForTournament(tournament: Tournament, members: Member[]) {
  const excluded = new Set(tournament.rankingExcludedMemberIds ?? []);
  return members.filter((member) => !excluded.has(member.id));
}

export function isIncludedInClubRecords(tournament: Tournament) {
  return tournament.includeInClubRecords !== false;
}
```

Add optional fields to the domain types so old local state and fixtures remain valid. Keep `STORAGE_VERSION` unchanged unless a runtime migration is required; normalization must supply policy defaults without rewriting unrelated state.

- [ ] **Step 4: Run focused and store tests**

Run: `npm test -- lib/domain/tournament-policy.test.ts lib/store/tournament-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/types.ts lib/domain/tournament-policy.ts lib/domain/tournament-policy.test.ts lib/store/tournament-store.ts
git commit -m "feat: add tournament event policies"
```

### Task 2: Prisma Schema and Repository Mapping

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260821000000_add_event_tournament_policies/migration.sql`
- Modify: `lib/server/repositories/tournament-repository.ts`
- Modify: `lib/server/repositories/tournament-repository.test.ts`

**Interfaces:**
- Consumes: domain policy fields from Task 1.
- Produces: DB persistence for the three tournament policies and optional match round number.

- [ ] **Step 1: Extend repository mapping tests first**

Add expectations that DB tournaments map `scheduleLocked`, `rankingExcludedMemberIds`, and `includeInClubRecords`, and DB matches map `roundNumber`. Add a legacy fixture expectation proving `false`, `[]`, `true`, and `undefined` defaults.

- [ ] **Step 2: Run repository tests and verify failure**

Run: `npm test -- lib/server/repositories/tournament-repository.test.ts`

Expected: FAIL because the Prisma and domain mappings do not expose the fields.

- [ ] **Step 3: Add schema fields and additive SQL**

```prisma
model Tournament {
  scheduleLocked           Boolean  @default(false)
  rankingExcludedMemberIds String[] @default([])
  includeInClubRecords     Boolean  @default(true)
}

model Match {
  roundNumber Int?
}
```

Use these additive statements. Do not alter existing rows beyond PostgreSQL applying these defaults.

```sql
ALTER TABLE "Tournament" ADD COLUMN "scheduleLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN "rankingExcludedMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Tournament" ADD COLUMN "includeInClubRecords" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Match" ADD COLUMN "roundNumber" INTEGER;
```

- [ ] **Step 4: Map and persist the fields**

Update `toDomainTournament`, selected tournament query typing, `toDomainMatch`, `replaceTournamentState`, and match create/update payloads. Preserve the DB `publicSlug` when loading instead of discarding it, while retaining the existing numeric-slug fallback for old rows.

- [ ] **Step 5: Generate Prisma client and run tests**

Run: `npm run db:generate`

Run: `npm test -- lib/server/repositories/tournament-repository.test.ts lib/domain/public-access.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260821000000_add_event_tournament_policies/migration.sql lib/server/repositories/tournament-repository.ts lib/server/repositories/tournament-repository.test.ts
git commit -m "feat: persist event tournament policies"
```

### Task 3: Register the Play Tennis Club

**Files:**
- Modify: `lib/domain/club.ts`
- Modify: `lib/domain/club.test.ts`
- Modify: `lib/domain/club-share.ts`
- Modify: `components/SplashScreen.tsx`
- Modify: `components/SplashScreen.test.tsx`
- Modify: `lib/server/auth/admin-session.ts`
- Modify: `components/RouteSplashScreen.test.tsx`

**Interfaces:**
- Produces: valid `ClubSlug` value `pt`, `/pt` routes, image mappings, share metadata, and logout cleanup.

- [ ] **Step 1: Add failing club routing and asset mapping tests**

```ts
expect(isKnownClubSlug("pt")).toBe(true);
expect(buildClubPath("pt", "tournaments/manage")).toBe("/pt/tournaments/manage");
expect(getClubBySlug("pt")).toMatchObject({ name: "Play Tennis", shortName: "Play Tennis", organizationLabel: "클럽" });
```

Also assert that `SplashScreen.tsx` contains `pt: "/pt_intro_summer_coast.webp"` and share content uses `/kakao-share-pt.jpg`.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- lib/domain/club.test.ts components/SplashScreen.test.tsx components/RouteSplashScreen.test.tsx`

Expected: FAIL because `pt` is not registered.

- [ ] **Step 3: Register the club everywhere**

Add `pt` to `ClubSlug`, `clubs`, intro image mapping, share content, and logout cookie deletion. Rely on `ADMIN_PASSWORD` fallback so `/pt` uses `1234` without adding a secret to source control.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- lib/domain/club.test.ts components/SplashScreen.test.tsx components/RouteSplashScreen.test.tsx lib/server/auth/admin-session.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/club.ts lib/domain/club.test.ts lib/domain/club-share.ts components/SplashScreen.tsx components/SplashScreen.test.tsx components/RouteSplashScreen.test.tsx lib/server/auth/admin-session.ts
git commit -m "feat: register Play Tennis club"
```

### Task 4: Seed the Play Tennis Event with an Idempotent Migration

**Files:**
- Create: `prisma/migrations/20260821010000_add_play_tennis_event/migration.sql`
- Modify: `prisma/seed.ts`
- Create: `lib/domain/play-tennis-event.test.ts`

**Interfaces:**
- Consumes: exact roster and draw in the approved spec.
- Produces: club `pt`, 32 members, tournament `pt-tournament-20260822`, group `pt-event-group`, 32 participants, 32 group members, and 32 scheduled matches.

- [ ] **Step 1: Add a static data integrity test**

The test reads the migration SQL and asserts all 32 member IDs (`pt-m01` through `pt-m32`), all 32 match IDs (`pt-event-r1-c1` through `pt-event-r8-c4`), date `2026-08-22`, public slug `2822`, and policy values. Parse each match value row to verify four unique players, round 1–8, court 1–4, and exactly four appearances per member.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- lib/domain/play-tennis-event.test.ts`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Write the additive migration**

Use stable IDs and PostgreSQL `INSERT` statements with `ON CONFLICT DO UPDATE` for club and members. Upsert the tournament with:

```sql
('pt-tournament-20260822', '제2회 임진강 나룻배', DATE '2026-08-22', '2822', true, ARRAY['pt-m01','pt-m02']::text[], false)
```

Insert the exact 32 roster rows and exact 32 matches from the spec. Each match uses `roundNumber` 1–8, `courtNumber` 1–4, `matchNumber` and `sortOrder` 1–32, null scores, and `scheduled` status. Make participant and group-member inserts conflict-safe. Do not delete or update any non-`pt` data.

- [ ] **Step 4: Keep disposable seed behavior consistent**

Add Play Tennis to `prisma/seed.ts` so a fresh local DB matches production migrations, without changing its clearly destructive development-only behavior.

- [ ] **Step 5: Run integrity and repository tests**

Run: `npm test -- lib/domain/play-tennis-event.test.ts lib/server/repositories/tournament-repository.test.ts`

Expected: PASS with 32 players, 32 matches, and four appearances per player.

- [ ] **Step 6: Commit**

```bash
git add prisma/migrations/20260821010000_add_play_tennis_event/migration.sql prisma/seed.ts lib/domain/play-tennis-event.test.ts
git commit -m "feat: add Play Tennis event draw"
```

### Task 5: Enforce the Lock on the Server

**Files:**
- Modify: `lib/server/repositories/tournament-repository.ts`
- Modify: `lib/server/actions/tournament-actions.ts`
- Modify: `lib/server/actions.test.ts`
- Modify: `lib/server/repositories/tournament-repository.test.ts`

**Interfaces:**
- Produces: `assertTournamentStructureEditable(clubSlug, tournamentId)` backed by DB state.
- Preserves: `updateMatchScore` and score reset for locked tournaments.

- [ ] **Step 1: Write failing action and repository tests**

Test that locked tournaments reject `replaceTournamentState`, name update, date update, and delete. Test that `updateMatchScoreAction` still calls `updateMatchScore` for the same locked event.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- lib/server/actions.test.ts lib/server/repositories/tournament-repository.test.ts`

Expected: FAIL because locked structures are currently mutable.

- [ ] **Step 3: Add a server-owned lock assertion**

```ts
async function assertTournamentStructureEditable(clubId: string, tournamentId: string) {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, clubId },
    select: { scheduleLocked: true }
  });
  if (!tournament) throw new Error(`Tournament not found: ${tournamentId}`);
  if (tournament.scheduleLocked) throw new Error("This tournament schedule is locked");
}
```

Call this before any structural transaction or metadata/delete mutation. Never trust `state.tournament.scheduleLocked` from the client.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- lib/server/actions.test.ts lib/server/repositories/tournament-repository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/server/repositories/tournament-repository.ts lib/server/actions/tournament-actions.ts lib/server/actions.test.ts lib/server/repositories/tournament-repository.test.ts
git commit -m "feat: protect locked tournament schedules"
```

### Task 6: Apply Ranking and Club Record Policies

**Files:**
- Modify: `components/TournamentManageClient.tsx`
- Modify: `components/PublicTournamentView.tsx`
- Modify: `components/TournamentManageClient.test.tsx`
- Modify: `components/PublicTournamentView.test.tsx`
- Modify: `lib/server/repositories/tournament-repository.ts`
- Modify: `app/[clubSlug]/records/page.tsx`
- Modify: `app/public/[clubSlug]/records/page.tsx`
- Modify: relevant records tests

**Interfaces:**
- Consumes: Task 1 policy helpers.
- Produces: matching admin/public rankings and annual-record filtering.

- [ ] **Step 1: Write failing ranking behavior tests**

Construct one completed doubles match where excluded member `m1` partners `m3` against `m4` and `m5`. Assert the ranking omits only `m1`, while `m3`, `m4`, and `m5` retain the match result and scores. Assert the event public page omits `.public-records-link`.

- [ ] **Step 2: Write a failing record repository/page test**

Return one included and one excluded tournament from the repository fixture. Assert record totals and completed match count use only the included tournament.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- components/TournamentManageClient.test.tsx components/PublicTournamentView.test.tsx lib/server/repositories/tournament-repository.test.ts`

Expected: FAIL because policies are not consumed.

- [ ] **Step 4: Filter ranking members before calculation**

Use `rankingMembersForTournament(tournament, groupMembers)` in both admin and public views. Keep the full `matches` array so partners and opponents retain results. Apply the same member filter to overall ranking inputs.

- [ ] **Step 5: Exclude event tournaments from annual records**

Make `loadClubRecordData` return policy metadata and filter out tournaments where `includeInClubRecords` is false before deriving match IDs and yearly totals. Hide the public records link when the displayed tournament has `includeInClubRecords === false`.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- components/TournamentManageClient.test.tsx components/PublicTournamentView.test.tsx lib/server/repositories/tournament-repository.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/TournamentManageClient.tsx components/PublicTournamentView.tsx components/TournamentManageClient.test.tsx components/PublicTournamentView.test.tsx lib/server/repositories/tournament-repository.ts app/[clubSlug]/records/page.tsx app/public/[clubSlug]/records/page.tsx
git commit -m "feat: apply event ranking and record policies"
```

### Task 7: Locked Admin Experience and Explicit Rounds

**Files:**
- Modify: `components/TournamentManageClient.tsx`
- Modify: `components/TournamentManageClient.test.tsx`
- Modify: `components/PublicTournamentView.tsx`
- Modify: `components/PublicTournamentView.test.tsx`
- Create: `lib/domain/match-rounds.ts`
- Create: `lib/domain/match-rounds.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `groupMatchesByExplicitRound(matches)` for matches with `roundNumber`.
- Preserves: existing flat KDK/random rendering and team-battle rendering when round metadata is absent.

- [ ] **Step 1: Write failing round grouping tests**

```ts
expect(groupMatchesByExplicitRound([
  { ...match, id: "r1c1", roundNumber: 1, sortOrder: 1 },
  { ...match, id: "r1c2", roundNumber: 1, sortOrder: 2 },
  { ...match, id: "r2c1", roundNumber: 2, sortOrder: 3 }
]).map((round) => [round.roundNumber, round.matches.length])).toEqual([[1, 2], [2, 1]]);
```

Also assert a locked manage view starts on the draw tab, omits setup controls, player change, add/delete controls, and still renders score inputs and save controls.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- lib/domain/match-rounds.test.ts components/TournamentManageClient.test.tsx components/PublicTournamentView.test.tsx`

Expected: FAIL because explicit rounds and locked UI do not exist.

- [ ] **Step 3: Implement locked UI with one policy boolean**

Derive `const scheduleLocked = isScheduleLocked(tournament)` once. Initialize `activeTab` to `draw` for locked tournaments. Render only `draw` and `ranking` tabs for locked tournaments. Keep score inputs enabled unless the tournament is date-completed or a score save is pending. Omit every structural control listed in the spec rather than scattering `/pt` or tournament-name checks.

- [ ] **Step 4: Render explicit rounds without affecting legacy formats**

If matches contain `roundNumber`, group and label them `1라운드` through `8라운드` in admin and public views. Otherwise retain the existing team-battle and flat schedule branches unchanged. Hide the internal random-format badge for locked schedules.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- lib/domain/match-rounds.test.ts components/TournamentManageClient.test.tsx components/PublicTournamentView.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/TournamentManageClient.tsx components/TournamentManageClient.test.tsx components/PublicTournamentView.tsx components/PublicTournamentView.test.tsx lib/domain/match-rounds.ts lib/domain/match-rounds.test.ts app/globals.css
git commit -m "feat: render locked event tournament rounds"
```

### Task 8: Create Play Tennis Visual Assets

**Files:**
- Create: `public/pt_intro_summer_coast.webp`
- Create: `public/kakao-share-pt.jpg`

**Interfaces:**
- Consumes: existing `public/otc_intro_summer_coast.webp` and `public/kakao-share-otc.jpg`.
- Produces: same composition with the visible OTC name replaced by `Play Tennis`.

- [ ] **Step 1: Inspect both OTC source assets at native size**

Verify the exact text location, image dimensions, safe areas, and font treatment before editing.

- [ ] **Step 2: Edit the intro asset**

Use the image editing tool with the OTC intro as the reference. Preserve the background and layout, remove only the OTC lettering, and render `Play Tennis` legibly in the same visual hierarchy.

- [ ] **Step 3: Edit the Kakao share asset**

Use the OTC Kakao image as the reference and apply the same name-only change. Preserve its aspect ratio and sharing-safe central composition.

- [ ] **Step 4: Visually verify both assets**

Check desktop source dimensions and mobile crops. Confirm there is no residual OTC text, malformed lettering, clipping, or unintended background alteration.

- [ ] **Step 5: Commit**

```bash
git add public/pt_intro_summer_coast.webp public/kakao-share-pt.jpg
git commit -m "feat: add Play Tennis visual assets"
```

### Task 9: Full Regression and Browser Verification

**Files:**
- Modify only files required by discovered regressions.

**Interfaces:**
- Verifies the complete admin-to-public flow and existing-club compatibility.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Prisma generation and Next.js production build complete successfully.

- [ ] **Step 3: Apply migrations to the local disposable DB**

Run: `npm run db:deploy`

Expected: both new migrations apply once; rerunning reports no pending migrations.

- [ ] **Step 4: Start and verify the app**

Run: `npm run dev`

Verify `/pt`, `/pt/login`, `/pt/members`, `/pt/tournaments`, the event manage URL, and `/public/pt/2822` on mobile and desktop. Enter and save one test score, confirm the public ranking excludes 유태주 and 감독진 but updates the other two players, then reset the score.

- [ ] **Step 5: Regression-check existing clubs**

Open representative STC, OTC, Queensday, team-battle, random KDK, and standard KDK admin/public pages. Confirm setup controls remain available, ranking and records links remain visible, and no console errors occur.

- [ ] **Step 6: Review final diff and commit repairs**

Run: `git diff --check`

Run: `git status --short`

If verification required repairs, commit only those files:

```bash
git add app components lib prisma public
git commit -m "fix: resolve Play Tennis regression checks"
```

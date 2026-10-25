# Team Battle Round Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 청백전 팀 스코어를 라운드 승점으로 바꾸고 개인 기여도를 개인 승률로 표시한다.

**Architecture:** 경기의 `roundNumber` 및 기존 라운드 그룹화 함수를 사용해 공용 도메인 결과를 계산한다. 관리자와 공유 화면은 이 결과를 그대로 표시하고, 개인 승률은 기존 랭킹 계산의 개인 완료 경기 수와 승수를 사용한다.

**Tech Stack:** TypeScript, React 19, Next.js 15, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-10-25-team-battle-round-score-design.md`

## Global Constraints

- DB 스키마와 저장된 경기 결과는 변경하지 않는다.
- 라운드가 모두 완료되기 전에는 해당 라운드에 점수를 부여하지 않는다.
- 관리자와 공개 화면이 같은 계산 함수를 사용한다.

## Review Focus

- 일부 경기만 입력된 라운드는 완료 및 팀 점수에 포함하지 않는다.
- 라운드 내 경기 승수가 같으면 무승부 라운드로 집계한다.
- 라운드 번호가 명시된 고정 이벤트 대진도 올바르게 묶는다.
- 개인 무승부 및 패배 경기도 승률 분모에 포함한다.
- 출전 완료 경기가 없는 선수는 0%로 표시한다.

---

### Task 1: 라운드 단위 팀 결과 계산

**Files:**
- Modify: `lib/domain/team-battle.ts`
- Test: `lib/domain/team-battle.test.ts`

**Interfaces:**
- Produces: `calculateTeamBattleResult(matches: Match[]): TeamBattleResult`

- [x] **Step 1: Write the failing tests**
  - 네 경기 중 청팀이 3승하면 청팀 라운드 점수 1점인지 검증한다.
  - 2승 2패는 무승부 라운드인지 검증한다.
  - 일부 경기만 완료된 라운드는 결과에서 제외되는지 검증한다.
- [x] **Step 2: Run `npm test -- lib/domain/team-battle.test.ts` and verify expected failures**
- [x] **Step 3: Implement round aggregation in `calculateTeamBattleResult`**
- [x] **Step 4: Re-run the domain test and verify it passes**

### Task 2: 개인 기여도를 개인 승률로 변경

**Files:**
- Modify: `components/TeamBattleDetails.tsx`
- Test: `components/TeamBattleDetails.test.tsx`

**Interfaces:**
- Consumes: `calculateRankings(members, matches)`의 `wins`, `draws`, `losses`
- Produces: 개인 완료 경기 기준 승률 UI

- [x] **Step 1: Write failing tests for 4승 100%, 2승 2패 50%, 무출전 0%**
- [x] **Step 2: Run `npm test -- components/TeamBattleDetails.test.tsx` and verify expected failures**
- [x] **Step 3: Update contribution calculation, labels, and explanatory copy**
- [x] **Step 4: Re-run the component test and verify it passes**

### Task 3: 관리자 및 공유 화면 문구 검증

**Files:**
- Modify: `components/PublicTournamentView.tsx`
- Modify: `components/TournamentManageClient.tsx`
- Test: `components/PublicTournamentView.test.tsx`
- Test: `components/TournamentManageClient.test.tsx`

**Interfaces:**
- Consumes: `TeamBattleResult`의 라운드 단위 `blueWins`, `whiteWins`, `draws`, `completedMatches`
- Produces: 완료/무승부 라운드 문구

- [x] **Step 1: Write failing UI assertions for `완료 N라운드` and `무승부 N라운드`**
- [x] **Step 2: Run focused UI tests and verify expected failures**
- [x] **Step 3: Change both screens from 경기 단위 to 라운드 단위 copy**
- [x] **Step 4: Run focused UI tests and verify they pass**
- [x] **Step 5: Run `npm test` and `npm run build`**
- [x] **Step 6: Commit and push `tennis-mobile-prototype`**

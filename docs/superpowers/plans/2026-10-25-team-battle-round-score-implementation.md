# Team Battle Match Total Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 청백전 팀 스코어를 완료 경기 승수 총합으로 표시하고 개인 기여도를 개인 승률로 표시한다.

**Architecture:** 공용 도메인 결과 함수가 완료된 개별 경기의 승패를 누적한다. 관리자와 공유 화면은 이 결과를 그대로 표시하고, 개인 승률은 기존 랭킹 계산의 개인 완료 경기 수와 승수를 사용한다.

**Tech Stack:** TypeScript, React 19, Next.js 15, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-10-25-team-battle-round-score-design.md`

## Global Constraints

- DB 스키마와 저장된 경기 결과는 변경하지 않는다.
- 완료된 경기만 팀 스코어에 반영한다.
- 관리자와 공개 화면이 같은 계산 함수를 사용한다.

## Review Focus

- 일부 경기만 입력된 라운드라도 완료된 경기는 팀 점수에 포함한다.
- 동점 경기는 무승부 경기로 집계한다.
- 라운드 번호가 명시된 고정 이벤트 대진도 올바르게 묶는다.
- 개인 무승부 및 패배 경기도 승률 분모에 포함한다.
- 출전 완료 경기가 없는 선수는 0%로 표시한다.

---

### Task 1: 경기 승수 총합 결과 계산

**Files:**
- Modify: `lib/domain/team-battle.ts`
- Test: `lib/domain/team-battle.test.ts`

**Interfaces:**
- Produces: `calculateTeamBattleResult(matches: Match[]): TeamBattleResult`

- [x] **Step 1: Write the failing tests**
  - 완료 경기마다 승리팀 점수가 1점씩 누적되는지 검증한다.
  - 동점 경기는 무승부 경기인지 검증한다.
  - 미완료 경기는 결과에서 제외되는지 검증한다.
- [x] **Step 2: Run `npm test -- lib/domain/team-battle.test.ts` and verify expected failures**
- [x] **Step 3: Implement completed-match aggregation in `calculateTeamBattleResult`**
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
- Produces: 완료/무승부 경기 문구

- [x] **Step 1: Write failing UI assertions for `완료 N경기` and `무승부 N경기`**
- [x] **Step 2: Run focused UI tests and verify expected failures**
- [x] **Step 3: Keep both screens on 경기 단위 copy**
- [x] **Step 4: Run focused UI tests and verify they pass**
- [x] **Step 5: Run `npm test` and `npm run build`**
- [x] **Step 6: Commit and push `tennis-mobile-prototype`**

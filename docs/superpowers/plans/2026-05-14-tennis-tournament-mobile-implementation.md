# 테니스 월례대회 모바일 사이트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회장님이 휴대폰 브라우저에서 확인할 수 있는 테니스 월례대회 모바일 웹 프로토타입을 만든다.

**Architecture:** Next.js 앱 안에 관리자 화면과 회원 공개 화면을 함께 둔다. 순위 계산과 대진표 생성은 UI와 분리한 순수 TypeScript 함수로 만들고 테스트로 먼저 고정한다. 1차 프로토타입은 브라우저 저장소 기반 샘플 운영 흐름으로 만들고, 데이터 접근 경계를 분리해 이후 SQLite/Prisma로 옮길 수 있게 한다.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Vitest, React Testing Library, browser localStorage.

---

## 파일 구조

- `package.json`: 프로젝트 스크립트와 의존성.
- `next.config.ts`: Next.js 설정.
- `tsconfig.json`: TypeScript 설정.
- `vitest.config.ts`: 테스트 설정.
- `postcss.config.mjs`: Tailwind 처리 설정.
- `tailwind.config.ts`: Tailwind 콘텐츠 경로와 테마 설정.
- `app/layout.tsx`: 전체 HTML 레이아웃.
- `app/page.tsx`: 첫 화면. 관리자/회원 화면으로 이동.
- `app/admin/page.tsx`: 관리자 비밀번호 입력과 관리자 대시보드.
- `app/public/[slug]/page.tsx`: 회원용 공개 대회 화면.
- `app/globals.css`: 모바일 우선 전역 스타일.
- `components/Button.tsx`: 큰 터치 버튼.
- `components/Section.tsx`: 화면 구역 래퍼.
- `components/Tabs.tsx`: 대진표/순위표 탭.
- `components/MatchCard.tsx`: 경기 카드.
- `components/RankingTable.tsx`: 순위표.
- `lib/domain/types.ts`: 회원, 대회, 그룹, 경기 타입.
- `lib/domain/ranking.ts`: 순위 계산.
- `lib/domain/schedule.ts`: 한울AA/KDK-V2010 초기 대진표 생성.
- `lib/domain/sample-data.ts`: 회장님 검토용 샘플 데이터.
- `lib/store/tournament-store.ts`: 브라우저 저장소 기반 데이터 읽기/쓰기.
- `lib/domain/ranking.test.ts`: 순위 계산 테스트.
- `lib/domain/schedule.test.ts`: 대진표 생성 테스트.

---

### Task 1: Next.js 프로젝트 뼈대 생성

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: 프로젝트 설정 파일을 만든다**

`package.json`:

```json
{
  "name": "tennis-monthly-tournament",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -H 0.0.0.0",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "jsdom": "^26.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true
  }
});
```

`postcss.config.mjs`:

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

export default config;
```

`tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: "#1f7a5a",
        ink: "#18211f",
        line: "#d8dedb",
        notice: "#f4b740"
      }
    }
  },
  plugins: []
};

export default config;
```

- [ ] **Step 2: 기본 앱 파일을 만든다**

`app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "테니스 월례대회",
  description: "테니스 클럽 월례대회 대진표와 순위표"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="text-3xl font-bold text-ink">테니스 월례대회</h1>
      <p className="text-lg text-slate-700">대진표와 순위표를 휴대폰에서 바로 확인합니다.</p>
      <Link className="rounded-lg bg-court px-5 py-4 text-center text-xl font-bold text-white" href="/admin">
        관리자 입장
      </Link>
      <Link className="rounded-lg border border-line px-5 py-4 text-center text-xl font-bold text-ink" href="/public/monthly-demo">
        회원 화면 보기
      </Link>
    </main>
  );
}
```

`app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color: #18211f;
  background: #f7f8f6;
}

body {
  margin: 0;
  font-family: Arial, "Malgun Gothic", sans-serif;
}

button,
input,
select {
  font: inherit;
}
```

- [ ] **Step 3: 의존성을 설치한다**

Run: `npm install`

Expected: `node_modules`와 `package-lock.json`이 생성된다.

- [ ] **Step 4: 기본 빌드를 확인한다**

Run: `npm run build`

Expected: Next.js 빌드가 성공한다.

- [ ] **Step 5: 커밋한다**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json vitest.config.ts postcss.config.mjs tailwind.config.ts app
git commit -m "chore: scaffold mobile tournament app"
```

---

### Task 2: 도메인 타입과 순위 계산 구현

**Files:**
- Create: `lib/domain/types.ts`
- Create: `lib/domain/ranking.ts`
- Create: `lib/domain/ranking.test.ts`

- [ ] **Step 1: 실패하는 순위 계산 테스트를 작성한다**

`lib/domain/ranking.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateRankings } from "./ranking";
import type { Match, Member } from "./types";

const members: Member[] = [
  { id: "m1", name: "김철수", level: "A", notes: "" },
  { id: "m2", name: "박영희", level: "B", notes: "" },
  { id: "m3", name: "이민수", level: "B", notes: "" },
  { id: "m4", name: "최은정", level: "C", notes: "" }
];

describe("calculateRankings", () => {
  it("승수, 득실차, 득점, 실점 순서로 순위를 계산한다", () => {
    const matches: Match[] = [
      {
        id: "match-1",
        tournamentId: "t1",
        groupId: "g1",
        matchNumber: 1,
        sideAPlayerIds: ["m1", "m2"],
        sideBPlayerIds: ["m3", "m4"],
        sideAScore: 6,
        sideBScore: 3,
        status: "completed",
        sortOrder: 1
      },
      {
        id: "match-2",
        tournamentId: "t1",
        groupId: "g1",
        matchNumber: 2,
        sideAPlayerIds: ["m1", "m3"],
        sideBPlayerIds: ["m2", "m4"],
        sideAScore: 4,
        sideBScore: 6,
        status: "completed",
        sortOrder: 2
      }
    ];

    expect(calculateRankings(members, matches)).toEqual([
      { memberId: "m2", name: "박영희", rank: 1, wins: 2, losses: 0, pointsFor: 12, pointsAgainst: 7, pointDiff: 5 },
      { memberId: "m1", name: "김철수", rank: 2, wins: 1, losses: 1, pointsFor: 10, pointsAgainst: 9, pointDiff: 1 },
      { memberId: "m4", name: "최은정", rank: 3, wins: 1, losses: 1, pointsFor: 9, pointsAgainst: 10, pointDiff: -1 },
      { memberId: "m3", name: "이민수", rank: 4, wins: 0, losses: 2, pointsFor: 7, pointsAgainst: 12, pointDiff: -5 }
    ]);
  });

  it("미완료 경기는 순위 계산에서 제외한다", () => {
    const matches: Match[] = [
      {
        id: "match-1",
        tournamentId: "t1",
        groupId: "g1",
        matchNumber: 1,
        sideAPlayerIds: ["m1"],
        sideBPlayerIds: ["m2"],
        sideAScore: null,
        sideBScore: null,
        status: "scheduled",
        sortOrder: 1
      }
    ];

    expect(calculateRankings(members.slice(0, 2), matches)).toEqual([
      { memberId: "m1", name: "김철수", rank: 1, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0 },
      { memberId: "m2", name: "박영희", rank: 1, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0 }
    ]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- lib/domain/ranking.test.ts`

Expected: `Cannot find module './ranking'` 또는 `calculateRankings` 미정의로 실패한다.

- [ ] **Step 3: 타입과 순위 계산 코드를 작성한다**

`lib/domain/types.ts`:

```ts
export type Member = {
  id: string;
  name: string;
  level: string;
  notes: string;
};

export type Tournament = {
  id: string;
  name: string;
  date: string;
  publicSlug: string;
  status: "draft" | "active" | "completed";
};

export type TournamentGroup = {
  id: string;
  tournamentId: string;
  name: string;
  scheduleFormat: "hanul-aa" | "kdk-v2010";
  sortOrder: number;
};

export type MatchStatus = "scheduled" | "completed";

export type Match = {
  id: string;
  tournamentId: string;
  groupId: string;
  matchNumber: number;
  sideAPlayerIds: string[];
  sideBPlayerIds: string[];
  sideAScore: number | null;
  sideBScore: number | null;
  status: MatchStatus;
  sortOrder: number;
};

export type RankingRow = {
  memberId: string;
  name: string;
  rank: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};
```

`lib/domain/ranking.ts`:

```ts
import type { Match, Member, RankingRow } from "./types";

type MutableRanking = Omit<RankingRow, "rank">;

export function calculateRankings(members: Member[], matches: Match[]): RankingRow[] {
  const rows = new Map<string, MutableRanking>();

  for (const member of members) {
    rows.set(member.id, {
      memberId: member.id,
      name: member.name,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0
    });
  }

  for (const match of matches) {
    if (match.status !== "completed" || match.sideAScore === null || match.sideBScore === null) {
      continue;
    }

    const sideAWon = match.sideAScore > match.sideBScore;
    applyResult(rows, match.sideAPlayerIds, match.sideAScore, match.sideBScore, sideAWon);
    applyResult(rows, match.sideBPlayerIds, match.sideBScore, match.sideAScore, !sideAWon);
  }

  const sorted = [...rows.values()]
    .map((row) => ({ ...row, pointDiff: row.pointsFor - row.pointsAgainst }))
    .sort(compareRankingRows);

  let previous: MutableRanking | undefined;
  let previousRank = 0;

  return sorted.map((row, index) => {
    const rank = previous && sameRankingValue(row, previous) ? previousRank : index + 1;
    previous = row;
    previousRank = rank;
    return { ...row, rank };
  });
}

function applyResult(rows: Map<string, MutableRanking>, playerIds: string[], pointsFor: number, pointsAgainst: number, won: boolean) {
  for (const playerId of playerIds) {
    const row = rows.get(playerId);
    if (!row) continue;
    row.pointsFor += pointsFor;
    row.pointsAgainst += pointsAgainst;
    if (won) row.wins += 1;
    else row.losses += 1;
  }
}

function compareRankingRows(a: MutableRanking, b: MutableRanking) {
  return (
    b.wins - a.wins ||
    b.pointDiff - a.pointDiff ||
    b.pointsFor - a.pointsFor ||
    a.pointsAgainst - b.pointsAgainst ||
    a.name.localeCompare(b.name, "ko")
  );
}

function sameRankingValue(a: MutableRanking, b: MutableRanking) {
  return (
    a.wins === b.wins &&
    a.pointDiff === b.pointDiff &&
    a.pointsFor === b.pointsFor &&
    a.pointsAgainst === b.pointsAgainst
  );
}
```

- [ ] **Step 4: 순위 테스트를 통과시킨다**

Run: `npm test -- lib/domain/ranking.test.ts`

Expected: `2 passed`.

- [ ] **Step 5: 커밋한다**

```bash
git add lib/domain/types.ts lib/domain/ranking.ts lib/domain/ranking.test.ts
git commit -m "feat: add ranking calculation"
```

---

### Task 3: 초기 대진표 생성기 구현

**Files:**
- Create: `lib/domain/schedule.ts`
- Create: `lib/domain/schedule.test.ts`

- [ ] **Step 1: 실패하는 대진표 생성 테스트를 작성한다**

`lib/domain/schedule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateInitialMatches } from "./schedule";
import type { Member } from "./types";

const participants: Member[] = Array.from({ length: 6 }, (_, index) => ({
  id: `m${index + 1}`,
  name: `회원${index + 1}`,
  level: "B",
  notes: ""
}));

describe("generateInitialMatches", () => {
  it("한울AA 방식으로 수정 가능한 경기 목록을 만든다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "hanul-aa",
      participants
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toMatchObject({
      tournamentId: "t1",
      groupId: "g1",
      matchNumber: 1,
      sideAScore: null,
      sideBScore: null,
      status: "scheduled",
      sortOrder: 1
    });
    expect(matches[0].sideAPlayerIds.length).toBe(2);
    expect(matches[0].sideBPlayerIds.length).toBe(2);
  });

  it("KDK-V2010 방식으로 수정 가능한 경기 목록을 만든다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "kdk-v2010",
      participants
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.status === "scheduled")).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- lib/domain/schedule.test.ts`

Expected: `Cannot find module './schedule'` 또는 `generateInitialMatches` 미정의로 실패한다.

- [ ] **Step 3: 초기 대진표 생성 코드를 작성한다**

`lib/domain/schedule.ts`:

```ts
import type { Match, Member, TournamentGroup } from "./types";

type GenerateInitialMatchesInput = {
  tournamentId: string;
  groupId: string;
  format: TournamentGroup["scheduleFormat"];
  participants: Member[];
};

const PAIRING_PATTERNS: Record<TournamentGroup["scheduleFormat"], number[][]> = {
  "hanul-aa": [
    [1, 2, 3, 4],
    [1, 3, 2, 5],
    [1, 4, 5, 6],
    [2, 3, 4, 6],
    [1, 5, 2, 6],
    [3, 4, 1, 6]
  ],
  "kdk-v2010": [
    [1, 4, 2, 3],
    [1, 2, 3, 5],
    [1, 5, 2, 4],
    [1, 3, 4, 5],
    [2, 5, 3, 4],
    [1, 4, 3, 6]
  ]
};

export function generateInitialMatches(input: GenerateInitialMatchesInput): Match[] {
  const pattern = PAIRING_PATTERNS[input.format];
  const participantIds = input.participants.map((participant) => participant.id);

  return pattern
    .map((slots, index) => {
      const ids = slots.map((slot) => participantIds[(slot - 1) % participantIds.length]);
      return {
        id: `${input.groupId}-match-${index + 1}`,
        tournamentId: input.tournamentId,
        groupId: input.groupId,
        matchNumber: index + 1,
        sideAPlayerIds: [ids[0], ids[1]],
        sideBPlayerIds: [ids[2], ids[3]],
        sideAScore: null,
        sideBScore: null,
        status: "scheduled" as const,
        sortOrder: index + 1
      };
    })
    .filter((match) => new Set([...match.sideAPlayerIds, ...match.sideBPlayerIds]).size === 4);
}
```

- [ ] **Step 4: 대진표 테스트를 통과시킨다**

Run: `npm test -- lib/domain/schedule.test.ts`

Expected: `2 passed`.

- [ ] **Step 5: 참고 이미지 기반 보강 메모를 남긴다**

`lib/domain/schedule.ts`의 `PAIRING_PATTERNS` 위에 다음 주석을 추가한다.

```ts
// 1차 프로토타입은 참고 이미지의 운영 방식을 경기 목록으로 옮기는 구조다.
// 정확한 전체 인원수별 패턴은 회장님 검토 후 실제 운영 규칙에 맞춰 확장한다.
```

- [ ] **Step 6: 커밋한다**

```bash
git add lib/domain/schedule.ts lib/domain/schedule.test.ts
git commit -m "feat: add initial schedule generator"
```

---

### Task 4: 샘플 데이터와 브라우저 저장소 만들기

**Files:**
- Create: `lib/domain/sample-data.ts`
- Create: `lib/store/tournament-store.ts`

- [ ] **Step 1: 샘플 대회 데이터를 만든다**

`lib/domain/sample-data.ts`:

```ts
import type { Match, Member, Tournament, TournamentGroup } from "./types";
import { generateInitialMatches } from "./schedule";

export const sampleMembers: Member[] = [
  { id: "m1", name: "김철수", level: "A", notes: "" },
  { id: "m2", name: "박영희", level: "A", notes: "" },
  { id: "m3", name: "이민수", level: "B", notes: "" },
  { id: "m4", name: "최은정", level: "B", notes: "" },
  { id: "m5", name: "정우진", level: "C", notes: "" },
  { id: "m6", name: "한미라", level: "C", notes: "" },
  { id: "m7", name: "오세훈", level: "B", notes: "" },
  { id: "m8", name: "강지연", level: "C", notes: "" }
];

export const sampleTournament: Tournament = {
  id: "t1",
  name: "5월 월례대회",
  date: "2026-05-24",
  publicSlug: "monthly-demo",
  status: "active"
};

export const sampleGroups: TournamentGroup[] = [
  { id: "g1", tournamentId: "t1", name: "A조", scheduleFormat: "hanul-aa", sortOrder: 1 },
  { id: "g2", tournamentId: "t1", name: "B조", scheduleFormat: "kdk-v2010", sortOrder: 2 }
];

export const sampleGroupMemberIds: Record<string, string[]> = {
  g1: ["m1", "m2", "m3", "m4"],
  g2: ["m5", "m6", "m7", "m8"]
};

export function createSampleMatches(): Match[] {
  return sampleGroups.flatMap((group) =>
    generateInitialMatches({
      tournamentId: sampleTournament.id,
      groupId: group.id,
      format: group.scheduleFormat,
      participants: sampleMembers.filter((member) => sampleGroupMemberIds[group.id].includes(member.id))
    })
  );
}
```

- [ ] **Step 2: 저장소 경계 코드를 만든다**

`lib/store/tournament-store.ts`:

```ts
"use client";

import { createSampleMatches, sampleGroupMemberIds, sampleGroups, sampleMembers, sampleTournament } from "@/lib/domain/sample-data";
import type { Match, Member, Tournament, TournamentGroup } from "@/lib/domain/types";

export type TournamentState = {
  adminUnlocked: boolean;
  members: Member[];
  tournament: Tournament;
  groups: TournamentGroup[];
  groupMemberIds: Record<string, string[]>;
  matches: Match[];
};

const STORAGE_KEY = "tennis-monthly-tournament-state";
const ADMIN_PASSWORD = "1234";

export function createInitialState(): TournamentState {
  return {
    adminUnlocked: false,
    members: sampleMembers,
    tournament: sampleTournament,
    groups: sampleGroups,
    groupMemberIds: sampleGroupMemberIds,
    matches: createSampleMatches()
  };
}

export function checkAdminPassword(password: string) {
  return password === ADMIN_PASSWORD;
}

export function loadTournamentState(): TournamentState {
  if (typeof window === "undefined") return createInitialState();
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return createInitialState();
  return JSON.parse(saved) as TournamentState;
}

export function saveTournamentState(state: TournamentState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
```

- [ ] **Step 3: 전체 테스트를 실행한다**

Run: `npm test`

Expected: 모든 테스트가 통과한다.

- [ ] **Step 4: 커밋한다**

```bash
git add lib/domain/sample-data.ts lib/store/tournament-store.ts
git commit -m "feat: add prototype tournament state"
```

---

### Task 5: 공통 모바일 UI 컴포넌트 구현

**Files:**
- Create: `components/Button.tsx`
- Create: `components/Section.tsx`
- Create: `components/Tabs.tsx`
- Create: `components/MatchCard.tsx`
- Create: `components/RankingTable.tsx`

- [ ] **Step 1: 버튼 컴포넌트를 만든다**

`components/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  const variantClass = {
    primary: "bg-court text-white",
    secondary: "border border-line bg-white text-ink",
    danger: "bg-red-600 text-white"
  }[variant];

  return (
    <button
      className={`min-h-12 rounded-lg px-4 py-3 text-lg font-bold active:scale-[0.99] disabled:opacity-50 ${variantClass} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2: 섹션 컴포넌트를 만든다**

`components/Section.tsx`:

```tsx
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line py-5">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 3: 탭 컴포넌트를 만든다**

`components/Tabs.tsx`:

```tsx
type Tab = {
  id: string;
  label: string;
};

export function Tabs({ tabs, activeId, onChange }: { tabs: Tab[]; activeId: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`rounded-lg px-3 py-3 text-base font-bold ${activeId === tab.id ? "bg-court text-white" : "border border-line bg-white text-ink"}`}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 경기 카드와 순위표 컴포넌트를 만든다**

`components/MatchCard.tsx`:

```tsx
import type { Match, Member } from "@/lib/domain/types";

export function MatchCard({ match, members }: { match: Match; members: Member[] }) {
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name ?? "미정";

  return (
    <article className="rounded-lg border border-line bg-white p-4">
      <div className="mb-3 text-base font-bold text-slate-600">경기 {match.matchNumber}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-lg font-bold">
        <div>{match.sideAPlayerIds.map(nameOf).join(" / ")}</div>
        <div className="text-center text-xl">
          {match.sideAScore ?? "-"} : {match.sideBScore ?? "-"}
        </div>
        <div className="text-right">{match.sideBPlayerIds.map(nameOf).join(" / ")}</div>
      </div>
    </article>
  );
}
```

`components/RankingTable.tsx`:

```tsx
import type { RankingRow } from "@/lib/domain/types";

export function RankingTable({ rows }: { rows: RankingRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      {rows.map((row) => (
        <div key={row.memberId} className="grid grid-cols-[3rem_1fr_4rem] items-center gap-2 border-b border-line p-3 last:border-b-0">
          <div className="text-xl font-bold text-court">{row.rank}</div>
          <div>
            <div className="text-lg font-bold">{row.name}</div>
            <div className="text-sm text-slate-600">
              득점 {row.pointsFor} · 실점 {row.pointsAgainst}
            </div>
          </div>
          <div className="text-right text-base font-bold">
            {row.wins}승 {row.losses}패
            <div className="text-sm text-slate-600">{row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: 빌드를 확인한다**

Run: `npm run build`

Expected: 빌드가 성공한다.

- [ ] **Step 6: 커밋한다**

```bash
git add components
git commit -m "feat: add mobile UI components"
```

---

### Task 6: 관리자 화면 구현

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: 관리자 페이지를 클라이언트 컴포넌트로 만든다**

`app/admin/page.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { MatchCard } from "@/components/MatchCard";
import { Section } from "@/components/Section";
import { calculateRankings } from "@/lib/domain/ranking";
import type { Match } from "@/lib/domain/types";
import { checkAdminPassword, createInitialState, saveTournamentState, type TournamentState } from "@/lib/store/tournament-store";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<TournamentState>(() => createInitialState());
  const [error, setError] = useState("");

  const rankings = useMemo(() => {
    return state.groups.map((group) => {
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      const members = state.members.filter((member) => groupMemberIds.includes(member.id));
      const matches = state.matches.filter((match) => match.groupId === group.id);
      return { group, rows: calculateRankings(members, matches) };
    });
  }, [state]);

  function unlock() {
    if (!checkAdminPassword(password)) {
      setError("비밀번호가 맞지 않습니다.");
      return;
    }
    setState((current) => ({ ...current, adminUnlocked: true }));
    setError("");
  }

  function updateMatch(matchId: string, patch: Partial<Match>) {
    setState((current) => {
      const next = {
        ...current,
        matches: current.matches.map((match) => (match.id === matchId ? { ...match, ...patch } : match))
      };
      saveTournamentState(next);
      return next;
    });
  }

  function addMatch(groupId: string) {
    setState((current) => {
      const groupMatches = current.matches.filter((match) => match.groupId === groupId);
      const nextNumber = groupMatches.length + 1;
      const memberIds = current.groupMemberIds[groupId] ?? [];
      const next = {
        ...current,
        matches: [
          ...current.matches,
          {
            id: `${groupId}-manual-${Date.now()}`,
            tournamentId: current.tournament.id,
            groupId,
            matchNumber: nextNumber,
            sideAPlayerIds: memberIds.slice(0, 2),
            sideBPlayerIds: memberIds.slice(2, 4),
            sideAScore: null,
            sideBScore: null,
            status: "scheduled" as const,
            sortOrder: nextNumber
          }
        ]
      };
      saveTournamentState(next);
      return next;
    });
  }

  if (!state.adminUnlocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5">
        <h1 className="text-3xl font-bold">관리자 입장</h1>
        <input
          className="min-h-14 rounded-lg border border-line px-4 text-xl"
          inputMode="numeric"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          type="password"
          value={password}
        />
        {error && <p className="text-lg font-bold text-red-600">{error}</p>}
        <Button onClick={unlock}>확인</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-5">
      <h1 className="text-3xl font-bold">{state.tournament.name}</h1>
      <p className="mt-1 text-lg text-slate-700">{state.tournament.date}</p>

      <Section title="대진표 관리">
        {state.groups.map((group) => (
          <div className="space-y-3" key={group.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{group.name}</h3>
              <Button onClick={() => addMatch(group.id)} variant="secondary">
                경기 추가
              </Button>
            </div>
            {state.matches
              .filter((match) => match.groupId === group.id)
              .map((match) => (
                <div className="space-y-2" key={match.id}>
                  <MatchCard match={match} members={state.members} />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg border border-line px-3 py-3 text-xl"
                      inputMode="numeric"
                      onChange={(event) =>
                        updateMatch(match.id, { sideAScore: Number(event.target.value), status: "completed" })
                      }
                      placeholder="A점수"
                      value={match.sideAScore ?? ""}
                    />
                    <input
                      className="rounded-lg border border-line px-3 py-3 text-xl"
                      inputMode="numeric"
                      onChange={(event) =>
                        updateMatch(match.id, { sideBScore: Number(event.target.value), status: "completed" })
                      }
                      placeholder="B점수"
                      value={match.sideBScore ?? ""}
                    />
                  </div>
                </div>
              ))}
          </div>
        ))}
      </Section>

      <Section title="그룹별 순위">
        {rankings.map(({ group, rows }) => (
          <div className="space-y-2" key={group.id}>
            <h3 className="text-xl font-bold">{group.name}</h3>
            <pre className="rounded-lg bg-white p-3 text-base">{rows.map((row) => `${row.rank}. ${row.name} ${row.wins}승`).join("\n")}</pre>
          </div>
        ))}
      </Section>
    </main>
  );
}
```

- [ ] **Step 2: 빌드를 확인한다**

Run: `npm run build`

Expected: 빌드가 성공한다.

- [ ] **Step 3: 커밋한다**

```bash
git add app/admin/page.tsx
git commit -m "feat: add admin prototype flow"
```

---

### Task 7: 회원 공개 화면 구현

**Files:**
- Create: `app/public/[slug]/page.tsx`

- [ ] **Step 1: 회원용 공개 페이지를 만든다**

`app/public/[slug]/page.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { RankingTable } from "@/components/RankingTable";
import { Tabs } from "@/components/Tabs";
import { calculateRankings } from "@/lib/domain/ranking";
import { loadTournamentState } from "@/lib/store/tournament-store";

const tabs = [
  { id: "schedule", label: "대진표" },
  { id: "group", label: "그룹 순위" },
  { id: "overall", label: "전체 순위" }
];

export default function PublicTournamentPage() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [state] = useState(() => loadTournamentState());

  const groupRankings = useMemo(() => {
    return state.groups.map((group) => {
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      const members = state.members.filter((member) => groupMemberIds.includes(member.id));
      const matches = state.matches.filter((match) => match.groupId === group.id);
      return { group, rows: calculateRankings(members, matches) };
    });
  }, [state]);

  const overallRanking = useMemo(() => calculateRankings(state.members, state.matches), [state]);

  return (
    <main className="mx-auto max-w-md px-4 py-5">
      <h1 className="text-3xl font-bold">{state.tournament.name}</h1>
      <p className="mb-4 mt-1 text-lg text-slate-700">{state.tournament.date}</p>
      <Tabs activeId={activeTab} onChange={setActiveTab} tabs={tabs} />

      {activeTab === "schedule" && (
        <div className="mt-5 space-y-6">
          {state.groups.map((group) => (
            <section className="space-y-3" key={group.id}>
              <h2 className="text-2xl font-bold">{group.name}</h2>
              {state.matches
                .filter((match) => match.groupId === group.id)
                .map((match) => (
                  <MatchCard key={match.id} match={match} members={state.members} />
                ))}
            </section>
          ))}
        </div>
      )}

      {activeTab === "group" && (
        <div className="mt-5 space-y-6">
          {groupRankings.map(({ group, rows }) => (
            <section className="space-y-3" key={group.id}>
              <h2 className="text-2xl font-bold">{group.name}</h2>
              <RankingTable rows={rows} />
            </section>
          ))}
        </div>
      )}

      {activeTab === "overall" && (
        <section className="mt-5 space-y-3">
          <h2 className="text-2xl font-bold">전체 순위</h2>
          <RankingTable rows={overallRanking} />
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: 빌드를 확인한다**

Run: `npm run build`

Expected: 빌드가 성공한다.

- [ ] **Step 3: 커밋한다**

```bash
git add app/public
git commit -m "feat: add public tournament view"
```

---

### Task 8: 관리자 편집 기능 완성

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `lib/store/tournament-store.ts`

- [ ] **Step 1: 관리자 화면에 회원 추가 기능을 넣는다**

`app/admin/page.tsx`의 컴포넌트 내부에 상태와 함수를 추가한다.

```tsx
const [newMemberName, setNewMemberName] = useState("");
const [newMemberLevel, setNewMemberLevel] = useState("B");

function addMember() {
  const trimmedName = newMemberName.trim();
  if (!trimmedName) return;

  setState((current) => {
    const next = {
      ...current,
      members: [
        ...current.members,
        {
          id: `member-${Date.now()}`,
          name: trimmedName,
          level: newMemberLevel,
          notes: ""
        }
      ]
    };
    saveTournamentState(next);
    return next;
  });

  setNewMemberName("");
  setNewMemberLevel("B");
}
```

`return` 영역의 대진표 관리 섹션 위에 회원 관리 섹션을 추가한다.

```tsx
<Section title="회원 관리">
  <div className="grid grid-cols-[1fr_5rem] gap-2">
    <input
      className="rounded-lg border border-line px-3 py-3 text-lg"
      onChange={(event) => setNewMemberName(event.target.value)}
      placeholder="회원 이름"
      value={newMemberName}
    />
    <input
      className="rounded-lg border border-line px-3 py-3 text-lg"
      onChange={(event) => setNewMemberLevel(event.target.value)}
      placeholder="레벨"
      value={newMemberLevel}
    />
  </div>
  <Button onClick={addMember}>회원 추가</Button>
  <div className="space-y-2">
    {state.members.map((member) => (
      <div className="rounded-lg border border-line bg-white p-3 text-lg" key={member.id}>
        <strong>{member.name}</strong>
        <span className="ml-2 text-slate-600">{member.level}</span>
      </div>
    ))}
  </div>
</Section>
```

- [ ] **Step 2: 대회 생성, 대회명, 날짜 수정 기능을 넣는다**

`app/admin/page.tsx`의 컴포넌트 내부에 새 대회 생성 함수를 추가한다.

```tsx
function createTournament() {
  const today = new Date().toISOString().slice(0, 10);
  setState((current) => {
    const tournamentId = `tournament-${Date.now()}`;
    const next = {
      ...current,
      tournament: {
        id: tournamentId,
        name: "새 월례대회",
        date: today,
        publicSlug: "monthly-demo",
        status: "draft" as const
      },
      groups: [],
      groupMemberIds: {},
      matches: []
    };
    saveTournamentState(next);
    return next;
  });
}
```

`app/admin/page.tsx`의 제목 영역 아래에 다음 입력 영역을 추가한다.

```tsx
<Section title="대회 설정">
  <Button onClick={createTournament} variant="secondary">
    새 대회 만들기
  </Button>
  <input
    className="w-full rounded-lg border border-line px-3 py-3 text-lg"
    onChange={(event) =>
      setState((current) => {
        const next = { ...current, tournament: { ...current.tournament, name: event.target.value } };
        saveTournamentState(next);
        return next;
      })
    }
    value={state.tournament.name}
  />
  <input
    className="w-full rounded-lg border border-line px-3 py-3 text-lg"
    onChange={(event) =>
      setState((current) => {
        const next = { ...current, tournament: { ...current.tournament, date: event.target.value } };
        saveTournamentState(next);
        return next;
      })
    }
    type="date"
    value={state.tournament.date}
  />
</Section>
```

- [ ] **Step 3: 그룹 생성과 참가자 배정 기능을 넣는다**

`app/admin/page.tsx`의 컴포넌트 내부에 함수를 추가한다.

```tsx
function addGroup() {
  setState((current) => {
    const nextGroupNumber = current.groups.length + 1;
    const groupId = `group-${Date.now()}`;
    const next = {
      ...current,
      groups: [
        ...current.groups,
        {
          id: groupId,
          tournamentId: current.tournament.id,
          name: `${String.fromCharCode(64 + nextGroupNumber)}조`,
          scheduleFormat: "hanul-aa" as const,
          sortOrder: nextGroupNumber
        }
      ],
      groupMemberIds: {
        ...current.groupMemberIds,
        [groupId]: []
      }
    };
    saveTournamentState(next);
    return next;
  });
}

function toggleGroupMember(groupId: string, memberId: string) {
  setState((current) => {
    const currentIds = current.groupMemberIds[groupId] ?? [];
    const nextIds = currentIds.includes(memberId)
      ? currentIds.filter((id) => id !== memberId)
      : [...currentIds, memberId];
    const next = {
      ...current,
      groupMemberIds: {
        ...current.groupMemberIds,
        [groupId]: nextIds
      }
    };
    saveTournamentState(next);
    return next;
  });
}

function updateGroupFormat(groupId: string, scheduleFormat: "hanul-aa" | "kdk-v2010") {
  setState((current) => {
    const next = {
      ...current,
      groups: current.groups.map((group) => (group.id === groupId ? { ...group, scheduleFormat } : group))
    };
    saveTournamentState(next);
    return next;
  });
}
```

회원 관리 섹션 아래에 그룹 편성 섹션을 추가한다.

```tsx
<Section title="그룹 편성">
  <Button onClick={addGroup} variant="secondary">
    그룹 추가
  </Button>
  {state.groups.map((group) => (
    <div className="space-y-2 rounded-lg border border-line bg-white p-3" key={group.id}>
      <h3 className="text-xl font-bold">{group.name}</h3>
      <select
        className="w-full rounded-lg border border-line px-3 py-3 text-lg"
        onChange={(event) => updateGroupFormat(group.id, event.target.value as "hanul-aa" | "kdk-v2010")}
        value={group.scheduleFormat}
      >
        <option value="hanul-aa">한울AA</option>
        <option value="kdk-v2010">KDK-V2010</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        {state.members.map((member) => {
          const selected = (state.groupMemberIds[group.id] ?? []).includes(member.id);
          return (
            <button
              className={`rounded-lg border px-3 py-2 text-left text-base font-bold ${
                selected ? "border-court bg-court text-white" : "border-line bg-white text-ink"
              }`}
              key={member.id}
              onClick={() => toggleGroupMember(group.id, member.id)}
              type="button"
            >
              {member.name}
            </button>
          );
        })}
      </div>
    </div>
  ))}
</Section>
```

- [ ] **Step 4: 그룹별 대진표 생성 버튼을 넣는다**

`app/admin/page.tsx`의 import에 대진표 생성 함수를 추가한다.

```tsx
import { generateInitialMatches } from "@/lib/domain/schedule";
```

컴포넌트 내부에 함수를 추가한다.

```tsx
function generateScheduleForGroup(groupId: string) {
  setState((current) => {
    const group = current.groups.find((item) => item.id === groupId);
    if (!group) return current;
    const groupMemberIds = current.groupMemberIds[groupId] ?? [];
    const participants = current.members.filter((member) => groupMemberIds.includes(member.id));
    const generated = generateInitialMatches({
      tournamentId: current.tournament.id,
      groupId,
      format: group.scheduleFormat,
      participants
    });
    const next = {
      ...current,
      matches: [...current.matches.filter((match) => match.groupId !== groupId), ...generated]
    };
    saveTournamentState(next);
    return next;
  });
}
```

각 그룹 카드의 대진표 방식 선택 아래에 버튼을 추가한다.

```tsx
<Button onClick={() => generateScheduleForGroup(group.id)}>
  대진표 생성
</Button>
```

- [ ] **Step 5: 경기 삭제와 선수 교체 기능을 넣는다**

`app/admin/page.tsx`의 컴포넌트 내부에 함수를 추가한다.

```tsx
function deleteMatch(matchId: string) {
  setState((current) => {
    const next = {
      ...current,
      matches: current.matches.filter((match) => match.id !== matchId)
    };
    saveTournamentState(next);
    return next;
  });
}

function replacePlayer(matchId: string, side: "A" | "B", index: number, memberId: string) {
  setState((current) => {
    const next = {
      ...current,
      matches: current.matches.map((match) => {
        if (match.id !== matchId) return match;
        const key = side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
        const nextIds = [...match[key]];
        nextIds[index] = memberId;
        return { ...match, [key]: nextIds };
      })
    };
    saveTournamentState(next);
    return next;
  });
}
```

각 경기 카드 아래에 삭제 버튼과 선수 선택 영역을 추가한다.

```tsx
<div className="grid grid-cols-2 gap-2">
  {[0, 1].map((index) => (
    <select
      className="rounded-lg border border-line px-3 py-3 text-base"
      key={`a-${index}`}
      onChange={(event) => replacePlayer(match.id, "A", index, event.target.value)}
      value={match.sideAPlayerIds[index] ?? ""}
    >
      {state.members.map((member) => (
        <option key={member.id} value={member.id}>
          A팀 {index + 1}: {member.name}
        </option>
      ))}
    </select>
  ))}
  {[0, 1].map((index) => (
    <select
      className="rounded-lg border border-line px-3 py-3 text-base"
      key={`b-${index}`}
      onChange={(event) => replacePlayer(match.id, "B", index, event.target.value)}
      value={match.sideBPlayerIds[index] ?? ""}
    >
      {state.members.map((member) => (
        <option key={member.id} value={member.id}>
          B팀 {index + 1}: {member.name}
        </option>
      ))}
    </select>
  ))}
</div>
<Button onClick={() => deleteMatch(match.id)} variant="danger">
  경기 삭제
</Button>
```

- [ ] **Step 6: 경기 순서 변경 기능을 넣는다**

`app/admin/page.tsx`의 컴포넌트 내부에 함수를 추가한다.

```tsx
function moveMatch(matchId: string, direction: -1 | 1) {
  setState((current) => {
    const target = current.matches.find((match) => match.id === matchId);
    if (!target) return current;
    const groupMatches = current.matches
      .filter((match) => match.groupId === target.groupId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = groupMatches.findIndex((match) => match.id === matchId);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= groupMatches.length) return current;
    const reordered = [...groupMatches];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, removed);
    const orderMap = new Map(reordered.map((match, orderIndex) => [match.id, orderIndex + 1]));
    const next = {
      ...current,
      matches: current.matches.map((match) =>
        orderMap.has(match.id)
          ? { ...match, sortOrder: orderMap.get(match.id)!, matchNumber: orderMap.get(match.id)! }
          : match
      )
    };
    saveTournamentState(next);
    return next;
  });
}
```

각 경기 카드 조작 영역에 순서 버튼을 추가한다.

```tsx
<div className="grid grid-cols-2 gap-2">
  <Button onClick={() => moveMatch(match.id, -1)} variant="secondary">
    위로
  </Button>
  <Button onClick={() => moveMatch(match.id, 1)} variant="secondary">
    아래로
  </Button>
</div>
```

- [ ] **Step 7: 빌드와 테스트를 확인한다**

Run: `npm test`

Expected: 모든 테스트가 통과한다.

Run: `npm run build`

Expected: 빌드가 성공한다.

- [ ] **Step 8: 커밋한다**

```bash
git add app/admin/page.tsx lib/store/tournament-store.ts
git commit -m "feat: complete admin editing controls"
```

---

### Task 9: 모바일 사용성 정리와 검증

**Files:**
- Modify: `app/globals.css`
- Modify: `app/admin/page.tsx`
- Modify: `app/public/[slug]/page.tsx`

- [ ] **Step 1: 전역 스타일에 모바일 터치 기준을 추가한다**

`app/globals.css`에 추가:

```css
a,
button,
input,
select {
  touch-action: manipulation;
}

main {
  width: 100%;
}

@media (max-width: 380px) {
  body {
    font-size: 15px;
  }
}
```

- [ ] **Step 2: 개발 서버를 실행한다**

Run: `npm run dev`

Expected: `http://localhost:3000`에서 앱이 열린다.

- [ ] **Step 3: 브라우저에서 확인한다**

확인 경로:

- `http://localhost:3000`
- `http://localhost:3000/admin`
- `http://localhost:3000/public/monthly-demo`

Expected:

- 첫 화면에서 관리자/회원 화면으로 이동할 수 있다.
- 관리자 비밀번호 `1234`로 들어갈 수 있다.
- 회원 화면에서 대진표, 그룹 순위, 전체 순위 탭이 보인다.
- 모바일 폭에서 글자가 겹치지 않는다.

- [ ] **Step 4: 테스트와 빌드를 실행한다**

Run: `npm test`

Expected: 모든 테스트가 통과한다.

Run: `npm run build`

Expected: 빌드가 성공한다.

- [ ] **Step 5: 커밋한다**

```bash
git add app/globals.css app/admin/page.tsx app/public/[slug]/page.tsx
git commit -m "polish: improve mobile review experience"
```

---

## 자체 검토

### 설계 반영 확인

- 관리자 간단 비밀번호 접속: Task 6.
- 회원 공개 링크: Task 7.
- 회원 관리: Task 8.
- 대회 생성과 대회 설정 수정: Task 8.
- 수동 그룹 편성: Task 8.
- 한울AA/KDK-V2010 초기 대진표 생성: Task 3.
- 경기 추가와 점수 입력: Task 6.
- 경기 삭제, 순서 변경, 선수 교체: Task 8.
- 순위 자동 계산: Task 2, Task 6, Task 7.
- 그룹별 순위와 전체 순위: Task 7.
- 모바일 단순 UI: Task 5, Task 9.

### 1차 구현 범위 판단

이 계획은 회장님 검토용 프로토타입에 필요한 핵심 운영 흐름을 포함한다. 데이터 저장은 브라우저 저장소로 시작하지만, 저장소 경계를 `lib/store/tournament-store.ts`에 모아 이후 SQLite/Prisma로 교체할 수 있게 한다.

# Tennis Tournament Vercel DB Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** localStorage 기반 모바일 테니스 대회 프로토타입을 Vercel 배포와 Postgres DB 저장을 사용하는 실제 서비스로 전환한다.

**Architecture:** Next.js App Router는 유지하고, 브라우저 저장소 역할을 하던 `TournamentState`를 Prisma repository 계층으로 옮긴다. 관리자 화면은 서버에서 DB 데이터를 읽고 server action 또는 API route로 변경사항을 저장하며, 공개 공유 화면은 DB에서 읽기 전용으로 렌더링한다. 클럽별 경로(`stc`, `otc`)는 `Club` 테이블과 `clubSlug` 외래키로 분리한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma ORM, Vercel Marketplace Postgres 또는 Prisma Postgres, Vitest, React Testing Library, Vercel Environment Variables.

---

## Current State

- `lib/store/tournament-store.ts`가 `window.localStorage`에 전체 상태를 저장한다.
- `components/HomeDashboard.tsx`, `components/MemberForm.tsx`, `app/admin/members/page.tsx`, `app/admin/tournaments/page.tsx`, `app/admin/tournaments/manage/page.tsx`, `components/PublicTournamentView.tsx`가 `useTournamentState` 또는 `loadTournamentState`에 의존한다.
- 도메인 타입은 `Member`, `Tournament`, `TournamentGroup`, `Match` 중심으로 이미 분리되어 있다.
- 대진 방식은 `"hanul-aa" | "kdk-v2010" | "random"`을 지원한다.
- 클럽 경로는 `lib/domain/club.ts`의 `"stc" | "otc"`를 기준으로 분리된다.

## Production Decisions

- DB는 Vercel 배포와 연결하기 쉬운 Postgres를 사용한다.
- ORM은 Prisma를 사용한다. Prisma 공식 문서는 Vercel 배포 시 `prisma generate`를 빌드 과정에 포함하는 방식을 안내한다.
- Vercel 환경변수는 `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`을 사용한다.
- 인증은 1차 운영 버전에서는 단일 관리자 비밀번호와 httpOnly 서명 쿠키로 구현한다. 회원별 로그인은 이번 단계 범위에서 제외한다.
- localStorage 데이터 자동 마이그레이션은 운영 전환 후 혼란을 줄이기 위해 기본 범위에서 제외한다. 필요한 경우 별도 1회성 import 화면을 만든다.

References:
- Vercel Environment Variables: https://vercel.com/docs/environment-variables
- Prisma Deploy to Vercel: https://docs.prisma.io/docs/v6/orm/prisma-client/deployment/serverless/deploy-to-vercel
- Prisma Postgres via Vercel Marketplace: https://docs.prisma.io/docs/guides/postgres/vercel

---

## File Map

- Modify: `package.json`
  - Prisma, zod, DB scripts, Vercel build script를 추가한다.
- Create: `.env.example`
  - 운영과 로컬 개발에 필요한 환경변수 이름을 문서화한다.
- Create: `prisma/schema.prisma`
  - `Club`, `Member`, `Tournament`, `TournamentParticipant`, `TournamentGroup`, `TournamentGroupMember`, `Match` 모델을 정의한다.
- Create: `prisma/seed.ts`
  - 기존 샘플 데이터를 DB에 넣는 개발용 seed를 만든다.
- Create: `lib/server/db.ts`
  - Prisma Client singleton을 만든다.
- Create: `lib/server/repositories/tournament-repository.ts`
  - DB row와 현재 도메인 타입 사이의 변환, 조회, 저장을 담당한다.
- Create: `lib/server/repositories/tournament-repository.test.ts`
  - enum 변환, date 변환, state assembly를 테스트한다.
- Create: `lib/server/auth/admin-session.ts`
  - 관리자 로그인, 쿠키 서명, 인증 확인을 담당한다.
- Create: `lib/server/auth/admin-session.test.ts`
  - 세션 서명과 만료 검증을 테스트한다.
- Create: `lib/server/actions/*.ts`
  - 회원, 대회, 그룹, 참가자, 경기 점수 저장 server action을 책임별 파일로 분리한다.
- Create: `lib/server/validation.ts`
  - zod 입력 검증 스키마를 둔다.
- Modify: `components/HomeDashboard.tsx`
  - props로 받은 DB 상태를 렌더링하도록 바꾼다.
- Modify: `components/MemberForm.tsx`
  - localStorage 저장 대신 server action form으로 저장한다.
- Modify: `components/PublicTournamentView.tsx`
  - props 기반 읽기 전용 공개 뷰로 바꾼다.
- Modify: `app/admin/**/*.tsx`, `app/[clubSlug]/**/*.tsx`, `app/public/[clubSlug]/[slug]/page.tsx`
  - 서버에서 DB 데이터를 조회하고 client component에 전달한다.
- Modify: `lib/store/tournament-store.ts`, `lib/store/use-tournament-state.ts`
  - 프로덕션 경로에서 제거하거나 테스트 전용 compatibility module로 축소한다.
- Create: `vercel.json`
  - 필요 시 서울 리전과 함수 설정을 기록한다.
- Create: `docs/deployment-smoke-test.md`
  - Preview와 Production 확인 절차를 문서화한다.

---

### Task 1: Dependencies And Environment Contract

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Install production DB dependencies**

Run:

```bash
npm install @prisma/client zod
npm install -D prisma tsx
```

Expected: `package.json` and `package-lock.json` include Prisma, zod, and tsx.

- [ ] **Step 2: Add DB scripts**

Update `package.json` scripts:

```json
{
  "dev": "next dev -H 0.0.0.0",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:deploy": "prisma migrate deploy",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio"
}
```

- [ ] **Step 3: Create environment example**

`.env.example`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
ADMIN_PASSWORD="change-this-before-deploy"
SESSION_SECRET="replace-with-at-least-32-random-characters"
```

- [ ] **Step 4: Document environment setup**

Add to `README.md`:

```md
## Production environment

Required variables:

- `DATABASE_URL`: Postgres connection string from Vercel Marketplace storage.
- `ADMIN_PASSWORD`: Single operator password for the admin pages.
- `SESSION_SECRET`: At least 32 random characters used to sign the admin cookie.

Local setup:

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test
npm run build
```

Expected: tests and the current Next.js build pass. Prisma generation is verified after the schema exists in Task 2.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example README.md
git commit -m "chore: add production database environment"
```

---

### Task 2: Prisma Schema For Clubs, Members, Tournaments, And Matches

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/*/migration.sql`

- [ ] **Step 1: Create Prisma schema**

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Gender {
  male
  female
}

enum TournamentStatus {
  draft
  active
  completed
}

enum ScheduleFormat {
  hanul_aa
  kdk_v2010
  random
}

enum MatchStatus {
  scheduled
  completed
}

model Club {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  shortName String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members     Member[]
  tournaments Tournament[]
}

model Member {
  id        String   @id @default(cuid())
  clubId    String
  name      String
  gender    Gender?
  level     String?
  notes     String   @default("")
  phone     String?
  active    Boolean  @default(true)
  deleted   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  club                   Club                    @relation(fields: [clubId], references: [id], onDelete: Cascade)
  tournamentParticipants TournamentParticipant[]
  groupMembers           TournamentGroupMember[]

  @@index([clubId, deleted, name])
}

model Tournament {
  id         String           @id @default(cuid())
  clubId     String
  name       String
  date       DateTime
  publicSlug String
  status     TournamentStatus @default(draft)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  club         Club                    @relation(fields: [clubId], references: [id], onDelete: Cascade)
  participants TournamentParticipant[]
  groups       TournamentGroup[]
  matches      Match[]

  @@unique([clubId, publicSlug])
  @@index([clubId, date])
}

model TournamentParticipant {
  id           String   @id @default(cuid())
  tournamentId String
  memberId     String
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())

  tournament Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  member     Member     @relation(fields: [memberId], references: [id], onDelete: Restrict)

  @@unique([tournamentId, memberId])
  @@index([memberId])
}

model TournamentGroup {
  id             String         @id @default(cuid())
  tournamentId   String
  name           String
  scheduleFormat ScheduleFormat
  sortOrder      Int
  seedPlayerIds  String[]       @default([])
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  tournament Tournament              @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  members    TournamentGroupMember[]
  matches    Match[]

  @@index([tournamentId, sortOrder])
}

model TournamentGroupMember {
  id        String   @id @default(cuid())
  groupId   String
  memberId  String
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  group  TournamentGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  member Member          @relation(fields: [memberId], references: [id], onDelete: Restrict)

  @@unique([groupId, memberId])
  @@index([memberId])
}

model Match {
  id             String      @id @default(cuid())
  tournamentId   String
  groupId        String
  matchNumber    Int
  sideAPlayerIds String[]
  sideBPlayerIds String[]
  sideAScore     Int?
  sideBScore     Int?
  status         MatchStatus @default(scheduled)
  sortOrder      Int
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  tournament Tournament      @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  group      TournamentGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@index([tournamentId])
  @@index([groupId, sortOrder])
}
```

- [ ] **Step 2: Generate migration**

Run:

```bash
npm run db:migrate -- --name init
```

Expected: `prisma/migrations/*_init/migration.sql` is created and local DB schema is applied.

- [ ] **Step 3: Verify schema generation**

Run:

```bash
npm run db:generate
```

Expected: Prisma Client is generated without enum or relation errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations package.json package-lock.json
git commit -m "feat: add production database schema"
```

---

### Task 3: Seed Data And Domain Mapping

**Files:**
- Create: `prisma/seed.ts`
- Create: `lib/server/db.ts`
- Create: `lib/server/repositories/tournament-repository.ts`
- Create: `lib/server/repositories/tournament-repository.test.ts`

- [ ] **Step 1: Create Prisma client singleton**

`lib/server/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: Write mapping tests**

`lib/server/repositories/tournament-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fromDbScheduleFormat, toDbScheduleFormat, toDomainDate } from "./tournament-repository";

describe("tournament repository mapping", () => {
  it("maps schedule formats between domain and Prisma enum values", () => {
    expect(toDbScheduleFormat("hanul-aa")).toBe("hanul_aa");
    expect(toDbScheduleFormat("kdk-v2010")).toBe("kdk_v2010");
    expect(toDbScheduleFormat("random")).toBe("random");
    expect(fromDbScheduleFormat("hanul_aa")).toBe("hanul-aa");
    expect(fromDbScheduleFormat("kdk_v2010")).toBe("kdk-v2010");
    expect(fromDbScheduleFormat("random")).toBe("random");
  });

  it("serializes DB dates as yyyy-mm-dd domain dates", () => {
    expect(toDomainDate(new Date("2026-05-24T00:00:00.000Z"))).toBe("2026-05-24");
  });
});
```

- [ ] **Step 3: Implement repository mapping helpers**

Add to `lib/server/repositories/tournament-repository.ts`:

```ts
import "server-only";
import type { ScheduleFormat } from "@prisma/client";
import type { z } from "zod";
import type { TournamentGroup } from "@/lib/domain/types";

export function toDbScheduleFormat(value: TournamentGroup["scheduleFormat"]): ScheduleFormat {
  if (value === "hanul-aa") return "hanul_aa";
  if (value === "kdk-v2010") return "kdk_v2010";
  return "random";
}

export function fromDbScheduleFormat(value: ScheduleFormat): TournamentGroup["scheduleFormat"] {
  if (value === "hanul_aa") return "hanul-aa";
  if (value === "kdk_v2010") return "kdk-v2010";
  return "random";
}

export function toDomainDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function toDbDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
```

- [ ] **Step 4: Create seed script**

`prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import { clubs } from "../lib/domain/club";
import { createSampleMatches, sampleGroupMemberIds, sampleGroups, sampleMembers, sampleTournaments } from "../lib/domain/sample-data";
import { toDbDate, toDbScheduleFormat } from "../lib/server/repositories/tournament-repository";

const prisma = new PrismaClient();

async function main() {
  await prisma.match.deleteMany();
  await prisma.tournamentGroupMember.deleteMany();
  await prisma.tournamentParticipant.deleteMany();
  await prisma.tournamentGroup.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.member.deleteMany();
  await prisma.club.deleteMany();

  const club = await prisma.club.create({
    data: {
      slug: clubs[0].slug,
      name: clubs[0].name,
      shortName: clubs[0].shortName
    }
  });

  for (const member of sampleMembers) {
    await prisma.member.create({
      data: {
        id: member.id,
        clubId: club.id,
        name: member.name,
        gender: member.gender,
        level: member.level,
        notes: member.notes,
        phone: member.phone,
        active: member.active ?? true,
        deleted: member.deleted ?? false
      }
    });
  }

  for (const tournament of sampleTournaments) {
    await prisma.tournament.create({
      data: {
        id: tournament.id,
        clubId: club.id,
        name: tournament.name,
        date: toDbDate(tournament.date),
        publicSlug: tournament.publicSlug,
        status: tournament.status
      }
    });
  }

  for (const group of sampleGroups) {
    await prisma.tournamentGroup.create({
      data: {
        id: group.id,
        tournamentId: group.tournamentId,
        name: group.name,
        scheduleFormat: toDbScheduleFormat(group.scheduleFormat),
        sortOrder: group.sortOrder,
        seedPlayerIds: group.seedPlayerIds ?? []
      }
    });

    const memberIds = sampleGroupMemberIds[group.id] ?? [];
    for (const [index, memberId] of memberIds.entries()) {
      await prisma.tournamentParticipant.upsert({
        where: { tournamentId_memberId: { tournamentId: group.tournamentId, memberId } },
        create: { tournamentId: group.tournamentId, memberId, sortOrder: index + 1 },
        update: {}
      });
      await prisma.tournamentGroupMember.create({
        data: { groupId: group.id, memberId, sortOrder: index + 1 }
      });
    }
  }

  for (const match of createSampleMatches()) {
    await prisma.match.create({
      data: {
        id: match.id,
        tournamentId: match.tournamentId,
        groupId: match.groupId,
        matchNumber: match.matchNumber,
        sideAPlayerIds: match.sideAPlayerIds,
        sideBPlayerIds: match.sideBPlayerIds,
        sideAScore: match.sideAScore,
        sideBScore: match.sideBScore,
        status: match.status,
        sortOrder: match.sortOrder
      }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- lib/server/repositories/tournament-repository.test.ts
npm run db:seed
```

Expected: mapping tests pass and sample data appears in the local DB.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts lib/server/db.ts lib/server/repositories/tournament-repository.ts lib/server/repositories/tournament-repository.test.ts
git commit -m "feat: seed database and add repository mappings"
```

---

### Task 4: Repository Queries Replace localStorage Reads

**Files:**
- Modify: `lib/server/repositories/tournament-repository.ts`
- Modify: `components/HomeDashboard.tsx`
- Modify: `components/PublicTournamentView.tsx`

- [ ] **Step 1: Add repository query functions**

Add functions to `lib/server/repositories/tournament-repository.ts`:

```ts
import { prisma } from "@/lib/server/db";
import { withDateStatus } from "@/lib/domain/tournament-status";
import type { Match, Member, Tournament, TournamentGroup } from "@/lib/domain/types";
import type { ClubSlug } from "@/lib/domain/club";
import type { TournamentState } from "@/lib/store/tournament-store";

export async function getClubOrThrow(clubSlug: ClubSlug) {
  const club = await prisma.club.findUnique({ where: { slug: clubSlug } });
  if (!club) throw new Error(`Unknown club slug: ${clubSlug}`);
  return club;
}

export async function listMembersByClub(clubSlug: ClubSlug): Promise<Member[]> {
  const club = await getClubOrThrow(clubSlug);
  const members = await prisma.member.findMany({
    where: { clubId: club.id },
    orderBy: [{ deleted: "asc" }, { name: "asc" }]
  });
  return members.map((member) => ({
    id: member.id,
    name: member.name,
    gender: member.gender ?? undefined,
    level: member.level ?? undefined,
    notes: member.notes,
    phone: member.phone ?? undefined,
    active: member.active,
    deleted: member.deleted
  }));
}

export async function listTournamentsByClub(clubSlug: ClubSlug): Promise<Tournament[]> {
  const club = await getClubOrThrow(clubSlug);
  const tournaments = await prisma.tournament.findMany({
    where: { clubId: club.id },
    orderBy: { date: "desc" }
  });
  return tournaments.map((tournament) =>
    withDateStatus({
      id: tournament.id,
      name: tournament.name,
      date: toDomainDate(tournament.date),
      publicSlug: tournament.publicSlug,
      status: tournament.status
    })
  );
}
```

- [ ] **Step 2: Add state assembly query**

Add:

```ts
export async function loadTournamentStateFromDb(clubSlug: ClubSlug, tournamentId?: string): Promise<TournamentState> {
  const tournaments = await listTournamentsByClub(clubSlug);
  const selectedTournament = tournamentId
    ? tournaments.find((item) => item.id === tournamentId)
    : tournaments[0];

  const members = await listMembersByClub(clubSlug);

  if (!selectedTournament) {
    return {
      version: 8,
      adminUnlocked: false,
      members,
      tournaments: [],
      currentTournamentId: "",
      tournament: { id: "", name: "대회 없음", date: toDomainDate(new Date()), publicSlug: "empty", status: "draft" },
      groups: [],
      tournamentParticipantIds: {},
      groupMemberIds: {},
      matches: [],
      deletedPublicSlugs: []
    };
  }

  const [groups, participantRows, matches] = await Promise.all([
    prisma.tournamentGroup.findMany({
      where: { tournamentId: selectedTournament.id },
      include: { members: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" }
    }),
    prisma.tournamentParticipant.findMany({
      where: { tournamentId: selectedTournament.id },
      orderBy: { sortOrder: "asc" }
    }),
    prisma.match.findMany({
      where: { tournamentId: selectedTournament.id },
      orderBy: [{ groupId: "asc" }, { sortOrder: "asc" }]
    })
  ]);

  return {
    version: 8,
    adminUnlocked: false,
    members,
    tournaments,
    currentTournamentId: selectedTournament.id,
    tournament: selectedTournament,
    groups: groups.map((group): TournamentGroup => ({
      id: group.id,
      tournamentId: group.tournamentId,
      name: group.name,
      scheduleFormat: fromDbScheduleFormat(group.scheduleFormat),
      sortOrder: group.sortOrder,
      seedPlayerIds: group.seedPlayerIds
    })),
    tournamentParticipantIds: {
      [selectedTournament.id]: participantRows.map((row) => row.memberId)
    },
    groupMemberIds: Object.fromEntries(groups.map((group) => [group.id, group.members.map((row) => row.memberId)])),
    matches: matches.map((match): Match => ({
      id: match.id,
      tournamentId: match.tournamentId,
      groupId: match.groupId,
      matchNumber: match.matchNumber,
      sideAPlayerIds: match.sideAPlayerIds,
      sideBPlayerIds: match.sideBPlayerIds,
      sideAScore: match.sideAScore,
      sideBScore: match.sideBScore,
      status: match.status,
      sortOrder: match.sortOrder
    })),
    deletedPublicSlugs: []
  };
}
```

- [ ] **Step 3: Convert display components to props**

Change `components/HomeDashboard.tsx` to receive `tournaments` instead of calling `useTournamentState`:

```ts
export function HomeDashboard({ clubSlug = "stc", tournaments }: { clubSlug?: ClubSlug; tournaments: Tournament[] }) {
  const recentTournaments = [...tournaments].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 4);
}
```

Change `components/PublicTournamentView.tsx` to receive `state`, `slug`, and `clubSlug` as props and remove `useParams`, `loadTournamentState`, and localStorage reads.

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npm run build
```

Expected: tests pass. Build may still fail where pages have not yet passed DB props; finish Task 5 and Task 6 before treating build as final.

- [ ] **Step 5: Commit**

```bash
git add lib/server/repositories/tournament-repository.ts components/HomeDashboard.tsx components/PublicTournamentView.tsx
git commit -m "feat: load tournament state from database"
```

---

### Task 5: Admin Authentication

**Files:**
- Create: `lib/server/auth/admin-session.ts`
- Create: `lib/server/auth/admin-session.test.ts`
- Create: `app/admin/login/page.tsx`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Write auth tests**

`lib/server/auth/admin-session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { signAdminSessionValue, verifyAdminSessionValue } from "./admin-session";

describe("admin session", () => {
  it("verifies a signed session", async () => {
    const value = await signAdminSessionValue("secret-123456789012345678901234567890");
    await expect(verifyAdminSessionValue(value, "secret-123456789012345678901234567890")).resolves.toBe(true);
  });

  it("rejects a session signed with a different secret", async () => {
    const value = await signAdminSessionValue("secret-123456789012345678901234567890");
    await expect(verifyAdminSessionValue(value, "different-123456789012345678901234")).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Implement signed session helpers**

`lib/server/auth/admin-session.ts`:

```ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "tennis-admin-session";

async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hash).toString("base64url");
}

export async function signAdminSessionValue(secret = process.env.SESSION_SECRET ?? "") {
  const issuedAt = Date.now();
  const signature = await digest(`${issuedAt}.${secret}`);
  return `${issuedAt}.${signature}`;
}

export async function verifyAdminSessionValue(value: string | undefined, secret = process.env.SESSION_SECRET ?? "") {
  if (!value || !secret) return false;
  const [issuedAt, signature] = value.split(".");
  if (!issuedAt || !signature) return false;
  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs > 1000 * 60 * 60 * 24 * 7) return false;
  return signature === (await digest(`${issuedAt}.${secret}`));
}

export async function requireAdmin() {
  const cookieStore = await cookies();
  const valid = await verifyAdminSessionValue(cookieStore.get(COOKIE_NAME)?.value);
  if (!valid) redirect("/admin/login");
}

export async function loginAdminAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.ADMIN_PASSWORD) redirect("/admin/login?error=1");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await signAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  redirect("/admin");
}
```

- [ ] **Step 3: Create login page**

`app/admin/login/page.tsx`:

```tsx
import { loginAdminAction } from "@/lib/server/auth/admin-session";

export default function AdminLoginPage() {
  return (
    <main className="app-shell">
      <section className="mobile-frame login-screen">
        <form action={loginAdminAction} className="section-card stack">
          <h1>관리자 로그인</h1>
          <label className="field boxed-field">
            <span>비밀번호</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="primary-button" type="submit">로그인</button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Guard admin home**

At the top of `app/admin/page.tsx`, call:

```ts
await requireAdmin();
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- lib/server/auth/admin-session.test.ts
npm run build
```

Expected: session tests pass and unauthenticated admin routes redirect during runtime.

- [ ] **Step 6: Commit**

```bash
git add lib/server/auth app/admin/login app/admin/page.tsx
git commit -m "feat: add admin authentication"
```

---

### Task 6: Server Actions For Writes

**Files:**
- Create: `lib/server/validation.ts`
- Create: `lib/server/actions/member-actions.ts`
- Create: `lib/server/actions/tournament-actions.ts`
- Create: `lib/server/actions/match-actions.ts`
- Modify: `lib/server/repositories/tournament-repository.ts`

- [ ] **Step 1: Create validation schemas**

`lib/server/validation.ts`:

```ts
import { z } from "zod";

export const clubSlugSchema = z.enum(["stc", "otc"]);

export const memberInputSchema = z.object({
  id: z.string().optional(),
  clubSlug: clubSlugSchema,
  name: z.string().trim().min(1),
  gender: z.enum(["male", "female"]).optional(),
  level: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  notes: z.string().trim().default(""),
  active: z.boolean().default(true)
});

export const tournamentInputSchema = z.object({
  id: z.string().optional(),
  clubSlug: clubSlugSchema,
  name: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  publicSlug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/)
});

export const scheduleFormatSchema = z.enum(["hanul-aa", "kdk-v2010", "random"]);

export const matchScoreInputSchema = z.object({
  matchId: z.string().min(1),
  sideAScore: z.number().int().min(0).max(99).nullable(),
  sideBScore: z.number().int().min(0).max(99).nullable()
});
```

- [ ] **Step 2: Add repository mutations**

Add to repository:

```ts
export async function upsertMember(input: z.infer<typeof memberInputSchema>) {
  const club = await getClubOrThrow(input.clubSlug);
  const data = {
    clubId: club.id,
    name: input.name,
    gender: input.gender,
    level: input.level,
    phone: input.phone,
    notes: input.notes,
    active: input.active
  };
  if (!input.id) return prisma.member.create({ data });
  return prisma.member.update({ where: { id: input.id }, data });
}

export async function softDeleteMember(memberId: string) {
  return prisma.member.update({ where: { id: memberId }, data: { deleted: true, active: false } });
}

export async function updateMatchScore(input: z.infer<typeof matchScoreInputSchema>) {
  return prisma.match.update({
    where: { id: input.matchId },
    data: {
      sideAScore: input.sideAScore,
      sideBScore: input.sideBScore,
      status: input.sideAScore === null || input.sideBScore === null ? "scheduled" : "completed"
    }
  });
}
```

- [ ] **Step 3: Create server actions**

`lib/server/actions/member-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { memberInputSchema } from "@/lib/server/validation";
import { softDeleteMember, upsertMember } from "@/lib/server/repositories/tournament-repository";

export async function saveMemberAction(formData: FormData) {
  await requireAdmin();
  const parsed = memberInputSchema.parse({
    id: String(formData.get("id") || "") || undefined,
    clubSlug: String(formData.get("clubSlug") || "stc"),
    name: String(formData.get("name") ?? ""),
    gender: String(formData.get("gender") || "") || undefined,
    level: String(formData.get("level") || "") || undefined,
    phone: String(formData.get("phone") || "") || undefined,
    notes: String(formData.get("notes") ?? ""),
    active: formData.get("active") === "on"
  });
  await upsertMember(parsed);
  revalidatePath(`/${parsed.clubSlug}/members`);
  redirect(`/${parsed.clubSlug}/members`);
}

export async function deleteMemberAction(formData: FormData) {
  await requireAdmin();
  const clubSlug = String(formData.get("clubSlug") || "stc");
  await softDeleteMember(String(formData.get("id")));
  revalidatePath(`/${clubSlug}/members`);
  redirect(`/${clubSlug}/members`);
}
```

`lib/server/actions/match-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { updateMatchScore } from "@/lib/server/repositories/tournament-repository";
import { matchScoreInputSchema } from "@/lib/server/validation";

export async function updateMatchScoreAction(input: unknown, clubSlug: "stc" | "otc") {
  await requireAdmin();
  const parsed = matchScoreInputSchema.parse(input);
  await updateMatchScore(parsed);
  revalidatePath(`/${clubSlug}/tournaments/manage`);
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npm run build
```

Expected: validation and repository tests pass. Build may still fail until pages stop using localStorage in Task 7.

- [ ] **Step 5: Commit**

```bash
git add lib/server/validation.ts lib/server/actions lib/server/repositories/tournament-repository.ts
git commit -m "feat: add database server actions"
```

---

### Task 7: Convert Admin Pages To DB Data

**Files:**
- Modify: `app/admin/members/page.tsx`
- Modify: `app/[clubSlug]/members/page.tsx`
- Modify: `components/MemberForm.tsx`
- Modify: `app/admin/tournaments/page.tsx`
- Modify: `app/[clubSlug]/tournaments/page.tsx`
- Modify: `app/admin/tournaments/manage/page.tsx`
- Modify: `app/[clubSlug]/tournaments/manage/page.tsx`
- Create: `components/TournamentManageClient.tsx`

- [ ] **Step 1: Server-load members page**

`app/[clubSlug]/members/page.tsx` should validate `clubSlug`, call `requireAdmin()`, load members with `listMembersByClub(clubSlug)`, and pass them to a client search/list component.

- [ ] **Step 2: Server-action member form**

`components/MemberForm.tsx` should remove `useTournamentState`, `saveTournamentState`, and `window.location.assign`. It should render a `<form action={saveMemberAction}>` with hidden `clubSlug` and optional `id`.

- [ ] **Step 3: Server-load tournament list**

`app/[clubSlug]/tournaments/page.tsx` should validate `clubSlug`, call `requireAdmin()`, and load tournaments with `listTournamentsByClub(clubSlug)`.

- [ ] **Step 4: Split manage page**

Move the current interactive body of `app/admin/tournaments/manage/page.tsx` into `components/TournamentManageClient.tsx`.

`app/[clubSlug]/tournaments/manage/page.tsx` becomes:

```tsx
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { TournamentManageClient } from "@/components/TournamentManageClient";
import { isKnownClubSlug } from "@/lib/domain/club";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { loadTournamentStateFromDb } from "@/lib/server/repositories/tournament-repository";

export default async function ClubTournamentManagePage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  await requireAdmin();
  const state = await loadTournamentStateFromDb(clubSlug);
  return <TournamentManageClient initialState={state} clubSlug={clubSlug} />;
}
```

- [ ] **Step 5: Replace persistence calls**

In `TournamentManageClient`, replace `saveTournamentState(next, clubSlug)` with server actions:

- tournament metadata: `saveTournamentAction`
- tournament participants: `saveTournamentParticipantsAction`
- groups: `saveTournamentGroupsAction`
- generated matches: `replaceTournamentMatchesAction`
- score changes: `updateMatchScoreAction`

Each action must call `revalidatePath` for admin and public routes.

- [ ] **Step 6: Verify**

Run:

```bash
rg "localStorage|saveTournamentState|useTournamentState" app components lib
npm run build
```

Expected: `rg` only finds test or compatibility files. Build passes after all admin pages receive DB state through props.

- [ ] **Step 7: Commit**

```bash
git add app components lib/server
git commit -m "feat: move admin workflows to database"
```

---

### Task 8: Convert Public Sharing Pages To DB Reads

**Files:**
- Modify: `app/public/[clubSlug]/[slug]/page.tsx`
- Modify: `components/PublicTournamentView.tsx`
- Modify: `lib/server/repositories/tournament-repository.ts`
- Modify: `lib/domain/public-access.ts`

- [ ] **Step 1: Add public repository query**

Add:

```ts
export async function loadPublicTournamentState(clubSlug: ClubSlug, publicSlug: string) {
  const club = await getClubOrThrow(clubSlug);
  const tournament = await prisma.tournament.findUnique({
    where: { clubId_publicSlug: { clubId: club.id, publicSlug } }
  });
  if (!tournament) return null;
  return loadTournamentStateFromDb(clubSlug, tournament.id);
}
```

- [ ] **Step 2: Server-render public page**

`app/public/[clubSlug]/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { PublicTournamentView } from "@/components/PublicTournamentView";
import { isKnownClubSlug } from "@/lib/domain/club";
import { loadPublicTournamentState } from "@/lib/server/repositories/tournament-repository";

export default async function ClubPublicTournamentPage({ params }: { params: Promise<{ clubSlug: string; slug: string }> }) {
  const { clubSlug, slug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  const state = await loadPublicTournamentState(clubSlug, slug);
  if (!state) notFound();
  return <PublicTournamentView state={state} slug={slug} clubSlug={clubSlug} />;
}
```

- [ ] **Step 3: Verify no private fields are exposed**

Ensure the public component does not render member phone numbers, notes, admin controls, or deleted tournament links.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- lib/domain/public-access.test.ts
npm run build
```

Expected: public access tests pass and `/public/[clubSlug]/[slug]` builds without client-side localStorage.

- [ ] **Step 5: Commit**

```bash
git add app/public components/PublicTournamentView.tsx lib/server/repositories/tournament-repository.ts lib/domain/public-access.ts
git commit -m "feat: load public tournament pages from database"
```

---

### Task 9: Vercel Deployment Configuration

**Files:**
- Modify: `package.json`
- Create: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Configure production build**

After migrations are committed and stable, update `package.json`:

```json
{
  "build": "prisma generate && prisma migrate deploy && next build"
}
```

If migration timing needs manual control, keep build as `prisma generate && next build` and run `npm run db:deploy` from CI before Vercel deployment.

- [ ] **Step 2: Add Vercel region config**

`vercel.json`:

```json
{
  "regions": ["icn1"]
}
```

- [ ] **Step 3: Document Vercel setup**

Add to `README.md`:

```md
## Vercel deployment checklist

1. Connect the Git repository to Vercel.
2. Set the project root to the Next.js app directory.
3. Create a Postgres database from Vercel Marketplace.
4. Add `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` to Preview and Production environments.
5. Deploy Preview.
6. Run the smoke test in `docs/deployment-smoke-test.md`.
7. Promote to Production after data persistence and public sharing are verified.
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npm run build
```

Expected: tests pass and production build succeeds with Prisma generation.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vercel.json README.md
git commit -m "chore: configure vercel deployment"
```

---

### Task 10: Deployment Smoke Test And Data Safety

**Files:**
- Create: `docs/deployment-smoke-test.md`
- Modify: `README.md`

- [ ] **Step 1: Create smoke test document**

`docs/deployment-smoke-test.md`:

```md
# Deployment Smoke Test

Run this checklist on every Vercel Preview deployment before promoting to Production.

## Admin auth

- Open `/admin/login`.
- Enter the configured admin password.
- Confirm redirect to `/admin`.
- Open a private browser window and confirm `/admin` redirects to `/admin/login`.

## Members

- Open `/stc/members`.
- Create a member named `배포검증`.
- Edit the member phone number.
- Confirm the member appears in the list after refresh.
- Deactivate or delete the test member.

## Tournament

- Open `/stc/tournaments`.
- Create a test tournament.
- Select 4 or more participants.
- Choose `랜덤 방식`.
- Generate matches.
- Enter one match score.
- Refresh and confirm the score remains.

## Public page

- Open the generated `/public/stc/<slug>` link.
- Confirm schedule and ranking render.
- Confirm no admin controls or phone numbers are visible.

## Cross-device check

- Open the same public link on a mobile phone.
- Confirm the DB-backed changes are visible without localStorage.
```

- [ ] **Step 2: Add data safety rules**

Add to `README.md`:

```md
## Data safety rules

- Do not run `prisma migrate reset` against Preview or Production.
- Do not commit `.env.local`.
- Run `npm run db:seed` only against disposable local databases.
- Verify Preview before promoting to Production.
- Export a DB backup before destructive schema migrations.
```

- [ ] **Step 3: Verify**

Run:

```bash
npm test
npm run build
```

Expected: all tests and build pass.

- [ ] **Step 4: Commit**

```bash
git add docs/deployment-smoke-test.md README.md
git commit -m "docs: add deployment smoke test"
```

---

## Final Verification

- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `rg "localStorage|saveTournamentState|useTournamentState" app components lib` only finds removed compatibility tests or no production paths.
- [ ] `/admin/login` accepts `ADMIN_PASSWORD`.
- [ ] `/admin` redirects to `/admin/login` without a valid cookie.
- [ ] `/stc/members` reads and writes members from Postgres.
- [ ] `/stc/tournaments` reads and writes tournaments from Postgres.
- [ ] `/stc/tournaments/manage` persists participants, groups, generated matches, player changes, and scores to Postgres.
- [ ] `/public/stc/<slug>` renders from Postgres in a fresh browser with no localStorage.
- [ ] A mobile browser can open the public link and see the same data.
- [ ] Vercel Preview has `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.
- [ ] Vercel Production has `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.

---

## Execution Notes

- Start with a fresh implementation branch or worktree before executing this plan.
- Keep commits task-sized. DB schema changes, repository conversion, auth, admin pages, public pages, and deployment config should be separate commits.
- Do not delete localStorage helpers until all production pages have been moved to DB-backed props and server actions.
- When `npm start` is used after a build, restart the server after every new `npm run build` to avoid stale `_next/static` asset hashes.

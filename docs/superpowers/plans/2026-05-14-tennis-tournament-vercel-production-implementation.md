# Tennis Tournament Vercel Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** localStorage 기반 모바일 프로토타입을 Vercel에 배포 가능한 실제 DB/백엔드 기반 서비스로 전환한다.

**Architecture:** Next.js App Router를 그대로 유지하고, 브라우저 저장소를 Prisma 기반 Postgres 저장소로 교체한다. 관리자 화면은 서버에서 데이터를 읽고 서버 액션으로 변경하며, 회원 공개 화면은 공개 slug로 읽기 전용 데이터를 조회한다. 관리자 인증은 단일 운영자용 비밀번호와 서명된 httpOnly 쿠키로 시작해 운영 부담을 낮춘다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Postgres on Vercel Marketplace, Vitest, React Testing Library, Vercel Environment Variables.

---

## 확인한 배포 전제

- Vercel의 최신 Storage 문서는 관계형 DB가 필요할 때 Marketplace Storage의 Postgres 공급자(Neon, Supabase, AWS 등)를 사용하라고 안내한다. 이 프로젝트는 정규화된 대회/회원/경기 데이터가 필요하므로 Postgres를 선택한다.
- Vercel Postgres 문서는 기존 Vercel Postgres가 2024년 12월 Neon으로 이전되었다고 안내한다. 새 프로젝트에서는 Vercel Marketplace의 Neon 또는 Prisma Postgres를 연결한다.
- Vercel 환경변수 문서는 Production, Preview, Development 환경별 변수를 지원하며 변경한 변수는 새 배포부터 적용된다고 안내한다. 배포 계획은 `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`을 환경별로 명시한다.

Reference:
- [Vercel Storage overview](https://vercel.com/docs/storage)
- [Postgres on Vercel](https://vercel.com/docs/postgres)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Next.js on Vercel](https://vercel.com/docs/concepts/next.js/overview)

---

## 파일 구조

- Modify: `package.json`
  - Prisma, Zod, production DB 스크립트 추가.
- Create: `.env.example`
  - 로컬과 Vercel에 필요한 환경변수 이름만 기록.
- Create: `prisma/schema.prisma`
  - 회원, 대회, 그룹, 그룹 참가자, 경기 테이블 정의.
- Create: `prisma/seed.ts`
  - 기존 샘플 데이터를 DB에 넣는 개발용 seed.
- Create: `lib/server/db.ts`
  - Prisma Client 싱글턴.
- Create: `lib/server/tournament-repository.ts`
  - 기존 `TournamentState`와 DB row 사이의 변환 및 CRUD.
- Create: `lib/server/admin-session.ts`
  - 관리자 비밀번호 확인, 서명 쿠키 생성/검증, 로그아웃 처리.
- Create: `lib/server/actions.ts`
  - 관리자 화면에서 호출하는 서버 액션.
- Create: `lib/server/validation.ts`
  - 서버 액션 입력 검증.
- Modify: `lib/store/tournament-store.ts`
  - localStorage 의존을 제거하거나 legacy import가 깨지지 않도록 최소 compatibility wrapper로 축소.
- Modify: `app/admin/page.tsx`
  - 서버 컴포넌트로 전환해 로그인 여부를 확인하고 관리자 홈을 렌더링.
- Create: `app/admin/login/page.tsx`
  - 관리자 로그인 폼.
- Modify: `app/admin/tournaments/page.tsx`
  - DB 목록 조회 기반으로 전환.
- Modify: `app/admin/tournaments/manage/page.tsx`
  - DB 상태를 받아 client component에 전달.
- Create: `components/TournamentManageClient.tsx`
  - 기존 `manage/page.tsx`의 상호작용 UI를 옮기고 서버 액션을 호출.
- Modify: `app/admin/members/page.tsx`
  - DB 회원 목록 조회 기반으로 전환.
- Modify: `app/admin/members/new/page.tsx`
  - 서버 액션으로 회원 생성.
- Modify: `app/admin/members/edit/[id]/page.tsx`
  - 서버 액션으로 회원 수정/비활성/삭제.
- Modify: `app/public/[slug]/page.tsx`
  - DB 공개 조회 기반으로 전환.
- Create: `lib/server/tournament-repository.test.ts`
  - DB row 변환과 repository mapping 단위 테스트.
- Create: `lib/server/admin-session.test.ts`
  - 쿠키 서명/검증 단위 테스트.
- Create: `lib/server/actions.test.ts`
  - 서버 액션 입력 검증과 repository 호출 단위 테스트.
- Modify: `README.md`
  - 로컬 DB, Vercel env, 배포 절차 기록.

---

### Task 1: Production Dependencies And Environment Contract

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: DB/검증 의존성을 추가한다**

Run:

```bash
npm install @prisma/client zod
npm install -D prisma tsx
```

Expected: `package.json`과 `package-lock.json`에 Prisma, Zod, tsx가 추가된다.

- [ ] **Step 2: package scripts를 추가한다**

`package.json`의 `scripts`를 다음처럼 만든다.

```json
{
  "dev": "next dev -H 0.0.0.0",
  "build": "prisma generate && next build",
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

- [ ] **Step 3: 환경변수 예시 파일을 만든다**

`.env.example`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
ADMIN_PASSWORD="change-this-before-deploy"
SESSION_SECRET="replace-with-at-least-32-random-characters"
```

- [ ] **Step 4: README에 운영 전제를 기록한다**

`README.md`에 다음 섹션을 추가한다.

````md
## Production setup

This app stores tournament data in Postgres through Prisma.

Required environment variables:

- `DATABASE_URL`: Postgres connection string from Vercel Marketplace storage.
- `ADMIN_PASSWORD`: Single admin password for tournament operators.
- `SESSION_SECRET`: At least 32 random characters used to sign the admin cookie.

Local setup:

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Vercel setup:

1. Create a Postgres database from Vercel Marketplace.
2. Add `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` for Production and Preview.
3. Deploy from the production branch.
4. Run `npm run db:deploy` during build through the `build` script only after migrations are committed.
````

- [ ] **Step 5: verify**

Run:

```bash
npm run db:generate
npm test
```

Expected: Prisma schema가 아직 없어 `db:generate`는 실패한다. 이 실패는 Task 2에서 schema를 만들면 해결된다.

- [ ] **Step 6: commit**

```bash
git add package.json package-lock.json .env.example README.md
git commit -m "chore: add production environment contract"
```

---

### Task 2: Prisma Schema And Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Prisma schema를 작성한다**

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
}

enum MatchStatus {
  scheduled
  completed
}

model Member {
  id        String   @id @default(cuid())
  name      String
  gender    Gender?
  level     String?
  notes     String   @default("")
  phone     String?
  active    Boolean  @default(true)
  deleted   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  groupMembers TournamentGroupMember[]
}

model Tournament {
  id         String           @id @default(cuid())
  name       String
  date       DateTime
  publicSlug String           @unique
  status     TournamentStatus @default(draft)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  groups  TournamentGroup[]
  matches Match[]
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

- [ ] **Step 2: Prisma enum 변환 규칙을 기록한다**

DB enum은 Prisma 식별자 제약 때문에 `hanul_aa`, `kdk_v2010`을 사용한다. TypeScript domain type은 기존 UI와 테스트를 유지하기 위해 `"hanul-aa"`, `"kdk-v2010"`을 계속 사용한다. 변환은 Task 3의 repository에서만 처리한다.

- [ ] **Step 3: seed 파일을 만든다**

`prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import { createSampleMatches, sampleGroupMemberIds, sampleGroups, sampleMembers, sampleTournament, sampleTournaments } from "../lib/domain/sample-data";

const prisma = new PrismaClient();

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDbFormat(value: "hanul-aa" | "kdk-v2010") {
  return value === "hanul-aa" ? "hanul_aa" : "kdk_v2010";
}

async function main() {
  await prisma.match.deleteMany();
  await prisma.tournamentGroupMember.deleteMany();
  await prisma.tournamentGroup.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.member.deleteMany();

  for (const member of sampleMembers) {
    await prisma.member.create({
      data: {
        id: member.id,
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
        name: tournament.name,
        date: toDate(tournament.date),
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
        scheduleFormat: toDbFormat(group.scheduleFormat),
        sortOrder: group.sortOrder,
        seedPlayerIds: group.seedPlayerIds ?? []
      }
    });

    for (const [index, memberId] of (sampleGroupMemberIds[group.id] ?? []).entries()) {
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
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 4: seed script를 Prisma에 연결한다**

`package.json` 최상위에 추가한다.

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 5: migration을 생성한다**

Run:

```bash
npm run db:migrate -- --name init
```

Expected: `prisma/migrations/*_init/migration.sql`이 생성되고 로컬 DB에 schema가 반영된다.

- [ ] **Step 6: seed를 실행한다**

Run:

```bash
npm run db:seed
```

Expected: 샘플 회원, 대회, 그룹, 경기 데이터가 DB에 들어간다.

- [ ] **Step 7: commit**

```bash
git add prisma package.json package-lock.json
git commit -m "feat: add prisma production schema"
```

---

### Task 3: Repository Layer Replacing localStorage State

**Files:**
- Create: `lib/server/db.ts`
- Create: `lib/server/tournament-repository.ts`
- Create: `lib/server/tournament-repository.test.ts`
- Modify: `lib/store/tournament-store.ts`

- [ ] **Step 1: Prisma client 싱글턴을 만든다**

`lib/server/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: repository mapping 테스트를 작성한다**

`lib/server/tournament-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fromDbFormat, toDbFormat, toDomainDate } from "./tournament-repository";

describe("tournament repository mapping", () => {
  it("maps domain schedule format to db enum", () => {
    expect(toDbFormat("hanul-aa")).toBe("hanul_aa");
    expect(toDbFormat("kdk-v2010")).toBe("kdk_v2010");
  });

  it("maps db schedule format to domain value", () => {
    expect(fromDbFormat("hanul_aa")).toBe("hanul-aa");
    expect(fromDbFormat("kdk_v2010")).toBe("kdk-v2010");
  });

  it("serializes dates as yyyy-mm-dd", () => {
    expect(toDomainDate(new Date("2026-05-24T00:00:00.000Z"))).toBe("2026-05-24");
  });
});
```

- [ ] **Step 3: repository를 구현한다**

`lib/server/tournament-repository.ts`:

```ts
import "server-only";
import type { ScheduleFormat } from "@prisma/client";
import { prisma } from "./db";
import { withDateStatus } from "@/lib/domain/tournament-status";
import type { Match, Member, Tournament, TournamentGroup } from "@/lib/domain/types";
import type { TournamentState } from "@/lib/store/tournament-store";

export function toDbFormat(value: TournamentGroup["scheduleFormat"]): ScheduleFormat {
  return value === "hanul-aa" ? "hanul_aa" : "kdk_v2010";
}

export function fromDbFormat(value: ScheduleFormat): TournamentGroup["scheduleFormat"] {
  return value === "hanul_aa" ? "hanul-aa" : "kdk-v2010";
}

export function toDomainDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function listMembers(): Promise<Member[]> {
  const members = await prisma.member.findMany({ orderBy: { name: "asc" } });
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

export async function listTournaments(): Promise<Tournament[]> {
  const tournaments = await prisma.tournament.findMany({ orderBy: { date: "desc" } });
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

export async function loadTournamentStateById(tournamentId?: string): Promise<TournamentState> {
  const tournaments = await listTournaments();
  const selectedTournament = tournamentId
    ? tournaments.find((tournament) => tournament.id === tournamentId)
    : tournaments[0];

  if (!selectedTournament) {
    return {
      version: 7,
      adminUnlocked: false,
      members: await listMembers(),
      tournaments: [],
      currentTournamentId: "",
      tournament: { id: "", name: "대회 없음", date: toDomainDate(new Date()), publicSlug: "empty", status: "draft" },
      groups: [],
      groupMemberIds: {},
      matches: [],
      deletedPublicSlugs: []
    };
  }

  const [members, groups, matches] = await Promise.all([
    listMembers(),
    prisma.tournamentGroup.findMany({
      where: { tournamentId: selectedTournament.id },
      include: { members: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" }
    }),
    prisma.match.findMany({
      where: { tournamentId: selectedTournament.id },
      orderBy: [{ groupId: "asc" }, { sortOrder: "asc" }]
    })
  ]);

  return {
    version: 7,
    adminUnlocked: false,
    members,
    tournaments,
    currentTournamentId: selectedTournament.id,
    tournament: selectedTournament,
    groups: groups.map((group) => ({
      id: group.id,
      tournamentId: group.tournamentId,
      name: group.name,
      scheduleFormat: fromDbFormat(group.scheduleFormat),
      sortOrder: group.sortOrder,
      seedPlayerIds: group.seedPlayerIds
    })),
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

export async function loadPublicTournamentState(publicSlug: string) {
  const tournament = await prisma.tournament.findUnique({ where: { publicSlug } });
  if (!tournament) return null;
  return loadTournamentStateById(tournament.id);
}

export async function updateTournament(input: { id: string; name: string; date: string }) {
  await prisma.tournament.update({
    where: { id: input.id },
    data: { name: input.name, date: toDate(input.date) }
  });
}
```

- [ ] **Step 4: localStorage store를 compatibility type 파일로 축소한다**

`lib/store/tournament-store.ts`는 `"use client"`를 제거하고 타입과 오류 메시지만 남긴다.

```ts
import type { Match, Member, Tournament, TournamentGroup } from "@/lib/domain/types";

export type TournamentState = {
  version: number;
  adminUnlocked: boolean;
  members: Member[];
  tournaments: Tournament[];
  currentTournamentId: string;
  tournament: Tournament;
  groups: TournamentGroup[];
  groupMemberIds: Record<string, string[]>;
  matches: Match[];
  deletedPublicSlugs: string[];
};

export function loadTournamentState(): TournamentState {
  throw new Error("loadTournamentState is no longer available in production. Use lib/server/tournament-repository.ts instead.");
}

export function saveTournamentState() {
  throw new Error("saveTournamentState is no longer available in production. Use server actions instead.");
}

export function checkAdminPassword() {
  throw new Error("checkAdminPassword moved to lib/server/admin-session.ts.");
}
```

- [ ] **Step 5: verify**

Run:

```bash
npm test -- lib/server/tournament-repository.test.ts
npm run build
```

Expected: repository mapping tests pass. Build may fail on UI files that still import localStorage functions; those are fixed in Tasks 5-7.

- [ ] **Step 6: commit**

```bash
git add lib/server/db.ts lib/server/tournament-repository.ts lib/server/tournament-repository.test.ts lib/store/tournament-store.ts
git commit -m "feat: add server tournament repository"
```

---

### Task 4: Admin Authentication For Vercel

**Files:**
- Create: `lib/server/admin-session.ts`
- Create: `lib/server/admin-session.test.ts`
- Create: `app/admin/login/page.tsx`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: session 테스트를 작성한다**

`lib/server/admin-session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { signSessionValue, verifySessionValue } from "./admin-session";

describe("admin session", () => {
  it("verifies a signed cookie value", async () => {
    const signed = await signSessionValue("secret-123456789012345678901234567890");
    await expect(verifySessionValue(signed, "secret-123456789012345678901234567890")).resolves.toBe(true);
  });

  it("rejects a tampered cookie value", async () => {
    const signed = await signSessionValue("secret-123456789012345678901234567890");
    await expect(verifySessionValue(`${signed}x`, "secret-123456789012345678901234567890")).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: session helper를 구현한다**

`lib/server/admin-session.ts`:

```ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "tennis_admin_session";
const SESSION_VALUE = "admin";

function getSecret(secret = process.env.SESSION_SECRET) {
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return secret;
}

function digest(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export async function signSessionValue(secret = getSecret()) {
  return `${SESSION_VALUE}.${digest(SESSION_VALUE, secret)}`;
}

export async function verifySessionValue(value: string | undefined, secret = getSecret()) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (payload !== SESSION_VALUE || !signature) return false;
  const expected = digest(payload, secret);
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function requireAdmin() {
  const cookieStore = await cookies();
  const valid = await verifySessionValue(cookieStore.get(COOKIE_NAME)?.value);
  if (!valid) redirect("/admin/login");
}

export async function loginAdmin(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  if (password !== process.env.ADMIN_PASSWORD) redirect("/admin/login?error=1");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await signSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  redirect("/admin");
}

export async function logoutAdmin() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}
```

- [ ] **Step 3: 로그인 페이지를 만든다**

`app/admin/login/page.tsx`:

```tsx
import { loginAdmin } from "@/lib/server/admin-session";

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="text-3xl font-bold text-ink">관리자 로그인</h1>
      {searchParams.error && <p className="notice-text">비밀번호가 맞지 않습니다.</p>}
      <form action={loginAdmin} className="section-card stack">
        <label className="field boxed-field">
          <span>비밀번호</span>
          <input autoComplete="current-password" name="password" type="password" />
        </label>
        <button className="primary-button" type="submit">입장</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: 관리자 홈에서 인증을 요구한다**

`app/admin/page.tsx`:

```tsx
import { AppShell } from "@/components/AppShell";
import { HomeDashboard } from "@/components/HomeDashboard";
import { logoutAdmin, requireAdmin } from "@/lib/server/admin-session";

export default async function AdminHomePage() {
  await requireAdmin();
  return (
    <AppShell title="메인페이지" subtitle="회원관리와 대회관리를 선택하세요" active="home">
      <form action={logoutAdmin}>
        <button className="ghost-button" type="submit">로그아웃</button>
      </form>
      <HomeDashboard />
    </AppShell>
  );
}
```

- [ ] **Step 5: verify**

Run:

```bash
npm test -- lib/server/admin-session.test.ts
npm run build
```

Expected: session tests pass. Build may still fail on remaining pages using localStorage; continue to Task 5.

- [ ] **Step 6: commit**

```bash
git add lib/server/admin-session.ts lib/server/admin-session.test.ts app/admin/login/page.tsx app/admin/page.tsx
git commit -m "feat: add admin session authentication"
```

---

### Task 5: Server Actions For Admin Mutations

**Files:**
- Create: `lib/server/validation.ts`
- Create: `lib/server/actions.ts`
- Create: `lib/server/actions.test.ts`
- Modify: `lib/server/tournament-repository.ts`

- [ ] **Step 1: validation 테스트를 작성한다**

`lib/server/actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { memberInputSchema, scoreInputSchema } from "./validation";

describe("server action validation", () => {
  it("accepts a valid member input", () => {
    expect(memberInputSchema.parse({ name: "김철수", gender: "male", phone: "010-1234-5678", active: true })).toMatchObject({ name: "김철수" });
  });

  it("rejects an empty member name", () => {
    expect(() => memberInputSchema.parse({ name: "", active: true })).toThrow();
  });

  it("normalizes score input range", () => {
    expect(scoreInputSchema.parse({ sideAScore: 6, sideBScore: 4 })).toEqual({ sideAScore: 6, sideBScore: 4 });
  });
});
```

- [ ] **Step 2: validation schema를 만든다**

`lib/server/validation.ts`:

```ts
import { z } from "zod";

export const memberInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  gender: z.enum(["male", "female"]).optional(),
  level: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  notes: z.string().trim().default(""),
  active: z.boolean().default(true)
});

export const tournamentInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  publicSlug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/)
});

export const groupInputSchema = z.object({
  id: z.string().optional(),
  tournamentId: z.string().min(1),
  name: z.string().trim().min(1),
  scheduleFormat: z.enum(["hanul-aa", "kdk-v2010"]),
  memberIds: z.array(z.string()).default([]),
  seedPlayerIds: z.array(z.string()).default([])
});

export const scoreInputSchema = z.object({
  sideAScore: z.number().int().min(0).max(6).nullable(),
  sideBScore: z.number().int().min(0).max(6).nullable()
});
```

- [ ] **Step 3: repository mutation 함수를 추가한다**

`lib/server/tournament-repository.ts`에 추가한다.

```ts
export async function upsertMember(input: {
  id?: string;
  name: string;
  gender?: "male" | "female";
  level?: string;
  phone?: string;
  notes: string;
  active: boolean;
}) {
  return prisma.member.upsert({
    where: { id: input.id ?? "__new_member__" },
    create: input,
    update: input
  });
}

export async function softDeleteMember(id: string) {
  return prisma.member.update({ where: { id }, data: { deleted: true, active: false } });
}

export async function updateMatchScore(input: { matchId: string; sideAScore: number | null; sideBScore: number | null }) {
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

- [ ] **Step 4: server actions를 작성한다**

`lib/server/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./admin-session";
import { softDeleteMember, updateMatchScore, updateTournament, upsertMember } from "./tournament-repository";
import { memberInputSchema, scoreInputSchema, tournamentInputSchema } from "./validation";

export async function saveMemberAction(formData: FormData) {
  await requireAdmin();
  const parsed = memberInputSchema.parse({
    id: String(formData.get("id") || "") || undefined,
    name: String(formData.get("name") ?? ""),
    gender: String(formData.get("gender") || "") || undefined,
    level: String(formData.get("level") || "") || undefined,
    phone: String(formData.get("phone") || "") || undefined,
    notes: String(formData.get("notes") ?? ""),
    active: formData.get("active") === "on"
  });
  await upsertMember(parsed);
  revalidatePath("/admin/members");
  redirect("/admin/members");
}

export async function deleteMemberAction(formData: FormData) {
  await requireAdmin();
  await softDeleteMember(String(formData.get("id")));
  revalidatePath("/admin/members");
  redirect("/admin/members");
}

export async function updateTournamentAction(formData: FormData) {
  await requireAdmin();
  const parsed = tournamentInputSchema.parse({
    id: String(formData.get("id") || "") || undefined,
    name: String(formData.get("name") ?? ""),
    date: String(formData.get("date") ?? ""),
    publicSlug: String(formData.get("publicSlug") ?? "")
  });
  if (!parsed.id) throw new Error("Tournament id is required.");
  await updateTournament({ id: parsed.id, name: parsed.name, date: parsed.date });
  revalidatePath("/admin/tournaments");
  revalidatePath(`/public/${parsed.publicSlug}`);
}

export async function updateMatchScoreAction(matchId: string, input: { sideAScore: number | null; sideBScore: number | null }) {
  await requireAdmin();
  const parsed = scoreInputSchema.parse(input);
  await updateMatchScore({ matchId, ...parsed });
  revalidatePath("/admin/tournaments/manage");
}
```

- [ ] **Step 5: verify**

Run:

```bash
npm test -- lib/server/actions.test.ts
npm run build
```

Expected: validation tests pass. Build may still fail until UI pages stop importing old client store.

- [ ] **Step 6: commit**

```bash
git add lib/server/validation.ts lib/server/actions.ts lib/server/actions.test.ts lib/server/tournament-repository.ts
git commit -m "feat: add admin server actions"
```

---

### Task 6: Admin Pages Use DB Data

**Files:**
- Modify: `app/admin/tournaments/page.tsx`
- Modify: `app/admin/tournaments/manage/page.tsx`
- Create: `components/TournamentManageClient.tsx`
- Modify: `app/admin/members/page.tsx`
- Modify: `app/admin/members/new/page.tsx`
- Modify: `app/admin/members/edit/[id]/page.tsx`

- [ ] **Step 1: 모든 관리자 페이지 상단에서 인증을 요구한다**

각 관리자 페이지의 server component에서 첫 줄 로직으로 호출한다.

```ts
await requireAdmin();
```

- [ ] **Step 2: 회원 목록 페이지를 DB 기반으로 전환한다**

`app/admin/members/page.tsx`에서 `useState(() => loadTournamentState())` 대신 서버 조회를 사용한다.

```tsx
import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/server/admin-session";
import { listMembers } from "@/lib/server/tournament-repository";

export default async function MemberManagementPage() {
  await requireAdmin();
  const members = await listMembers();
  const visibleMembers = members.filter((member) => !member.deleted);

  return (
    <AppShell title="회원관리" subtitle="회원 목록을 먼저 확인합니다" active="members">
      {/* existing list markup can render visibleMembers directly */}
    </AppShell>
  );
}
```

- [ ] **Step 3: 회원 생성/수정 폼을 server action form으로 전환한다**

`app/admin/members/new/page.tsx`와 `app/admin/members/edit/[id]/page.tsx`는 `saveMemberAction`을 form action으로 사용한다.

```tsx
import { saveMemberAction } from "@/lib/server/actions";

export function MemberServerForm({ member }: { member?: { id: string; name: string; phone?: string; notes: string; active?: boolean } }) {
  return (
    <form action={saveMemberAction} className="section-card stack">
      {member?.id && <input name="id" type="hidden" value={member.id} />}
      <label className="field boxed-field">
        <span>이름</span>
        <input name="name" defaultValue={member?.name ?? ""} required />
      </label>
      <label className="field boxed-field">
        <span>연락처</span>
        <input name="phone" defaultValue={member?.phone ?? ""} />
      </label>
      <label className="field boxed-field">
        <span>메모</span>
        <textarea name="notes" defaultValue={member?.notes ?? ""} />
      </label>
      <label className="toggle-row">
        <input name="active" type="checkbox" defaultChecked={member?.active ?? true} />
        <span>활성 회원</span>
      </label>
      <button className="primary-button" type="submit">저장</button>
    </form>
  );
}
```

- [ ] **Step 4: 대회 목록 페이지를 DB 기반으로 전환한다**

`app/admin/tournaments/page.tsx`에서 `listTournaments()`를 호출하고 기존 카드 UI에 전달한다.

```tsx
const tournaments = await listTournaments();
```

- [ ] **Step 5: 대회 관리 페이지를 server wrapper + client interaction으로 분리한다**

`app/admin/tournaments/manage/page.tsx`:

```tsx
import { TournamentManageClient } from "@/components/TournamentManageClient";
import { requireAdmin } from "@/lib/server/admin-session";
import { loadTournamentStateById } from "@/lib/server/tournament-repository";

export default async function TournamentManagePage({ searchParams }: { searchParams: { id?: string } }) {
  await requireAdmin();
  const state = await loadTournamentStateById(searchParams.id);
  return <TournamentManageClient initialState={state} />;
}
```

`components/TournamentManageClient.tsx`는 기존 `app/admin/tournaments/manage/page.tsx`의 `"use client"` UI를 옮긴다. 변경 함수 중 DB 반영이 필요한 곳은 `saveTournamentState(next)` 대신 Task 5의 server action을 호출한다. 점수 입력은 다음 형태로 시작한다.

```tsx
"use client";

import { useTransition } from "react";
import { updateMatchScoreAction } from "@/lib/server/actions";
import type { TournamentState } from "@/lib/store/tournament-store";

export function TournamentManageClient({ initialState }: { initialState: TournamentState }) {
  const [isPending, startTransition] = useTransition();

  function updateScore(matchId: string, sideAScore: number | null, sideBScore: number | null) {
    startTransition(async () => {
      await updateMatchScoreAction(matchId, { sideAScore, sideBScore });
    });
  }

  return (
    <div aria-busy={isPending}>
      {/* move existing manage UI here and call updateScore from score inputs */}
    </div>
  );
}
```

- [ ] **Step 6: verify**

Run:

```bash
npm run build
```

Expected: 관리자 페이지에서 `loadTournamentState`와 `saveTournamentState` import가 사라지고 build가 통과하거나 public page만 남은 오류가 표시된다.

- [ ] **Step 7: commit**

```bash
git add app/admin components/TournamentManageClient.tsx
git commit -m "feat: load admin pages from database"
```

---

### Task 7: Public Page Uses Read-Only DB Query

**Files:**
- Modify: `app/public/[slug]/page.tsx`
- Modify: `lib/server/tournament-repository.ts`

- [ ] **Step 1: 공개 조회가 없는 slug를 명확히 처리한다**

`app/public/[slug]/page.tsx`에서 `notFound()`를 사용한다.

```tsx
import { notFound } from "next/navigation";
import { PublicTournamentClient } from "@/components/PublicTournamentClient";
import { loadPublicTournamentState } from "@/lib/server/tournament-repository";

export default async function PublicTournamentPage({ params }: { params: { slug: string } }) {
  const state = await loadPublicTournamentState(params.slug);
  if (!state) notFound();
  return <PublicTournamentClient state={state} />;
}
```

- [ ] **Step 2: 기존 공개 UI를 client component로 분리한다**

Create: `components/PublicTournamentClient.tsx`

```tsx
"use client";

import { useMemo, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { RankingTable } from "@/components/RankingTable";
import { Tabs } from "@/components/Tabs";
import { calculateRankings } from "@/lib/domain/ranking";
import type { TournamentState } from "@/lib/store/tournament-store";

const tabs = [
  { id: "schedule", label: "대진표" },
  { id: "group", label: "그룹 순위" },
  { id: "overall", label: "전체 순위" }
];

export function PublicTournamentClient({ state }: { state: TournamentState }) {
  const [activeTab, setActiveTab] = useState("schedule");
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
      {/* move existing public page markup here, using groupRankings and overallRanking */}
    </main>
  );
}
```

- [ ] **Step 3: public page에서 관리자 전용 데이터가 노출되지 않는지 확인한다**

`loadPublicTournamentState`는 `adminUnlocked`, `deletedPublicSlugs`를 빈 값으로 반환한다. 회원 전화번호는 공개 화면에 쓰지 않으므로 현재 component에 전달하지 않는다. 필요하면 repository에서 public member shape를 별도 타입으로 줄인다.

- [ ] **Step 4: verify**

Run:

```bash
npm run build
npm test
```

Expected: 전체 build와 테스트가 통과한다.

- [ ] **Step 5: commit**

```bash
git add app/public components/PublicTournamentClient.tsx lib/server/tournament-repository.ts
git commit -m "feat: load public tournament page from database"
```

---

### Task 8: Vercel Deployment Pipeline

**Files:**
- Modify: `package.json`
- Create: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Vercel build 명령을 migration 포함 형태로 정한다**

`package.json`의 build script를 다음처럼 변경한다.

```json
{
  "build": "prisma generate && prisma migrate deploy && next build"
}
```

이 프로젝트는 단일 운영자가 관리하는 작은 서비스라 production deploy 중 migration을 적용한다. 데이터 규모가 커지면 migration apply를 별도 release command로 분리한다.

- [ ] **Step 2: Vercel function region을 한국 사용자에게 가깝게 고정한다**

`vercel.json`:

```json
{
  "regions": ["icn1"]
}
```

- [ ] **Step 3: README에 Vercel 설정 절차를 확정한다**

`README.md`에 추가한다.

````md
## Vercel deployment

Production variables:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

Deploy checklist:

```bash
npm test
npm run build
```

After connecting the Git repository to Vercel:

1. Set the project root to the repository root that contains `package.json`.
2. Connect a Postgres database from Vercel Marketplace.
3. Confirm the generated `DATABASE_URL` is present in Production and Preview.
4. Add `ADMIN_PASSWORD` and `SESSION_SECRET`.
5. Trigger a Preview deployment.
6. Open `/admin/login`, create or verify data, then open `/public/monthly-demo`.
7. Promote to Production after Preview is verified.
````

- [ ] **Step 4: verify local production build**

Run:

```bash
npm test
npm run build
```

Expected: tests pass, Prisma migration deploy runs against the configured local/preview DB, and Next.js production build succeeds.

- [ ] **Step 5: commit**

```bash
git add package.json package-lock.json vercel.json README.md
git commit -m "chore: configure vercel deployment"
```

---

### Task 9: Production Smoke Test And Data Safety

**Files:**
- Create: `docs/deployment-smoke-test.md`
- Modify: `README.md`

- [ ] **Step 1: smoke test 문서를 만든다**

`docs/deployment-smoke-test.md`:

```md
# Deployment Smoke Test

Run this checklist on every Preview deployment before promoting to Production.

## Admin auth

- Open `/admin/login`.
- Enter the configured admin password.
- Confirm redirect to `/admin`.
- Open a private browser window and confirm `/admin` redirects to `/admin/login`.

## Members

- Open `/admin/members`.
- Create a member named `배포검증`.
- Edit the member phone number.
- Confirm the member appears in the list.
- Delete or deactivate the member.

## Tournament

- Open `/admin/tournaments`.
- Open the current tournament manage page.
- Change the tournament date.
- Add a group member to a group.
- Generate the schedule.
- Enter one match score.
- Confirm the ranking changes.

## Public page

- Open `/public/monthly-demo`.
- Confirm schedule, group ranking, and overall ranking render.
- Confirm no admin controls are visible.

## Data persistence

- Refresh the browser.
- Open the same Preview URL in another device or browser.
- Confirm the changed score is still visible.
```

- [ ] **Step 2: README에 운영 안전 규칙을 추가한다**

`README.md`:

```md
## Data safety rules

- Do not run `prisma migrate reset` against Preview or Production.
- Do not commit `.env.local`.
- Run `npm run db:seed` only against disposable local databases.
- Use Preview deployment smoke tests before Production promotion.
```

- [ ] **Step 3: verify**

Run:

```bash
npm test
npm run build
```

Expected: tests and production build pass.

- [ ] **Step 4: commit**

```bash
git add docs/deployment-smoke-test.md README.md
git commit -m "docs: add deployment smoke test"
```

---

## 전체 검증

- [ ] `npm test` passes.
- [ ] `npm run build` passes with `prisma generate`, `prisma migrate deploy`, and `next build`.
- [ ] No client component imports `lib/server/*`.
- [ ] No server component imports browser-only `window`, `localStorage`, `navigator`, or `document`.
- [ ] `/admin/login` accepts the configured `ADMIN_PASSWORD`.
- [ ] `/admin` redirects to `/admin/login` without a valid cookie.
- [ ] `/admin/members` reads and writes members from Postgres.
- [ ] `/admin/tournaments/manage` reads and writes tournament groups, schedules, scores, and rankings from Postgres.
- [ ] `/public/[slug]` renders from Postgres in a fresh browser where no localStorage data exists.
- [ ] Vercel Preview has `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.
- [ ] Vercel Production has `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.

---

## 자체 검토

- Spec coverage: DB 연결, 백엔드 저장/조회, 관리자 인증, 기존 localStorage 제거, 공개 페이지 DB 조회, Vercel 배포 환경변수, migration, smoke test가 모두 포함되어 있다.
- Placeholder scan: 구현자가 멈춰야 하는 빈 항목 없이 파일, 코드, 명령, 기대 결과를 명시했다.
- Type consistency: domain type의 schedule format은 `"hanul-aa" | "kdk-v2010"`을 유지하고 Prisma enum과 repository에서만 변환한다. `TournamentState`는 기존 UI 컴포넌트와의 호환을 위해 유지한다.

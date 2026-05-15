# Tennis Mobile Prototype

테니스 클럽 월례대회 운영을 위한 모바일 우선 프로토타입입니다.  
현재 구조는 STC와 OTC 두 클럽을 URL 경로로 분리하고, Vercel 배포와 Postgres DB 연결을 전제로 동작합니다.

## 진입 URL

- STC 클럽: `/stc`
- OTC 클럽: `/otc`
- 루트(`/`)는 사용하지 않으며, 접속 시 `잘못된 접근입니다` 안내 화면을 표시합니다.

각 클럽의 관리 화면은 해당 클럽 경로 아래에서만 사용합니다.

- STC 로그인: `/stc/login`
- OTC 로그인: `/otc/login`
- STC 회원 관리: `/stc/members`
- OTC 회원 관리: `/otc/members`
- STC 대회 관리: `/stc/tournaments`
- OTC 대회 관리: `/otc/tournaments`

로컬 기본 비밀번호는 두 클럽 모두 `1234`입니다.

## 로컬 실행

의존성을 설치합니다.

```sh
npm install
```

개발 서버를 실행합니다.

```sh
npm run dev
```

프로덕션 빌드 방식으로 확인할 때는 빌드 후 서버를 시작합니다.

```sh
npm run build
npm run start
```

`npm run build`를 다시 실행했다면 기존 `npm run start` 서버를 종료한 뒤 다시 시작해야 합니다. 그렇지 않으면 오래된 Next.js chunk를 참조해 화면이 깨질 수 있습니다.

## 환경 변수

실제 DB 저장을 사용하려면 `.env.local` 또는 Vercel 환경 변수에 아래 값을 설정합니다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
ADMIN_PASSWORD="1234"
SESSION_SECRET="replace-with-at-least-32-random-characters"
```

클럽별 비밀번호를 따로 운영하려면 아래 값을 추가로 사용할 수 있습니다.

```env
ADMIN_PASSWORD_STC="1234"
ADMIN_PASSWORD_OTC="1234"
```

실제 운영 환경에서는 `SESSION_SECRET`을 32자 이상의 랜덤 문자열로 반드시 변경하세요. 실제 비밀값과 `.env.local`은 커밋하지 않습니다.

## DB 설정

초기 스키마를 배포 대상 DB에 적용합니다.

```sh
npm run db:deploy
```

로컬 개발 DB를 사용할 때는 아래 순서를 사용합니다.

```sh
npm run db:migrate
npm run db:seed
```

현재 로컬에 `DATABASE_URL`이 없으면 읽기 화면은 샘플 데이터로 표시됩니다. 단, 실제 저장 기능과 Vercel 배포 환경에서는 DB 연결이 필요합니다.

## Vercel 배포 체크리스트

1. Git 저장소를 Vercel 프로젝트에 연결합니다.
2. Vercel 프로젝트 Root Directory를 Next.js 앱 디렉터리로 설정합니다.
3. Vercel Marketplace 또는 Prisma Postgres에서 Postgres DB를 생성합니다.
4. Preview와 Production 환경 변수에 `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`을 설정합니다.
5. migration 내용을 확인한 뒤 대상 DB에 `npm run db:deploy`를 실행합니다.
6. Preview 배포를 생성합니다.
7. `docs/deployment-smoke-test.md`의 스모크 테스트를 실행합니다.
8. 데이터 저장과 공개 공유 링크가 정상 동작하면 Production으로 배포합니다.

## 주요 명령어

```sh
npm run dev          # 개발 서버 실행
npm run build        # Prisma Client 생성 후 Next.js production build
npm run start        # production build 실행
npm test             # 테스트 실행
npm run db:generate  # Prisma Client 생성
npm run db:deploy    # production DB migration 적용
npm run db:seed      # 샘플 데이터 입력
```

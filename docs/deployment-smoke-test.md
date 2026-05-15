# Deployment Smoke Test

Run this checklist on every Vercel Preview deployment before promoting to Production.

## Admin auth

- Open `/admin/login`.
- Enter the configured admin password.
- Confirm redirect to `/admin`.
- Open a private browser window and confirm `/admin` redirects to `/admin/login`.

## Members

- Open `/stc/members`.
- Create a member with name, gender, level, phone, and notes.
- Edit the member and confirm the changed fields persist after refresh.
- Delete the member and confirm it no longer appears in the active list.

## Tournaments

- Open `/stc/tournaments`.
- Create or edit a tournament.
- Open the manage screen.
- Select tournament participants before group assignment.
- Assign groups, generate matches, edit scores, change players, and refresh.
- Confirm the same groups, matches, players, and scores are still present after refresh.

## Public sharing

- Open the public link under `/public/stc/<slug>` in a fresh browser.
- Confirm the public page renders without relying on old browser localStorage.
- Confirm the public page does not expose member phone numbers or admin-only notes.
- Open the same public link on a mobile browser and confirm the same tournament data is visible.

## Data safety

- Confirm Preview and Production both have `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.
- Run `npm run db:deploy` only after reviewing pending Prisma migrations.
- Run `npm run db:seed` only against disposable local databases.
- Export a DB backup before destructive schema migrations.

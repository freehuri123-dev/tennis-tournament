## Production environment

Configure these variables in Vercel or your production hosting environment, not only in `.env.local`.

Required variables:

- DATABASE_URL: Postgres connection string from Vercel Marketplace storage.
- ADMIN_PASSWORD: Single operator password for the admin pages.
- SESSION_SECRET: At least 32 random characters used to sign the admin cookie. Generate a real secret for every deployed environment.

Do not commit real secrets or `.env.local`.

## Vercel deployment checklist

1. Connect the Git repository to Vercel.
2. Set the project root to the Next.js app directory.
3. Create a Postgres database from Vercel Marketplace or Prisma Postgres.
4. Add `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` to Preview and Production environments.
5. Run `npm run db:deploy` against the target database after migrations are reviewed.
6. Deploy Preview.
7. Run the smoke test in `docs/deployment-smoke-test.md`.
8. Promote to Production after data persistence and public sharing are verified.

Production migration deployment:

```sh
npm run db:deploy
```

Local setup commands:

```sh
cp .env.example .env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

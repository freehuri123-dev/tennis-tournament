## Production environment

Configure these variables in Vercel or your production hosting environment, not only in `.env.local`.

Required variables:

- DATABASE_URL: Postgres connection string from Vercel Marketplace storage.
- ADMIN_PASSWORD: Single operator password for the admin pages.
- SESSION_SECRET: At least 32 random characters used to sign the admin cookie. Generate a real secret for every deployed environment.

Do not commit real secrets or `.env.local`.

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

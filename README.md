## Production environment

Required variables:

- DATABASE_URL: Postgres connection string from Vercel Marketplace storage.
- ADMIN_PASSWORD: Single operator password for the admin pages.
- SESSION_SECRET: At least 32 random characters used to sign the admin cookie.

Local setup commands:

```sh
cp .env.example .env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

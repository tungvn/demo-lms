# Demo LMS

## Setup

### 1. Clone and Install

```bash
cd demo-lms
pnpm install
```

### 2. Configure Environment

Clone `.env.example` with your credentials:

```env
# Database URLs (from Supabase Dashboard > Settings > Database)
DATABASE_URL="postgresql://root:secret@pgsql.demo-lms.ordinarist.localhost:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://root:secret@pgsql.demo-lms.ordinarist.localhost:5432/postgres"
```

### 3. Push Database Schema

```bash
pnpm prisma db push
pnpm prisma generate
```

Run seeds to populate the database with demo data:

```bash
pnpm prisma db seed
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## CI/CD to Vercel (GitHub Actions)

This project includes GitHub Actions workflow at `.github/workflows/vercel-cd.yml` using Vercel CLI:

- Open PR into `main`: deploy Preview
- Push commit to `main`: deploy Production

### Required GitHub Secrets

Add these secrets in GitHub repository settings:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### One-time setup

1. Link local project with Vercel if you have not done it before:

```bash
pnpm dlx vercel link
```

2. Get `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from `.vercel/project.json` after linking.
3. Create the 3 secrets above in GitHub.

## License

MIT

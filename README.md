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

### 4. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## License

MIT

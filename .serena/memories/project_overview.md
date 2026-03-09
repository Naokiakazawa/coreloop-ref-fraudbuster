# Project Overview: ref-backbone

## Purpose
**Anti-Fraud Crowdsourcing Platform (FraudBuster)**
This project is a reference implementation of a platform for collecting, sharing, and searching information about online fraud (SNS, messaging apps, suspicious URLs). It allows users to report cases, view detailed fraud profiles, and monitor statistics to prevent fraud victimhood.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Library**: React 19.2.4
- **Styling**: Tailwind CSS 4.2.1 (using `@tailwindcss/postcss`)
- **UI Components**: Radix UI (various primitives), Lucide React, Embla Carousel, Recharts, Sonner
- **Forms & Validation**: React Hook Form, Zod
- **Database**: PostgreSQL 17 with Prisma ORM (^7.4.2)
- **Tooling**: Biome (Linting & Formatting), pnpm (Package Manager), ESLint
- **Testing**: Node.js native test runner (unit), Playwright (E2E)

## Codebase Structure
- `app/`: Next.js App Router pages and layouts.
- `components/`: UI components, including `ui/` components (Radix-based design system).
- `hooks/`: Custom React hooks (e.g., `use-debounce`).
- `lib/`: Utility functions and shared logic (e.g., `prisma.ts`, `api-utils.ts`).
- `docs/`: Project documentation, including `SPEC.md` and SQL scripts.
- `prisma/`: Prisma schema and migrations.
- `compose.yaml`: Docker Compose for PostgreSQL.

## Key Features
- **Incremental Search**: Fast search for fraud reports with status badges and risk categories.
- **Report Submission**: Multi-step form for reporting fraud, including URL and image evidence.
- **Admin Dashboard**: Portal for reviewing reports, managing categories, and posting announcements.
- **Statistics/KPIs**: Visual representation of fraud trends and platform statistics.

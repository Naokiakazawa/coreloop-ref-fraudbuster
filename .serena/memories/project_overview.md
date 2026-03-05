# Project Overview: ref-backbone

## Purpose
**Anti-Fraud Crowdsourcing Platform (仮称)**
This project is a platform for collecting, sharing, and searching information about online fraud (SNS, messaging apps, suspicious URLs). It allows users to report cases and view statistics to prevent fraud victimhood.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Library**: React 19.2.4
- **Styling**: Tailwind CSS 4.1.18
- **UI Components**: Radix UI, Lucide React, Embla Carousel, Recharts
- **Forms & Validation**: React Hook Form, Zod
- **Database**: PostgreSQL 17 (via Docker Compose) with Prisma ORM
- **Tooling**: Biome (Linting & Formatting), pnpm (Package Manager), ESLint

## Codebase Structure
- `app/`: Next.js App Router pages and layouts.
- `components/`: UI components, including a large set of `ui/` components (Radix-based).
- `hooks/`: Custom React hooks.
- `lib/`: Utility functions and shared logic.
- `docs/`: Project documentation, including `SPEC.md`.
- `migration.sql`: Initial database schema.
- `seed.sql`: Seed data for the database.
- `compose.yaml`: Docker Compose configuration for the database.

## Key Features (from SPEC.md)
- **Search & List**: Incremental search for fraud cases with status badges.
- **Case Detail**: Detailed information, evidence images, and processing timeline.
- **Statistics**: KPI visualization using Recharts.
- **Reporting Form**: Form for reporting fraud with SMS OTP authentication.
- **Admin Management**: Backend for reviewing reports and managing contents.

# Project Overview: ref-backbone

## Purpose
**Anti-Fraud Crowdsourcing Platform (FraudBuster)**
This project is a reference implementation of a platform for collecting, sharing, and searching information about online fraud (SNS, messaging apps, suspicious URLs). It allows users to report cases, view detailed fraud profiles, and monitor statistics to prevent fraud victimhood.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Library**: React 19.2.4
- **Styling**: Tailwind CSS 4.2.1 (using `@tailwindcss/postcss`)
- **UI Components**: 
  - Radix UI (Accordion, Alert Dialog, Aspect Ratio, Avatar, Checkbox, Collapsible, Context Menu, Dialog, Dropdown Menu, Hover Card, Label, Menubar, Navigation Menu, Popover, Progress, Radio Group, Scroll Area, Select, Separator, Slider, Slot, Switch, Tabs, Toggle, Toggle Group, Tooltip)
  - Lucide React (Icons)
  - Embla Carousel (Sliders)
  - Recharts (KPIs/Stats)
  - Sonner (Toast notifications)
  - Vaul (Drawers)
  - Base UI (Primitives)
- **Forms & Validation**: React Hook Form, Zod
- **Utilities**: Nanoid, Date-fns, CMDK (Command Menu), File-type (MIME check), Input-OTP, Sharp (Image processing)
- **Database**: PostgreSQL 17 with Prisma ORM (^7.4.2)
- **Architecture**: Prisma Client is generated into `app/generated/prisma` for better App Router integration.
- **Tooling**: Biome (Linting & Formatting), pnpm 10.19.0 (Package Manager), ESLint
- **Testing**: Node.js native test runner (unit), Playwright (E2E)

## Codebase Structure
- `app/`: Next.js App Router pages and layouts.
  - `app/api/`: REST API endpoints (Admin, Reports, Statistics, etc.).
  - `app/api-docs/`: OpenAPI documentation route.
  - `app/generated/prisma/`: Custom location for generated Prisma Client and models.
  - `app/reports/`, `app/report/new/`, `app/statistics/`, `app/announcements/`: Core feature routes.
  - `app/admin/`: Admin panel routes.
- `components/`: UI components, including `ui/` components (Radix-based design system).
- `hooks/`: Custom React hooks (e.g., `use-debounce`).
- `lib/`: Utility functions and shared logic (e.g., `prisma.ts`, `api-utils.ts`).
- `docs/`: Project documentation, including `SPEC.md` and SQL scripts.
- `prisma/`: Prisma schema and migrations.
- `compose.yaml`: Docker Compose for PostgreSQL.
- `e2e/`: Playwright end-to-end tests.

## Key Features
- **Incremental Search**: Fast search for fraud reports with status badges and risk categories.
- **Report Submission**: Multi-step form for reporting fraud, including URL and image evidence.
- **Admin Dashboard**: Portal for reviewing reports, managing categories, and posting announcements.
- **Statistics/KPIs**: Visual representation of fraud trends and platform statistics.
- **API Documentation**: Built-in OpenAPI documentation.

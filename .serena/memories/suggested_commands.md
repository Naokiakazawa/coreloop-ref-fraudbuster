# Suggested Commands

## Development
- `pnpm dev`: Starts the Next.js development server.
- `pnpm build`: Builds the application for production.
- `pnpm start`: Starts the production server.

## Database
- `docker compose up -d`: Starts the PostgreSQL database container.
- `pnpx prisma db push`: Synchronizes the Prisma schema with the database.
- `pnpx prisma generate`: Generates the Prisma Client.
- `pnpx prisma studio`: Opens the Prisma Studio to browse data.

## Code Quality & Testing
- `pnpm format`: Runs `biome format --write` on the codebase.
- `pnpm check`: Runs `biome check --write` (linting + formatting fixes).
- `pnpm lint`: Runs ESLint.
- `pnpm test:unit`: Runs backend unit tests using Node.js test runner.
- `pnpm test:e2e`: Runs Playwright E2E tests.

## System Utils (Darwin)
- `ls`: List directory contents.
- `grep`: Search for patterns in files.
- `find`: Find files.
- `git`: Version control.

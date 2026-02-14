# Suggested Commands

## Development
- `pnpm dev`: Starts the Next.js development server.

## Database
- `docker compose up -d`: Starts the PostgreSQL database container in the background.
- `docker compose down`: Stops the database container.
- `docker compose logs -f db`: Views the database logs.

## Code Quality
- `pnpm format`: Runs `biome format --write` on `app`, `components`, `hooks`, and `lib`.
- `pnpm check`: Runs `biome check --write` on `app`, `components`, `hooks`, and `lib`. This performs linting and fixes.
- `pnpm lint`: Runs ESLint.

## Build
- `pnpm build`: Builds the application for production.
- `pnpm start`: Starts the production server.

## System Utils (Darwin)
- `ls`: List directory contents.
- `grep`: Search for patterns in files.
- `find`: Find files.
- `git`: Version control.

# Project Coreloop Reference Product

inspired by Fraud Buster

## Cloudflare Deployment (OpenNext)

### Setup

```bash
pnpm install
pnpm run build:cf
```

### Local preview on Workers runtime

```bash
pnpm run preview:cf
```

### Deploy

```bash
pnpm wrangler login
pnpm run deploy:cf
```

### Required environment variables

Set production secrets in Cloudflare Worker before deploy (for example `DATABASE_URL`):

```bash
pnpm wrangler secret put DATABASE_URL
```

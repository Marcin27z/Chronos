# Dual Adapter Setup - Cloudflare & Node

## Overview

This project uses a dual-adapter configuration to support both Cloudflare Pages deployment and local E2E testing with Playwright.

## Configuration

The setup automatically selects the appropriate adapter based on the environment:

- **Production (Cloudflare Pages)**: Uses `@astrojs/cloudflare` adapter
- **Local Development/Testing**: Uses `@astrojs/node` adapter

### Adapter Selection Logic

Located in `astro.config.mjs`:

```javascript
const isCloudflare = process.env.CF_PAGES === "1" || process.env.CLOUDFLARE_BUILD === "1";

adapter: isCloudflare
  ? cloudflare({ platformProxy: { enabled: true } })
  : node({ mode: "standalone" })
```

## Available Scripts

### Build Scripts

- `npm run build` - Builds for local preview/testing (uses Node adapter)
- `npm run build:cf` - Builds for Cloudflare deployment (uses Cloudflare adapter)

### Preview

- `npm run preview` - Runs local preview server (port 3000 by default)
- `npm run preview -- --port 4322` - Runs preview on custom port

### E2E Tests

- `npm run test:e2e` - Runs Playwright E2E tests (automatically builds and starts preview)

## Why Two Adapters?

### Node Adapter (Local Development)

- Works with `astro preview` out of the box
- Compatible with Playwright's `webServer` configuration
- Enables local E2E testing without Cloudflare emulation
- Simpler debugging and faster iteration

### Cloudflare Adapter (Production)

- Required for Cloudflare Pages deployment
- Provides access to Cloudflare Workers runtime
- Enables use of Cloudflare-specific features (KV, Durable Objects, etc.)

## Environment Variables

### Cloudflare Pages

During Cloudflare Pages builds, the following environment variables are automatically set:

- `CF_PAGES=1` - Indicates build is running on Cloudflare Pages

### Manual Cloudflare Build

To manually build with Cloudflare adapter locally:

```bash
npm run build:cf
```

This sets `CLOUDFLARE_BUILD=1` to trigger Cloudflare adapter selection.

## Playwright Configuration

The Playwright config (`playwright.config.ts`) automatically:

1. Builds the project with Node adapter
2. Starts preview server on port 4322
3. Runs E2E tests against the preview server
4. Shuts down the server after tests complete

## Troubleshooting

### Preview Port Already in Use

If you see `EADDRINUSE` error:

```bash
npm run preview -- --port 4322
```

This uses a different port than the default dev server (3000).

### E2E Tests Failing

1. Ensure `.env.test` has correct Supabase credentials
2. Run `npm run build` before manual preview
3. Check preview server is accessible at `http://localhost:4322`

### Cloudflare-specific Features Not Working Locally

Cloudflare-specific features (KV, Durable Objects) only work with Cloudflare adapter. For local testing of these features, use `wrangler pages dev` instead of `astro preview`.

## Dependencies

Required packages:

- `@astrojs/node` (devDependency) - For local preview
- `@astrojs/cloudflare` (dependency) - For production deployment
- `cross-env` (devDependency) - For cross-platform environment variables




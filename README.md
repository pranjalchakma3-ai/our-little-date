# Our Little Date 💗

A polished romantic date-proposal experience built with React, TypeScript, and Vite.

**Live site:** https://pranjalchakma3-ai.github.io/our-little-date/

## Run locally

```bash
pnpm install
pnpm dev
```

Then open the local URL printed by Vite.

## Quality checks

```bash
pnpm lint
pnpm build
```

## Routes

- `/` — proposal and runaway NO button
- `/plan` — date planner
- `/contribution` — playful demo contribution and QR
- `/reveal` — animated love letter

The QR encodes the deployed origin plus `/reveal`. On localhost, use the on-screen fallback button when testing across devices. No payment service or backend is connected.

SPA rewrites are included for both Netlify (`public/_redirects`) and Vercel (`vercel.json`) so direct QR navigation to `/reveal` works after deployment.

The included GitHub Actions workflow deploys every push to `main` to GitHub Pages. It also publishes `index.html` as `404.html`, allowing direct navigation to the reveal route on GitHub Pages.

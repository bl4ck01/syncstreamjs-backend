This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started (Bun)

First, run the development servers with Bun:

```bash
# Start the Go proxy (default :8081)
# Windows PowerShell
$env:PROXY_ADDR=":8081"; go run ./proxy
# Linux/macOS
# PROXY_ADDR=":8081" go run ./proxy

# In another terminal, start the frontend
cd frontend
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

The browser calls the proxy directly using `NEXT_PUBLIC_PROXY_URL` (no Next.js rewrites).

### Environment Variables

Create `frontend/.env.local` to override defaults if needed:

```
# Public URL for the proxy used by the browser
NEXT_PUBLIC_PROXY_URL=http://localhost:8081

# Backend API base (used by server actions and middleware)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000/api/v1
```

## Proxy Integration

The frontend integrates with the Go proxy server which provides:

- **GET /test** - Lightweight connection validation (used in playlist dialog)
- **GET /get** - Full data fetch with all categories and streams (used by playlist store)
- **GET /health** - Health check endpoint

The frontend calls these endpoints directly from the browser using `NEXT_PUBLIC_PROXY_URL`.

## Notes

- All development tooling uses Bun. Prefer `bun install`, `bun dev`, etc.
- Shared proxy utilities are in `src/lib/proxy.js` to avoid code duplication.
- The `/test` endpoint is fast and used for credential validation without fetching all data.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

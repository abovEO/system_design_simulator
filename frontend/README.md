# System Design Simulator frontend

React + TypeScript authentication interface for the Django REST API.

## Run locally

Use Node.js 22.12+ (or 20.19+).

1. Start Django from `backend`: `python manage.py migrate`, then `python manage.py runserver`.
2. From `frontend`, run `npm install` and `npm run dev`.
3. Open the local URL printed by Vite.

Vite proxies `/api` to `http://127.0.0.1:8000`. For production, route `/api` to Django on the same origin, or set `VITE_API_BASE_URL` to the full authentication API base URL before building (for example `https://api.example.com/api/auth`). A separate API origin requires backend CORS configuration.

## Authentication

- Create an account with first name, last name, username, email, password, and password confirmation, then sign in.
- Sign-in uses a **username**, matching Django’s JWT endpoint.
- The profile is fetched from the authenticated API; expired access tokens are refreshed once before retrying.
- Tokens are stored in session storage, survive reloads in the same tab, and are cleared on sign-out or a rejected refresh. If storage is unavailable, the session stays in memory.
- Sign-out clears the browser session; the backend does not currently expose a token revocation endpoint.
- Backend validation messages, network errors, and loading states appear in the form.

## Checks

- `npm run build` — TypeScript checks and production bundle.
- `npm run lint` — ESLint.
- `npm test` — authentication API and session handling tests with mocked responses.

# EVFlow deployment

One Node process serves the frontend (`public/`) and the API (`/api`).

Render / Railway / Fly:

- Build: `npm install`
- Start: `npm start`
- Optional env: `JWT_SECRET`, `DEMO_MODE`, `OTP_MODE`

Note: SQLite lives on local disk, so free tiers reset data on redeploy. Fine for a demo
(DEMO_MODE re-seeds on boot). Vercel/Netlify are not suitable (no persistent disk, no ticker).

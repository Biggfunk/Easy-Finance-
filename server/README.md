# FundTrack server

A small backend whose only job is to talk to [Plaid](https://plaid.com) on
FundTrack's behalf. Plaid's secret key must never be shipped to the browser
— anyone could read it out of your page's source and use it — so this
exists purely to hold it and make the handful of calls that need it.

The frontend (the rest of this repo, on GitHub Pages or wherever you host
it) never talks to Plaid directly. It only talks to this server.

## 1. Get Plaid sandbox keys (free)

1. Sign up at [dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
2. Go to **Team Settings → Keys** and copy your `client_id` and the
   **Sandbox** `secret`
3. Sandbox works with Plaid's fake test banks — no real bank account or
   money is involved. Use username `user_good` / password `pass_good`
   when Plaid Link asks you to log in to a test bank.

## 2. Run it locally

```
cd server
cp .env.example .env
# edit .env and paste in your client_id and sandbox secret
npm install
npm start
```

This starts the server on `http://localhost:4000`. In the FundTrack app,
open **Bank Sync** and set the server URL to that address.

## 3. Connect a (sandbox) bank

Click **Connect a bank**, pick any institution in the Plaid Link window
(e.g. "Platypus Bank"), and log in with `user_good` / `pass_good`. Click
**Sync transactions** afterward to pull its fake transaction history into
FundTrack.

## 4. Deploying it for real use

To use this from your phone (rather than only `localhost` on your
computer), deploy `server/` to any host that runs a persistent Node
process — [Render](https://render.com) and [Railway](https://railway.app)
both have free tiers and work well for this:

1. Create a new **Web Service** pointed at this repo, with the root
   directory set to `server/`
2. Build command: `npm install` — start command: `npm start`
3. Add the same environment variables from `.env` (`PLAID_CLIENT_ID`,
   `PLAID_SECRET`, `PLAID_ENV`, `ALLOWED_ORIGIN` — set this to your GitHub
   Pages URL, e.g. `https://biggfunk.github.io`)
4. Once deployed, use that service's URL as the server URL in FundTrack's
   Bank Sync settings

## 5. Going from Sandbox to real banks

Everything above uses Plaid's Sandbox, which only connects to fake test
banks. To link your *actual* bank, Plaid requires your app to go through
their **Production** access review (they ask what you're building and how
you handle data) before issuing Production keys. See
[Plaid's docs on going live](https://plaid.com/docs/quickstart/glossary/#production)
for their current process — this is Plaid's approval step, not something
this code can skip.

## What this server stores

`server/data/items.json` (gitignored, created automatically) holds one
entry per linked bank: its Plaid `access_token`, a sync cursor, and the
institution's name. Nothing here is encrypted — this is built for personal,
single-user use on a server only you control. Don't commit that file or
your `.env`, and don't deploy this server somewhere with public write
access to its filesystem.

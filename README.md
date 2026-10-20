# IPTV

A private web app for watching an Xtream-compatible IPTV service: Live TV with a TV guide,
Movies, Series, search, favorites, Chromecast casting and an installable app, in a design that
follows Apple's (iOS / macOS) look and feel.

It is built to run on **your own computer**. The app is only reachable from that computer;
the one exception is a small casting port that serves short-lived stream links to a Chromecast
on your home network.

## Features

- **Live TV** — player-first layout, fast channel zapping (↑/↓, Page Up/Down, media keys,
  picture-in-picture next/previous), last channel (L), favorites, recently watched, automatic
  reconnect when a stream drops, and what's on now/next for every channel.
- **TV Guide** — a scrollable timeline grid; your provider's guide plus any XMLTV sources you add.
- **Movies & Series** — per-category browsing that stays fast on very large catalogues
  (tested with 63,000+ movies), detail pages, seasons and episodes. Nothing streams until you
  press Play (accounts often allow only one connection).
- **Search** — across all channels, movies and series at once.
- **Cast to TV** — Google Cast from Chrome/Edge; the TV fetches the stream itself.
- **Installable app (PWA)** — opens in its own window; offline page when there's no connection.
- **Profiles** — several IPTV services; edit, switch, delete.

## Requirements

- Node.js 20 or newer (developed on 24)
- pnpm 10 (`corepack enable` gives you the pinned version)

## Getting started

```bash
pnpm install
cp .env.example .env
```

Generate the encryption key for stored passwords and put it in `.env` as
`NUXT_PROFILE_ENCRYPTION_KEY`:

```bash
openssl rand -base64 32
```

Then start the app and open <http://localhost:3000>:

```bash
pnpm dev
```

Add your service under **Profiles** (server URL, username, password). Use **Test connection**
before saving.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server on <http://localhost:3000> |
| `pnpm build` | Production build into `.output/` |
| `pnpm preview` | Run the production build locally |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm typecheck` | Vue + TypeScript type check |
| `pnpm test` | Unit tests (Vitest) |

## Configuration

All settings are environment variables (see `.env.example`).

| Variable | Default | Purpose |
| --- | --- | --- |
| `NUXT_PROFILE_ENCRYPTION_KEY` | — (required) | Base64, 32 bytes. Encrypts profile passwords at rest. |
| `NUXT_CAST_PORT` | `3001` | Port on your home network that serves stream links to a Chromecast. `0` turns casting off. |
| `NUXT_CAST_BASE_URL` | auto | Overrides the detected `http://<this computer's IP>:<port>` (several network adapters, VPN). |
| `HOST` / `PORT` | all interfaces / `3000` | Where the production server listens. Use `HOST=127.0.0.1`. |

App data lives in `.data/` (git-ignored): profiles with encrypted passwords, favorites and
history, and the built TV guide. Back it up together with your `.env` — without the key the
stored passwords can't be decrypted.

## Running in production

```bash
pnpm build
HOST=127.0.0.1 node --env-file=.env .output/server/index.mjs
```

`HOST=127.0.0.1` keeps the app on this computer only. (Requests from other devices are refused
anyway, but static files such as the JavaScript bundle would still be served without it.)
`GET /api/health` returns `{ "ok": true }` for monitoring.

## Security model

- **Passwords** are encrypted with AES-256-GCM before they are written to disk, and never sent
  to the browser. Editing a profile leaves the password field blank to keep the stored one.
- **Streams** go through the server: the browser and the TV only ever see opaque, expiring
  tokens, never your provider's address or credentials.
- **Network**: the app answers only to the computer running it. The cast port serves nothing but
  tokenized stream links (no pages, settings or credentials).
- **Headers** in production: a content-security policy, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer` and friends.
- There is **no login**, because the app isn't reachable from other devices. Don't expose it to
  your network or the internet without adding authentication and HTTPS first.

## Casting to a Chromecast

Use the cast button in the player (Chrome or Edge on a computer or Android). The TV fetches the
stream from the cast port on your home network, so this computer and the TV must be on the same
network. The first time, macOS may ask whether `node` may accept incoming connections — allow it.

Accounts that allow one connection at a time: casting moves the stream to the TV, and playback
here stops. Chromecast doesn't officially support MKV, so those movies may not cast; 4K/HEVC
channels need a Chromecast with Google TV, Chromecast Ultra or Google TV Streamer.

## Installing as an app

Chrome/Edge: the install icon in the address bar (or **Settings → App → Install**). Safari on Mac:
**File → Add to Dock**. The service worker runs only in production builds; it caches the app's
own build files and an offline page, never streams, API responses or pages.

## TV guide

Your provider's own guide is always used. Many providers publish no programme data, so you can
add XMLTV sources in **Settings → TV Guide** (a few free suggestions are listed there). Guides
refresh every 12 hours.

## Troubleshooting

- **"This channel isn't responding"** — the channel may be offline, or your account is already
  streaming on another device.
- **A movie won't play in the browser** — AVI/WMV never play in browsers; MKV plays in
  Chrome/Edge but not Safari/Firefox. Use **Open stream link** to play it elsewhere.
- **Casting can't reach the TV** — check both are on the same network, the macOS firewall allows
  `node`, and set `NUXT_CAST_BASE_URL` if this computer has several network adapters.

## Tech stack

Nuxt 4 (Vue 3, Nitro server routes), Nuxt UI 4 (Tailwind CSS 4), Pinia, hls.js, TanStack Virtual,
htmlparser2 (streaming XMLTV), zod, Vitest.

```text
app/      pages, components, composables, stores (client)
server/   API routes, stream proxy, Xtream client, TV guide, cast port (Nitro)
shared/   types used by both
tests/    unit tests
```

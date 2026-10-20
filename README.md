# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

### Running it privately

The app is meant to be reachable only from the computer running it. A production server listens on
every network interface by default, so bind it to localhost:

```bash
HOST=127.0.0.1 node --env-file=.env .output/server/index.mjs
```

(Requests from other devices are refused anyway, but static files such as the JavaScript bundle would
still be served without `HOST`.)

### Casting to a Chromecast

A second port (`NUXT_CAST_PORT`, default 3001) listens on the home network and serves only short-lived,
tokenized stream links for the TV — no pages, settings or credentials. macOS may ask once whether
`node` may accept incoming connections: allow it, or casting can't reach the TV. Set `NUXT_CAST_PORT=0`
to turn casting off.

### Installing as an app

Chrome/Edge: the install icon in the address bar (or Settings → App → Install app). Safari on Mac:
File → Add to Dock. The service worker only runs in production builds.

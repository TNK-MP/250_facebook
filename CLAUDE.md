# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GoLive Studio — a **fake-livestream demo** (entertainment use only; it does not connect to or broadcast on any real service). A user enters a username + streamer display name and picks one of five platform "looks"; the app opens a page that turns on their webcam and dresses it up to resemble that platform's live UI.

## Running

No build step, no package manager — plain HTML/CSS/vanilla JS. Camera access (`getUserMedia`) requires a secure context, so serve over `localhost`, never `file://`:

```bash
python3 -m http.server 8000   # from project root, then visit http://localhost:8000
```

There are no tests, linters, or build tooling.

## Architecture

The landing page (`index.html` + `assets/js/landing.js`) validates the form and redirects to `platforms/<id>.html?username=...&streamer=...`. **The platform is never passed in the URL** — each platform page infers its own id from its filename (`stream-session.js` strips `.html` off `location.pathname`).

Two shared modules attach everything to a global `window.GoLive` namespace (loaded in this order on every platform page: `platforms.js` → `stream-session.js` → the platform's own JS):

- `assets/js/platforms.js` — the platform **registry**, the single source of truth for all five platforms (`id`, `name`, `page`, `color`, `icon`). The landing picker is built from it; each page looks itself up via `GoLive.getPlatform(id)`. Add/rename a platform here only. An `id` must match both `platforms/<id>.html` and `assets/js/platforms/<id>.js`.
- `assets/js/stream-session.js` — the shared API every platform page gets for free:
  - `GoLive.session()` → `{ username, streamer, platform }`
  - `GoLive.startCamera(videoEl, opts?)` → `Promise<MediaStream>`, pipes webcam into a `<video>`
  - `GoLive.startTimer(el)` → ticks an `HH:MM:SS` clock, returns a stop function

Each `assets/js/platforms/<id>.js` is a small starter bootstrap that reads the session, fills placeholders, starts the timer, and starts the camera. The `platforms/<id>.html` pages currently share a placeholder ("stub") layout styled by `assets/css/stream-stub.css`; the intended work is to replace that with a realistic per-platform UI.

## Ownership convention (avoid merge conflicts)

Each platform is owned by one person. When working on a platform, touch **only** its three files: `platforms/<id>.html`, `assets/js/platforms/<id>.js`, and `assets/css/<id>.css` (create the CSS and link it in the HTML). Do **not** edit the shared files — `platforms.js`, `stream-session.js`, `assets/css/base.css`, or `index.html` — without coordinating, since every page depends on them.

Platform ids: `instagram`, `youtube`, `twitch`, `kick`, `facebook`.

When building a platform page, keep a `data-camera` `<video>` element (or create your own and pass it to `GoLive.startCamera`); the placeholder markup also wires `data-streamer`, `data-username`, `data-platform-name`, `data-timer`, and `data-camera-error` hooks.

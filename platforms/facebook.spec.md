# Facebook Live — Page Spec

Spec-driven build for the Facebook platform look in GoLive Studio.
Owner: Facebook builder. Scope: **only** the three Facebook-owned files
(`platforms/facebook.html`, `assets/js/platforms/facebook.js`,
`assets/css/facebook.css`). No shared files are edited.

## 1. Goal

Turn the placeholder stub into a convincing **Facebook Live** broadcast view:
the user's webcam is the live video, dressed in Facebook's live UI — LIVE badge,
fluctuating viewer count, streamer identity + Follow, a scrolling live comment
feed, floating reaction emojis, and the Like / Comment / Share action bar with
Facebook's reaction picker.

Entertainment/demo only — nothing is broadcast anywhere.

## 2. Inputs (from the shared platform contract — do not re-implement)

Provided by `platforms.js` + `stream-session.js`, already loaded before our JS:

- `GoLive.session()` → `{ username, streamer, platform }`
  - `platform` = `{ id:"facebook", name:"Facebook Live", color:"#1877f2", icon }`
- `GoLive.startCamera(videoEl)` → `Promise<MediaStream>`
- `GoLive.startTimer(el)` → live `HH:MM:SS` clock, returns a stop fn

## 3. The chat bank seam (senior dev owns this)

Comments/reactions data will come from a **shared chat bank** owned by the
senior dev; every platform pulls from it. It is a shared resource, so we do
**not** author it — we consume it through an adapter and fall back to a local
seed pool until it lands.

Adapter accepts whichever surface the bank ships (detected at runtime):

```
GoLive.chat.messages : Array<{ user, text, avatar? }>   // static pool, we sample it
GoLive.chat.next()   : { user, text, avatar? }          // we pull one on a tick
GoLive.chat.subscribe(fn) : () => void                  // bank pushes; fn(msg) per message
```

Message shape consumed: `{ user: string, text: string, avatar?: string }`.
`avatar` is only honored if it is an `http(s)` URL (otherwise we render
initials), so a bank value can't inject arbitrary CSS/resources. If
`GoLive.chat` is missing entirely, use `FALLBACK_MESSAGES` local to
`facebook.js` (clearly marked as a stand-in). The spec assumes the bank loads
before our JS; as a safeguard, if it attaches late the feed upgrades off the
fallback to the real bank within a few seconds.

## 4. UI regions

1. **Stage** — full-viewport webcam `<video>` (`data-camera`), object-fit cover,
   dark backdrop, `data-camera-error` overlay if the camera is denied.
2. **Top-left status** — red **LIVE** pill + live **viewer count** (eye icon),
   count drifts realistically over time.
3. **Top bar** — round avatar (initials), streamer display name,
   `@username · started <timer>`, and a **Follow** button (toggles Following).
4. **Comment feed** (bottom-left) — newest comments slide in and stack upward,
   older ones fade under a top gradient mask; each row = avatar + bold name +
   text. Auto-fed from the chat bank on an interval.
5. **Composer** — input "Comment as @username" + send; pressing Enter/Send adds
   the user's own comment to the feed locally.
6. **Reaction lane** (bottom-right) — floating emoji reactions rise, drift, fade.
   Auto-emitted periodically; also emitted on demand from the action bar.
7. **Action bar** — **Like / Comment / Share**. Hovering Like reveals the
   Facebook reaction picker (👍 ❤️ 😆 😮 😢 😡); choosing one emits that floating
   reaction and sets the Like button state. Comment focuses the composer.

## 5. Behavior & feel

- Facebook blue `#1877f2`; system UI font stack; Facebook-style rounded cards
  and translucent overlays layered over the video.
- Everything is an overlay on the live video — the video is never obscured
  center-frame.
- Motion is subtle and performant (CSS transforms/opacity only, no layout
  thrash). Comment feed and reaction lane self-clean to avoid unbounded DOM.
- Fully responsive down to a phone-width viewport.
- Accessible: buttons are real `<button>`s with labels; picker keyboard-usable;
  `prefers-reduced-motion` dampens the float animations.

## 6. Acceptance

- Loads via `platforms/facebook.html?username=...&streamer=...` over localhost;
  camera turns on and shows in-frame.
- Streamer name + `@username` + live timer render from `GoLive.session()`.
- Comment feed streams from the chat bank when present, from the fallback pool
  otherwise — swapping in the real bank requires **no markup change**.
- Like reaction picker works; clicking a reaction floats it; typing a comment
  adds it to the feed.
- No edits to any shared file; page has zero console errors with the bank absent.

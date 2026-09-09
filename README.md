# GoLive Studio (demo)

A fake-livestream tool for **entertainment / demo use only**. A user enters a
username, a streamer display name, and picks one of five platform "looks". The
app then opens a page that turns on their webcam and dresses it up to resemble
that platform's live UI. It does **not** connect to or broadcast on any real
service.

## Run it

Camera access requires `localhost` or HTTPS, so open it through a local server
(not `file://`):

```bash
# from the project root
python3 -m http.server 8000
# then visit http://localhost:8000
```

Fill in the form, choose a platform, and click **Go live**. You'll land on
`platforms/<platform>.html?username=...&streamer=...` with the camera running.

## How it's wired

```
index.html                     Landing page (form + platform picker)
assets/css/base.css            Shared design tokens + reset (all pages)
assets/css/landing.css         Landing page styles
assets/css/stream-stub.css     Placeholder styling for un-built platform pages
assets/js/platforms.js         ⭐ Registry: the 5 platforms (single source of truth)
assets/js/landing.js           Landing form logic + redirect
assets/js/stream-session.js    ⭐ Shared helpers for every platform page
platforms/<id>.html            One page per platform (built by one person each)
assets/js/platforms/<id>.js    That platform's bootstrap
assets/css/<id>.css            That platform's styles (create as needed)
```

The landing page passes data to platform pages through the URL query string
(`?username=...&streamer=...`). The platform is implied by which page loads.

## For the 5 platform builders

Each platform is owned by one person. To avoid merge conflicts, **only touch
the files for your platform**:

| Platform  | HTML                        | JS                                  | CSS (create)              |
|-----------|-----------------------------|-------------------------------------|---------------------------|
| Instagram | `platforms/instagram.html`  | `assets/js/platforms/instagram.js`  | `assets/css/instagram.css`|
| YouTube   | `platforms/youtube.html`    | `assets/js/platforms/youtube.js`    | `assets/css/youtube.css`  |
| Twitch    | `platforms/twitch.html`     | `assets/js/platforms/twitch.js`     | `assets/css/twitch.css`   |
| Kick      | `platforms/kick.html`       | `assets/js/platforms/kick.js`       | `assets/css/kick.css`     |
| Facebook  | `platforms/facebook.html`   | `assets/js/platforms/facebook.js`   | `assets/css/facebook.css` |

**Do not edit** `platforms.js`, `stream-session.js`, `base.css`, or the landing
page unless you're coordinating a shared change.

### The shared API you get for free

Load order in your page is already set: `platforms.js` → `stream-session.js` →
your platform JS. Inside your JS you have:

```js
const s = GoLive.session();
// s.username  -> the handle the user typed
// s.streamer  -> the display name to show
// s.platform  -> { id, name, color, icon } for your platform

GoLive.startCamera(videoEl);   // returns a Promise<MediaStream>; pipes webcam in
GoLive.startTimer(timerEl);    // ticks a live HH:MM:SS clock; returns a stop fn
```

### Your task

Replace the placeholder markup/styles in your `platforms/<id>.html` so it looks
like a real live stream on your platform (header, avatar, viewer count, chat,
reactions, like button, etc.). Keep the `data-camera` `<video>` element (or
create your own and pass it to `GoLive.startCamera`). Everything else is yours.

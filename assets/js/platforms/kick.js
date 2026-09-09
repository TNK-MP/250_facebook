/* Kick page bootstrap.
 *
 * Drives everything that makes the static markup feel like a live Kick page:
 * camera, uptime clock, viewer count, the channel rail, a simulated chat you
 * can talk in, and channel switching so you can watch other people's channels.
 *
 * Shared helpers used: GoLive.session(), GoLive.startCamera(), GoLive.startTimer(),
 * GoLive.startViewerCount().
 */
(function () {
  const s = GoLive.session(); // { username, streamer, viewers, platform }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ------------------------------------------------------------- helpers */

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rand(0, arr.length - 1)];

  /** 8_400 -> "8.4K", 1_250_000 -> "1.25M" */
  function compact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  /** Stable hue from a string, so a name always gets the same colour. */
  function hueFor(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }

  const colorFor = (name) => `hsl(${hueFor(name)} 85% 65%)`;
  const initial = (str) => (String(str).trim()[0] || "?").toUpperCase();
  const handleFor = (name) => name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

  /* -------------------------------------------------------------- toasts */

  const toastRegion = $("[data-toasts]");

  function toast(text, emphasis) {
    if (!toastRegion) return;
    const el = document.createElement("div");
    el.className = "toast";
    if (emphasis) {
      const strong = document.createElement("strong");
      strong.textContent = emphasis;
      el.append(strong, document.createTextNode(" " + text));
    } else {
      el.textContent = text;
    }
    toastRegion.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ------------------------------------------------------- channel models */

  // Your own channel, seeded from the landing form.
  const SELF = {
    name: s.streamer,
    handle: s.username,
    game: "Just Chatting",
    title: pick([
      `${s.streamer} is live — come hang out`,
      `late night stream w/ ${s.streamer}`,
      `first stream of the week! !socials !discord`,
      `chill vibes only :: ${s.streamer}`,
    ]),
    followers: rand(24000, 480000),
    viewers: s.viewers,
    verified: true,
    following: true,
    self: true,
    bio:
      `${s.streamer} streams on Kick as @${s.username}. This is a GoLive Studio ` +
      `demo channel — the video is your own webcam and the chat is simulated.`,
  };

  // `slug` is the real kick.com channel, used to embed their live player.
  // The follower/viewer/title values are placeholders: Kick's channel API
  // sends no CORS header, so the browser can't read the real ones from here.
  const OTHERS = [
    { name: "xQc", slug: "xqc", game: "Just Chatting", title: "JUICER KING | !prime !socials", followers: 2600000, viewers: 48200, verified: true, following: true },
    { name: "Amouranth", slug: "amouranth", game: "IRL", title: "hot tub stream :: !socials", followers: 1450000, viewers: 12800, verified: true, following: true },
    { name: "Trainwreckstv", slug: "trainwreckstv", game: "Slots", title: "late night gambling talk", followers: 1100000, viewers: 9400, verified: true, following: true },
    { name: "AdinRoss", slug: "adinross", game: "Just Chatting", title: "BIG ANNOUNCEMENT TODAY", followers: 1900000, viewers: 31500, verified: true, following: true },
    { name: "Nickmercs", slug: "nickmercs", game: "Warzone", title: "MFAM grind — ranked push", followers: 860000, viewers: 7300, verified: true, following: false },
    { name: "Destiny", slug: "destiny", game: "Politics", title: "debate night, calling in guests", followers: 410000, viewers: 4100, verified: false, following: false },
    { name: "kaicenat", slug: "kaicenat", game: "Just Chatting", title: "MAFIATHON — day 12", followers: 2200000, viewers: 62700, verified: true, following: false },
    { name: "iceposeidon", slug: "iceposeidon", game: "IRL", title: "walking around downtown", followers: 520000, viewers: 2800, verified: false, following: false },
  ];

  OTHERS.forEach((c) => {
    c.handle = c.slug || handleFor(c.name);
    c.self = false;
    c.bio =
      `${c.name} streams ${c.game} on Kick. Follow the channel to get a ` +
      `notification every time they go live. (Simulated channel.)`;
  });

  const CHANNELS = [SELF].concat(OTHERS);

  let current = null; // the channel on screen
  let counter = null; // GoLive.startViewerCount() handle for `current`

  /* ------------------------------------------------------ identity fill-in */

  // These describe YOU, not the channel being watched, so they're set once.
  $$("[data-streamer]").forEach((el) => (el.textContent = s.streamer));
  $$("[data-username]").forEach((el) => (el.textContent = "@" + s.username));
  $$("[data-avatar-initial]").forEach((el) => (el.textContent = initial(s.streamer)));

  /* ------------------------------------------------------------ the clock */

  // Two uptime readouts (player overlay + stats row); both tick from page load.
  $$("[data-timer]").forEach((el) => GoLive.startTimer(el));

  /* ----------------------------------------------------------- the camera */

  const video = $("[data-camera]");
  const errorEl = $("[data-camera-error]");
  let cameraFailed = false;

  /** The camera warning is about YOUR channel, so hide it while watching others. */
  function syncCameraError() {
    if (!errorEl) return;
    const onOwnChannel = !current || current.self;
    errorEl.style.display = cameraFailed && onOwnChannel ? "grid" : "none";
  }

  GoLive.startCamera(video).catch((err) => {
    console.error("Camera error:", err);
    cameraFailed = true;
    syncCameraError();
  });

  /* ------------------------------------------------- simulated feed (canvas)
   *
   * Your own channel shows the webcam. Every other channel needs *something*
   * in the player, and this demo deliberately talks to no real service — so
   * their "feed" is drawn here: a scene themed to the channel's own colour,
   * with a facecam box, drifting light, and an audio meter that reacts.
   */

  const sim = $("[data-sim]");
  const simCtx = sim ? sim.getContext("2d") : null;
  let simChannel = null; // non-null while the canvas is on screen
  let simRaf = null;
  let simClock = 0;
  let simLast = 0;
  let simW = 0;
  let simH = 0;

  function sizeSim() {
    if (!sim || !simCtx) return;
    const rect = sim.getBoundingClientRect();
    simW = Math.max(1, Math.round(rect.width));
    simH = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sim.width = Math.round(simW * dpr);
    sim.height = Math.round(simH * dpr);
    simCtx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawSim(t) {
    if (!simCtx || !simChannel) return;
    const ctx = simCtx;
    const w = simW;
    const h = simH;
    const hue = hueFor(simChannel.name);

    // backdrop: slow two-tone wash in the channel's hue
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, `hsl(${(hue + Math.sin(t / 7) * 12).toFixed(1)} 55% 17%)`);
    bg.addColorStop(1, "#07090a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // drifting light blobs
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const ph = t * (0.16 + i * 0.05) + i * 2.1;
      const cx = w * (0.5 + 0.34 * Math.cos(ph));
      const cy = h * (0.5 + 0.3 * Math.sin(ph * 1.3));
      const rad = Math.min(w, h) * (0.3 + 0.05 * Math.sin(t + i));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `hsla(${(hue + i * 40) % 360} 90% 60% / 0.20)`);
      g.addColorStop(1, "hsla(0 0% 0% / 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = "source-over";

    // faint scanlines scrolling upward — reads as "video"
    ctx.fillStyle = "rgba(255,255,255,0.022)";
    const offset = (t * 26) % 6;
    for (let y = -offset; y < h; y += 6) ctx.fillRect(0, y, w, 2);

    // centre plate: avatar + name + category
    const plateW = Math.min(w * 0.62, 420);
    const plateH = Math.min(h * 0.36, 150);
    const px = (w - plateW) / 2;
    const py = (h - plateH) / 2;
    ctx.fillStyle = "rgba(6,8,9,0.55)";
    roundRect(ctx, px, py, plateW, plateH, 16);
    ctx.fill();

    const av = Math.min(plateH * 0.52, 74);
    const ax = px + 26;
    const ay = py + (plateH - av) / 2;
    ctx.fillStyle = `hsl(${hue} 85% 62%)`;
    roundRect(ctx, ax, ay, av, av, av * 0.3);
    ctx.fill();

    ctx.fillStyle = "#0b0e0f";
    ctx.font = `900 ${Math.round(av * 0.5)}px ${
      "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    }`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial(simChannel.name), ax + av / 2, ay + av / 2 + 1);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${Math.round(Math.min(plateH * 0.2, 24))}px ${
      "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    }`;
    ctx.fillText(simChannel.name, ax + av + 18, py + plateH * 0.42);

    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = `600 ${Math.round(Math.min(plateH * 0.14, 15))}px ${
      "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    }`;
    ctx.fillText(simChannel.game, ax + av + 18, py + plateH * 0.62);

    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.font = `500 ${Math.round(Math.min(plateH * 0.12, 13))}px ${
      "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    }`;
    ctx.fillText("simulated feed", ax + av + 18, py + plateH * 0.8);

    // facecam box, bottom-left, with a bobbing silhouette
    const camW = Math.min(w * 0.2, 150);
    const camH = camW * 0.62;
    const cxx = 20;
    const cyy = h - camH - 58;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRect(ctx, cxx, cyy, camW, camH, 10);
    ctx.fill();
    ctx.strokeStyle = `hsla(${hue} 90% 60% / 0.5)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const bob = Math.sin(t * 1.7) * 3;
    const headR = camH * 0.2;
    ctx.fillStyle = `hsla(${hue} 60% 70% / 0.55)`;
    ctx.beginPath();
    ctx.arc(cxx + camW / 2, cyy + camH * 0.42 + bob, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cxx + camW / 2, cyy + camH * 0.95 + bob, headR * 1.9, headR * 1.5, 0, Math.PI, 0);
    ctx.fill();

    // audio meter along the bottom
    const bars = 48;
    const gap = 2;
    const bw = Math.max(1, (w - 40 - gap * (bars - 1)) / bars);
    for (let i = 0; i < bars; i++) {
      // squared/cubed sines give peaks and troughs instead of a flat band
      const a = Math.abs(Math.sin(t * 3.1 + i * 0.55));
      const b = Math.abs(Math.sin(t * 1.7 + i * 1.1));
      const amp = 0.08 + 0.55 * a * a + 0.3 * b * b * b;
      const bh = 3 + 26 * Math.min(1, amp);
      ctx.fillStyle = `hsla(${hue} 90% 58% / ${(0.22 + amp * 0.45).toFixed(3)})`;
      ctx.fillRect(20 + i * (bw + gap), h - 20 - bh, bw, bh);
    }

    // vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  function simFrame(ts) {
    if (!simLast) simLast = ts;
    const dt = Math.min(100, ts - simLast); // clamp after tab-away
    simLast = ts;
    simClock += dt;
    drawSim(simClock / 1000);
    simRaf = requestAnimationFrame(simFrame);
  }

  function simRun() {
    if (simRaf || !simChannel) return;
    simLast = 0;
    simRaf = requestAnimationFrame(simFrame);
  }

  function simHalt() {
    if (!simRaf) return;
    cancelAnimationFrame(simRaf);
    simRaf = null;
  }

  /** Show the canvas feed for someone else's channel. */
  function showSim(ch) {
    if (!sim || !simCtx) return;
    simChannel = ch;
    sim.hidden = false;
    if (video) video.hidden = true;
    sizeSim();
    drawSim(simClock / 1000); // paint one frame immediately
    simRun();
  }

  /** Back to the webcam. */
  function hideSim() {
    simHalt();
    simChannel = null;
    if (sim) sim.hidden = true;
    if (video) video.hidden = false;
  }

  window.addEventListener("resize", () => {
    if (!simChannel) return;
    sizeSim();
    drawSim(simClock / 1000);
  });
  document.addEventListener("fullscreenchange", () => {
    if (!simChannel) return;
    // the canvas box changes size on the way in and out of fullscreen
    setTimeout(() => {
      sizeSim();
      drawSim(simClock / 1000);
    }, 60);
  });

  /* ------------------------------------------------------ the real Kick feed
   *
   * Other channels load their actual Kick player in an iframe, so you see and
   * hear the live stream. player.kick.com sends no X-Frame-Options or CSP, so
   * framing is allowed. If the network is down (or you switch to it manually)
   * the canvas feed above stands in instead.
   */

  const embed = $("[data-embed]");
  let feedMode = "real"; // "real" | "sim"

  const embedActive = () => !!(embed && !embed.hidden);

  function showEmbed(ch) {
    if (!embed) return;
    hideSim();
    if (video) video.hidden = true;
    embed.hidden = false;
    const src =
      "https://player.kick.com/" + encodeURIComponent(ch.slug) + "?autoplay=true&muted=false";
    if (embed.src !== src) embed.src = src;
    if (playerEl) playerEl.classList.add("player--embed");
  }

  function hideEmbed() {
    if (!embed) return;
    embed.hidden = true;
    // dropping the src stops the stream and its audio, rather than leaving it
    // playing behind a hidden element
    if (embed.src && embed.src !== "about:blank") embed.src = "about:blank";
    if (playerEl) playerEl.classList.remove("player--embed");
  }

  /** Point the player at whatever this channel should show. */
  function applyFeed(ch) {
    if (ch.self) {
      hideEmbed();
      hideSim();
    } else if (feedMode === "real" && ch.slug && navigator.onLine !== false) {
      showEmbed(ch);
    } else {
      hideEmbed();
      showSim(ch);
    }
    syncCameraError();
    setPaused(false);
  }

  const feedModeBtn = $("[data-feed-mode]");

  function paintFeedModeBtn() {
    if (!feedModeBtn) return;
    feedModeBtn.textContent =
      feedMode === "real" ? "Show simulated feed" : "Show real stream";
  }

  if (feedModeBtn) {
    feedModeBtn.addEventListener("click", () => {
      feedMode = feedMode === "real" ? "sim" : "real";
      paintFeedModeBtn();
      if (current && !current.self) applyFeed(current); // swap without resetting chat
      toast(feedMode === "real" ? "Showing the real Kick stream" : "Showing the simulated feed");
    });
  }

  paintFeedModeBtn();

  /* --------------------------------------------------------- count painting */

  const viewerEls = $$("[data-viewers]");
  const chattersEl = $("[data-chatters]");
  const followersEl = $("[data-followers]");

  function paintCounts() {
    if (!counter) return;
    const n = counter.value;
    viewerEls.forEach((el) => (el.textContent = n.toLocaleString()));
    if (chattersEl) chattersEl.textContent = compact(Math.round(n * 0.14));
    if (current && current.railCount) current.railCount.textContent = compact(n);
  }

  function paintFollowers() {
    if (followersEl && current) followersEl.textContent = compact(current.followers);
  }

  setInterval(paintCounts, 1000);

  /* ------------------------------------------------------ channel switching */

  const channelAvatar = $("[data-channel-avatar]");
  const channelNames = $$("[data-channel-name]"); // header + about panel
  const channelBio = $("[data-channel-bio]");
  const channelVerified = $("[data-channel-verified]");
  const channelGame = $("[data-channel-game]");
  const channelHandle = $("[data-channel-handle]");
  const titleEl = $("[data-stream-title]");
  const followBtn = $("[data-follow]");
  const followLabel = $("[data-follow-label]");
  const viewingBar = $("[data-viewing-bar]");
  const viewingName = $("[data-viewing-name]");
  const chatInput = $("[data-chat-input]");

  function renderChannel(ch) {
    // Remember where the previous channel's count had drifted to, so coming
    // back to it doesn't reset the number.
    if (current && counter) {
      current.viewers = counter.value;
      counter.stop();
    }
    current = ch;

    if (channelAvatar) {
      channelAvatar.textContent = initial(ch.name);
      channelAvatar.style.background = ch.self ? "var(--kick-green)" : colorFor(ch.name);
    }
    channelNames.forEach((el) => (el.textContent = ch.name));
    if (channelBio) channelBio.textContent = ch.bio;
    if (channelVerified) channelVerified.style.display = ch.verified ? "" : "none";
    if (channelGame) channelGame.textContent = ch.game;
    if (channelHandle) channelHandle.textContent = "@" + ch.handle;
    if (titleEl) titleEl.textContent = ch.title;
    if (chatInput) chatInput.placeholder = `Send a message to ${ch.name}...`;

    // follow button reflects this channel's state
    if (followBtn) {
      followBtn.setAttribute("aria-pressed", String(!!ch.following));
      if (followLabel) followLabel.textContent = ch.following ? "Following" : "Follow";
    }

    // "you're watching someone else" bar
    if (viewingBar) {
      viewingBar.hidden = !!ch.self;
      if (viewingName) viewingName.textContent = ch.name;
    }

    // rail highlight
    CHANNELS.forEach((c) => {
      if (c.railEl) c.railEl.classList.toggle("rail__item--active", c === ch);
      // your own row stays green whether or not you're currently on it
      if (c.railAvatar) {
        c.railAvatar.style.background = c.self ? "var(--kick-green)" : colorFor(c.name);
      }
    });

    // your channel is the webcam; everyone else is their real Kick player
    applyFeed(ch);

    counter = GoLive.startViewerCount(null, { start: ch.viewers, interval: 2500 });
    paintCounts();
    paintFollowers();

    document.title = `${ch.name} - ${s.platform ? s.platform.name : "Kick"}`;

    // fresh chat for the new channel
    resetChat();
    addSystemMessage(
      ch.self
        ? `Welcome to your own channel, ${ch.name}. You're live!`
        : `Welcome to the ${ch.name} channel!`
    );
    for (let i = 0; i < 10; i++) fakeMessage();

    if (!ch.self) toast(`Now watching ${ch.name}`, "LIVE");
    renderBrowseGrid();
  }

  /* ---------------------------------------------------------- the left rail */

  function railItem(ch) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rail__item";

    const avatar = document.createElement("span");
    avatar.className = "rail__avatar";
    avatar.style.background = colorFor(ch.name);
    avatar.textContent = initial(ch.name);

    const meta = document.createElement("span");
    meta.className = "rail__meta";
    const nameEl = document.createElement("span");
    nameEl.className = "rail__name";
    nameEl.textContent = ch.self ? ch.name + " (you)" : ch.name;
    const gameEl = document.createElement("span");
    gameEl.className = "rail__game";
    gameEl.textContent = ch.game;
    meta.append(nameEl, gameEl);

    const count = document.createElement("span");
    count.className = "rail__viewers";
    count.textContent = compact(ch.viewers);

    btn.append(avatar, meta, count);
    btn.addEventListener("click", () => renderChannel(ch));
    li.appendChild(btn);

    // stash refs so renderChannel/paintCounts can update this row
    ch.railEl = btn;
    ch.railAvatar = avatar;
    ch.railCount = count;
    return li;
  }

  const followingList = $("[data-rail-following]");
  const recommendedList = $("[data-rail-recommended]");

  if (followingList) {
    followingList.appendChild(railItem(SELF));
    OTHERS.filter((c) => c.following).forEach((c) => followingList.appendChild(railItem(c)));
  }
  if (recommendedList) {
    OTHERS.filter((c) => !c.following).forEach((c) => recommendedList.appendChild(railItem(c)));
  }

  /* ------------------------------------------------------------ browse grid */

  const browse = $("[data-browse]");
  const browseGrid = $("[data-browse-grid]");
  const browseFilter = $("[data-browse-filter]");
  const browseTitle = $("[data-browse-title]");
  let browseScope = "all"; // "all" | "following"

  function browseCard(ch) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "browse__card" + (ch === current ? " browse__card--self" : "");

    const thumb = document.createElement("div");
    thumb.className = "browse__thumb";
    thumb.style.background = `linear-gradient(135deg, ${colorFor(ch.name)}, #0b0e0f)`;
    thumb.textContent = initial(ch.name);

    const live = document.createElement("span");
    live.className = "badge-live";
    live.textContent = "LIVE";

    const count = document.createElement("span");
    count.className = "badge-dark";
    count.textContent = compact(ch === current && counter ? counter.value : ch.viewers) + " watching";

    thumb.append(live, count);

    const body = document.createElement("div");
    body.className = "browse__body";
    const avatar = document.createElement("span");
    avatar.className = "browse__avatar";
    avatar.style.background = ch.self ? "var(--kick-green)" : colorFor(ch.name);
    avatar.textContent = initial(ch.name);

    const meta = document.createElement("div");
    meta.className = "browse__meta";
    const t = document.createElement("div");
    t.className = "browse__title";
    t.textContent = ch.title;
    const n = document.createElement("span");
    n.className = "browse__name";
    n.textContent = ch.self ? ch.name + " (you)" : ch.name;
    const g = document.createElement("span");
    g.className = "browse__game";
    g.textContent = ch.game;
    meta.append(t, n, g);
    body.append(avatar, meta);

    card.append(thumb, body);
    card.addEventListener("click", () => {
      renderChannel(ch);
      closeBrowse();
    });
    return card;
  }

  function renderBrowseGrid() {
    if (!browseGrid) return;
    const q = (browseFilter ? browseFilter.value : "").trim().toLowerCase();
    const pool = browseScope === "following" ? CHANNELS.filter((c) => c.following) : CHANNELS;
    const matches = pool.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.game.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q)
    );

    browseGrid.textContent = "";
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "browse__empty";
      empty.textContent = `No channels match "${q}".`;
      browseGrid.appendChild(empty);
      return;
    }
    matches.forEach((c) => browseGrid.appendChild(browseCard(c)));
  }

  function openBrowse(scope, query, heading) {
    if (!browse) return;
    browseScope = scope || "all";
    if (browseFilter) browseFilter.value = query || "";
    if (browseTitle) browseTitle.textContent = heading || "Browse channels";
    browse.hidden = false;
    renderBrowseGrid();
    if (browseFilter) browseFilter.focus();
  }

  function closeBrowse() {
    if (browse) browse.hidden = true;
  }

  if (browseFilter) browseFilter.addEventListener("input", renderBrowseGrid);
  $$("[data-browse-close]").forEach((b) => b.addEventListener("click", closeBrowse));
  if (browse) {
    // click the dim backdrop to dismiss
    browse.addEventListener("click", (e) => {
      if (e.target === browse) closeBrowse();
    });
  }

  // top-bar nav
  $$("[data-nav]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      $$("[data-nav]").forEach((l) => l.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "page");
      const which = link.getAttribute("data-nav");
      if (which === "following") openBrowse("following", "", "Channels you follow");
      else if (which === "categories") openBrowse("all", "", "Categories");
      else openBrowse("all", "", "Browse channels");
    });
  });

  // top-bar search feeds the same overlay
  const searchForm = $("[data-search-form]");
  const searchInput = $("[data-search]");
  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      openBrowse("all", searchInput.value, "Search results");
    });
    searchInput.addEventListener("input", () => {
      if (searchInput.value.trim().length >= 2) {
        openBrowse("all", searchInput.value, "Search results");
        searchInput.focus(); // keep typing in the top bar, not the overlay
      }
    });
  }

  /* -------------------------------------------------------------- popovers */

  function popToggleFor(pop) {
    const name = pop.getAttribute("data-pop");
    return $(`[data-pop-toggle="${name}"]`);
  }

  function closePops(except) {
    $$("[data-pop]").forEach((pop) => {
      if (pop === except) return;
      pop.hidden = true;
      const t = popToggleFor(pop);
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-pop-toggle]");
    if (toggle) {
      const pop = $(`[data-pop="${toggle.getAttribute("data-pop-toggle")}"]`);
      const willOpen = pop && pop.hidden;
      closePops(willOpen ? pop : null);
      if (pop) {
        pop.hidden = !willOpen;
        toggle.setAttribute("aria-expanded", String(willOpen));
      }
      return;
    }
    if (!e.target.closest(".pop")) closePops();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (browse && !browse.hidden) closeBrowse();
    closePops();
  });

  /* --------------------------------------------------- follow / subscribe */

  if (followBtn) {
    followBtn.addEventListener("click", () => {
      current.following = !current.following;
      followBtn.setAttribute("aria-pressed", String(current.following));
      if (followLabel) followLabel.textContent = current.following ? "Following" : "Follow";
      current.followers += current.following ? 1 : -1;
      paintFollowers();
      if (current.following) {
        addSystemMessage(`@${s.username} followed the channel!`);
        toast(`You're now following ${current.name}`, "♥");
      } else {
        toast(`Unfollowed ${current.name}`);
      }
    });
  }

  const subBtn = $("[data-subscribe]");
  if (subBtn) {
    subBtn.addEventListener("click", () => {
      addSystemMessage(`@${s.username} subscribed to ${current.name} — Tier 1!`);
      if (counter) counter.bump(rand(1, 4));
      paintCounts();
      toast(`Subscribed to ${current.name} — Tier 1`, "★");
    });
  }

  /* ------------------------------------------------- share / more options */

  function copyLink() {
    const url = location.href;
    const done = () => toast("Channel link copied to clipboard", "🔗");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, () => toast(url));
    } else {
      toast(url);
    }
  }

  const shareBtn = $("[data-share]");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      if (navigator.share) {
        navigator
          .share({ title: current.name + " on Kick", url: location.href })
          .catch(copyLink);
      } else {
        copyLink();
      }
    });
  }

  const copyLinkBtn = $("[data-copy-link]");
  if (copyLinkBtn) copyLinkBtn.addEventListener("click", () => { copyLink(); closePops(); });

  const theatreBtn = $("[data-theatre]");
  if (theatreBtn) {
    theatreBtn.addEventListener("click", () => {
      const on = document.querySelector(".kick").classList.toggle("kick--theatre");
      theatreBtn.textContent = on ? "Exit theatre mode" : "Theatre mode";
      closePops();
      toast(on ? "Theatre mode on" : "Theatre mode off");
    });
  }

  // Menu entries with nothing real behind them at least say so.
  $$("[data-stub]").forEach((btn) => {
    btn.addEventListener("click", () => {
      toast(btn.getAttribute("data-stub") + " — not wired up in this demo");
      closePops();
    });
  });

  /* -------------------------------------------------------- notifications */

  const NOTIFS = [
    { who: "kaicenat", what: "went live — MAFIATHON — day 12", when: "2m ago" },
    { who: "xQc", what: "went live — JUICER KING", when: "18m ago" },
    { who: "Nickmercs", what: "posted a clip you might like", when: "1h ago" },
  ];

  const notifList = $("[data-notif-list]");
  const notifBadge = $("[data-notif-badge]");

  if (notifList) {
    NOTIFS.forEach((n) => {
      const row = document.createElement("div");
      row.className = "notif";
      const dot = document.createElement("span");
      dot.className = "notif__dot";
      const text = document.createElement("div");
      text.className = "notif__text";
      const who = document.createElement("strong");
      who.textContent = n.who + " ";
      const time = document.createElement("span");
      time.className = "notif__time";
      time.textContent = n.when;
      text.append(who, document.createTextNode(n.what), time);
      row.append(dot, text);
      notifList.appendChild(row);
    });
  }

  const notifClear = $("[data-notif-clear]");
  if (notifClear) {
    notifClear.addEventListener("click", () => {
      $$(".notif__dot").forEach((d) => (d.style.background = "var(--kick-border)"));
      if (notifBadge) notifBadge.remove();
      toast("Notifications marked as read");
      closePops();
    });
  }

  /* ---------------------------------------------------------------- kicks */

  $$("[data-kicks]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const amount = Number(btn.getAttribute("data-kicks"));
      addSystemMessage(`@${s.username} sent ${amount.toLocaleString()} kicks to ${current.name}!`);
      if (counter) counter.bump(rand(2, 12));
      paintCounts();
      toast(`Sent ${amount.toLocaleString()} kicks`, "⚡");
      closePops();
    });
  });

  /* -------------------------------------------------------- player buttons */

  const SPEAKER_ON =
    '<path d="M4 9h4l5-4v14l-5-4H4V9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M16.5 9.5a3.5 3.5 0 010 5M19 7a7 7 0 010 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  const SPEAKER_OFF =
    '<path d="M4 9h4l5-4v14l-5-4H4V9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M17 9l4 6M21 9l-4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  const ICON_PAUSE =
    '<path d="M9 5v14M15 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  const ICON_PLAY = '<path d="M8 5l11 7-11 7V5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';

  const playerEl = $("[data-player]");
  const muteBtn = $("[data-mute]");
  const volume = $("#kick-volume");

  function setMuted(muted) {
    if (video) video.muted = muted;
    if (muteBtn) {
      muteBtn.setAttribute("aria-pressed", String(muted));
      muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
      const svg = muteBtn.querySelector("svg");
      if (svg) svg.innerHTML = muted ? SPEAKER_OFF : SPEAKER_ON;
    }
    if (volume) volume.value = muted ? 0 : Math.round((video ? video.volume : 1) * 100);
  }

  if (muteBtn) muteBtn.addEventListener("click", () => setMuted(!(video && video.muted)));

  if (volume) {
    volume.addEventListener("input", () => {
      const level = Number(volume.value) / 100;
      if (video) video.volume = level;
      setMuted(level === 0);
    });
  }

  const playPauseBtn = $("[data-playpause]");
  let isPaused = false;

  /** Pause/resume whichever feed is on screen — the webcam or the canvas. */
  function setPaused(next) {
    isPaused = next;
    if (embedActive()) {
      // Kick's own player owns play/pause and volume for a real stream.
    } else if (simChannel) {
      if (next) simHalt();
      else simRun();
    } else if (video) {
      if (next) video.pause();
      else video.play().catch(() => {});
    }
    if (playPauseBtn) {
      const svg = playPauseBtn.querySelector("svg");
      if (svg) svg.innerHTML = next ? ICON_PLAY : ICON_PAUSE;
      playPauseBtn.setAttribute("aria-label", next ? "Play" : "Pause");
    }
    if (playerEl) playerEl.classList.toggle("player--paused", next);
  }

  if (playPauseBtn) playPauseBtn.addEventListener("click", () => setPaused(!isPaused));

  const fsBtn = $("[data-fullscreen]");
  if (fsBtn) {
    fsBtn.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (playerEl && playerEl.requestFullscreen) playerEl.requestFullscreen().catch(() => {});
    });
  }

  // quality menu
  const qualityLabel = $("[data-quality-label]");
  $$("[data-quality]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.getAttribute("data-quality");
      $$("[data-quality]").forEach((b) => b.setAttribute("aria-current", String(b === btn)));
      if (qualityLabel) qualityLabel.textContent = q;
      toast("Quality set to " + q);
      closePops();
    });
  });

  // mirror toggle — the camera is mirrored by default like a selfie cam
  const mirrorBtn = $("[data-mirror]");
  if (mirrorBtn && video) {
    mirrorBtn.addEventListener("click", () => {
      const on = mirrorBtn.getAttribute("aria-checked") !== "true";
      mirrorBtn.setAttribute("aria-checked", String(on));
      video.style.transform = on ? "scaleX(-1)" : "none";
      if (simChannel) toast("Mirror saved — it applies to your own channel");
      else toast(on ? "Camera mirrored" : "Camera un-mirrored");
    });
  }

  /* ------------------------------------------------------- "your channel" */

  $$("[data-go-self]").forEach((btn) =>
    btn.addEventListener("click", () => {
      renderChannel(SELF);
      closePops();
      closeBrowse();
    })
  );

  /* ---------------------------------------------------------------- chat */

  const CHATTERS = [
    "greenpilled", "kickfan_92", "MoonLightt", "not_a_bot", "SlyFoxx", "bigE",
    "pixel_pete", "Vanta", "onlyvibes", "queso_king", "TypoMaster", "mira__",
    "clipthatW", "dr_nope", "Sundae", "hexcode", "lurkerNo7", "brb_2min",
  ];

  const LINES = [
    "W stream", "first time here, this is fire", "KEKW", "chat is moving fast today",
    "the lighting looks so good", "let's goooo", "someone clip that",
    "hi from Australia 🇦🇺", "how long you been live?", "mods asleep, post frogs",
    "that transition was clean", "banger stream as always", "PogU",
    "no way that just happened", "audio is perfect btw", "hydrate!!!",
    "new follower here 👋", "this is my third hour lol", "GG", "chat behave",
    "the camera quality is insane", "raid incoming?", "!socials",
  ];

  const EMOTES = ["KEKW", "PogU", "OMEGALUL", "monkaS", "EZ Clap", "Sadge", "catJAM"];

  const chatEl = $("[data-chat]");
  const log = $("[data-chat-log]");
  const form = $("[data-chat-form]");
  const MAX_MESSAGES = 150;
  let autoscroll = true;

  // Timestamps start hidden; the toggle flips a class rather than re-rendering.
  if (chatEl) chatEl.classList.add("chat--no-timestamps");

  function scrollIfPinned() {
    if (!log || !autoscroll) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    if (nearBottom) log.scrollTop = log.scrollHeight;
  }

  function trim() {
    while (log.children.length > MAX_MESSAGES) log.removeChild(log.firstChild);
  }

  function timeStamp() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function addMessage(author, text, opts = {}) {
    if (!log) return;
    const row = document.createElement("p");
    row.className = "msg" + (opts.own ? " msg--own" : "");

    const time = document.createElement("span");
    time.className = "msg__time";
    time.textContent = timeStamp();
    row.appendChild(time);

    if (opts.badge) {
      const badge = document.createElement("span");
      badge.className = "msg__badge msg__badge--" + opts.badge;
      badge.textContent = opts.badge[0].toUpperCase();
      badge.title = { mod: "Moderator", sub: "Subscriber", vip: "VIP" }[opts.badge];
      row.appendChild(badge);
    }

    const nameEl = document.createElement("span");
    nameEl.className = "msg__author";
    nameEl.style.color = opts.own ? "var(--kick-green)" : colorFor(author);
    nameEl.textContent = author;

    const textEl = document.createElement("span");
    textEl.className = "msg__text";
    textEl.textContent = " " + text; // textContent, so pasted markup can't inject

    row.append(nameEl, textEl);
    log.appendChild(row);
    trim();
    scrollIfPinned();
  }

  function addSystemMessage(text) {
    if (!log) return;
    const row = document.createElement("p");
    row.className = "msg msg--system";
    row.textContent = text;
    log.appendChild(row);
    trim();
    scrollIfPinned();
  }

  function resetChat() {
    if (log) log.textContent = "";
  }

  function randomBadge() {
    const roll = Math.random();
    if (roll > 0.93) return "mod";
    if (roll > 0.78) return "sub";
    if (roll > 0.72) return "vip";
    return null;
  }

  function fakeMessage() {
    const author = pick(CHATTERS);
    const text = Math.random() > 0.85 ? pick(EMOTES) : pick(LINES);
    addMessage(author, text, { badge: randomBadge() });
  }

  // Rolling chat at an irregular cadence — a fixed interval reads as fake.
  (function loop() {
    setTimeout(() => {
      fakeMessage();
      loop();
    }, rand(700, 2600));
  })();

  // Every so often another channel raids in — a chat line plus a real jump in
  // the viewer count, which is what counter.bump() is for.
  (function raidLoop() {
    setTimeout(() => {
      const raider = pick(OTHERS).name;
      const size = rand(60, 900);
      if (counter) counter.bump(size);
      paintCounts();
      addSystemMessage(`${raider} is raiding with ${size.toLocaleString()} viewers!`);
      raidLoop();
    }, rand(45000, 110000));
  })();

  if (form && chatInput) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      addMessage(s.username, text, { own: true, badge: "sub" });
      chatInput.value = "";
      if (log) log.scrollTop = log.scrollHeight; // always follow your own message
    });
  }

  // emote picker
  const emoteGrid = $("[data-emote-grid]");
  if (emoteGrid && chatInput) {
    EMOTES.forEach((em) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pop__item";
      b.textContent = em;
      b.addEventListener("click", () => {
        chatInput.value = (chatInput.value.trim() + " " + em).trim() + " ";
        chatInput.focus();
        closePops();
      });
      emoteGrid.appendChild(b);
    });
  }

  // chat settings
  function bindCheck(sel, onChange) {
    const btn = $(sel);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-checked") !== "true";
      btn.setAttribute("aria-checked", String(on));
      onChange(on);
    });
  }

  bindCheck("[data-toggle-timestamps]", (on) => {
    if (chatEl) chatEl.classList.toggle("chat--no-timestamps", !on);
  });
  bindCheck("[data-toggle-badges]", (on) => {
    if (chatEl) chatEl.classList.toggle("chat--no-badges", !on);
  });
  bindCheck("[data-toggle-autoscroll]", (on) => {
    autoscroll = on;
    if (on) scrollIfPinned();
  });

  const clearChatBtn = $("[data-clear-chat]");
  if (clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
      resetChat();
      addSystemMessage("Chat cleared.");
      closePops();
    });
  }

  /* ---------------------------------------------------------------- boot */

  renderChannel(SELF);
})();

/* Kick page bootstrap.
 *
 * Drives everything that makes the static markup feel like a live Kick page:
 * camera, uptime clock, drifting viewer count, the followed-channel rail, and
 * a simulated chat you can talk in.
 *
 * Shared helpers used: GoLive.session(), GoLive.startCamera(), GoLive.startTimer(),
 * GoLive.startViewerCount().
 */
(function () {
  const s = GoLive.session(); // { username, streamer, platform }

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ------------------------------------------------------------- helpers */

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rand(0, arr.length - 1)];

  /** 8_400 -> "8.4K", 1_250_000 -> "1.25M" */
  function compact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  /** Stable pastel-ish hue from a string, so a name always gets the same colour. */
  function hueFor(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }

  const colorFor = (name) => `hsl(${hueFor(name)} 85% 65%)`;
  const initial = (str) => (str.trim()[0] || "?").toUpperCase();

  /* ------------------------------------------------------ identity fill-in */

  $$("[data-streamer]").forEach((el) => (el.textContent = s.streamer));
  $$("[data-username]").forEach((el) => (el.textContent = "@" + s.username));
  $$("[data-avatar-initial]").forEach((el) => (el.textContent = initial(s.streamer)));

  document.title = `${s.streamer} - ${s.platform ? s.platform.name : "Kick"}`;

  const titleEl = $("[data-stream-title]");
  if (titleEl) {
    titleEl.textContent = pick([
      `${s.streamer} is live — come hang out`,
      `late night stream w/ ${s.streamer}`,
      `first stream of the week! !socials !discord`,
      `chill vibes only :: ${s.streamer}`,
    ]);
  }

  /* ------------------------------------------------------------ the clock */

  // Two uptime readouts (player overlay + stats row); both tick from page load.
  $$("[data-timer]").forEach((el) => GoLive.startTimer(el));

  /* ----------------------------------------------------------- the camera */

  const video = $("[data-camera]");
  const errorEl = $("[data-camera-error]");
  GoLive.startCamera(video).catch((err) => {
    console.error("Camera error:", err);
    if (errorEl) errorEl.style.display = "grid";
  });

  /* ------------------------------------------------------- viewer counters */

  const viewerEls = $$("[data-viewers]");
  const chattersEl = $("[data-chatters]");
  // Set by the rail below; painted here so every count stays in lockstep.
  let railSelfCount = null;

  // The shared counter owns the number — it seeds from the "Starting viewers"
  // field on the landing form (s.viewers) and drifts net-upward on its own.
  // Passing null means it renders nothing itself; Kick paints its own spots.
  const counter = GoLive.startViewerCount(null, { start: s.viewers, interval: 2500 });

  function paintCounts() {
    const n = counter.value;
    viewerEls.forEach((el) => (el.textContent = n.toLocaleString()));
    if (chattersEl) chattersEl.textContent = compact(Math.round(n * 0.14));
    if (railSelfCount) railSelfCount.textContent = compact(n);
  }

  paintCounts();
  setInterval(paintCounts, 1000);

  /* --------------------------------------------------------- follow button */

  const followersEl = $("[data-followers]");
  let followers = rand(24000, 480000);
  const paintFollowers = () => followersEl && (followersEl.textContent = compact(followers));
  paintFollowers();

  const followBtn = $("[data-follow]");
  const followLabel = $("[data-follow-label]");
  if (followBtn) {
    followBtn.addEventListener("click", () => {
      const following = followBtn.getAttribute("aria-pressed") === "true";
      followBtn.setAttribute("aria-pressed", String(!following));
      if (followLabel) followLabel.textContent = following ? "Follow" : "Following";
      followers += following ? -1 : 1;
      paintFollowers();
      if (!following) addSystemMessage(`@${s.username} followed the channel!`);
    });
  }

  const subBtn = $("[data-subscribe]");
  if (subBtn) {
    subBtn.addEventListener("click", () =>
      addSystemMessage(`@${s.username} subscribed to ${s.streamer} — Tier 1!`)
    );
  }

  /* -------------------------------------------------------- player buttons */

  const SPEAKER_ON =
    '<path d="M4 9h4l5-4v14l-5-4H4V9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M16.5 9.5a3.5 3.5 0 010 5M19 7a7 7 0 010 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  const SPEAKER_OFF =
    '<path d="M4 9h4l5-4v14l-5-4H4V9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M17 9l4 6M21 9l-4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';

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

  if (muteBtn) {
    muteBtn.addEventListener("click", () => setMuted(!(video && video.muted)));
  }

  if (volume) {
    volume.addEventListener("input", () => {
      const level = Number(volume.value) / 100;
      if (video) video.volume = level;
      setMuted(level === 0);
    });
  }

  const fsBtn = $("[data-fullscreen]");
  if (fsBtn) {
    fsBtn.addEventListener("click", () => {
      const stage = document.querySelector(".player");
      if (document.fullscreenElement) document.exitFullscreen();
      else if (stage && stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
    });
  }

  /* ----------------------------------------------------- followed-channel rail */

  const OTHER_CHANNELS = [
    { name: "xQc", game: "Just Chatting" },
    { name: "Amouranth", game: "IRL" },
    { name: "Trainwreckstv", game: "Slots" },
    { name: "AdinRoss", game: "Just Chatting" },
    { name: "Nickmercs", game: "Warzone" },
    { name: "Destiny", game: "Politics" },
    { name: "kaicenat", game: "Just Chatting" },
    { name: "iceposeidon", game: "IRL" },
  ];

  function railItem({ name, game, live, active }) {
    const li = document.createElement("li");
    li.className = "rail__item" + (active ? " rail__item--active" : "");

    const avatar = document.createElement("span");
    avatar.className = "rail__avatar";
    avatar.style.background = active ? "var(--kick-green)" : colorFor(name);
    avatar.textContent = initial(name);

    const meta = document.createElement("span");
    meta.className = "rail__meta";
    const nameEl = document.createElement("span");
    nameEl.className = "rail__name";
    nameEl.textContent = name;
    const gameEl = document.createElement("span");
    gameEl.className = "rail__game";
    gameEl.textContent = game;
    meta.append(nameEl, gameEl);

    const count = document.createElement("span");
    count.className = "rail__viewers";
    count.textContent = compact(live);

    li.append(avatar, meta, count);
    return li;
  }

  const followingList = $("[data-rail-following]");
  const recommendedList = $("[data-rail-recommended]");

  if (followingList) {
    // The channel you're watching sits at the top, highlighted.
    const self = railItem({
      name: s.streamer,
      game: "Just Chatting",
      live: counter.value,
      active: true,
    });
    followingList.appendChild(self);
    // Hand the element to paintCounts so it tracks the header count.
    railSelfCount = self.querySelector(".rail__viewers");

    OTHER_CHANNELS.slice(0, 4).forEach((c) =>
      followingList.appendChild(railItem({ ...c, live: rand(400, 62000) }))
    );
  }

  if (recommendedList) {
    OTHER_CHANNELS.slice(4).forEach((c) =>
      recommendedList.appendChild(railItem({ ...c, live: rand(200, 31000) }))
    );
  }

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

  const log = $("[data-chat-log]");
  const form = $("[data-chat-form]");
  const input = $("[data-chat-input]");
  const emoteBtn = $("[data-emote]");
  const MAX_MESSAGES = 150;

  /** Autoscroll only when the reader hasn't scrolled up to read history. */
  function scrollIfPinned() {
    if (!log) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    if (nearBottom) log.scrollTop = log.scrollHeight;
  }

  function trim() {
    while (log.children.length > MAX_MESSAGES) log.removeChild(log.firstChild);
  }

  function addMessage(author, text, opts = {}) {
    if (!log) return;
    const row = document.createElement("p");
    row.className = "msg" + (opts.own ? " msg--own" : "");

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

  // Seed the log so chat isn't empty on arrival, then keep it rolling at an
  // irregular cadence — a fixed interval reads as obviously fake.
  addSystemMessage(`Welcome to the ${s.streamer} channel!`);
  for (let i = 0; i < 12; i++) fakeMessage();

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
      const raider = pick(OTHER_CHANNELS).name;
      const size = rand(60, 900);
      counter.bump(size);
      paintCounts();
      addSystemMessage(`${raider} is raiding with ${size.toLocaleString()} viewers!`);
      raidLoop();
    }, rand(45000, 110000));
  })();

  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      addMessage(s.username, text, { own: true, badge: "sub" });
      input.value = "";
      if (log) log.scrollTop = log.scrollHeight; // always follow your own message
    });
  }

  if (emoteBtn && input) {
    emoteBtn.addEventListener("click", () => {
      input.value = (input.value.trim() + " " + pick(EMOTES)).trim() + " ";
      input.focus();
    });
  }
})();

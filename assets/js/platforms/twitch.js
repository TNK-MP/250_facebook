/* Twitch page controller.
 *
 * Wires the shared session into the Twitch look:
 *   - fills in streamer / username / avatar
 *   - turns on the webcam as the "live" video
 *   - runs a fake, self-populating live chat with bot viewers
 *   - fluctuates the viewer count and fires occasional follow/sub events
 *
 * All chat is simulated locally — nothing is sent anywhere.
 */
(function () {
  const s = GoLive.session(); // { username, streamer, platform }
  const streamer = s.streamer || "Streamer";
  const username = s.username || "guest";

  /* ---------- Fill identity ---------- */
  const initial = (streamer.trim()[0] || "S").toUpperCase();
  document.querySelectorAll("[data-streamer]").forEach((el) => (el.textContent = streamer));
  document.querySelectorAll("[data-avatar]").forEach((el) => (el.textContent = initial));
  const navAvatar = document.querySelector("[data-nav-avatar]");
  if (navAvatar) navAvatar.textContent = (username.trim()[0] || "Y").toUpperCase();
  const tabTitle = document.querySelector("[data-tab-title]");
  if (tabTitle) tabTitle.textContent = `${streamer} - Twitch`;

  /* ---------- Live uptime clock ---------- */
  const timerEl = document.querySelector("[data-timer]");
  if (timerEl) GoLive.startTimer(timerEl);

  /* ---------- Camera ---------- */
  const video = document.querySelector("[data-camera]");
  const errorEl = document.querySelector("[data-camera-error]");
  GoLive.startCamera(video).catch((err) => {
    console.error("Camera error:", err);
    if (errorEl) errorEl.style.display = "flex";
  });

  /* ---------- Viewer count (starts at the user's chosen number, drifts up) ---------- */
  const viewersEl = document.querySelector("[data-viewers]");
  const viewerCount = GoLive.startViewerCount(viewersEl, { start: s.viewers });

  /* ---------- Follow / Subscribe buttons ---------- */
  const followBtn = document.querySelector("[data-follow]");
  if (followBtn) {
    followBtn.addEventListener("click", () => {
      const following = followBtn.classList.toggle("is-following");
      followBtn.lastChild.textContent = following ? " Following" : " Follow";
      if (following) addEvent(`You are now following ${streamer}!`);
    });
  }
  const subBtn = document.querySelector("[data-sub]");
  if (subBtn) {
    subBtn.addEventListener("click", () => {
      addEvent(`You subscribed to ${streamer} for $4.99! Welcome to the crew 💜`);
    });
  }

  /* ---------- Chat data ---------- */
  const chatEl = document.querySelector("[data-chat]");

  const BOTS = [
    { name: "xX_GamerKid_Xx", color: "#ff4a4a", badge: "sub" },
    { name: "PogChampion", color: "#00d1b2", badge: "mod" },
    { name: "night_owl_99", color: "#f5a623", badge: "" },
    { name: "SaltyMcSalt", color: "#7ed321", badge: "" },
    { name: "melody_beats", color: "#e005b9", badge: "vip" },
    { name: "TacoTuesday", color: "#4a90e2", badge: "sub" },
    { name: "kappa_lord", color: "#bd10e0", badge: "" },
    { name: "frostbyte", color: "#50e3c2", badge: "sub" },
    { name: "LurkerNo1", color: "#b8e986", badge: "" },
    { name: "quietstorm", color: "#ff7ac6", badge: "mod" },
    { name: "big_chungus", color: "#f8e71c", badge: "" },
    { name: "pixel_pete", color: "#9013fe", badge: "vip" },
    { name: "sunny_side", color: "#ff9f43", badge: "" },
    { name: "raid_boss", color: "#ee5253", badge: "sub" },
    { name: "chill_vibes", color: "#54a0ff", badge: "" },
  ];

  const MESSAGES = [
    "LETS GOOO",
    "first time here, this is so cool",
    "POGGERS",
    "how long have you been streaming today?",
    "the quality looks so clean 🔥",
    "KEKW",
    "W streamer",
    "chat is moving so fast lol",
    "can we get a song request?",
    "hi from Germany 🇩🇪",
    "PepeHands",
    "this is my comfort stream ngl",
    "gg",
    "no wayyyy 😂",
    "you're cracked at this",
    "hello everyone 👋",
    "monkaS",
    "that was insane",
    "raid incoming 👀",
    "love the energy today",
    "5Head play",
    "who else is grinding rn",
    "streamer notice me pls",
    "sheeeesh",
    "vibes are immaculate ✨",
    "clip it!!!",
    "EZ Clap",
    "been lurking, finally saying hi",
    "the setup looks amazing",
    "modCheck",
    "first!!",
    "let's get this to 2k viewers",
    "🔥🔥🔥",
    "yo the cam quality wow",
    "greetings from Brazil 🇧🇷",
    "this song slaps",
    "back from work, what did i miss",
    "catJAM",
    "you deserve way more viewers",
    "HYPERS",
  ];

  const EMOTE_MESSAGES = [
    "Kappa", "PogChamp", "LUL", "<3 <3 <3", "🐸☕", "catJAM catJAM",
    "peepoHappy", "widepeepoHappy", "GGWP", "o7",
  ];

  const badgeMarkup = (badge) => {
    if (!badge) return "";
    const map = {
      mod: ["⚔", "tw-badge--mod"],
      vip: ["◆", "tw-badge--vip"],
      sub: ["✦", "tw-badge--sub"],
      broadcaster: ["★", "tw-badge--broadcaster"],
    };
    const [label, cls] = map[badge] || ["", ""];
    return `<span class="tw-msg__badge ${cls}">${label}</span>`;
  };

  const escapeHtml = (str) =>
    str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const nearBottom = () =>
    chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 80;

  function pushMessage(html, cls = "tw-msg") {
    const stick = nearBottom();
    const div = document.createElement("div");
    div.className = cls;
    div.innerHTML = html;
    chatEl.appendChild(div);
    // keep the DOM from growing forever
    while (chatEl.children.length > 120) chatEl.removeChild(chatEl.firstChild);
    if (stick) chatEl.scrollTop = chatEl.scrollHeight;
  }

  function addBotMessage() {
    const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
    const useEmote = Math.random() < 0.25;
    const text = useEmote
      ? EMOTE_MESSAGES[Math.floor(Math.random() * EMOTE_MESSAGES.length)]
      : MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    pushMessage(
      `${badgeMarkup(bot.badge)}<span class="tw-msg__user" style="color:${bot.color}">${escapeHtml(
        bot.name
      )}</span><span class="tw-msg__colon">: </span><span class="tw-msg__text">${escapeHtml(text)}</span>`
    );
  }

  function addEvent(text) {
    pushMessage(`<strong>${escapeHtml(text)}</strong>`, "tw-msg tw-msg--event");
  }

  /* Occasional follow / sub / raid alerts from fake viewers */
  function randomAlert() {
    const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
    const kind = Math.random();
    if (kind < 0.4) {
      addEvent(`${bot.name} just followed!`);
      viewerCount.bump(1);
    } else if (kind < 0.75) {
      const months = 1 + Math.floor(Math.random() * 24);
      addEvent(`${bot.name} subscribed for ${months} month${months > 1 ? "s" : ""}! 💜`);
    } else {
      const raiders = 20 + Math.floor(Math.random() * 200);
      addEvent(`${bot.name} is raiding with ${raiders} viewers! Welcome raiders 🎉`);
      viewerCount.bump(raiders);
    }
  }

  /* ---------- Chat loop ---------- */
  // welcome line
  addEvent(`Welcome to the chat room! Be respectful and have fun.`);

  // seed a few messages so chat isn't empty on load
  for (let i = 0; i < 6; i++) addBotMessage();

  function scheduleNext() {
    const delay = 700 + Math.random() * 2200; // 0.7s – 2.9s between messages
    setTimeout(() => {
      addBotMessage();
      if (Math.random() < 0.08) randomAlert();
      scheduleNext();
    }, delay);
  }
  scheduleNext();

  /* ---------- User can send their own messages ---------- */
  const input = document.querySelector("[data-chat-input]");
  const sendBtn = document.querySelector("[data-chat-send]");

  function sendUserMessage() {
    const text = (input.value || "").trim();
    if (!text) return;
    pushMessage(
      `${badgeMarkup("broadcaster")}<span class="tw-msg__user" style="color:#ff4a4a">${escapeHtml(
        username
      )}</span><span class="tw-msg__colon">: </span><span class="tw-msg__text">${escapeHtml(text)}</span>`
    );
    input.value = "";
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  if (sendBtn) sendBtn.addEventListener("click", sendUserMessage);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendUserMessage();
      }
    });
  }
})();

/* TikTok LIVE page controller.
 *
 * Turns the shared session into a portrait TikTok LIVE look:
 *   - webcam as the fullscreen vertical video
 *   - self-populating comment stream with fake viewers + "joined" lines
 *   - floating hearts, gift banners, and a like counter
 *   - viewer count that starts at the user's chosen number and drifts upward
 *
 * Everything is simulated locally — nothing is sent anywhere.
 */
(function () {
  const s = GoLive.session(); // { username, streamer, viewers, platform }
  const streamer = s.streamer || "Streamer";
  const username = s.username || "guest";

  /* ---------- Identity ---------- */
  const initial = (streamer.trim()[0] || "S").toUpperCase();
  document.querySelectorAll("[data-streamer]").forEach((el) => (el.textContent = streamer));
  document.querySelectorAll("[data-avatar]").forEach((el) => (el.textContent = initial));
  const miniAvatar = document.querySelector("[data-avatar-mini]");
  if (miniAvatar) miniAvatar.textContent = initial;
  const navAvatar = document.querySelector("[data-nav-avatar]");
  if (navAvatar) navAvatar.textContent = (username.trim()[0] || "Y").toUpperCase();
  const tabTitle = document.querySelector("[data-tab-title]");
  if (tabTitle) tabTitle.textContent = `${streamer} is LIVE - TikTok`;

  /* ---------- Camera ---------- */
  const video = document.querySelector("[data-camera]");
  const errorEl = document.querySelector("[data-camera-error]");
  GoLive.startCamera(video).catch((err) => {
    console.error("Camera error:", err);
    if (errorEl) errorEl.style.display = "flex";
  });

  /* ---------- Viewer count (starts at chosen number, drifts up) ---------- */
  const viewersEl = document.querySelector("[data-viewers]");
  const viewerCount = GoLive.startViewerCount(viewersEl, { start: s.viewers });

  /* ---------- Follow button ---------- */
  const followBtn = document.querySelector("[data-follow]");
  if (followBtn) {
    followBtn.addEventListener("click", () => {
      const following = followBtn.classList.toggle("is-following");
      followBtn.textContent = following ? "Following" : "+ Follow";
    });
  }

  /* ---------- Data ---------- */
  const chatEl = document.querySelector("[data-chat]");

  const USERS = [
    "leo.vibes", "mochi_bunny", "dat_boi_92", "sunset.kylie", "gamer_greg",
    "itsnina.x", "coffee.addict", "raptor_jay", "luna_moon", "big_tony",
    "yuki_chan", "the_realdave", "peachy.keen", "zoomer_z", "maya.dances",
    "crispytofu", "night_rider", "happy.hana", "kaito99", "bubblegum.pop",
    "chef_marco", "skater_sam", "aria.sings", "dexter_lab", "cloud9_kid",
  ];

  const COMMENTS = [
    "hi 👋", "omg hiii", "you're so pretty", "first!!", "where are you from?",
    "love this 😍", "sound is perfect", "hi from Manila 🇵🇭", "let's gooo",
    "can you say my name?", "🔥🔥🔥", "how tall are you?", "so talented",
    "this made my day", "따라올게요 ❤️", "notice me pls", "wowww",
    "the vibes are unreal", "hi from London 🇬🇧", "you deserve more viewers",
    "haha so funny 😂", "queen 👑", "what's your @?", "streaming again tmrw?",
    "i've been here since the start", "big fan!!", "hello beautiful people",
    "this song is fire", "sending love 💕", "you're glowing today",
    "can we get to 5k?", "yesss 🙌", "so wholesome", "new follower here!",
  ];

  const GIFTS = [
    { name: "Rose", icon: "🌹", n: 1 },
    { name: "Finger Heart", icon: "🫰", n: 1 },
    { name: "Perfume", icon: "🧴", n: 1 },
    { name: "Sunglasses", icon: "🕶️", n: 1 },
    { name: "Doughnut", icon: "🍩", n: 3 },
    { name: "Galaxy", icon: "🌌", n: 1 },
    { name: "Lion", icon: "🦁", n: 1 },
    { name: "Rocket", icon: "🚀", n: 1 },
    { name: "TikTok Universe", icon: "🌠", n: 1 },
    { name: "Confetti", icon: "🎉", n: 5 },
  ];

  const HEART_EMOJIS = ["❤️", "💛", "💚", "💙", "💜", "🧡", "💖", "💗"];

  const randOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const escapeHtml = (str) =>
    str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const nearBottom = () => chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 90;

  function pushComment(html, cls = "tt-comment") {
    const stick = nearBottom();
    const div = document.createElement("div");
    div.className = cls;
    div.innerHTML = html;
    chatEl.appendChild(div);
    while (chatEl.children.length > 80) chatEl.removeChild(chatEl.firstChild);
    if (stick) chatEl.scrollTop = chatEl.scrollHeight;
  }

  /* ---------- Counters (likes / comments) ---------- */
  const likeEl = document.querySelector("[data-like-count]");
  const commentCountEl = document.querySelector("[data-comment-count]");
  const followerCountEl = document.querySelector("[data-follower-count]");
  let likes = Math.floor(s.viewers * 8);
  let comments = Math.floor(s.viewers * 1.5);
  let followers = 48200;

  const fmt = (n) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  };
  const renderCounts = () => {
    if (likeEl) likeEl.textContent = fmt(likes);
    if (commentCountEl) commentCountEl.textContent = fmt(comments);
    if (followerCountEl) followerCountEl.textContent = fmt(followers);
  };
  renderCounts();

  /* ---------- Floating hearts ---------- */
  const heartsEl = document.querySelector("[data-hearts]");
  function spawnHeart() {
    if (!heartsEl) return;
    const h = document.createElement("span");
    h.className = "tt-heart";
    h.textContent = randOf(HEART_EMOJIS);
    h.style.setProperty("--drift", Math.floor(Math.random() * 70 - 45) + "px");
    h.style.setProperty("--rot", Math.floor(Math.random() * 40 - 20) + "deg");
    heartsEl.appendChild(h);
    h.addEventListener("animationend", () => h.remove());
  }
  function burstHearts(n) {
    for (let i = 0; i < n; i++) setTimeout(spawnHeart, i * 120);
  }

  /* ---------- Gift banner ---------- */
  const giftEl = document.querySelector("[data-gift]");
  let giftTimer = null;
  const topGifterEl = document.querySelector("[data-top-gifter]");
  function showGift(user, gift) {
    likes += gift.n * 50;
    comments += 1;
    renderCounts();
    burstHearts(4 + gift.n);
    if (topGifterEl) topGifterEl.textContent = "Top gifter: " + user;
    pushComment(
      `<span class="tt-comment__user">${escapeHtml(user)}</span><span class="tt-comment__text">sent ${
        gift.icon
      } ${escapeHtml(gift.name)} x${gift.n}</span>`,
      "tt-comment tt-comment--gift"
    );
    if (giftEl) {
      giftEl.innerHTML = `<span class="tt-gift__icon">${gift.icon}</span><span>${escapeHtml(
        user
      )} sent <b>${escapeHtml(gift.name)}</b></span><span class="tt-gift__x">x${gift.n}</span>`;
      giftEl.classList.add("is-show");
      clearTimeout(giftTimer);
      giftTimer = setTimeout(() => giftEl.classList.remove("is-show"), 3200);
    }
  }

  /* ---------- Comment + event loop ---------- */
  function addViewerComment() {
    const user = randOf(USERS);
    comments += 1;
    renderCounts();
    pushComment(
      `<span class="tt-comment__user">${escapeHtml(user)}</span><span class="tt-comment__text">${escapeHtml(
        randOf(COMMENTS)
      )}</span>`
    );
  }
  function addJoin() {
    const user = randOf(USERS);
    viewerCount.bump(1);
    followers += 1;
    renderCounts();
    pushComment(`${escapeHtml(user)} joined`, "tt-comment tt-comment--join");
  }

  // seed
  pushComment("Welcome to the LIVE! Be kind and follow if you're new 💕", "tt-comment tt-comment--join");
  for (let i = 0; i < 5; i++) addViewerComment();

  function scheduleComment() {
    const delay = 600 + Math.random() * 1800;
    setTimeout(() => {
      const roll = Math.random();
      if (roll < 0.15) addJoin();
      else if (roll < 0.25) showGift(randOf(USERS), randOf(GIFTS));
      else addViewerComment();
      scheduleComment();
    }, delay);
  }
  scheduleComment();

  // ambient hearts float up on their own, plus a small like drip
  setInterval(() => {
    burstHearts(1 + Math.floor(Math.random() * 3));
    likes += Math.floor(Math.random() * 40) + 5;
    renderCounts();
  }, 1400);

  /* ---------- User interactions ---------- */
  document.querySelectorAll("[data-like]").forEach((btn) => {
    btn.addEventListener("click", () => {
      likes += 1;
      renderCounts();
      burstHearts(2);
      btn.classList.add("is-liked");
      setTimeout(() => btn.classList.remove("is-liked"), 400);
    });
  });

  const input = document.querySelector("[data-chat-input]");
  const sendBtn = document.querySelector("[data-chat-send]");
  function sendUserComment() {
    const text = (input.value || "").trim();
    if (!text) return;
    comments += 1;
    renderCounts();
    pushComment(
      `<span class="tt-comment__user" style="color:#25f4ee">${escapeHtml(
        username
      )}</span><span class="tt-comment__text">${escapeHtml(text)}</span>`
    );
    input.value = "";
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  if (sendBtn) sendBtn.addEventListener("click", sendUserComment);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendUserComment();
      }
    });
  }
})();

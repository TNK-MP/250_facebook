/* Facebook Live page bootstrap.
 *
 * Built to platforms/facebook.spec.md. Uses only the shared contract
 * (GoLive.session / startCamera / startTimer) plus the shared "chat bank"
 * (GoLive.chat, owned by the senior dev) accessed through an adapter so this
 * page needs no changes when the real bank lands.
 */
(function () {
  "use strict";

  var s = GoLive.session(); // { username, streamer, platform }
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Identity ---------- */
  $$("[data-streamer]").forEach(function (el) { el.textContent = s.streamer; });
  $$("[data-username]").forEach(function (el) { el.textContent = "@" + s.username; });

  var input = $("[data-comment-input]");
  if (input) input.placeholder = "Comment as @" + s.username;

  // Deterministic initials + color for avatars.
  var AVATAR_COLORS = ["#1877f2", "#e1306c", "#9146ff", "#f5533d", "#2fbf71", "#f7b928"];
  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/);
    var a = (parts[0] || "?")[0] || "?";
    var b = parts.length > 1 ? (parts[parts.length - 1][0] || "") : "";
    return (a + b).toUpperCase();
  }
  function colorFor(name) {
    var h = 0, str = String(name || "");
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }
  function paintAvatar(el, name) {
    el.textContent = initials(name);
    el.style.background = colorFor(name);
  }
  $$("[data-avatar-for='streamer']").forEach(function (el) { paintAvatar(el, s.streamer); });
  $$("[data-avatar-for='user']").forEach(function (el) { paintAvatar(el, s.username); });

  /* ---------- Timer + camera (shared helpers) ---------- */
  var timerEl = $("[data-timer]");
  if (timerEl && GoLive.startTimer) GoLive.startTimer(timerEl);

  var video = $("[data-camera]");
  var camError = $("[data-camera-error]");
  if (video && GoLive.startCamera) {
    GoLive.startCamera(video).catch(function (err) {
      console.error("Camera error:", err);
      if (camError) camError.hidden = false;
    });
  }

  /* ---------- Live viewer count ---------- */
  var viewersEl = $("[data-viewers]");
  var viewers = 40 + Math.floor(Math.random() * 120);
  function renderViewers() {
    viewersEl.textContent = viewers >= 1000
      ? (viewers / 1000).toFixed(1).replace(/\.0$/, "") + "K"
      : String(viewers);
  }
  if (viewersEl) {
    renderViewers();
    setInterval(function () {
      viewers = Math.max(1, viewers + Math.floor(Math.random() * 9) - 3);
      renderViewers();
    }, 2500);
  }

  /* ---------- Chat bank adapter (the seam) ----------
   * Consumes whichever surface GoLive.chat exposes; falls back to a local
   * pool if the shared bank is not loaded. Message shape: { user, text, avatar? }
   */
  var FALLBACK_MESSAGES = [
    { user: "Amara O.", text: "first!! 🎉" },
    { user: "Deej", text: "the quality is so clean 🔥" },
    { user: "Priya S.", text: "hi from Mumbai 👋" },
    { user: "Marcus", text: "who else is watching live?" },
    { user: "Lena", text: "love this ❤️" },
    { user: "Tomás", text: "sound is perfect" },
    { user: "Kai", text: "sharing with my friends rn" },
    { user: "Yuki", text: "😮 wow" },
    { user: "Sam R.", text: "been waiting for this stream all day" },
    { user: "Nadia", text: "looking great!" },
    { user: "Chidi", text: "greetings from Lagos 🇳🇬" },
    { user: "Bee", text: "haha 😆😆" },
    { user: "Owen", text: "turn up the energy!!" },
    { user: "Rosa", text: "following now ✅" }
  ];

  function makeChatSource() {
    var bank = window.GoLive && window.GoLive.chat;

    // Push model: bank drives the feed via subscribe(fn).
    if (bank && typeof bank.subscribe === "function") {
      return { mode: "push", subscribe: bank.subscribe.bind(bank) };
    }
    // Pull model: we ask for one message per tick.
    if (bank && typeof bank.next === "function") {
      return { mode: "pull", next: bank.next.bind(bank) };
    }
    // Static pool: sample from an array.
    var pool = (bank && Array.isArray(bank.messages) && bank.messages.length)
      ? bank.messages
      : FALLBACK_MESSAGES;
    var order = shuffle(pool.slice());
    var i = 0;
    return {
      mode: "pull",
      next: function () {
        if (i >= order.length) { order = shuffle(pool.slice()); i = 0; }
        return order[i++];
      }
    };
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- Comment feed ---------- */
  var list = $("[data-comments]");
  var MAX_COMMENTS = 18;

  function addComment(msg, opts) {
    if (!list || !msg || !msg.text) return;
    opts = opts || {};
    var li = document.createElement("li");
    li.className = "fb-comment" + (opts.you ? " is-you" : "");

    var av = document.createElement("div");
    av.className = "fb-avatar fb-avatar--sm";
    if (msg.avatar) {
      av.style.background = "center/cover no-repeat url(" + JSON.stringify(msg.avatar) + ")";
      av.textContent = "";
    } else {
      paintAvatar(av, msg.user);
    }

    var body = document.createElement("div");
    body.className = "fb-comment-body";
    var name = document.createElement("span");
    name.className = "fb-comment-name";
    name.textContent = msg.user || "Someone";
    var text = document.createElement("span");
    text.className = "fb-comment-text";
    text.textContent = msg.text;
    body.appendChild(name);
    body.appendChild(text);

    li.appendChild(av);
    li.appendChild(body);
    list.appendChild(li);

    while (list.children.length > MAX_COMMENTS) list.removeChild(list.firstChild);
  }

  var source = makeChatSource();
  if (source.mode === "push") {
    source.subscribe(function (msg) { addComment(msg); });
  } else {
    // Seed a few, then stream at a natural, slightly irregular cadence.
    addComment(source.next());
    addComment(source.next());
    (function tick() {
      addComment(source.next());
      setTimeout(tick, 1600 + Math.random() * 2600);
    })();
  }

  /* ---------- Floating reactions ---------- */
  var lane = $("[data-reaction-lane]");
  function floatReaction(emoji) {
    if (!lane || reduceMotion) return;
    var span = document.createElement("span");
    span.className = "fb-float";
    span.textContent = emoji;
    var dur = 2.4 + Math.random() * 1.4;
    span.style.setProperty("--dur", dur + "s");
    span.style.setProperty("--x1", rand(-14, 6) + "px");
    span.style.setProperty("--x2", rand(4, 22) + "px");
    span.style.setProperty("--x3", rand(-10, 8) + "px");
    span.style.left = rand(4, 30) + "px";
    lane.appendChild(span);
    setTimeout(function () { span.remove(); }, dur * 1000 + 60);
  }
  function rand(min, max) { return Math.floor(min + Math.random() * (max - min)); }

  var AMBIENT = ["👍", "❤️", "😆", "😮", "👍", "❤️"];
  if (!reduceMotion) {
    setInterval(function () {
      floatReaction(AMBIENT[Math.floor(Math.random() * AMBIENT.length)]);
    }, 1200);
  }

  /* ---------- Follow ---------- */
  var follow = $("[data-follow]");
  if (follow) {
    follow.addEventListener("click", function () {
      var on = follow.classList.toggle("is-following");
      follow.lastChild.textContent = on ? "Following" : "Follow";
      if (on) { viewers += 1; if (viewersEl) renderViewers(); }
    });
  }

  /* ---------- Like + reaction picker ---------- */
  var likeBtn = $("[data-like]");
  var likeEmoji = $("[data-like-emoji]");
  var likeLabel = $("[data-like-label]");
  var picker = $("[data-picker]");
  var REACTION_LABELS = { "👍": "Like", "❤️": "Love", "😆": "Haha", "😮": "Wow", "😢": "Sad", "😡": "Angry" };
  var liked = false;

  function setReaction(emoji) {
    liked = true;
    likeBtn.classList.add("is-active");
    if (likeEmoji) likeEmoji.textContent = emoji;
    if (likeLabel) likeLabel.textContent = REACTION_LABELS[emoji] || "Like";
    burst(emoji);
  }
  function burst(emoji) {
    var n = 3 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      (function (d) { setTimeout(function () { floatReaction(emoji); }, d); })(i * 90);
    }
  }

  if (likeBtn) {
    likeBtn.addEventListener("click", function () {
      if (liked) { // toggle off
        liked = false;
        likeBtn.classList.remove("is-active");
        if (likeEmoji) likeEmoji.textContent = "👍";
        if (likeLabel) likeLabel.textContent = "Like";
      } else {
        setReaction("👍");
      }
    });
  }
  if (picker) {
    $$("[data-reaction]", picker).forEach(function (btn) {
      btn.addEventListener("click", function () {
        setReaction(btn.getAttribute("data-reaction"));
        picker.classList.remove("is-open");
      });
    });
  }

  /* ---------- Composer ---------- */
  var composer = $("[data-composer]");
  var commentFocus = $("[data-comment-focus]");
  if (composer) {
    composer.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = (input.value || "").trim();
      if (!text) return;
      addComment({ user: s.streamer + " (you)", text: text }, { you: true });
      input.value = "";
    });
  }
  if (commentFocus && input) {
    commentFocus.addEventListener("click", function () { input.focus(); });
  }

  /* ---------- Share (demo only) ---------- */
  var share = $("[data-share]");
  if (share) {
    share.addEventListener("click", function () {
      var original = share.querySelector("svg").nextSibling;
      var prev = original.textContent;
      original.textContent = "Copied link!";
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).catch(function () {});
      setTimeout(function () { original.textContent = prev; }, 1500);
    });
  }
})();

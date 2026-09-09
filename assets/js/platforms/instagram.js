(function () {
  const s = GoLive.session();

  // Identity
  document.querySelectorAll('[data-streamer]').forEach(el => (el.textContent = s.streamer));
  document.querySelectorAll('[data-username]').forEach(el => (el.textContent = '@' + s.username));

  // Avatar: gradient ring + first initial
  const avatarEl = document.querySelector('[data-avatar]');
  if (avatarEl) {
    const inner = document.createElement('div');
    inner.className = 'ig-avatar-inner';
    inner.textContent = (s.streamer || 'S')[0];
    avatarEl.appendChild(inner);
  }

  // Timer
  const timerEl = document.querySelector('[data-timer]');
  if (timerEl) GoLive.startTimer(timerEl);

  // Camera
  const video = document.querySelector('[data-camera]');
  const errorEl = document.querySelector('[data-camera-error]');
  GoLive.startCamera(video).catch(err => {
    console.error('Camera error:', err);
    if (errorEl) errorEl.style.display = 'flex';
  });

  // Viewer count — random start, slow drift
  const viewersEl = document.querySelector('[data-viewers]');
  let viewers = Math.floor(Math.random() * 900) + 400;
  const fmtNum = n => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
  if (viewersEl) {
    viewersEl.textContent = fmtNum(viewers);
    setInterval(() => {
      viewers += Math.floor(Math.random() * 7) - 2;
      if (viewers < 1) viewers = 1;
      viewersEl.textContent = fmtNum(viewers);
    }, 4500);
  }

  // Back/close button
  document.getElementById('ig-back')?.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.location.href = '../index.html';
  });

  // ── Comments ──────────────────────────────────────────────
  const commentsEl = document.getElementById('ig-comments');
  const MAX_VISIBLE = 8;

  function addComment(name, text) {
    if (!commentsEl) return;
    const row = document.createElement('div');
    row.className = 'ig-comment';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'ig-comment__name';
    nameSpan.textContent = name;
    const textSpan = document.createElement('span');
    textSpan.className = 'ig-comment__text';
    textSpan.textContent = text;
    row.appendChild(nameSpan);
    row.appendChild(textSpan);
    commentsEl.appendChild(row);
    while (commentsEl.children.length > MAX_VISIBLE) {
      commentsEl.removeChild(commentsEl.firstChild);
    }
  }

  // Seed comments on load
  const seedComments = [
    ['mika_live',      '🔥🔥🔥'],
    ['jess.creates',   'omg finally going live!!'],
    ['the_real_kai',   'hey!! been waiting for this'],
    ['sunflower.jay',  'love this so much ✨'],
    ['user_9234',      'hi from Canada 🇨🇦'],
    ['ava.streams',    'the quality is amazing'],
  ];
  seedComments.forEach(([name, text], i) => {
    setTimeout(() => addComment(name, text), i * 1100 + 400);
  });

  // Auto comments over time
  const autoComments = [
    ['nightowl.88',     'can u say hi to me pleasee'],
    ['dm_for_collabs',  '💯💯'],
    ['techgirl.codes',  'this is so good'],
    ['river_vibes',     '👏👏👏'],
    ['just_lurking99',  'been watching for 10 min 😭'],
    ['beachbae_',       'share the link in bio!!'],
    ['_xo.maya',        'you look amazing omg'],
    ['chill.mode99',    '❤️❤️'],
  ];
  let autoIdx = 0;
  setInterval(() => {
    if (autoIdx < autoComments.length) {
      const [name, text] = autoComments[autoIdx++];
      addComment(name, text);
    }
  }, 6500);

  // Comment input → add as viewer comment
  const input = document.getElementById('ig-comment-input');
  const sendBtn = document.getElementById('ig-send-btn');

  function submitComment() {
    const text = input.value.trim();
    if (!text) return;
    addComment(s.username || 'you', text);
    input.value = '';
  }

  sendBtn?.addEventListener('click', submitComment);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') submitComment(); });

  // ── Hearts ────────────────────────────────────────────────
  const heartBtn    = document.getElementById('ig-heart-btn');
  const heartCount  = document.getElementById('ig-heart-count');
  const heartsStage = document.getElementById('ig-hearts-stage');
  let totalHearts = 0;
  const heartEmojis = ['❤️', '🧡', '💛', '💜', '💖', '🩷'];

  function spawnHeart() {
    if (!heartsStage) return;
    const el = document.createElement('span');
    el.className = 'ig-float-heart';
    el.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
    el.style.right = Math.floor(Math.random() * 28) + 'px';
    heartsStage.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }

  heartBtn?.addEventListener('click', () => {
    totalHearts++;
    if (heartCount) heartCount.textContent = fmtNum(totalHearts);
    spawnHeart();
  });

  // Occasional auto hearts from viewers
  function scheduleAutoHeart() {
    const delay = 4000 + Math.random() * 7000;
    setTimeout(() => { spawnHeart(); scheduleAutoHeart(); }, delay);
  }
  scheduleAutoHeart();
})();

/* Shared platform registry — the single source of truth for all 5 platforms.
 *
 * The landing page builds its picker from this list, and each platform page
 * can look itself up here. If you add/rename a platform, do it HERE and nowhere
 * else. `id` must match the platform HTML filename (platforms/<id>.html) and the
 * folder name used in assets/js/platforms/<id>.js.
 */
(function (global) {
  const PLATFORMS = [
    {
      id: "instagram",
      name: "Instagram Live",
      page: "platforms/instagram.html",
      color: "#e1306c",
      icon:
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg>',
    },
    {
      id: "youtube",
      name: "YouTube Live",
      page: "platforms/youtube.html",
      color: "#ff0000",
      icon:
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" stroke-width="2"/><path d="M10 9l5 3-5 3V9z" fill="currentColor"/></svg>',
    },
    {
      id: "twitch",
      name: "Twitch",
      page: "platforms/twitch.html",
      color: "#9146ff",
      icon:
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 3h16v11l-4 4h-4l-3 3H7v-3H4V3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M11 8v4M15 8v4" stroke="currentColor" stroke-width="2"/></svg>',
    },
    {
      id: "kick",
      name: "Kick",
      page: "platforms/kick.html",
      color: "#53fc18",
      icon:
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4v16M5 12l6-8M5 12l6 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 4h5v5M14 20h5v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id: "facebook",
      name: "Facebook Live",
      page: "platforms/facebook.html",
      color: "#1877f2",
      icon:
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 8h2V5h-2c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14V8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    },
  ];

  const byId = (id) => PLATFORMS.find((p) => p.id === id) || null;

  global.GoLive = global.GoLive || {};
  global.GoLive.PLATFORMS = PLATFORMS;
  global.GoLive.getPlatform = byId;
})(window);

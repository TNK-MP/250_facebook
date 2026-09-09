/* Shared stream session helper — used by every platform page.
 *
 * It gives each platform builder three things so nobody has to re-solve the
 * plumbing:
 *   1. GoLive.session()          -> { username, streamer, platform }
 *   2. GoLive.startCamera(video) -> Promise, pipes the webcam into a <video>
 *   3. GoLive.startTimer(el)     -> ticks a live "elapsed time" clock
 *
 * Requires platforms.js to be loaded first (for the registry).
 */
(function (global) {
  const GoLive = (global.GoLive = global.GoLive || {});

  function session() {
    const params = new URLSearchParams(global.location.search);
    // platform id is inferred from the filename: platforms/<id>.html
    const file = global.location.pathname.split("/").pop() || "";
    const id = file.replace(/\.html?$/i, "");
    return {
      username: params.get("username") || "guest",
      streamer: params.get("streamer") || "Unknown Streamer",
      platform: (GoLive.getPlatform && GoLive.getPlatform(id)) || null,
    };
  }

  /**
   * Start the webcam and pipe it into the given <video> element.
   * @param {HTMLVideoElement} videoEl
   * @param {{ audio?: boolean, facingMode?: string }} [opts]
   * @returns {Promise<MediaStream>}
   */
  async function startCamera(videoEl, opts = {}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API not available in this browser.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: opts.facingMode || "user" },
      audio: opts.audio || false,
    });
    videoEl.srcObject = stream;
    videoEl.muted = true;
    videoEl.playsInline = true;
    await videoEl.play().catch(() => {}); // autoplay may need a gesture; ignore
    return stream;
  }

  /**
   * Tick an elapsed-time clock into an element's textContent (HH:MM:SS).
   * @param {HTMLElement} el
   * @returns {() => void} stop function
   */
  function startTimer(el) {
    const start = Date.now();
    const pad = (n) => String(n).padStart(2, "0");
    const render = () => {
      const s = Math.floor((Date.now() - start) / 1000);
      const hh = Math.floor(s / 3600);
      const mm = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      el.textContent = (hh ? pad(hh) + ":" : "") + pad(mm) + ":" + pad(ss);
    };
    render();
    const timer = setInterval(render, 1000);
    return () => clearInterval(timer);
  }

  GoLive.session = session;
  GoLive.startCamera = startCamera;
  GoLive.startTimer = startTimer;
})(window);

/* YouTube Live page bootstrap.
 *
 * Starter wiring only — feel free to rewrite this entirely as you build the
 * real YouTube Live look. It shows the three shared helpers you have available.
 */
(function () {
  const s = GoLive.session(); // { username, streamer, platform }

  // Fill in the shared placeholders.
  document.querySelectorAll("[data-streamer]").forEach((el) => (el.textContent = s.streamer));
  document.querySelectorAll("[data-username]").forEach((el) => (el.textContent = "@" + s.username));

  // Live elapsed-time clock.
  const timerEl = document.querySelector("[data-timer]");
  if (timerEl) GoLive.startTimer(timerEl);

  // Turn on the webcam.
  const video = document.querySelector("[data-camera]");
  const errorEl = document.querySelector("[data-camera-error]");
  GoLive.startCamera(video).catch((err) => {
    console.error("Camera error:", err);
    if (errorEl) errorEl.style.display = "grid";
  });
})();

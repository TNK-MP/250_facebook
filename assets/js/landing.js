/* Landing page controller:
 *  - renders the platform picker from the shared registry
 *  - validates the form
 *  - hands the session off to the chosen platform page via URL params
 */
(function () {
  const { PLATFORMS } = window.GoLive;

  const form = document.getElementById("setup-form");
  const picker = document.querySelector(".platforms");

  // Build the platform radio cards.
  picker.innerHTML = PLATFORMS.map(
    (p) => `
    <div class="platform">
      <input type="radio" name="platform" id="platform-${p.id}" value="${p.id}" />
      <label for="platform-${p.id}">
        <span class="platform__icon" style="color:${p.color}">${p.icon}</span>
        <span>${p.name}</span>
      </label>
    </div>`
  ).join("");

  function setError(field, message) {
    const el = document.querySelector(`[data-error-for="${field}"]`);
    if (el) el.textContent = message || "";
  }

  function clearErrors() {
    ["username", "streamer", "platform"].forEach((f) => setError(f, ""));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();

    const username = form.username.value.trim();
    const streamer = form.streamer.value.trim();
    const viewersRaw = form.viewers.value.trim();
    const platform = (form.querySelector('input[name="platform"]:checked') || {}).value;

    let ok = true;
    if (!username) {
      setError("username", "Please enter a username.");
      ok = false;
    }
    if (!streamer) {
      setError("streamer", "Please enter the streamer's display name.");
      ok = false;
    }
    const viewers = Math.floor(Number(viewersRaw));
    if (viewersRaw !== "" && (!Number.isFinite(viewers) || viewers < 0)) {
      setError("viewers", "Enter a whole number of viewers (0 or more).");
      ok = false;
    }
    if (!platform) {
      setError("platform", "Please choose a platform.");
      ok = false;
    }
    if (!ok) return;

    const target = window.GoLive.getPlatform(platform);
    const params = new URLSearchParams({ username, streamer });
    if (viewersRaw !== "") params.set("viewers", String(viewers));
    window.location.href = `${target.page}?${params.toString()}`;
  });
})();

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

  // Make the stream look active with dynamic updates
  const sampleChatMessages = [
    { author: "CraftMaster", text: "This is incredible! 🎉", color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { author: "DigitalNomad", text: "Love the production quality!", color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { author: "ChillVibes_", text: "Been here since the start, never disappointed", color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { author: "FutureFocused", text: "Subscribed! 👍", color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
    { author: "GreenScreen", text: "Top tier content!", color: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" },
    { author: "PixelPerfect", text: "How do you do this so smoothly?", color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
    { author: "NeonGlow", text: "The energy is unmatched 🔥", color: "linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)" },
    { author: "VibrantVibes", text: "I'm telling everyone about this!", color: "linear-gradient(135deg, #2e2e78 0%, #662d91 100%)" },
    { author: "EchoStudio", text: "Absolutely brilliant work", color: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)" },
    { author: "NovaLight", text: "Can't wait for the next one!", color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { author: "StardustDream", text: "This stream > all others", color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { author: "BlazeFire", text: "Hit that subscribe button everyone!", color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { author: "SereneFlow", text: "Peaceful and amazing 💫", color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
    { author: "ThunderStrike", text: "LETS GOOOO!", color: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" },
    { author: "LunaLight", text: "Amazing content as always 💯", color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
    { author: "VortexWire", text: "Never miss a stream!", color: "linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)" },
    { author: "PhoenixRise", text: "Goated streamer right here", color: "linear-gradient(135deg, #2e2e78 0%, #662d91 100%)" },
    { author: "EchoVoice", text: "This is what I needed today", color: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)" },
    { author: "SonicSpeed", text: "Keep the streams coming! 🚀", color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { author: "GlacierFrost", text: "Finally got here, what did I miss?", color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  ];

  const sampleViewerCounts = [2847, 2896, 2954, 3021, 3089, 3156, 3201, 3267, 3334, 3401, 3456, 3523];
  let viewerIndex = 0;

  // Update viewer count periodically
  const viewerEl = document.querySelector("[data-viewer-count]");
  if (viewerEl) {
    setInterval(() => {
      viewerIndex = (viewerIndex + 1) % sampleViewerCounts.length;
      const newCount = sampleViewerCounts[viewerIndex];
      viewerEl.textContent = newCount.toLocaleString();
    }, 5000); // Update every 5 seconds
  }

  // Add new chat messages periodically
  const chatContainer = document.querySelector("[data-chat-container]");
  if (chatContainer) {
    setInterval(() => {
      const randomMsg = sampleChatMessages[Math.floor(Math.random() * sampleChatMessages.length)];
      const initials = randomMsg.author.split(/(?=[A-Z])/).map(w => w[0]).join("").substring(0, 2).toUpperCase();

      const messageEl = document.createElement("div");
      messageEl.className = "yt-chat-message";
      messageEl.innerHTML = `
        <div class="yt-message-avatar" style="background: ${randomMsg.color};">${initials}</div>
        <div class="yt-message-content">
          <span class="yt-message-author">${randomMsg.author}</span>
          <span class="yt-message-text">${randomMsg.text}</span>
        </div>
      `;
      chatContainer.appendChild(messageEl);

      // Keep chat scrolled to bottom
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 10);

      // Remove old messages if there are too many
      while (chatContainer.children.length > 25) {
        chatContainer.removeChild(chatContainer.firstChild);
      }
    }, 800 + Math.random() * 800); // New message every 0.8-1.6 seconds (MUCH faster)
  }
})();

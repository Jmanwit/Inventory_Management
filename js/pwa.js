// Shack Out Back PWA installation and user-approved application updates.
const SW_URL = "./service-worker.js";

function showUpdatePrompt(registration) {
  if (!registration.waiting || document.getElementById("sob-update-prompt")) return;

  const prompt = document.createElement("aside");
  prompt.id = "sob-update-prompt";
  prompt.setAttribute("role", "status");
  prompt.innerHTML = `
    <div class="sob-update-copy">
      <strong>Shack Out Back update ready</strong>
      <span>A new version is ready. Your inventory remains in your account.</span>
    </div>
    <div class="sob-update-actions">
      <button type="button" class="sob-update-later">Later</button>
      <button type="button" class="sob-update-now">Update</button>
    </div>`;
  document.body.append(prompt);

  prompt.querySelector(".sob-update-later").addEventListener("click", () => prompt.remove());
  prompt.querySelector(".sob-update-now").addEventListener("click", () => {
    const update = registration.waiting;
    if (update) update.postMessage({ type: "SOB_SKIP_WAITING" });
    prompt.querySelector(".sob-update-now").disabled = true;
    prompt.querySelector(".sob-update-now").textContent = "Updating…";
  });
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  let refreshing = false;
  // A first-ever service-worker install should not force a page reload.
  const hadControllerAtStartup = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadControllerAtStartup || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, { scope: "./" });

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdatePrompt(registration);
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" &&
              navigator.serviceWorker.controller &&
              registration.waiting) {
            showUpdatePrompt(registration);
          }
        });
      });

      // Check for a newer deployment when the app is opened.
      await registration.update();
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdatePrompt(registration);
      }
    } catch (error) {
      console.warn("Shack Out Back PWA registration/update check failed:", error);
    }
  });
}

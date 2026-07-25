(() => {
  const script = document.currentScript;
  const root = new URL(script?.dataset.root || "../", script?.src || location.href);
  const installButton = document.querySelector("#installAppBtn");
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMobile = matchMedia("(pointer: coarse)").matches || innerWidth <= 820;
  let installPrompt = null;

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(new URL("sw.js", root), { scope: root.pathname })
        .catch((error) => console.warn("GUCC service worker registration failed:", error));
    });
  }

  if (!installButton || isStandalone) return;

  if (isIos || isMobile) installButton.hidden = false;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
    showToast("GUCC 已安装到设备");
  });

  installButton.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      installPrompt = null;
      if (result.outcome === "accepted") installButton.hidden = true;
      return;
    }

    showInstallHelp();
  });

  function showInstallHelp() {
    const existing = document.querySelector(".pwa-sheet-backdrop");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "pwa-sheet-backdrop";
    backdrop.innerHTML = `
      <section class="pwa-sheet" role="dialog" aria-modal="true" aria-labelledby="pwaSheetTitle">
        <h2 id="pwaSheetTitle">安装 GUCC 到手机</h2>
        <p>${isIos ? "iPhone / iPad 需要通过 Safari 的分享菜单安装。" : "如果浏览器没有弹出安装窗口，可以从浏览器菜单手动安装。"}</p>
        <ol class="pwa-steps">
          ${isIos
            ? "<li>点击 Safari 底部的“分享”按钮</li><li>选择“添加到主屏幕”</li><li>点击右上角“添加”</li>"
            : "<li>打开浏览器右上角菜单</li><li>选择“安装应用”或“添加到主屏幕”</li><li>确认安装</li>"}
        </ol>
        <button class="pwa-sheet-close" type="button">知道了</button>
      </section>`;

    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    backdrop.querySelector(".pwa-sheet-close").addEventListener("click", close);
    document.addEventListener("keydown", function onKeydown(event) {
      if (event.key !== "Escape") return;
      document.removeEventListener("keydown", onKeydown);
      close();
    });

    document.body.append(backdrop);
    backdrop.querySelector(".pwa-sheet-close").focus();
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "pwa-toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }
})();

(() => {
  const resetTimers = new WeakMap();

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Fall through to the selection-based copy path
      }
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.opacity = "0";
    document.body.append(input);
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);

    try {
      if (document.execCommand("copy")) return true;
    } finally {
      input.remove();
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    return false;
  };

  document.querySelectorAll("[data-copy-command]").forEach((button) => {
    const command = button.dataset.copyCommand;
    const status = button.querySelector("[data-copy-status]");

    if (!command) return;

    button.addEventListener("click", async () => {
      window.clearTimeout(resetTimers.get(button));

      const copied = await copyText(command).catch(() => false);

      button.classList.toggle("is-copied", copied);
      button.setAttribute("aria-label", copied ? `Copied in-game command ${command}` : `Copy failed for ${command}`);
      if (status) status.textContent = copied ? "Copied command!" : "Copy failed";

      resetTimers.set(button, window.setTimeout(() => {
        button.classList.remove("is-copied");
        button.setAttribute("aria-label", `Copy in-game command ${command}`);
        if (status) status.textContent = "";
      }, 1800));
    });
  });
})();

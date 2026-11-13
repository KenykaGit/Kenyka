"use strict";

// Restore the palette before the first stylesheet is loaded.
(() => {
  const root = document.documentElement;
  const storageKey = "kenyka-theme";
  let current = "dark";
  let activeTransition;
  let fallbackTimer;
  try {
    if (localStorage.getItem(storageKey) === "claude") current = "claude";
  } catch { /* Storage can be disabled in private browsing. */ }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content", theme === "claude" ? "#FAF9F6" : "#080808"
    );
  }
  applyTheme(current);

  document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("header");
    if (!header) return;
    const picker = document.createElement("div");
    picker.className = "theme-picker";
    picker.innerHTML = `
      <button class="theme-trigger" type="button" aria-pressed="false">
        <svg class="theme-icon theme-icon-dark" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/>
        </svg>
        <img class="theme-icon theme-icon-claude" src="/images/icons/claude.svg" alt="" width="20" height="20">
      </button>`;
    header.append(picker);
    const trigger = picker.querySelector("button");
    function syncControl() {
      const label = current === "claude" ? "Switch to Dark" : "Switch to Claude Mode";
      trigger.setAttribute("aria-label", label);
      trigger.setAttribute("title", label);
      trigger.setAttribute("aria-pressed", String(current === "claude"));
    }
    trigger.addEventListener("click", () => {
      current = current === "dark" ? "claude" : "dark";
      const next = current;
      try { localStorage.setItem(storageKey, next); } catch { /* Keep the choice for this visit. */ }
      activeTransition?.skipTransition();
      const update = () => { applyTheme(next); syncControl(); };
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        update();
      } else if (document.startViewTransition) {
        const transition = document.startViewTransition(update);
        activeTransition = transition;
        transition.finished.catch(() => {}).finally(() => {
          if (activeTransition === transition) activeTransition = null;
        });
      } else {
        root.classList.add("theme-changing");
        update();
        clearTimeout(fallbackTimer);
        fallbackTimer = setTimeout(() => root.classList.remove("theme-changing"), 650);
      }
    });
    window.addEventListener("storage", event => {
      if (event.key !== storageKey && event.key !== null) return;
      activeTransition?.skipTransition();
      current = event.newValue === "claude" ? "claude" : "dark";
      applyTheme(current);
      syncControl();
    });
    syncControl();
  });
})();

"use strict";

const viewport = document.getElementById("viewport");
const track = document.getElementById("track");
const slides = [...document.querySelectorAll(".slide")];
const navButtons = [...document.querySelectorAll("[data-goto]")];
const dots = [...document.querySelectorAll(".page-dot")];

let currentSlide = 0;
let lastTransition = 0;
let wheelAmount = 0;
let touchStart = null;
let toastTimeout = null;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let stopMeimeiRain = null;

function startMeimeiRain() {
  stopMeimeiRain?.();
  if (reduceMotion.matches) return;

  const layer = document.createElement("div");
  layer.className = "meimei-rain";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  const particles = [];
  const started = performance.now();
  let previous = started;
  let nextSpawn = 0;
  let frame;
  const cleanup = () => {
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
    layer.remove();
    stopMeimeiRain = null;
  };
  const timeout = setTimeout(cleanup, 10000);
  stopMeimeiRain = cleanup;

  function animate(now) {
    const elapsed = (now - started) / 1000;
    if (elapsed >= 10 || reduceMotion.matches) {
      cleanup();
      return;
    }
    const dt = Math.min((now - previous) / 1000, 0.035);
    previous = now;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (elapsed >= nextSpawn && elapsed < 7 && particles.length < 42) {
      const size = 38 + Math.random() * 34;
      const image = document.createElement("img");
      image.src = "images/meimei_drop.png";
      image.alt = "";
      image.draggable = false;
      image.width = size;
      image.height = size;
      layer.append(image);
      particles.push({
        image, size,
        x: Math.random() * Math.max(0, width - size),
        y: -size * 1.5,
        vx: (Math.random() - 0.5) * 220,
        vy: 40 + Math.random() * 120,
        angle: (Math.random() - 0.5) * 40,
        spin: (Math.random() - 0.5) * 180
      });
      nextSpawn = elapsed + 0.16;
    }

    for (const particle of particles) {
      particle.vy += 1200 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.angle += particle.spin * dt;
      const floor = Math.max(0, height - particle.size);
      const right = Math.max(0, width - particle.size);
      if (elapsed < 8 && particle.y >= floor && particle.vy > 0) {
        particle.y = floor;
        particle.vy = -Math.max(340 + Math.random() * 220, particle.vy * 0.72);
        particle.spin *= -0.85;
      }
      if ((particle.x < 0 && particle.vx < 0) || (particle.x > right && particle.vx > 0)) {
        particle.x = Math.max(0, Math.min(right, particle.x));
        particle.vx *= -1;
      }
      particle.image.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0) rotate(${particle.angle}deg)`;
    }
    frame = requestAnimationFrame(animate);
  }

  frame = requestAnimationFrame(animate);
}

prodContainer.querySelector(".prod-project-icon")?.addEventListener("click", startMeimeiRain);

function updatePosition(instant = false) {
  if (instant || reduceMotion.matches) {
    track.style.transition = "none";
  }

  track.style.transform = `translate3d(0, -${slides[currentSlide].offsetTop}px, 0)`;

  if (instant || reduceMotion.matches) {
    void track.offsetHeight;
    track.style.transition = "";
  }
}

function goTo(index, instant = false) {
  const next = Math.max(0, Math.min(slides.length - 1, index));

  if (next === currentSlide && !instant) return;

  currentSlide = next;
  wheelAmount = 0;
  lastTransition = Date.now();

  slides.forEach((slide, i) => {
    slide.classList.toggle("active", i === next);
    slide.inert = i !== next;
  });

  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === next);
  });

  document.querySelectorAll("nav [data-goto]").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.goto) === next);
  });

  fitScreens();
  updatePosition(instant);
  if (slides.some(slide => slide.inert && slide.contains(document.activeElement))) {
    const heading = slides[next].querySelector("h1, h2");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  history.replaceState(null, "", "#" + slides[next].id);
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    goTo(Number(button.dataset.goto));
  });
});

window.addEventListener("wheel", event => {
  if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

  const content = slides[currentSlide].querySelector(".screen-body");
  if (content && /^(auto|scroll)$/.test(getComputedStyle(content).overflowY)) {
    const maxScroll = content.scrollHeight - content.clientHeight;
    if ((event.deltaY > 0 && content.scrollTop < maxScroll - 3) ||
        (event.deltaY < 0 && content.scrollTop > 3)) return;
  }

  event.preventDefault();

  const multiplier = event.deltaMode === 1
    ? 16
    : event.deltaMode === 2
      ? window.innerHeight
      : 1;

  const delta = event.deltaY * multiplier;
  const direction = Math.sign(delta);

  if (!direction) return;

  if (Date.now() - lastTransition < 750) return;

  if (direction > 0 && currentSlide === slides.length - 1) return;
  if (direction < 0 && currentSlide === 0) return;

  if (Math.sign(wheelAmount) !== direction) {
    wheelAmount = 0;
  }

  wheelAmount += delta;

  if (Math.abs(wheelAmount) >= 24) {
    goTo(currentSlide + direction);
  }
}, { passive: false });

viewport.addEventListener("touchstart", event => {
  if (event.touches.length !== 1) {
    touchStart = null;
    return;
  }

  const touch = event.touches[0];
  const content = slides[currentSlide].querySelector(".screen-body");
  const canScrollContent = content && /^(auto|scroll)$/.test(getComputedStyle(content).overflowY);

  touchStart = {
    x: touch.clientX,
    y: touch.clientY,
    scrollTop: content?.scrollTop || 0,
    maxScroll: canScrollContent
      ? Math.max(0, content.scrollHeight - content.clientHeight)
      : 0
  };
}, { passive: true });

viewport.addEventListener("touchend", event => {
  if (!touchStart || !event.changedTouches.length) return;

  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const start = touchStart;

  touchStart = null;

  if (Math.abs(dy) < 55) return;
  if (Math.abs(dx) > Math.abs(dy) * .75) return;

  const direction = dy < 0 ? 1 : -1;

  if (start.maxScroll > 3) {
    const canScroll = direction > 0
      ? start.scrollTop < start.maxScroll - 3
      : start.scrollTop > 3;

    if (canScroll) return;
  }

  if (Date.now() - lastTransition > 500) {
    goTo(currentSlide + direction);
  }
}, { passive: true });

viewport.addEventListener("touchcancel", () => {
  touchStart = null;
}, { passive: true });

window.addEventListener("keydown", event => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;

  const focused = document.activeElement;

  if (["INPUT", "TEXTAREA", "SELECT"].includes(focused?.tagName)) return;
  if (focused?.matches("a, button, .project-card")) return;

  if (["ArrowDown", "PageDown"].includes(event.key)) {
    event.preventDefault();
    goTo(currentSlide + 1);
  }

  if (["ArrowUp", "PageUp"].includes(event.key)) {
    event.preventDefault();
    goTo(currentSlide - 1);
  }
});

function fitScreens() {
  const prodRowsHeight = prodEntries.reduce((height, entry) => height + Math.ceil(parseFloat(getComputedStyle(entry.querySelector("button")).height)), 0);
  const prodPanelHeight = Math.max(...prodEntries.map(entry => entry.querySelector(".prod-panel-inner").scrollHeight)) + 1;
  prodContainer.style.minHeight = `${prodRowsHeight + prodPanelHeight}px`;

  // Reserve space at the bottom of the card, as with PROD, keeping closed rows adjacent.
  const lyceumEntry = document.querySelector(".sayte-entry");
  const lyceumCard = lyceumEntry.closest(".achievement-card");
  const lyceumRowsHeight = [...lyceumCard.children]
    .filter(child => child !== lyceumEntry)
    .reduce((height, child) => height + Math.ceil(parseFloat(getComputedStyle(child).height)), 0);
  const lyceumTriggerHeight = Math.ceil(parseFloat(getComputedStyle(lyceumEntry.querySelector("button")).height));
  const lyceumPanelHeight = lyceumEntry.querySelector(".prod-panel-inner").scrollHeight;
  lyceumCard.style.minHeight = `${lyceumRowsHeight + lyceumTriggerHeight + lyceumPanelHeight + 1}px`;

  slides.forEach(slide => {
    const body = slide.querySelector(".screen-body");
    const style = getComputedStyle(slide);
    const available = slide.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (slide.id === "projects") {
      body.style.setProperty("--available", `${available}px`);
      return;
    }
    body.style.setProperty("--fit", Math.min(1, available / Math.max(1, body.scrollHeight)));
  });
}

window.addEventListener("resize", () => {
  fitScreens();
  updatePosition(true);
});
window.addEventListener("load", fitScreens);
document.fonts.ready.then(fitScreens);
fitScreens();

const prodLayoutObserver = new ResizeObserver(() => fitScreens());
prodLayoutObserver.observe(document.querySelector("#achievements .screen-body"));

function showToast(message) {
  const element = document.getElementById("toast");

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    element.classList.remove("show");
  }, 3000);
}



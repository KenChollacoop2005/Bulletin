// ============================================================
// physics.js — shared poster pendulum physics engine
// Registers posters by selector with per-poster tuning constants.
// One shared rAF loop and one shared mousemove listener handles all.
// ============================================================

(function () {
  const registered = []; // all registered poster physics configs + state

  let rafId = null;
  let loopRunning = false;
  let lastMouseX = null;
  let lastMouseY = null;

  // ============================================================
  // REGISTRATION
  // Call this from any poster JS file to opt into physics.
  // config = {
  //   selector     : CSS selector for the poster element
  //   gravity      : restoring force (higher = snappier return)
  //   damping      : velocity multiplier per frame (lower = faster decay)
  //   swipeScale   : mouse velocity -> angular impulse multiplier
  //   maxAngle     : degrees — max swing in either direction
  //   transformOrigin: CSS transform-origin string e.g. "top center"
  //
  // Optional PIVOT MODE (instead of transformOrigin) — swings the poster
  // around another element (e.g. a push pin) without touching the poster's
  // own transform-origin or transform:
  //   pivotSelector: CSS selector of the element to pivot around
  //   pivotOffset  : { x, y } px nudge from that element's center
  // Uses the separate `rotate`/`translate` CSS properties, which sit
  // outside `transform` — so the poster's inline transform, its
  // `transition: transform` (open/close animation) and its .poster-active
  // !important transform are all left alone.
  // }
  // ============================================================
  window.registerPosterPhysics = function (config) {
    const entry = {
      config,
      angle: 0, // current rotation in degrees
      vel: 0, // angular velocity in degrees/frame
      el: null, // resolved DOM element (lazy)
    };
    registered.push(entry);

    // Start the loop if it isn't already running
    if (!loopRunning) startLoop();
  };

  // ============================================================
  // LOOP
  // ============================================================
  function startLoop() {
    if (loopRunning) return;
    loopRunning = true;
    rafId = requestAnimationFrame(tick);
  }

  function tick() {
    if (!loopRunning) return;

    registered.forEach((entry) => {
      // Lazy-resolve the element
      if (!entry.el) {
        entry.el = document.querySelector(entry.config.selector);
        if (!entry.el) return;

        // Pivot-mode posters leave transform/transform-origin untouched
        if (!entry.config.pivotSelector) {
          entry.el.style.transformOrigin = entry.config.transformOrigin;

          // Capture whatever transform is already on the element as the base
          // so physics rotation layers on top without clobbering position
          entry.el.dataset.physicsBaseTransform =
            entry.el.style.transform || "";
        }
      }

      // Pivot mode while the poster is open: nothing to animate, and the
      // rotate/translate properties would still apply on top of the
      // enlarged active transform — so zero everything out
      if (
        entry.config.pivotSelector &&
        entry.el.classList.contains("poster-active")
      ) {
        entry.angle = 0;
        entry.vel = 0;
        entry.el.style.rotate = "";
        entry.el.style.translate = "";
        return;
      }

      // Skip if poster is active — physics pauses while open
      if (entry.el.classList.contains("poster-active")) {
        // Reset smoothly when closing — let damping bring it to rest
        // by keeping vel/angle but not applying further impulse
        entry.vel *= entry.config.damping;
        entry.angle += entry.vel;
        if (Math.abs(entry.angle) < 0.01 && Math.abs(entry.vel) < 0.01) {
          entry.angle = 0;
          entry.vel = 0;
        }
        return;
      }

      const cfg = entry.config;

      // Pivot mode: find the pivot element once (overlays load after
      // posters, so keep retrying until it exists). Stored as a px offset
      // from the poster's own center, in corkboard space — offsetLeft/Top
      // are layout values, so the poster's scale/rotation don't matter.
      if (cfg.pivotSelector && !entry.pivot) {
        const pivotEl = document.querySelector(cfg.pivotSelector);
        if (!pivotEl) return;
        const nudge = cfg.pivotOffset || { x: 0, y: 0 };
        entry.pivot = {
          x:
            pivotEl.offsetLeft +
            pivotEl.offsetWidth / 2 -
            (entry.el.offsetLeft + entry.el.offsetWidth / 2) +
            nudge.x,
          y:
            pivotEl.offsetTop +
            pivotEl.offsetHeight / 2 -
            (entry.el.offsetTop + entry.el.offsetHeight / 2) +
            nudge.y,
        };
      }

      // Pendulum restoring force
      entry.vel += -cfg.gravity * entry.angle;

      // Damping
      entry.vel *= cfg.damping;

      // Integrate
      entry.angle += entry.vel;

      // Clamp
      entry.angle = Math.max(
        -cfg.maxAngle,
        Math.min(cfg.maxAngle, entry.angle),
      );

      // Snap to rest if essentially still
      if (Math.abs(entry.angle) < 0.01 && Math.abs(entry.vel) < 0.01) {
        entry.angle = 0;
        entry.vel = 0;
      }

      if (cfg.pivotSelector) {
        // Rotate about the pivot point Q (offset from the poster's center):
        // translate(Q - R*Q) then rotate(angle) leaves Q fixed in place
        if (entry.angle === 0) {
          entry.el.style.rotate = "";
          entry.el.style.translate = "";
        } else {
          const rad = (entry.angle * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const { x, y } = entry.pivot;
          entry.el.style.rotate = `${entry.angle}deg`;
          entry.el.style.translate = `${x - (x * cos - y * sin)}px ${
            y - (x * sin + y * cos)
          }px`;
        }
        return;
      }

      // Apply — layered on top of existing inline transform if any
      // We store the base transform separately so we don't clobber it
      const base = entry.el.dataset.physicsBaseTransform || "";
      entry.el.style.transform = base
        ? `${base} rotate(${entry.angle}deg)`
        : `rotate(${entry.angle}deg)`;
    });

    rafId = requestAnimationFrame(tick);
  }

  // ============================================================
  // MOUSE MOVE — shared impulse detection
  // ============================================================
  document.addEventListener("mousemove", (e) => {
    const dx = lastMouseX !== null ? e.clientX - lastMouseX : 0;
    const dy = lastMouseY !== null ? e.clientY - lastMouseY : 0;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    const speed = Math.sqrt(dx * dx + dy * dy);
    if (speed < 2) return; // ignore tiny movements

    registered.forEach((entry) => {
      if (!entry.el) return;
      if (entry.el.classList.contains("poster-active")) return;
      if (entry.config.pivotSelector && !entry.pivot) return;

      // Check if mouse is over this poster's bounding box
      const rect = entry.el.getBoundingClientRect();
      const margin = 40; // px — react slightly outside the box too
      if (
        e.clientX < rect.left - margin ||
        e.clientX > rect.right + margin ||
        e.clientY < rect.top - margin ||
        e.clientY > rect.bottom + margin
      )
        return;

      const cfg = entry.config;

      // Horizontal mouse movement is the primary impulse driver
      // for posters pivoting at top center (like a pendulum)
      const impulse = dx * cfg.swipeScale;
      entry.vel += impulse;

      // Clamp velocity
      entry.vel = Math.max(
        -cfg.maxAngle * 0.4,
        Math.min(cfg.maxAngle * 0.4, entry.vel),
      );
    });
  });
})();

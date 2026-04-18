(function () {
  // ============================================================
  // STATE
  // ============================================================
  let selectedCharm = null;
  let openingAnimationDone = false;

  const HIDE_DELAY = 550;

  const charms = [
    "roots",
    "push",
    "installation",
    "recognition",
    "board",
    "legacy",
  ];

  const charmPages = {
    roots: [".GPSolar-roots1", ".GPSolar-roots2"],
    push: [".GPSolar-push1", ".GPSolar-push2", ".GPSolar-push3"],
    installation: [
      ".GPSolar-installation1",
      ".GPSolar-installation2",
      ".GPSolar-installation3",
    ],
    recognition: [
      ".GPSolar-recognition1",
      ".GPSolar-recognition2",
      ".GPSolar-recognition3",
      ".GPSolar-recognition4",
    ],
    board: [
      ".GPSolar-board1",
      ".GPSolar-board2",
      ".GPSolar-board3",
      ".GPSolar-board4",
    ],
    legacy: [".GPSolar-legacy1", ".GPSolar-legacy2", ".GPSolar-legacy3"],
  };

  // ============================================================
  // PHYSICS — PENDULUM SIMULATION
  // Each charm is a pendulum rotating around its pivot (right center,
  // because the images are rotated 90° clockwise in CSS).
  // Physics runs in a single shared rAF loop only while poster is active.
  // Mouse swipe impulse propagates one step to neighbors at NEIGHBOR_RATIO strength.
  // Click jiggle is isolated — no propagation.
  // ============================================================

  const GRAVITY = 0.018; // restoring force toward rest (higher = snappier return)
  const DAMPING = 0.88; // velocity multiplier per frame (lower = faster decay)
  const SWIPE_SCALE = 0.026; // how much mouse velocity translates to angular impulse
  const MAX_ANGLE = 18; // degrees — maximum swing limit
  const NEIGHBOR_RATIO = 0.38; // fraction of impulse passed to immediate neighbors
  const CLICK_IMPULSE = 2; // degrees/frame added on click jiggle

  // Per-charm physics state
  const state = {};
  charms.forEach((name) => {
    state[name] = {
      angle: 0, // current rotation in degrees
      vel: 0, // angular velocity in degrees/frame
    };
  });

  // Mouse tracking — we only care about velocity (delta) not position
  let lastMouseX = null;
  let lastMouseY = null;
  let rafId = null;
  let physicsActive = false;

  function applyImpulse(name, impulse) {
    state[name].vel += impulse;
    // Clamp velocity to prevent wild swings
    state[name].vel = Math.max(
      -MAX_ANGLE * 0.5,
      Math.min(MAX_ANGLE * 0.5, state[name].vel),
    );
  }

  function applyImpulseWithNeighbors(name, impulse) {
    const idx = charms.indexOf(name);
    applyImpulse(name, impulse);

    // One step left neighbor
    if (idx > 0) applyImpulse(charms[idx - 1], impulse * NEIGHBOR_RATIO);
    // One step right neighbor
    if (idx < charms.length - 1)
      applyImpulse(charms[idx + 1], impulse * NEIGHBOR_RATIO);
  }

  function physicsStep() {
    charms.forEach((name) => {
      const s = state[name];

      // Pendulum restoring force — pulls toward angle=0
      // Negative angle means pull is positive and vice versa
      s.vel += -GRAVITY * s.angle;

      // Damping
      s.vel *= DAMPING;

      // Integrate
      s.angle += s.vel;

      // Clamp angle
      s.angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, s.angle));

      // Apply rotation to the charm div
      // transform-origin is handled in CSS as "right center"
      // so this rotate adds on top of the existing CSS position
      const el = document.getElementById(`charm-${name}`);
      if (el) {
        el.style.transform = `rotate(${s.angle}deg)`;
      }
    });
  }

  function rafLoop() {
    if (!physicsActive) return;
    physicsStep();
    rafId = requestAnimationFrame(rafLoop);
  }

  function startPhysics() {
    if (physicsActive) return;
    physicsActive = true;
    rafId = requestAnimationFrame(rafLoop);
  }

  function stopPhysics() {
    physicsActive = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // Reset all charms to rest position
    charms.forEach((name) => {
      state[name].angle = 0;
      state[name].vel = 0;
      const el = document.getElementById(`charm-${name}`);
      if (el) el.style.transform = "";
    });
    lastMouseX = null;
    lastMouseY = null;
  }

  // ============================================================
  // MOUSE MOVE — swipe detection
  // Tracks mouse velocity and hits the charm whose div contains
  // the cursor, then propagates to neighbors.
  // ============================================================
  document.addEventListener("mousemove", (e) => {
    if (!physicsActive) return;

    const dx = lastMouseX !== null ? e.clientX - lastMouseX : 0;
    const dy = lastMouseY !== null ? e.clientY - lastMouseY : 0;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    // Only react to meaningful movement
    const speed = Math.sqrt(dx * dx + dy * dy);
    if (speed < 2) return;

    // Find which charm the mouse is over
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const charm = el?.closest(".GPS-charm");
    if (!charm) return;

    const name = charm.dataset.charm;
    if (!name) return;

    // Because charms are rotated 90° clockwise, vertical mouse movement
    // (dy) maps to the swinging axis. Horizontal movement (dx) is secondary.
    // We use dy as the primary impulse driver, dx as a smaller secondary.
    const impulse = (dy * 0.7 + dx * 0.3) * SWIPE_SCALE;
    applyImpulseWithNeighbors(name, impulse);
  });

  // ============================================================
  // HELPERS
  // ============================================================
  function getPages(charmName) {
    return (charmPages[charmName] || [])
      .map((sel) => document.querySelector(sel))
      .filter(Boolean);
  }

  function showPages(pages) {
    pages.forEach((el) => {
      if (el._hideTimer) {
        clearTimeout(el._hideTimer);
        el._hideTimer = null;
      }
      el.style.display = "block";
      el.getBoundingClientRect();
    });
  }

  function hidePages(pages) {
    pages.forEach((el) => {
      if (el._hideTimer) {
        clearTimeout(el._hideTimer);
        el._hideTimer = null;
      }
      el.classList.remove("charm-active");
      el._hideTimer = setTimeout(() => {
        if (!el.classList.contains("charm-active")) {
          el.style.display = "none";
          el.style.transition = "";
        }
        el._hideTimer = null;
      }, HIDE_DELAY);
    });
  }

  function setPageTransition(pages, delay) {
    pages.forEach((el) => {
      el.style.transition = `transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${delay}`;
    });
  }

  // ============================================================
  // SELECTION
  // ============================================================
  function selectCharm(name) {
    window.soundEffects?.play("GPSclick");
    window.soundEffects?.play("GPSpaper");
    charms.forEach((charm) => {
      const el = document.getElementById(`charm-${charm}`);
      if (el) el.classList.remove("charm-selected");
    });

    if (selectedCharm === name) {
      const pages = getPages(name);
      if (openingAnimationDone) setPageTransition(pages, "0s");
      hidePages(pages);
      selectedCharm = null;
    } else {
      if (selectedCharm) {
        const prevPages = getPages(selectedCharm);
        if (openingAnimationDone) setPageTransition(prevPages, "0s");
        hidePages(prevPages);
      }

      selectedCharm = name;

      const el = document.getElementById(`charm-${name}`);
      if (el) el.classList.add("charm-selected");

      const pages = getPages(name);
      showPages(pages);
      if (openingAnimationDone) setPageTransition(pages, "0s");
      pages.forEach((el) => el.classList.add("charm-active"));
    }

    // Click jiggle — isolated to clicked charm only, no propagation
    // Small random direction so repeated clicks feel varied
    const jiggleDir = Math.random() > 0.5 ? 1 : -1;
    applyImpulse(name, CLICK_IMPULSE * jiggleDir);

    console.log("Selected charm:", selectedCharm);
  }

  function clearSelection() {
    charms.forEach((charm) => {
      const el = document.getElementById(`charm-${charm}`);
      if (el) el.classList.remove("charm-selected");
    });

    Object.keys(charmPages).forEach((name) => {
      const pages = getPages(name);
      pages.forEach((el) => {
        if (el._hideTimer) {
          clearTimeout(el._hideTimer);
          el._hideTimer = null;
        }
        el.classList.remove("charm-active");
        el.style.transition = "";
        el.style.display = "none";
      });
    });

    selectedCharm = null;
  }

  // ============================================================
  // CLICK HANDLER
  // ============================================================
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".GPSolar-rope-wrap")) return;

    const allCharms = document.querySelectorAll(".GPS-charm");
    allCharms.forEach((c) => (c.style.pointerEvents = "none"));

    const el = document.elementFromPoint(e.clientX, e.clientY);

    allCharms.forEach((c) => (c.style.pointerEvents = "auto"));

    const charm = el?.closest(".GPS-charm");
    if (!charm) return;

    const name = charm.dataset.charm;
    if (name) selectCharm(name);
  });

  // ============================================================
  // POSTER STATE WATCHER
  // ============================================================
  const mo = new MutationObserver(() => {
    const poster = document.querySelector(".poster.GPSolar");
    if (!poster) return;

    if (poster.classList.contains("poster-active")) {
      window.soundEffects?.play("GPSopen"); // play open sound
      setTimeout(() => {
        window.soundEffects?.play("GPSslide"); // bag slides at 0.8s
      }, 700);
      setTimeout(() => {
        window.soundEffects?.play("GPSstack");
      }, 800);
      setTimeout(() => {
        openingAnimationDone = true;
        startPhysics();
      }, 1600);
    } else {
      openingAnimationDone = false;
      clearSelection();
      stopPhysics();
      window.soundEffects?.stopAll(); // cut any playing sounds
      window.soundEffects?.play("GPSclose"); // play close sound
    }
  });

  window._gpsMOInit = function (poster) {
    mo.observe(poster, {
      attributes: true,
      attributeFilter: ["class"],
    });
  };
})();

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
  // Uses elementFromPoint to let the browser do its own native
  // hit test — respects all CSS transforms and real PNG transparency
  // without any coordinate math. Temporarily disables pointer-events
  // on all charm divs so elementFromPoint pierces through to the
  // actual img underneath, which the browser only hits on opaque pixels.
  // ============================================================
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".GPSolar-rope-wrap")) return;

    // Disable pointer-events on all charm divs temporarily
    const allCharms = document.querySelectorAll(".GPS-charm");
    allCharms.forEach((c) => (c.style.pointerEvents = "none"));

    // Ask the browser what's visually at this exact point
    const el = document.elementFromPoint(e.clientX, e.clientY);

    // Restore pointer-events
    allCharms.forEach((c) => (c.style.pointerEvents = "auto"));

    // Walk up from the hit element to find a charm div
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
      setTimeout(() => {
        openingAnimationDone = true;
      }, 1600);
    } else {
      openingAnimationDone = false;
      clearSelection();
    }
  });

  window._gpsMOInit = function (poster) {
    mo.observe(poster, {
      attributes: true,
      attributeFilter: ["class"],
    });
  };
})();

(function () {
  // ============================================================
  // STATE
  // ============================================================
  let selectedCharm = null;
  let openingAnimationDone = false;

  // How long (ms) to wait after removing charm-active before setting
  // display:none — must be >= the slide-back transition duration (500ms).
  // A little extra headroom prevents cutting the animation short.
  const HIDE_DELAY = 550;

  const charms = [
    "roots",
    "push",
    "installation",
    "recognition",
    "board",
    "legacy",
  ];

  // pages controlled by each charm
  // NOTE: GPSolar-report is intentionally NOT listed here.
  //       It is the cover/stack image and must always remain rendered.
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

  /**
   * Make pages visible immediately so their transitions can fire.
   * Forces a reflow between display:block and adding charm-active
   * so the browser actually animates the slide-in.
   */
  function showPages(pages) {
    pages.forEach((el) => {
      // Cancel any pending hide timer on this element
      if (el._hideTimer) {
        clearTimeout(el._hideTimer);
        el._hideTimer = null;
      }
      el.style.display = "block";
      // Force reflow so the initial (stack) position is painted
      // before charm-active moves the element to its active position.
      el.getBoundingClientRect();
    });
  }

  /**
   * Remove charm-active so the slide-back transition plays,
   * then hide the element after the transition completes.
   */
  function hidePages(pages) {
    pages.forEach((el) => {
      // Cancel any previously scheduled hide first
      if (el._hideTimer) {
        clearTimeout(el._hideTimer);
        el._hideTimer = null;
      }
      // Remove charm-active — this triggers the CSS slide-back transition.
      // Do NOT clear el.style.transition here; that would kill the animation
      // before it starts. The transition stays alive until the timer fires.
      el.classList.remove("charm-active");
      // Hide after the slide-back transition has finished
      el._hideTimer = setTimeout(() => {
        // Only hide if the element hasn't been re-activated in the meantime
        if (!el.classList.contains("charm-active")) {
          el.style.display = "none";
          el.style.transition = ""; // safe to clear now — animation is done
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
    // Deselect all charm highlights
    charms.forEach((charm) => {
      const el = document.getElementById(`charm-${charm}`);
      if (el) el.classList.remove("charm-selected");
    });

    if (selectedCharm === name) {
      // Tapping the same charm again — deselect: slide back then hide
      const pages = getPages(name);
      if (openingAnimationDone) setPageTransition(pages, "0s");
      hidePages(pages);
      selectedCharm = null;
    } else {
      // Deactivate the previously selected charm, if any
      if (selectedCharm) {
        const prevPages = getPages(selectedCharm);
        if (openingAnimationDone) setPageTransition(prevPages, "0s");
        hidePages(prevPages);
      }

      selectedCharm = name;

      // Highlight the newly selected charm
      const el = document.getElementById(`charm-${name}`);
      if (el) el.classList.add("charm-selected");

      // Show and animate in the new charm's pages
      const pages = getPages(name);
      showPages(pages);
      if (openingAnimationDone) setPageTransition(pages, "0s");
      pages.forEach((el) => el.classList.add("charm-active"));
    }

    console.log("Selected charm:", selectedCharm);
  }

  /**
   * Called when the poster closes. Hides all charm pages immediately
   * (no delay needed — the whole poster is animating away anyway).
   */
  function clearSelection() {
    charms.forEach((charm) => {
      const el = document.getElementById(`charm-${charm}`);
      if (el) el.classList.remove("charm-selected");
    });

    Object.keys(charmPages).forEach((name) => {
      const pages = getPages(name);
      pages.forEach((el) => {
        // Cancel any pending hide timer
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
    const charm = e.target.closest(".GPS-charm");
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
      // Poster just opened — wait for the opening animation to complete
      // before enabling instant charm transitions (1.1s delay + 0.5s transition)
      setTimeout(() => {
        openingAnimationDone = true;
      }, 1600);
    } else {
      // Poster closed — reset everything immediately
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

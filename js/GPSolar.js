(function () {
  // ============================================================
  // STATE
  // ============================================================
  let selectedCharm = null;
  let openingAnimationDone = false;

  const charms = [
    "roots",
    "push",
    "installation",
    "recognition",
    "board",
    "legacy",
  ];

  // pages controlled by each charm
  const charmPages = {
    roots: [".GPSolar-roots1", ".GPSolar-roots2", ".GPSolar-report"],
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

  function setPageTransition(pages, delay) {
    pages.forEach((el) => {
      el.style.transition = `transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${delay}`;
    });
  }

  function clearPageTransition(pages) {
    pages.forEach((el) => {
      el.style.transition = "";
    });
  }

  // ============================================================
  // SELECTION
  // ============================================================
  function selectCharm(name) {
    // deselect all charm highlights
    charms.forEach((charm) => {
      const el = document.getElementById(`charm-${charm}`);
      if (el) el.classList.remove("charm-selected");
    });

    if (selectedCharm === name) {
      // deselecting — remove charm-active with no delay
      const pages = getPages(name);
      if (openingAnimationDone) setPageTransition(pages, "0s");
      pages.forEach((el) => el.classList.remove("charm-active"));
      selectedCharm = null;
    } else {
      // deactivate previous selection if any
      if (selectedCharm) {
        const prevPages = getPages(selectedCharm);
        if (openingAnimationDone) setPageTransition(prevPages, "0s");
        prevPages.forEach((el) => el.classList.remove("charm-active"));
      }

      selectedCharm = name;

      // highlight new charm
      const el = document.getElementById(`charm-${name}`);
      if (el) el.classList.add("charm-selected");

      // activate pages
      const pages = getPages(name);
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

    // clear all charm pages
    Object.keys(charmPages).forEach((name) => {
      const pages = getPages(name);
      pages.forEach((el) => {
        el.classList.remove("charm-active");
        el.style.transition = "";
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
    mo.disconnect();

    const poster = document.querySelector(".poster.GPSolar");

    if (!poster) {
      mo.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"],
      });
      return;
    }

    if (poster.classList.contains("poster-active")) {
      // poster just opened — wait for opening animation to finish
      setTimeout(() => {
        openingAnimationDone = true;
      }, 1600); // 1.1s delay + 0.5s transition
    } else {
      // poster closed — reset everything
      openingAnimationDone = false;
      clearSelection();
    }

    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });

  mo.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
  });
})();

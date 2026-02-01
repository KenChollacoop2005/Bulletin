const sceneContainer = document.querySelector(".scene-container");
const corkboard = document.querySelector(".corkboard");

let isZoomedIn = false;
let activePoster = null;

sceneContainer.style.transform = "scale(0.4)";
corkboard.style.transform = "rotateX(30deg) rotateY(-30deg)";

// List all poster HTML files
const posterFiles = [
  "Posters/Pamphlet-SawasdeeDC.html",
  "Posters/Poster2.html",
  "Posters/Poster3.html",
  "Posters/AccessibilityPaper.html",
  "Posters/NameCard.html",
  "Posters/CD-Saturn.html",
];
// Overlay HTML files (like posters, but rendered on top of corkboard)
const overlayFiles = ["Overlays/OverlayElements.html"];

// Dynamically load posters into the corkboard
async function loadPosters() {
  for (const file of posterFiles) {
    const response = await fetch(file);
    const html = await response.text();
    corkboard.insertAdjacentHTML("beforeend", html);
  }
  // After loading, initialize interactions
  initPosterInteractions();
}
async function loadOverlays() {
  const overlayLayer = corkboard; // overlays sit inside corkboard, same container
  for (const file of overlayFiles) {
    const response = await fetch(file);
    const html = await response.text();
    overlayLayer.insertAdjacentHTML("beforeend", html);
  }
}
// Poster click / zoom / pamphlet / name card logic
function initPosterInteractions() {
  const posters = document.querySelectorAll(".poster");

  function closeActivePoster() {
    if (!activePoster) return;

    // Special handling for name-card stacks
    if (activePoster.classList.contains("name-card-stack")) {
      const frontPage = activePoster.querySelector(".name-card-page.is-front");
      const backPage = activePoster.querySelector(".name-card-page.is-back");

      if (frontPage.classList.contains("page-back")) {
        // If back page is showing, swap pages first
        swapNameCardPages(activePoster, () => finishClose(activePoster));
        return; // exit now, will finish close after swap
      }
    }

    finishClose(activePoster);
  }

  function finishClose(poster) {
    if (poster.classList.contains("pamphlet")) {
      poster.classList.remove("open");
      // also remove any flipped state when closing
      const li = poster.querySelector(".SDCLanyard-inner");
      if (li) li.classList.remove("flipped");
    }
    poster.classList.remove("poster-active");
    poster.style.left = poster.dataset.originalLeft;
    poster.style.top = poster.dataset.originalTop;
    poster.style.transform = poster.dataset.originalTransform;
    activePoster = null;
    corkboard.classList.remove("has-active");
  }

  // Helper to swap name card pages programmatically
  function swapNameCardPages(stack, callback) {
    const currentFront = stack.querySelector(".name-card-page.is-front");
    const currentBack = stack.querySelector(".name-card-page.is-back");

    if (!currentFront || !currentBack) {
      callback();
      return;
    }

    currentFront.classList.add("moving-out");

    const onSlideOutEnd = (ev) => {
      if (ev.propertyName !== "transform") return;
      currentFront.removeEventListener("transitionend", onSlideOutEnd);

      currentFront.classList.remove("moving-out", "is-front");
      currentFront.classList.add("is-back");

      currentBack.classList.remove("is-back");
      currentBack.classList.add("is-front");

      const onSettleEnd = (ev2) => {
        if (ev2.propertyName !== "transform") return;
        currentBack.removeEventListener("transitionend", onSettleEnd);
        callback();
      };
      currentBack.addEventListener("transitionend", onSettleEnd);
    };
    currentFront.addEventListener("transitionend", onSlideOutEnd);
  }

  corkboard.addEventListener("click", () => {
    if (!isZoomedIn) {
      sceneContainer.style.transform = "scale(1)";
      corkboard.style.transform = "rotateX(0) rotateY(0)";
      corkboard.classList.add("zoomed-in");
      isZoomedIn = true;
    }
  });

  posters.forEach((poster) => {
    poster.addEventListener("click", function (e) {
      if (!isZoomedIn) return;
      if (activePoster && activePoster !== poster) closeActivePoster();
      if (!activePoster) {
        activePoster = poster;
        poster.dataset.originalLeft = poster.style.left || "";
        poster.dataset.originalTop = poster.style.top || "";
        poster.dataset.originalTransform = poster.style.transform || "";
        poster.classList.add("poster-active");
        corkboard.classList.add("has-active");
        if (poster.classList.contains("pamphlet")) {
          setTimeout(() => poster.classList.add("open"), 550);
        }
      }
    });

    // --- Pamphlet lanyard wiring (attach overlay click to toggle flip) ---
    const lanyardClick = poster.querySelector(".SDCLanyard-click");
    const lanyardInner = poster.querySelector(".SDCLanyard-inner");
    if (lanyardClick && lanyardInner) {
      lanyardClick.addEventListener("click", (ev) => {
        // stop propagation so the click doesn't re-close the poster or re-trigger other handlers
        ev.stopPropagation();
        // only allow flipping when this poster is active (open)
        if (!poster.classList.contains("poster-active")) return;
        lanyardInner.classList.toggle("flipped");
      });
    }
  });

  // Name card page swap (if it exists)
  const stack = document.querySelector(".name-card-stack");
  if (stack) {
    let swapping = false;

    function pointInRect(x, y, rect) {
      return (
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      );
    }

    function swapPages(e) {
      e.stopPropagation();
      if (swapping) return;
      swapping = true;

      const currentFront = stack.querySelector(".name-card-page.is-front");
      const currentBack = stack.querySelector(".name-card-page.is-back");

      currentFront.classList.add("moving-out");

      const onSlideOutEnd = (ev) => {
        if (ev.propertyName !== "transform") return;
        currentFront.removeEventListener("transitionend", onSlideOutEnd);

        currentFront.classList.remove("moving-out", "is-front");
        currentFront.classList.add("is-back");

        currentBack.classList.remove("is-back");
        currentBack.classList.add("is-front");

        const onSettleEnd = (ev2) => {
          if (ev2.propertyName !== "transform") return;
          currentBack.removeEventListener("transitionend", onSettleEnd);
          swapping = false;
        };
        currentBack.addEventListener("transitionend", onSettleEnd);
      };
      currentFront.addEventListener("transitionend", onSlideOutEnd);
    }

    stack.addEventListener("click", (e) => {
      if (activePoster !== stack) return;
      const frontClip = stack.querySelector(
        ".name-card-page.is-front .paperclip-container",
      );
      if (!frontClip) return;

      const rect = frontClip.getBoundingClientRect();
      if (pointInRect(e.clientX, e.clientY, rect)) {
        swapPages(e);
      }
    });
  }

  // Click outside to close posters
  document.addEventListener("click", (e) => {
    if (activePoster) {
      if (!e.target.closest(".poster-active")) closeActivePoster();
      return;
    }
    if (isZoomedIn && !e.target.closest(".corkboard")) {
      sceneContainer.style.transform = "scale(0.4)";
      corkboard.style.transform = "rotateX(30deg) rotateY(-30deg)";
      corkboard.classList.remove("zoomed-in");
      isZoomedIn = false;
    }
  });

  // Keyboard handling: 'f' flips the lanyard (if a pamphlet is active), Escape closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (activePoster) closeActivePoster();
      else if (isZoomedIn) {
        sceneContainer.style.transform = "scale(0.4)";
        corkboard.style.transform = "rotateX(30deg) rotateY(-30deg)";
        corkboard.classList.remove("zoomed-in");
        isZoomedIn = false;
      }
    }
  });
}

// Start by loading posters
loadPosters().then(() => {
  loadOverlays();
});

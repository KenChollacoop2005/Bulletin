const sceneContainer = document.querySelector(".scene-container");
const corkboard = document.querySelector(".corkboard");

let isZoomedIn = false;
let activePoster = null;
// Global animation lock - can be set by any poster JS file
window.animationRunning = false;
window.saturnAssemblyComplete = false;

sceneContainer.style.transform = "scale(0.4)";
corkboard.style.transform = "rotateX(30deg) rotateY(-30deg)";

// List all poster HTML files
const posterFiles = [
  "Posters/Pamphlet-SawasdeeDC.html",
  "Posters/Poster2.html",
  "Posters/Poster3.html",
  "Posters/AccessibilityPaper.html",
  "Posters/NameCard.html",
  "Posters/SafeSlip.html",
  "Posters/CD-Saturn.html",
  "Posters/GPSolar.html",
];
// Overlay HTML files (like posters, but rendered on top of corkboard)
const overlayFiles = ["Overlays/SatCD-Tape.html", "Overlays/SafeSlipPin.html"];

// ============================================================
// HEAVY ASSETS — images to decode during the loading screen
// Only the laggy ones, not every asset on the board
// ============================================================
const heavyAssets = [
  // GP Solar (all)
  "Assets/GPSolar/GPSbase.png",
  "Assets/GPSolar/GPSbase2.png",
  "Assets/GPSolar/GPSrope.png",
  "Assets/GPSolar/GPSpanel.png",
  "Assets/GPSolar/GPSroots1.png",
  "Assets/GPSolar/GPSroots2.png",
  "Assets/GPSolar/GPSreport.png",
  "Assets/GPSolar/GPSpush1.png",
  "Assets/GPSolar/GPSpush2.png",
  "Assets/GPSolar/GPSpush3.png",
  "Assets/GPSolar/GPSinstallation1.png",
  "Assets/GPSolar/GPSinstallation2.png",
  "Assets/GPSolar/GPSinstallation3.png",
  "Assets/GPSolar/GPSrecognition1.png",
  "Assets/GPSolar/GPSrecognition2.png",
  "Assets/GPSolar/GPSrecognition3.png",
  "Assets/GPSolar/GPSrecognition4.png",
  // SafeSlip
  "Assets/SafeSlip/SafeSlipBoard.png",
  "Assets/SafeSlip/SafeSlipLock.png",
  "Assets/SafeSlip/SafeSlipMask.png",
  "Assets/SafeSlip/SafeSlipMask2.png",
  "Assets/SafeSlip/SafeSlipDisplay.png",
  "Assets/SafeSlip/SafeSlipTop.png",
  "Assets/SafeSlip/SafeSlipTop.gif",
  // NameCard
  "Assets/Namecard/Namecard.png",
  "Assets/Namecard/NamecardBack.png",
];

// ============================================================
// LOADING SCREEN LOGIC
// ============================================================
const loadingScreen = document.getElementById("loading-screen");
const barFill = document.getElementById("loading-bar-fill");
const continueText = document.getElementById("loading-continue");

let loadingComplete = false;
let userClickedThrough = false;

function decodeAssets() {
  let resolved = 0;
  const total = heavyAssets.length;

  const promises = heavyAssets.map((src) => {
    const img = new Image();
    img.src = src;
    return img
      .decode()
      .catch(() => {}) // if one fails (e.g. gif), don't block everything
      .finally(() => {
        resolved++;
        // Update progress bar as each image resolves
        const pct = (resolved / total) * 100;
        barFill.style.width = `${pct}%`;

        // When all done, show the continue prompt
        if (resolved === total) {
          loadingComplete = true;
          continueText.style.opacity = "1";
        }
      });
  });

  return Promise.all(promises);
}

function dismissLoadingScreen() {
  // Fade out
  loadingScreen.style.transition = "opacity 0.6s ease";
  loadingScreen.style.opacity = "0";
  setTimeout(() => {
    loadingScreen.style.display = "none"; // fully remove from interaction
  }, 620); // slightly after fade completes
}

// Click anywhere to continue — but only once loading is done
document.addEventListener(
  "click",
  (e) => {
    // Let resume button work without triggering continue
    if (e.target.closest(".loading-resume-btn")) return;
    if (!loadingComplete || userClickedThrough) return;
    if (
      !loadingScreen.contains(e.target) &&
      loadingScreen.style.display === "none"
    )
      return;

    userClickedThrough = true;
    dismissLoadingScreen();
  },
  { capture: true },
); // capture: true so this fires before main.js poster click handlers

// ============================================================
// POSTER + OVERLAY LOADING
// ============================================================
async function loadPosters() {
  for (const file of posterFiles) {
    const response = await fetch(file);
    const html = await response.text();
    corkboard.insertAdjacentHTML("beforeend", html);
  }
  initPosterInteractions();
}

async function loadOverlays() {
  const overlayLayer = corkboard;
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

    if (activePoster.classList.contains("name-card-stack")) {
      const frontPage = activePoster.querySelector(".name-card-page.is-front");
      const backPage = activePoster.querySelector(".name-card-page.is-back");

      if (frontPage.classList.contains("page-back")) {
        swapNameCardPages(activePoster, () => finishClose(activePoster));
        return;
      }
    }

    finishClose(activePoster);
  }

  function finishClose(poster) {
    if (poster.classList.contains("pamphlet")) {
      poster.classList.remove("open");
      const li = poster.querySelector(".SDCLanyard-inner");
      if (li) li.classList.remove("flipped");
    }
    poster.classList.remove("poster-active");
    poster.style.left = poster.dataset.originalLeft;
    poster.style.top = poster.dataset.originalTop;
    poster.style.transform = poster.dataset.originalTransform;

    soundEffects.stopAll();

    if (poster.classList.contains("APFolder")) {
      soundEffects.play("APFClose");
    }
    if (poster.classList.contains("SaturnCD")) {
      setTimeout(() => {
        soundEffects.play("SCDclose");
      }, 100);
    }
    if (poster.classList.contains("name-card-stack")) {
      setTimeout(() => {
        soundEffects.play("NCputdown");
      }, 100);
    }
    if (poster.classList.contains("pamphlet")) {
      soundEffects.play("SDCPclose");
    }

    activePoster = null;
    corkboard.classList.remove("has-active");
  }

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

        if (poster.classList.contains("APFolder")) {
          setTimeout(() => {
            soundEffects.play("APF1");
          }, 400);
          setTimeout(() => {
            soundEffects.play("APF2");
          }, 150);
          setTimeout(() => {
            soundEffects.play("APF3");
          }, 100);
        }
        if (poster.classList.contains("SaturnCD")) {
          setTimeout(() => {
            soundEffects.play("SCDopen");
          }, 400);
          setTimeout(() => {
            soundEffects.play("SCDbpslide");
          }, 800);
        }
        if (poster.classList.contains("name-card-stack")) {
          setTimeout(() => {
            soundEffects.play("NCpickup");
          }, 10);
        }
        if (poster.classList.contains("pamphlet")) {
          setTimeout(() => {
            soundEffects.play("SDCpolaroid");
          }, 350);
          setTimeout(() => {
            soundEffects.play("SDClanyard");
          }, 700);
          setTimeout(() => {
            soundEffects.play("SDCticket");
          }, 900);
          setTimeout(() => {
            soundEffects.play("SDCticket");
          }, 1100);
        }
      }
    });

    const lanyardClick = poster.querySelector(".SDCLanyard-click");
    const lanyardInner = poster.querySelector(".SDCLanyard-inner");
    if (lanyardClick && lanyardInner) {
      lanyardClick.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!poster.classList.contains("poster-active")) return;
        lanyardInner.classList.toggle("flipped");
        soundEffects.play("SDClanyardFlip");
      });
    }
  });

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

    stack.addEventListener("transitionstart", (e) => {
      if (e.target.classList.contains("moving-out")) {
        soundEffects.stopAll();
        soundEffects.play("NCchange");
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (window.animationRunning) return;
    if (activePoster) {
      if (!e.target.closest(".poster-active")) {
        if (window.saturnAssemblyComplete) {
          window.saturnDisassemble();
        } else {
          closeActivePoster();
        }
      }
      return;
    }
    if (isZoomedIn && !e.target.closest(".corkboard")) {
      sceneContainer.style.transform = "scale(0.4)";
      corkboard.style.transform = "rotateX(30deg) rotateY(-30deg)";
      corkboard.classList.remove("zoomed-in");
      isZoomedIn = false;
    }
  });

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

// ============================================================
// KICK EVERYTHING OFF — posters/overlays + asset decoding run
// in parallel. Loading bar reflects decode progress.
// ============================================================
Promise.all([loadPosters().then(() => loadOverlays()), decodeAssets()]);

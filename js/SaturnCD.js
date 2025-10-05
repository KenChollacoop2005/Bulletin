// File: js/SaturnCD.js

(function () {
  // Config
  const SPIN_MS_PER_REV = 4000; // 1 full rotation every 3s
  const SPIN_DEG_PER_MS = 360 / SPIN_MS_PER_REV;

  // State
  let spinState = "idle"; // "idle" | "spinning"
  let spinRaf = null;
  let lastTimestamp = null;
  let currentRotation = -45; // baseline rotation

  function getActivePosterAndImg() {
    const poster = document.querySelector(".poster.SaturnCD.poster-active");
    if (!poster) return { poster: null, img: null };
    const img = poster.querySelector("#saturn-cd-disk");
    return { poster, img };
  }

  function spinFrame(ts, img) {
    if (!lastTimestamp) lastTimestamp = ts;
    const delta = ts - lastTimestamp;
    lastTimestamp = ts;

    currentRotation = (currentRotation + SPIN_DEG_PER_MS * delta) % 360;
    img.style.transform = `rotate(${currentRotation}deg)`;

    spinRaf = requestAnimationFrame((t) => spinFrame(t, img));
  }

  function startSpinning(img) {
    if (spinState === "spinning") return;
    spinState = "spinning";
    img.style.transition = "none"; // ensure RAF controls it smoothly
    lastTimestamp = performance.now();
    spinRaf = requestAnimationFrame((t) => spinFrame(t, img));
  }

  function stopSpinning(img) {
    if (spinRaf) cancelAnimationFrame(spinRaf);
    spinRaf = null;
    spinState = "idle";
    // Keep the current rotation position - don't reset to -45
    img.style.transition = "transform 0.4s ease";
    // The rotation stays at whatever currentRotation was when stopped
  }

  function stopAndReset(img) {
    if (spinRaf) cancelAnimationFrame(spinRaf);
    spinRaf = null;
    spinState = "idle";
    currentRotation = -45;
    img.style.transition = "transform 0.4s ease";
    img.style.transform = `rotate(${currentRotation}deg)`;
  }

  // Click handler: toggle continuous spin
  document.addEventListener("click", (e) => {
    const { poster, img } = getActivePosterAndImg();
    if (!poster || !img) return;

    const cdContainer = poster.querySelector(".cd-disk");
    if (!cdContainer || !cdContainer.contains(e.target)) return;

    if (spinState === "idle") {
      startSpinning(img);
    } else {
      stopSpinning(img); // Just stop, don't reset position
    }
  });

  // Watch for poster closing → stop + reset
  const mo = new MutationObserver(() => {
    const poster = document.querySelector(".poster.SaturnCD");
    if (!poster) return;
    const img = poster.querySelector("#saturn-cd-disk");
    if (!img) return;

    if (!poster.classList.contains("poster-active")) {
      stopAndReset(img); // Still reset when poster closes
    }
  });

  mo.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  // Initialize
  (function initIfPresent() {
    const poster = document.querySelector(".poster.SaturnCD");
    if (!poster) return;
    const img = poster.querySelector("#saturn-cd-disk");
    if (!img) return;
    img.style.transform = `rotate(${currentRotation}deg)`;
  })();
})();

document.addEventListener("DOMContentLoaded", () => {
  const corkboard = document.querySelector(".corkboard");

  const initObserver = new MutationObserver(() => {
    const poster = document.querySelector(".SafeSlip");
    if (!poster) return;

    initObserver.disconnect();

    // Preload all bloom assets so they're ready on first click
    const preloadSrcs = [
      "Assets/SafeSlip/SafeSlipBoard.png",
      "Assets/SafeSlip/SafeSlipLock.png",
      "Assets/SafeSlip/SafeSlipMask.png",
      "Assets/SafeSlip/SafeSlipMask2.png",
      "Assets/SafeSlip/SafeSlipDisplay.png",
      "Assets/SafeSlip/SafeSlipTop.png",
      "Assets/SafeSlip/SafeSlipTop.gif",
      "Assets/SafeSlip/SafeSlipTopStill.png",
    ];

    preloadSrcs.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    let bloomElements = [];
    let bloomTimeout = null;
    const speed = 350;

    // Every bloom element now rests at a static top/left/right (set once,
    // never animated) and slides via a translate() offset in "transform"
    // instead. dismissBloom reads that static value straight back off the
    // element's own style + its stored dataset.size/side/restRotation to
    // compute the same off-screen exit distance the old code used, just
    // expressed as a transform delta instead of a new top/left/right target.
    function dismissBloom() {
      if (bloomElements.length === 0) return;

      bloomElements.forEach((el) => {
        const side = el.dataset.side;
        const offscreenSize = parseFloat(el.dataset.size) + 200;
        const restRotation = el.dataset.restRotation || "0deg";

        let dx = 0;
        let dy = 0;

        if (side === "right") {
          const restRight = parseFloat(el.style.right);
          dx = restRight + offscreenSize; // push further right, off-screen
        } else if (side === "left") {
          const restLeft = parseFloat(el.style.left);
          dx = -offscreenSize - restLeft; // push further left, off-screen
        } else if (side === "top") {
          const restTop = parseFloat(el.style.top);
          dy = -offscreenSize - restTop; // push further up, off-screen
        } else if (side === "bottom") {
          const restTop = parseFloat(el.style.top);
          dy = window.innerHeight + 200 - restTop; // push down, off-screen
        }

        el.style.transition = `transform ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        el.style.transform = `translate(${dx}px, ${dy}px) rotate(${restRotation})`;
        soundEffects.play("SSclose");
      });

      setTimeout(() => {
        bloomElements.forEach((el) => el.remove());
        bloomElements = [];
      }, speed + 50);
    }

    const activeObserver = new MutationObserver(() => {
      if (poster.classList.contains("poster-active")) {
        // Preload the real GIF now, in the background, so it's already in
        // cache by the time notecardD's slide-in finishes and swaps over
        // to it — well before the 1800ms + slide delay below.
        const gifPreload = new Image();
        gifPreload.src = "Assets/SafeSlip/SafeSlipTop.gif";

        bloomTimeout = setTimeout(() => {
          triggerInfoBloom(poster, bloomElements);
        }, 1800);
        setTimeout(() => {
          soundEffects.play("SSflip");
        }, 800);
      }

      if (!poster.classList.contains("poster-active")) {
        clearTimeout(bloomTimeout);
        dismissBloom();
      }
    });

    activeObserver.observe(poster, {
      attributes: true,
      attributeFilter: ["class"],
    });
  });

  initObserver.observe(corkboard, { childList: true, subtree: true });
});

function triggerInfoBloom(poster, bloomElements) {
  const posterRect = poster.getBoundingClientRect();
  const padding = 20;
  const gap = 60;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // ============================================================
  // BOARD (slides in from left)
  // Every element below follows the same pattern: compute the exact same
  // final resting value the old code used as its *animated target*, set it
  // as a static (never-transitioned) top/left/right, then express the old
  // off-screen starting value as a translate() offset from that static
  // position. The slide-in becomes "transform: translate(offset) rotate(a)"
  // animating to "translate(0, 0) rotate(b)" — same visual motion, same
  // resting spot, but driven by a compositor-only property instead of one
  // that forces layout on every frame.
  // ============================================================
  const boardWidth = 736;
  const boardHeight = 1002;

  const board = document.createElement("img");
  board.src = "Assets/SafeSlip/SafeSlipBoard.png";
  board.style.position = "fixed";
  board.style.width = `${boardWidth}px`;
  board.style.height = `${boardHeight}px`;
  board.style.objectFit = "contain";
  board.style.zIndex = "102";
  board.style.top = `${posterRect.top + posterRect.height / 2 - boardHeight / 2 - 100}px`;

  let boardRestLeft = posterRect.left - gap - boardWidth;
  boardRestLeft = Math.max(padding, boardRestLeft);
  boardRestLeft -= 20;
  board.style.left = `${boardRestLeft}px`;

  const boardStartLeft = -(boardWidth + 140);
  const boardStartX = boardStartLeft - boardRestLeft;
  const boardRestRotate = -2; // deg — final rotation, unchanged from before

  board.style.transform = `translate(${boardStartX}px, 0px) rotate(2deg)`;
  board.style.transition =
    "transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  board.dataset.side = "left";
  board.dataset.size = boardWidth;
  board.dataset.restRotation = `${boardRestRotate}deg`;
  document.body.appendChild(board);
  bloomElements.push(board);

  //
  // ALL OF THE FOLLOWING CODE FOR SIDE ELEMENTS ARE STOLEN FROM SATURN's INFO BLOOM SO NAMING
  // MAY NOT MAKE 100% SENSE. KEEP THAT IN MIND
  //

  // ============================================================
  // Lock
  // ============================================================
  const notecardWidth = 3648 * 0.2;
  const notecardHeight = 3648 * 0.2;

  const notecardA = document.createElement("img");
  notecardA.src = "Assets/SafeSlip/SafeSlipLock.png";
  notecardA.style.position = "fixed";
  notecardA.style.width = `${notecardWidth}px`;
  notecardA.style.height = `${notecardHeight}px`;
  notecardA.style.objectFit = "contain";
  notecardA.style.zIndex = "101";
  notecardA.style.top = `${posterRect.top + posterRect.height / 2 - notecardHeight / 2 - 285}px`;

  const notecardARightPos = posterRect.right + gap;
  const notecardARestRight =
    viewportWidth - notecardARightPos - notecardWidth + 300;
  notecardA.style.right = `${notecardARestRight}px`;

  const notecardAStartRight = -(notecardWidth + 200);
  const notecardAStartX = notecardARestRight - notecardAStartRight;
  const notecardARestRotate = 5; // deg

  notecardA.style.transform = `translate(${notecardAStartX}px, 0px) rotate(8deg)`;
  notecardA.style.transition =
    "transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardA.dataset.side = "right";
  notecardA.dataset.size = notecardWidth;
  notecardA.dataset.restRotation = `${notecardARestRotate}deg`;
  document.body.appendChild(notecardA);
  bloomElements.push(notecardA);

  // ============================================================
  // Mask
  // ============================================================
  const notecardWidth2 = 3648 * 0.2;
  const notecardHeight2 = 3648 * 0.2;
  const notecardB = document.createElement("img");
  notecardB.src = "Assets/SafeSlip/SafeSlipMask.png";
  notecardB.style.position = "fixed";
  notecardB.style.width = `${notecardWidth2}px`;
  notecardB.style.height = `${notecardHeight2}px`;
  notecardB.style.objectFit = "contain";
  notecardB.style.zIndex = "102";
  notecardB.style.top = `${posterRect.top + posterRect.height / 2 - notecardHeight2 / 2 + 300}px`;

  const notecardBRightPos = posterRect.right + gap;
  const notecardBRestRight =
    viewportWidth - notecardBRightPos - notecardWidth2 + 360;
  notecardB.style.right = `${notecardBRestRight}px`;

  const notecardBStartRight = -(notecardWidth2 + 200);
  const notecardBStartX = notecardBRestRight - notecardBStartRight;
  const notecardBRestRotate = -8; // deg

  notecardB.style.transform = `translate(${notecardBStartX}px, 0px) rotate(-4deg)`;
  notecardB.style.transition =
    "transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardB.dataset.side = "right";
  notecardB.dataset.size = notecardWidth2;
  notecardB.dataset.restRotation = `${notecardBRestRotate}deg`;
  document.body.appendChild(notecardB);
  bloomElements.push(notecardB);

  // ============================================================
  // Mask polaroid
  // ============================================================
  const notecardWidth3 = 3648 * 0.1;
  const notecardHeight3 = 3648 * 0.1;
  const notecardC = document.createElement("img");
  notecardC.src = "Assets/SafeSlip/SafeSlipMask2.png";
  notecardC.style.position = "fixed";
  notecardC.style.width = `${notecardWidth3}px`;
  notecardC.style.height = `${notecardHeight3}px`;
  notecardC.style.objectFit = "contain";
  notecardC.style.zIndex = "103";
  notecardC.style.top = `${posterRect.top + posterRect.height / 2 - notecardHeight3 / 2 + 243}px`;

  const notecardCRightPos = posterRect.right + gap;
  const notecardCRestRight =
    viewportWidth - notecardCRightPos - notecardWidth3 - 256;
  notecardC.style.right = `${notecardCRestRight}px`;

  const notecardCStartRight = -(notecardWidth3 + 200);
  const notecardCStartX = notecardCRestRight - notecardCStartRight;
  const notecardCRestRotate = 19; // deg

  notecardC.style.transform = `translate(${notecardCStartX}px, 0px) rotate(3deg)`;
  notecardC.style.transition =
    "transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardC.dataset.side = "right";
  notecardC.dataset.size = notecardWidth3;
  notecardC.dataset.restRotation = `${notecardCRestRotate}deg`;
  document.body.appendChild(notecardC);
  bloomElements.push(notecardC);

  // ============================================================
  // Welding and fabrics
  // ============================================================
  const notecardWidth4 = 1920 * 0.5;
  const notecardHeight4 = 1080 * 0.5;

  const notecardD = document.createElement("div");
  notecardD.style.position = "fixed";
  notecardD.style.width = `${notecardWidth4}px`;
  notecardD.style.height = `${notecardHeight4}px`;
  notecardD.style.zIndex = "101";
  notecardD.style.left = `${posterRect.left + posterRect.width / 2 - notecardWidth4 / 2 - 170}px`;

  const notecardDRestTop = padding - 70;
  notecardD.style.top = `${notecardDRestTop}px`;

  const notecardDStartTop = -notecardHeight4;
  const notecardDStartY = notecardDStartTop - notecardDRestTop;
  const notecardDRestRotate = 0; // deg

  notecardD.style.transform = `translate(0px, ${notecardDStartY}px) rotate(-5deg)`;
  notecardD.style.transition =
    "transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardD.dataset.side = "top";
  notecardD.dataset.size = notecardHeight4;
  notecardD.dataset.restRotation = `${notecardDRestRotate}deg`;

  // GIF sits behind the PNG cutout. Starts on a static first frame
  // (SafeSlipTopStill.png, matched pixel-for-pixel to the GIF) and swaps to
  // the real animated GIF only once notecardD's own slide-in transform
  // finishes — so the GIF isn't decoding/animating while it (and the rest
  // of the bloom) is still sliding. { once: true } so the dismiss
  // transition's transitionend doesn't re-trigger a pointless re-swap.
  // Width/height are identical before and after the swap (both fixed in px
  // below), so this causes no layout shift.
  const notecardDGif = document.createElement("img");
  notecardDGif.src = "Assets/SafeSlip/SafeSlipTopStill.png";
  notecardDGif.style.position = "absolute";
  notecardDGif.style.width = `${2000 * 0.16}px`; // scale factor
  notecardDGif.style.height = `${2500 * 0.16}px`; // scale factor
  notecardDGif.style.top = "80px"; // nudge until aligned
  notecardDGif.style.left = "100px"; // nudge until aligned
  notecardDGif.style.transform = "rotate(-4deg)";
  notecardDGif.style.objectFit = "cover";
  notecardDGif.style.zIndex = "1";
  notecardD.appendChild(notecardDGif);

  notecardD.addEventListener(
    "transitionend",
    (e) => {
      if (e.propertyName !== "transform") return;
      notecardDGif.src = "Assets/SafeSlip/SafeSlipTop.gif";
    },
    { once: true },
  );

  // PNG cutout sits on top of the GIF
  const notecardDPng = document.createElement("img");
  notecardDPng.src = "Assets/SafeSlip/SafeSlipTop.png";
  notecardDPng.style.position = "absolute";
  notecardDPng.style.width = "100%";
  notecardDPng.style.height = "100%";
  notecardDPng.style.top = "0";
  notecardDPng.style.left = "0";
  notecardDPng.style.objectFit = "contain";
  notecardDPng.style.zIndex = "2";
  notecardD.appendChild(notecardDPng);

  document.body.appendChild(notecardD);
  bloomElements.push(notecardD);

  // ============================================================
  // Display Polaroid (slides in from bottom)
  // ============================================================
  const notecardWidth5 = 6000 * 0.19;
  const notecardHeight5 = 3648 * 0.19;

  const notecardE = document.createElement("img");
  notecardE.src = "Assets/SafeSlip/SafeSlipDisplay.png";
  notecardE.style.position = "fixed";
  notecardE.style.width = `${notecardWidth5}px`;
  notecardE.style.height = `${notecardHeight5}px`;
  notecardE.style.objectFit = "contain";
  notecardE.style.zIndex = "101";
  notecardE.style.left = `${posterRect.left + posterRect.width / 2 - notecardWidth5 / 2 - 200}px`;

  const notecardERestTop = viewportHeight - notecardHeight5 - padding + 120;
  notecardE.style.top = `${notecardERestTop}px`;

  const notecardEStartTop = viewportHeight;
  const notecardEStartY = notecardEStartTop - notecardERestTop;
  const notecardERestRotate = 0; // deg

  notecardE.style.transform = `translate(0px, ${notecardEStartY}px) rotate(4deg)`;
  notecardE.style.transition =
    "transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardE.dataset.side = "bottom";
  notecardE.dataset.size = notecardHeight5;
  notecardE.dataset.restRotation = `${notecardERestRotate}deg`;
  document.body.appendChild(notecardE);
  bloomElements.push(notecardE);

  // ============================================================
  // SLIDE EVERYTHING IN
  // Resting positions are already set above — this just animates each
  // element's transform back to translate(0, 0) at its own final rotation,
  // landing exactly on the static top/left/right already in place.
  // ============================================================
  setTimeout(() => {
    board.style.transform = `translate(0px, 0px) rotate(${boardRestRotate}deg)`;

    const delayA = 100 + Math.random() * 200;
    const delayB = 100 + Math.random() * 200;
    const delayC = 200 + Math.random() * 200;
    const delayD = 100 + Math.random() * 200;
    const delayE = 100 + Math.random() * 200;

    setTimeout(() => {
      notecardA.style.transform = `translate(0px, 0px) rotate(${notecardARestRotate}deg)`;
      soundEffects.play("SSslide1");
    }, delayA);

    setTimeout(() => {
      notecardB.style.transform = `translate(0px, 0px) rotate(${notecardBRestRotate}deg)`;
      soundEffects.play("SSslide2");
    }, delayB);

    setTimeout(() => {
      notecardC.style.transform = `translate(0px, 0px) rotate(${notecardCRestRotate}deg)`;
      soundEffects.play("SSslide3");
    }, delayC);

    setTimeout(() => {
      notecardD.style.transform = `translate(0px, 0px) rotate(${notecardDRestRotate}deg)`;
      soundEffects.play("SSslide4");
    }, delayD);

    setTimeout(() => {
      notecardE.style.transform = `translate(0px, 0px) rotate(${notecardERestRotate}deg)`;
      soundEffects.play("SSslide5");
    }, delayE);
  }, 50);
}

// Register SafeSlip for pendulum physics
// SafeSlip is a plastic lanyard card pinned at top center —
// light, small, reacts easily to nearby movement
window.registerPosterPhysics({
  selector: ".poster.SafeSlip",
  transformOrigin: "center left",
  gravity: 0.008, // low — light plastic, slow return
  damping: 0.92, // high — swings freely, takes a while to settle
  swipeScale: -0.015, // fairly reactive — it's small and light
  maxAngle: 12, // degrees — lanyard card, not a huge swing
});

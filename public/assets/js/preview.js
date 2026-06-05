(() => {
  const preview = document.querySelector("#preview");

  if (!preview) {
    return;
  }

  const map = preview.querySelector(".preview-map");
  const mapFrames = [...preview.querySelectorAll(".map-frame")];
  const terminalEntries = [...preview.querySelectorAll(".terminal-entry")];
  const terminalHistory = preview.querySelector("[data-terminal-history]");
  const progressTrack = preview.querySelector(".preview-progress");
  const progressPills = [...preview.querySelectorAll(".preview-progress button")];
  const mobilePreview = window.matchMedia("(max-width: 640px)");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frameDuration = 4000;
  const finalFrameDuration = frameDuration * 2;
  let activeStep = 0;
  let previousFrameCleanup;
  let frameTimer;
  let stepStartedAt = 0;
  let remainingFrameTime = frameDuration;
  let currentFrameDuration = frameDuration;
  let touchHoldTimer;
  let activeTouchHold;
  let isPaused = false;
  let isPreviewVisible = false;
  const preloadedFrames = new Set();

  if (mapFrames.length === 0) {
    return;
  }

  const normalizeStep = (step) => ((step % mapFrames.length) + mapFrames.length) % mapFrames.length;

  const preloadFrame = (step) => {
    const normalizedStep = normalizeStep(step);

    if (preloadedFrames.has(normalizedStep)) {
      return;
    }

    const frame = mapFrames[normalizedStep];
    if (!frame) {
      return;
    }

    const image = new Image();
    image.src = frame.currentSrc || frame.src;
    preloadedFrames.add(normalizedStep);
  };

  preloadFrame(activeStep);

  const scrollToNewestEntry = (step) => {
    if (!terminalHistory || mobilePreview.matches || !isPreviewVisible) {
      return;
    }

    const newestEntry = terminalEntries[step];
    const behavior = prefersReducedMotion ? "auto" : "smooth";
    const scrollToBottom = (scrollBehavior = behavior) => {
      const entryBottom = newestEntry ? newestEntry.offsetTop + newestEntry.offsetHeight : terminalHistory.scrollHeight;
      const targetTop = Math.max(0, entryBottom - terminalHistory.clientHeight);

      terminalHistory.scrollTo({
        top: targetTop,
        behavior: scrollBehavior
      });
    };

    window.requestAnimationFrame(() => {
      scrollToBottom();
      window.setTimeout(() => scrollToBottom("auto"), 560);
    });
  };

  const clearFrameTimer = () => {
    window.clearTimeout(frameTimer);
    frameTimer = undefined;
    stepStartedAt = 0;
  };

  const getFrameDuration = (step) => {
    const normalizedStep = normalizeStep(step);
    return normalizedStep === mapFrames.length - 1 ? finalFrameDuration : frameDuration;
  };

  const getRemainingFrameTime = () => {
    if (!frameTimer || stepStartedAt === 0) {
      return getFrameDuration(activeStep);
    }

    return Math.max(currentFrameDuration - (Date.now() - stepStartedAt), 250);
  };

  const scheduleNextFrame = (delay = getFrameDuration(activeStep)) => {
    if (prefersReducedMotion || mapFrames.length === 0 || isPaused || !isPreviewVisible) {
      return;
    }

    clearFrameTimer();
    remainingFrameTime = delay;
    currentFrameDuration = delay;
    stepStartedAt = Date.now();
    frameTimer = window.setTimeout(() => {
      showStep((activeStep + 1) % mapFrames.length);
    }, delay);
  };

  const pausePreview = () => {
    if (prefersReducedMotion || isPaused) {
      return;
    }

    isPaused = true;
    preview.classList.add("is-paused");
    remainingFrameTime = getRemainingFrameTime();
    clearFrameTimer();
  };

  const resumePreview = () => {
    if (prefersReducedMotion || !isPaused || !isPreviewVisible) {
      return;
    }

    isPaused = false;
    preview.classList.remove("is-paused");
    scheduleNextFrame(remainingFrameTime);
  };

  const stopAutoAdvance = () => {
    remainingFrameTime = getRemainingFrameTime();
    clearFrameTimer();
  };

  const setPreviewVisibility = (isVisible) => {
    isPreviewVisible = isVisible;

    if (!isPreviewVisible) {
      stopAutoAdvance();
      preview.classList.add("is-paused");
      return;
    }

    showStep(activeStep, { skipSchedule: true });

    if (!isPaused) {
      preview.classList.remove("is-paused");
      scheduleNextFrame(remainingFrameTime);
    }
  };

  const pausePreviewOnHover = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") {
      return;
    }

    pausePreview();
  };

  const resumePreviewOnHover = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") {
      return;
    }

    resumePreview();
  };

  const pausePreviewOnTouchHold = (event) => {
    if (
      event.pointerType !== "touch" ||
      activeTouchHold ||
      (event.target instanceof Element && event.target.closest(".preview-progress"))
    ) {
      return;
    }

    activeTouchHold = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      didPause: false
    };

    touchHoldTimer = window.setTimeout(() => {
      if (!activeTouchHold || activeTouchHold.pointerId !== event.pointerId) {
        return;
      }

      activeTouchHold.didPause = true;
      pausePreview();
    }, 220);
  };

  const cancelTouchHold = (event) => {
    if (event.pointerType !== "touch" || !activeTouchHold || event.pointerId !== activeTouchHold.pointerId) {
      return;
    }

    window.clearTimeout(touchHoldTimer);

    if (activeTouchHold.didPause) {
      resumePreview();
    }

    activeTouchHold = undefined;
  };

  const syncTouchHoldMovement = (event) => {
    if (event.pointerType !== "touch" || !activeTouchHold || event.pointerId !== activeTouchHold.pointerId) {
      return;
    }

    const distanceX = Math.abs(event.clientX - activeTouchHold.startX);
    const distanceY = Math.abs(event.clientY - activeTouchHold.startY);

    if (distanceX > 10 || distanceY > 10) {
      cancelTouchHold(event);
    }
  };

  const syncProgressIndicator = (step) => {
    if (!progressTrack || progressPills.length === 0) {
      return;
    }

    const activePill = progressPills[step];
    const trackRect = progressTrack.getBoundingClientRect();
    const pillRect = activePill?.getBoundingClientRect();

    if (!activePill || trackRect.width === 0 || pillRect.width === 0) {
      return;
    }

    const indicatorWidth = parseFloat(window.getComputedStyle(progressTrack, "::before").width) || pillRect.width;
    const indicatorLeft = pillRect.left - trackRect.left + (pillRect.width / 2) - (indicatorWidth / 2);
    progressTrack.style.setProperty("--preview-indicator-left", `${Math.max(0, indicatorLeft)}px`);

    progressTrack.classList.remove("is-animating");
    void progressTrack.offsetWidth;

    if (!prefersReducedMotion) {
      progressTrack.classList.add("is-animating");
    }
  };

  function showStep(step, options = {}) {
    const normalizedStep = normalizeStep(step);
    const previousStep = activeStep;
    activeStep = normalizedStep;
    const nextDelay = getFrameDuration(normalizedStep);
    remainingFrameTime = nextDelay;
    currentFrameDuration = nextDelay;
    preview.style.setProperty("--preview-frame-duration", `${nextDelay}ms`);

    window.clearTimeout(previousFrameCleanup);
    mapFrames.forEach((frame, index) => {
      const isPreviousFrame = index === previousStep && previousStep !== normalizedStep && !prefersReducedMotion;
      frame.classList.toggle("is-active", index === normalizedStep);
      frame.classList.toggle("is-previous", isPreviousFrame);
    });

    terminalEntries.forEach((entry, index) => {
      entry.classList.toggle("is-current", index === normalizedStep);
      entry.classList.toggle("is-visible", mobilePreview.matches ? index === normalizedStep : index <= normalizedStep);
    });

    progressPills.forEach((pill) => {
      pill.classList.remove("is-active");
    });

    progressPills.forEach((pill, index) => {
      const isActive = index === normalizedStep;
      pill.classList.toggle("is-active", isActive);
      pill.setAttribute("aria-current", isActive ? "true" : "false");
    });

    syncProgressIndicator(normalizedStep);

    if (previousStep !== normalizedStep && !prefersReducedMotion) {
      previousFrameCleanup = window.setTimeout(() => {
        mapFrames[previousStep]?.classList.remove("is-previous");
      }, 950);
    }

    scrollToNewestEntry(normalizedStep);
    preloadFrame(normalizedStep + 1);

    if (!options.skipSchedule) {
      scheduleNextFrame(nextDelay);
    }
  }

  progressPills.forEach((pill, index) => {
    pill.addEventListener("click", () => {
      showStep(index);
    });
  });

  if (window.PointerEvent) {
    map?.addEventListener("pointerenter", pausePreviewOnHover);
    map?.addEventListener("pointerleave", resumePreviewOnHover);
    map?.addEventListener("pointerdown", pausePreviewOnTouchHold);
    map?.addEventListener("pointermove", syncTouchHoldMovement);
    map?.addEventListener("pointerup", cancelTouchHold);
    map?.addEventListener("pointercancel", cancelTouchHold);
    map?.addEventListener("lostpointercapture", cancelTouchHold);
    document.addEventListener("pointermove", syncTouchHoldMovement);
    document.addEventListener("pointerup", cancelTouchHold);
    document.addEventListener("pointercancel", cancelTouchHold);
  } else {
    map?.addEventListener("mouseenter", pausePreview);
    map?.addEventListener("mouseleave", resumePreview);
  }
  map?.addEventListener("focusin", pausePreview);
  map?.addEventListener("focusout", resumePreview);

  const syncPreviewLayout = () => {
    showStep(activeStep, { skipSchedule: true });
  };

  mobilePreview.addEventListener?.("change", syncPreviewLayout);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoAdvance();
      preview.classList.add("is-paused");
      return;
    }

    if (isPreviewVisible && !isPaused) {
      preview.classList.remove("is-paused");
      scheduleNextFrame(remainingFrameTime);
    }
  });
  showStep(0, { skipSchedule: true });

  if ("IntersectionObserver" in window) {
    const previewObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      setPreviewVisibility(entry.isIntersecting && entry.intersectionRatio >= 0.2);
    }, {
      threshold: [0, 0.2]
    });

    previewObserver.observe(preview);
    return;
  }

  setPreviewVisibility(true);
})();

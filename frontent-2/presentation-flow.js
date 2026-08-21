(function () {
  "use strict";

  const scriptUrl = new URL(document.currentScript.src);
  const appRoot = new URL("./", scriptUrl);
  const repositoryRoot = new URL("../", appRoot);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const steps = [
    new URL("grupo-9.html", appRoot),
    new URL("presentacion.html", appRoot),
    new URL("mood-splash.html", appRoot),
    new URL("frontend-3-whatsapp/index.html", repositoryRoot),
    new URL("frontent-2-extention/index.html", repositoryRoot),
    new URL("dashboard.html", appRoot),
    new URL("frontend-3-whatsapp/index.html#post-consent", repositoryRoot),
    new URL("index.html", appRoot)
  ];

  const currentUrl = new URL(window.location.href);
  const samePage = (first, second) =>
    first.origin === second.origin &&
    decodeURIComponent(first.pathname) === decodeURIComponent(second.pathname);

  const whatsappUrl = steps[3];
  const stepFromUrl = url => samePage(url, whatsappUrl)
    ? url.hash === "#post-consent" ? 6 : 3
    : steps.findIndex((step, index) => index !== 6 && samePage(url, step));
  let currentStep = stepFromUrl(currentUrl);

  if (
    currentStep === 3 &&
    document.querySelector("#app")?.dataset.state === "post-consent"
  ) {
    currentStep = 6;
  }
  let isTransitioning = false;
  let isControlledByParent = false;
  const stepMessageType = "presentation-flow:step";
  const activeStepMessageType = "presentation-flow:active-step";

  if (currentStep === -1) return;

  const announceCurrentStep = () => {
    if (window.parent === window) return;

    window.parent.postMessage({
      type: stepMessageType,
      step: currentStep
    }, "*");
  };

  const broadcastCurrentStep = () => {
    document.querySelectorAll("iframe").forEach(frame => {
      frame.contentWindow?.postMessage({
        type: activeStepMessageType,
        step: currentStep
      }, "*");
    });
  };

  window.addEventListener("message", event => {
    const data = event.data;
    const hasValidStep =
      data &&
      Number.isInteger(data.step) &&
      data.step >= 0 &&
      data.step < steps.length;

    if (
      hasValidStep &&
      data.type === activeStepMessageType &&
      event.source === window.parent
    ) {
      isControlledByParent = true;
      currentStep = data.step;
      broadcastCurrentStep();
      return;
    }

    const comesFromChildFrame = Array.from(document.querySelectorAll("iframe"))
      .some(frame => frame.contentWindow === event.source);

    if (
      !comesFromChildFrame ||
      !hasValidStep ||
      data.type !== stepMessageType ||
      data.step === currentStep
    ) return;

    currentStep = data.step;
    broadcastCurrentStep();
    announceCurrentStep();
  });

  document.querySelectorAll("iframe").forEach(frame => {
    frame.addEventListener("load", broadcastCurrentStep);
  });
  broadcastCurrentStep();

  const syncAnimatedStep = () => {
    let activeStep = currentStep;
    let hasExplicitAnimatedState = false;
    const app = document.querySelector("#app");

    if (samePage(currentUrl, whatsappUrl)) {
      if (app?.classList.contains("is-anima-active")) {
        activeStep = 7;
        hasExplicitAnimatedState = true;
      } else if (app?.classList.contains("is-health-active")) {
        activeStep = 4;
        hasExplicitAnimatedState = true;
      }
      else if (app?.dataset.state === "post-consent") activeStep = 6;
      else activeStep = 3;
    } else if (samePage(currentUrl, steps[4])) {
      if (document.body.classList.contains("is-dashboard-active")) {
        activeStep = 5;
        hasExplicitAnimatedState = true;
      } else {
        activeStep = 4;
      }
    } else if (samePage(currentUrl, steps[5])) {
      if (document.body.classList.contains("is-chat-active")) {
        activeStep = 6;
        hasExplicitAnimatedState = true;
      } else {
        activeStep = 5;
      }
    }

    if (isControlledByParent && !hasExplicitAnimatedState) return;
    if (activeStep === currentStep) return;
    currentStep = activeStep;
    broadcastCurrentStep();
    announceCurrentStep();
  };

  const stateObserver = new MutationObserver(syncAnimatedStep);
  stateObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"]
  });

  const app = document.querySelector("#app");
  if (app && app !== document.body) {
    stateObserver.observe(app, {
      attributes: true,
      attributeFilter: ["class", "data-state"]
    });
  }

  const navigateTo = nextStep => {
    if (isTransitioning || nextStep < 0 || nextStep >= steps.length) return;

    isTransitioning = true;
    document.documentElement.style.pointerEvents = "none";
    const target = steps[nextStep];
    const completeNavigation = () => {
      try {
        window.top.location.href = target.href;
      } catch (error) {
        window.location.href = target.href;
      }
    };

    if (typeof document.documentElement.animate !== "function") {
      completeNavigation();
      return;
    }

    const animation = document.documentElement.animate(
      [
        { opacity: 1, filter: "blur(0)", transform: "scale(1)" },
        { opacity: 0, filter: "blur(3px)", transform: "scale(0.985)" }
      ],
      {
        duration: reduceMotion.matches ? 80 : 260,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        fill: "forwards"
      }
    );

    animation.finished.then(completeNavigation, completeNavigation);
  };

  window.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;

    navigateTo(currentStep + (event.key === "ArrowRight" ? 1 : -1));
  }, { capture: true });
})();

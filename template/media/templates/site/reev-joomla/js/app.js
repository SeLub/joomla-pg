document.addEventListener("DOMContentLoaded", () => {
  initTemplate();
});
function initTemplate() {
  initMobileMenu();
  initHeaderScroll();
  initSmoothScroll();
}
function initMobileMenu() {
  const toggle = document.getElementById("mobile-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  const hamburger = toggle == null ? void 0 : toggle.querySelector("svg:not([data-close-icon])");
  const closeIcon = toggle == null ? void 0 : toggle.querySelector("[data-close-icon]");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isExpanded));
    menu.classList.toggle("hidden");
    if (hamburger && closeIcon) {
      hamburger.classList.toggle("hidden", !isExpanded);
      closeIcon.classList.toggle("hidden", isExpanded);
    }
    document.body.classList.toggle("overflow-hidden", !isExpanded);
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest('a[href^="#"], a[href*="/"]')) {
      toggle.click();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.classList.contains("hidden")) {
      toggle.click();
      toggle.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("hidden") && !menu.contains(e.target) && !toggle.contains(e.target)) {
      toggle.click();
    }
  });
}
function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }, { passive: true });
}
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((link) => {
    link.addEventListener("click", (e) => {
      var _a;
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        e.preventDefault();
        const headerOffset = ((_a = document.querySelector(".site-header")) == null ? void 0 : _a.offsetHeight) || 0;
        const elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset - 20;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    });
  });
}
//# sourceMappingURL=app.js.map

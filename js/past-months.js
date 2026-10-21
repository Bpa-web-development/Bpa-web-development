(function () {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function initReveal() {
        const targets = Array.from(document.querySelectorAll("[data-pm-reveal]"));
        if (reduceMotion || !("IntersectionObserver" in window)) {
            targets.forEach((element) => element.classList.add("is-visible"));
            return;
        }
        document.documentElement.classList.add("has-pm-reveal");
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
        targets.forEach((element) => observer.observe(element));
    }

    function initJump() {
        const links = Array.from(document.querySelectorAll(".pm-jump a[href^='#']"));
        const sections = links.map((link) => document.getElementById(link.getAttribute("href").slice(1))).filter(Boolean);
        if (!sections.length || !("IntersectionObserver" in window)) {
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    links.forEach((link) => {
                        const match = link.getAttribute("href") === "#" + entry.target.id;
                        if (match) {
                            link.setAttribute("aria-current", "location");
                        } else {
                            link.removeAttribute("aria-current");
                        }
                    });
                }
            });
        }, { rootMargin: "-45% 0px -50% 0px" });
        sections.forEach((section) => observer.observe(section));
    }

    document.addEventListener("DOMContentLoaded", () => {
        initReveal();
        initJump();
    });
})();

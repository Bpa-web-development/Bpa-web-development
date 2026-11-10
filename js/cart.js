(function () {
    "use strict";

    // Checks the visitor's "reduce motion" setting with window.matchMedia().
    // From MDN Web Docs, "Window: matchMedia() method": https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    function nextShipDate(now) {
        const ship = new Date(now.getFullYear(), now.getMonth(), 5, 9, 0, 0);
        if (now >= ship) {
            ship.setMonth(ship.getMonth() + 1);
        }
        return ship;
    }

    function initReveal() {
        const targets = $$("[data-reveal]");
        if (reduceMotion || !("IntersectionObserver" in window)) {
            targets.forEach((element) => element.classList.add("is-visible"));
            return;
        }
        document.documentElement.classList.add("has-reveal");
        // Adapted from MDN Web Docs, "Intersection Observer API"
        // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
        // Changed: each element is revealed once, then no longer watched.
        const options = { root: null, rootMargin: "0px 0px -40px 0px", threshold: 0.15 };
        const callback = (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        };
        const observer = new IntersectionObserver(callback, options);
        targets.forEach((element, index) => {
            element.style.setProperty("--reveal-delay", (index % 3) * 90 + "ms");
            observer.observe(element);
        });
    }


    // Countdown to the next ship date.
    // Adapted from W3Schools, "How To Create a Countdown Timer"
    // https://www.w3schools.com/howto/howto_js_countdown.asp
    // Changed: the target date moves to the 5th of next month, numbers are padded to two digits,
    // and each unit is written into its own element instead of one "demo" paragraph.
    function initCountdown() {
        const parts = { days: $("#btvDays"), hours: $("#btvHours"), mins: $("#btvMins"), secs: $("#btvSecs") };
        if (!parts.days) {
            return;
        }
        const pad = (value) => String(value).padStart(2, "0");
        // Digit flip adapted from GSAP docs, "gsap.fromTo()"
        // https://gsap.com/docs/v3/GSAP/gsap.fromTo()
        // Changed: only runs on the box whose number actually changed.
        function setDigit(node, value) {
            if (node.textContent === value) {
                return;
            }
            node.textContent = value;
            if (window.gsap && !reduceMotion) {
                gsap.fromTo(node, { yPercent: -40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.3, ease: "power2.out" });
            }
        }
        function tick() {
            // Find the distance between now and the count down date
            const now = new Date().getTime();
            const distance = Math.max(0, nextShipDate(new Date()).getTime() - now);

            // Time calculations for days, hours, minutes and seconds
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setDigit(parts.days, pad(days));
            setDigit(parts.hours, pad(hours));
            setDigit(parts.mins, pad(minutes));
            setDigit(parts.secs, pad(seconds));
        }
        tick();
        window.setInterval(tick, 1000);
    }

    function initBoxSwitch() {
        const list = $("#btvItems");
        const text = $("#btvBuyText");
        const buttons = $$("[data-tier-show]");
        if (!list || !buttons.length) {
            return;
        }
        const lines = {
            basic: "Basic gets you the five items in every box, plus a passport stamp and a maker stories card.",
            premium: "Premium gets you all eight, plus a digital city guide and playlist."
        };
        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                const tier = button.dataset.tierShow;
                buttons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
                list.classList.toggle("is-basic", tier === "basic");
                if (text) {
                    text.textContent = lines[tier];
                }
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initReveal();
        initBoxSwitch();
        initCountdown();
    });
})();

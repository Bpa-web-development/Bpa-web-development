(function () {
    "use strict";

    function init() {
        var items = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
        if (!items.length) {
            return;
        }

        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !("IntersectionObserver" in window)) {
            items.forEach(function (item) {
                item.classList.add("is-visible");
            });
            return;
        }

        document.documentElement.classList.add("has-reveal");

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

        items.forEach(function (item, index) {
            item.style.setProperty("--reveal-delay", (index % 3) * 90 + "ms");
            observer.observe(item);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

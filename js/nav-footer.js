(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const navbar = document.querySelector(".navbar");
        const toggle = document.getElementById("navbarToggle");
        const links = document.getElementById("navbarLinks");
        if (!navbar || !toggle || !links) {
            return;
        }

        navbar.classList.add("is-enhanced");

        function setOpen(open) {
            navbar.classList.toggle("is-open", open);
            toggle.setAttribute("aria-expanded", String(open));
            toggle.querySelector(".navbar-toggle-label").textContent = open ? "Close" : "Menu";
        }

        toggle.addEventListener("click", () => {
            setOpen(!navbar.classList.contains("is-open"));
        });

        links.addEventListener("click", (event) => {
            if (event.target.closest("a")) {
                setOpen(false);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && navbar.classList.contains("is-open")) {
                setOpen(false);
                toggle.focus();
            }
        });

        document.addEventListener("click", (event) => {
            if (navbar.classList.contains("is-open") && !navbar.contains(event.target)) {
                setOpen(false);
            }
        });

        window.matchMedia("(min-width: 961px)").addEventListener("change", (event) => {
            if (event.matches) {
                setOpen(false);
            }
        });

        const onScroll = () => navbar.classList.toggle("is-scrolled", window.scrollY > 8);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    });
})();

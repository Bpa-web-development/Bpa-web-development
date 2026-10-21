(function () {
    "use strict";

    const PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

    document.addEventListener("DOMContentLoaded", () => {
        const navbar = document.querySelector(".navbar");
        const toggle = document.getElementById("navbarToggle");
        const links = document.getElementById("navbarLinks");
        if (!navbar || !toggle || !links) {
            return;
        }

        const mobile = window.matchMedia("(max-width: 960px)");
        navbar.classList.add("is-enhanced");
        toggle.setAttribute("aria-label", "Open menu");

        const ticket = document.createElement("li");
        ticket.className = "navbar-drawer-extra";
        ticket.innerHTML = '<a class="navbar-drawer-ticket" href="/html/burlington.html"><span class="navbar-drawer-stamp" aria-hidden="true">BTV</span><span><small>Now shipping</small><strong>This month: Burlington, VT</strong></span><span class="navbar-drawer-arrow" aria-hidden="true">&rarr;</span></a>';
        links.insertBefore(ticket, links.firstChild);

        const foot = document.createElement("li");
        foot.className = "navbar-drawer-extra navbar-drawer-foot";
        foot.textContent = "Explore your city, one box at a time";
        links.appendChild(foot);

        Array.from(links.children).forEach((item, index) => {
            item.style.setProperty("--i", index);
        });

        const current = location.pathname.replace(/\/$/, "/index.html");
        links.querySelectorAll(".link-dropdown").forEach((item, index) => {
            const top = item.querySelector(":scope > .navbar-link-item");
            const menu = item.querySelector(":scope > .sub-menu");
            if (!top || !menu) {
                return;
            }
            menu.id = menu.id || "navbarSub" + index;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "navbar-sub-toggle";
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-controls", menu.id);
            button.setAttribute("aria-label", "Show " + top.textContent.trim() + " links");
            button.innerHTML = PLUS;
            top.after(button);
            button.addEventListener("click", () => {
                const open = !item.classList.contains("is-expanded");
                links.querySelectorAll(".link-dropdown.is-expanded").forEach((other) => {
                    if (other !== item) {
                        other.classList.remove("is-expanded");
                        other.querySelector(".navbar-sub-toggle").setAttribute("aria-expanded", "false");
                    }
                });
                item.classList.toggle("is-expanded", open);
                button.setAttribute("aria-expanded", String(open));
            });
            const here = top.getAttribute("href") === current || Array.from(menu.querySelectorAll("a")).some((a) => a.getAttribute("href") === current);
            if (here) {
                item.classList.add("is-expanded");
                button.setAttribute("aria-expanded", "true");
            }
        });

        function setOpen(open) {
            if (open) {
                navbar.style.setProperty("--nav-top", navbar.querySelector(".navbar-container").getBoundingClientRect().height + "px");
            }
            navbar.classList.toggle("is-open", open);
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
            toggle.querySelector(".navbar-toggle-label").textContent = open ? "Close" : "Menu";
            document.documentElement.classList.toggle("nav-locked", open && mobile.matches);
            if (mobile.matches) {
                links.inert = !open;
            }
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

        const sync = () => {
            links.inert = mobile.matches && !navbar.classList.contains("is-open");
            if (!mobile.matches) {
                setOpen(false);
            }
        };
        mobile.addEventListener("change", sync);
        sync();

        const onScroll = () => navbar.classList.toggle("is-scrolled", window.scrollY > 8);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    });
})();

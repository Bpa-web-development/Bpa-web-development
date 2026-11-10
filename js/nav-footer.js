(function () {
    "use strict";

    const CART_KEY = "marlowbyCart";
    const USER_KEY = "marlowbyUserHint";
    const MOBILE = window.matchMedia("(max-width: 1180px)");
    // Checks the visitor's "reduce motion" setting with window.matchMedia().
    // From MDN Web Docs, "Window: matchMedia() method": https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia
    const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

    function readJson(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "null");
            return value === null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function normalizePath(path) {
        const clean = path.replace(/\/+$/, "") || "/";
        return clean === "/" ? "/index.html" : clean;
    }

    function linkPath(link) {
        return normalizePath(new URL(link.getAttribute("href"), location.href).pathname);
    }

    function nextShipDate(now) {
        const ship = new Date(now.getFullYear(), now.getMonth(), 5, 9, 0, 0);
        if (now >= ship) {
            ship.setMonth(ship.getMonth() + 1);
        }
        return ship;
    }

    function shipLabel(now) {
        const ship = nextShipDate(now);
        const days = Math.ceil((ship - now) / 86400000);
        const date = ship.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (days <= 1) {
            return ship.getDate() === now.getDate() ? "today" : "tomorrow";
        }
        return "on " + date;
    }

    function initials(name) {
        return String(name || "").split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    }

    // Cookie notice. The site only uses strictly necessary storage, so this informs
    // rather than asks; the choice is remembered so it shows once per browser.
    const NOTICE_KEY = "marlowbyCookieNotice";
    const NOTICE_VERSION = "2026-10-25";

    function initCookieNotice() {
        const notice = document.createElement("section");
        notice.className = "cookie-notice";
        notice.setAttribute("aria-labelledby", "cookieNoticeTitle");
        notice.hidden = true;
        notice.innerHTML = `
            <h2 class="cookie-notice_title" id="cookieNoticeTitle">Cookies on Marlowby</h2>
            <p class="cookie-notice_text">We use one essential cookie to keep you signed in and your browser's storage to remember your cart and settings. No ads, analytics or tracking cookies.</p>
            <div class="cookie-notice_actions">
                <button type="button" class="cookie-notice_ok">Got it</button>
                <a class="cookie-notice_link" href="/html/privacy.html#cookies">Privacy and cookies</a>
            </div>`;
        document.body.appendChild(notice);

        function show(focus) {
            notice.hidden = false;
            document.documentElement.classList.add("cookie-notice-open");
            requestAnimationFrame(() => notice.classList.add("is-shown"));
            if (focus) {
                notice.querySelector(".cookie-notice_ok").focus();
            }
        }

        function hide() {
            try {
                localStorage.setItem(NOTICE_KEY, NOTICE_VERSION);
            } catch (error) {
                // Storage blocked: the notice simply shows again next time.
            }
            notice.classList.remove("is-shown");
            document.documentElement.classList.remove("cookie-notice-open");
            window.setTimeout(() => (notice.hidden = true), REDUCE_MOTION.matches ? 0 : 250);
        }

        notice.querySelector(".cookie-notice_ok").addEventListener("click", hide);
        document.addEventListener("click", (event) => {
            if (event.target.closest("[data-cookie-notice-open]")) {
                show(true);
            }
        });

        let seen = null;
        try {
            seen = localStorage.getItem(NOTICE_KEY);
        } catch (error) {
            seen = null;
        }
        // Shown straight away: a notice that pops in late would become the page's Largest Contentful Paint.
        if (seen !== NOTICE_VERSION) {
            show(false);
        }
    }

    // Quick search: a keyboard-friendly list of every page and section, built from the
    // navbar links so it never goes out of date. Opens with "/" or Ctrl+K (Cmd+K on a Mac).
    const EXTRA_PAGES = [
        { title: "Your Cart", desc: "Review your box and check out", href: "/html/cart.html", group: "Shop", words: "basket checkout bag" },
        { title: "Sign In or Create Account", desc: "Your orders and passport", href: "/html/sign-in.html", group: "Account", words: "login log in register account profile" },
        { title: "Help Desk", desc: "Send a ticket to a real person", href: "/html/faq.html#helpdesk", group: "Help", words: "support ticket problem contact" },
        { title: "Privacy Policy and Cookies", desc: "What we collect and why", href: "/html/privacy.html", group: "Help", words: "data cookies gdpr ccpa delete" },
        { title: "Works Cited", desc: "Sources and credits", href: "/html/works-cited.html", group: "Help", words: "sources citations credits bpa" },
        { title: "Sitemap", desc: "Every page in one list", href: "/html/sitemap.html", group: "Help", words: "all pages map" }
    ];
    const POPULAR = ["This Month's Box", "Subscription Plans", "Daily Specials", "Help Desk", "Your Cart"];

    function searchIndex(navbar) {
        const items = [{ title: "Home", desc: "Start here", href: "/", group: "Pages", words: "index main start" }];
        navbar.querySelectorAll("#navbarLinks > .link-dropdown").forEach((item) => {
            const top = item.querySelector(":scope > .navbar-link-item");
            const group = top.textContent.trim();
            items.push({ title: group, desc: "Page", href: top.getAttribute("href"), group: "Pages", words: "" });
            item.querySelectorAll(".sub-menu a").forEach((link) => {
                items.push({
                    title: link.querySelector("strong").textContent.trim(),
                    desc: link.querySelector("span").textContent.trim(),
                    href: link.getAttribute("href"),
                    group,
                    words: ""
                });
            });
        });
        return items.concat(EXTRA_PAGES);
    }

    function initSearch(navbar) {
        const opener = navbar.querySelector(".navbar-search");
        if (!opener || typeof HTMLDialogElement !== "function") {
            if (opener) {
                opener.hidden = true;
            }
            return;
        }
        const index = searchIndex(navbar);
        const dialog = document.createElement("dialog");
        dialog.className = "site-search";
        dialog.setAttribute("aria-label", "Search Marlowby");
        dialog.innerHTML = `
            <div class="site-search_field">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                <input class="site-search_input" type="text" role="combobox" aria-expanded="true" aria-controls="siteSearchResults" aria-autocomplete="list" aria-label="Search pages and sections" placeholder="Search plans, specials, help..." autocomplete="off" spellcheck="false">
                <button type="button" class="site-search_close">Esc</button>
            </div>
            <ul class="site-search_results" id="siteSearchResults" role="listbox" aria-label="Results"></ul>
            <p class="site-search_foot" aria-hidden="true"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></p>
            <p class="visually-hidden" aria-live="polite"></p>`;
        document.body.appendChild(dialog);
        const input = dialog.querySelector(".site-search_input");
        const list = dialog.querySelector(".site-search_results");
        const live = dialog.querySelector("[aria-live]");
        let results = [];
        let active = 0;

        function escapeHtml(text) {
            return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
        }

        function highlight(text, query) {
            const safe = escapeHtml(text);
            if (!query) {
                return safe;
            }
            const at = text.toLowerCase().indexOf(query);
            if (at < 0) {
                return safe;
            }
            return escapeHtml(text.slice(0, at)) + "<mark>" + escapeHtml(text.slice(at, at + query.length)) + "</mark>" + escapeHtml(text.slice(at + query.length));
        }

        function score(item, terms) {
            const title = item.title.toLowerCase();
            const haystack = (item.title + " " + item.desc + " " + item.group + " " + item.words).toLowerCase();
            let total = 0;
            for (const term of terms) {
                if (title.startsWith(term)) total += 6;
                else if (title.split(/[\s']+/).some((word) => word.startsWith(term))) total += 4;
                else if (haystack.includes(term)) total += 1;
                else return 0;
            }
            return total;
        }

        function render() {
            const query = input.value.trim().toLowerCase();
            const terms = query.split(/\s+/).filter(Boolean);
            if (terms.length) {
                results = index.map((item) => ({ item, rank: score(item, terms) }))
                    .filter((entry) => entry.rank > 0)
                    .sort((a, b) => b.rank - a.rank)
                    .slice(0, 12)
                    .map((entry) => entry.item);
            } else {
                results = POPULAR.map((title) => index.find((item) => item.title === title)).filter(Boolean);
            }
            active = 0;
            list.replaceChildren();
            if (!results.length) {
                const empty = document.createElement("li");
                empty.className = "site-search_empty";
                empty.setAttribute("role", "presentation");
                empty.textContent = "No pages match \u201c" + input.value.trim() + "\u201d. Try \u201cgift\u201d or \u201chelp\u201d.";
                list.appendChild(empty);
            } else {
                const heading = document.createElement("li");
                heading.className = "site-search_group";
                heading.setAttribute("role", "presentation");
                heading.textContent = terms.length ? "Best matches" : "Popular";
                list.appendChild(heading);
                results.forEach((item, i) => {
                    const option = document.createElement("li");
                    option.className = "site-search_option";
                    option.id = "siteSearchOption" + i;
                    option.setAttribute("role", "option");
                    option.innerHTML = "<strong>" + highlight(item.title, terms[0]) + "</strong><span>" + escapeHtml(item.desc) + "</span><em>" + escapeHtml(item.group) + "</em>";
                    option.addEventListener("click", () => go(i));
                    option.addEventListener("mousemove", () => select(i));
                    list.appendChild(option);
                });
            }
            live.textContent = results.length ? results.length + (results.length === 1 ? " result" : " results") : "No results";
            select(0);
        }

        function select(i) {
            if (!results.length) {
                input.removeAttribute("aria-activedescendant");
                return;
            }
            active = (i + results.length) % results.length;
            list.querySelectorAll(".site-search_option").forEach((option, n) => option.setAttribute("aria-selected", String(n === active)));
            const current = list.querySelector("#siteSearchOption" + active);
            input.setAttribute("aria-activedescendant", current.id);
            // Smooth scroll adapted from MDN, "Element: scrollIntoView() method"
            // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
            current.scrollIntoView({ block: "nearest" });
        }

        function go(i) {
            const item = results[i];
            if (!item) {
                return;
            }
            dialog.close();
            const target = new URL(item.href, location.href);
            if (target.pathname === location.pathname && target.hash) {
                location.hash = target.hash;
            } else {
                location.href = target.href;
            }
        }

        // The search box is a native <dialog>: showModal() opens it on top of the page and traps
        // focus, close() hides it again.
        // Adapted from MDN Web Docs, "<dialog>: The Dialog element" (Creating a modal dialog)
        // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
        // Changed: also opens with "/" or Ctrl+K, closes on a click outside the box, and puts
        // focus back where it was.
        let returnTo = null;
        function open() {
            if (dialog.open) {
                return;
            }
            returnTo = document.activeElement;
            if (navbar.classList.contains("is-open") && window.MarlowbyNav) {
                window.MarlowbyNav.close();
            }
            input.value = "";
            render();
            dialog.showModal();
            input.focus();
        }

        opener.addEventListener("click", open);
        dialog.querySelector(".site-search_close").addEventListener("click", () => dialog.close());
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) {
                dialog.close();
            }
        });
        dialog.addEventListener("close", () => {
            if (returnTo && typeof returnTo.focus === "function") {
                returnTo.focus();
            }
        });
        input.addEventListener("input", render);
        input.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                select(active + 1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                select(active - 1);
            } else if (event.key === "Enter") {
                event.preventDefault();
                go(active);
            }
        });
        document.addEventListener("keydown", (event) => {
            const typing = event.target.closest && event.target.closest("input, textarea, select, [contenteditable='true']");
            if ((event.key === "k" || event.key === "K") && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                open();
            } else if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                open();
            }
        });
    }

    function init() {
        initCookieNotice();
        const navbar = document.getElementById("siteNav");
        if (!navbar) {
            return;
        }
        const toggle = document.getElementById("navbarToggle");
        const drawer = document.getElementById("navbarDrawer");
        const links = document.getElementById("navbarLinks");
        const scrim = navbar.querySelector(".navbar-scrim");
        const dropdowns = Array.from(navbar.querySelectorAll(".link-dropdown"));
        const here = normalizePath(location.pathname);

        navbar.classList.add("is-enhanced");

        Array.from(links.children).forEach((item, index) => item.style.setProperty("--i", index));

        navbar.querySelectorAll(".navbar-link-item, .navbar-sign-in, .navbar-cart").forEach((link) => {
            if (linkPath(link) === here) {
                link.setAttribute("aria-current", "page");
            }
        });

        dropdowns.forEach((item) => {
            const top = item.querySelector(":scope > .navbar-link-item");
            const onThisPage = Array.from(item.querySelectorAll(".sub-menu a")).some((link) => linkPath(link) === here);
            if (onThisPage && top.getAttribute("aria-current") !== "page") {
                top.classList.add("is-current");
            }
            item.dataset.current = String(onThisPage);
        });

        // Dropdown menus: the button toggles its menu open and shut, and a click anywhere
        // outside the navbar closes every menu.
        // Adapted from W3Schools, "How To Create a Clickable Dropdown"
        // https://www.w3schools.com/howto/howto_js_dropdown.asp
        // Changed: toggles an "is-open" class on the menu's list item (W3Schools uses "show"),
        // sets aria-expanded so screen readers hear it, and only one menu is open at a time.
        function setDropdown(item, open) {
            item.classList.toggle("is-open", open);
            item.querySelector(".navbar-sub-toggle").setAttribute("aria-expanded", String(open));
        }

        function closeDropdowns(except) {
            dropdowns.forEach((item) => {
                if (item !== except) {
                    setDropdown(item, false);
                }
            });
        }

        dropdowns.forEach((item) => {
            const button = item.querySelector(".navbar-sub-toggle");
            button.addEventListener("click", () => {
                const open = !item.classList.contains("is-open");
                closeDropdowns(item);
                setDropdown(item, open);
                item.classList.remove("is-dismissed");
            });
            item.addEventListener("mouseleave", () => item.classList.remove("is-dismissed"));
            item.addEventListener("focusout", (event) => {
                if (!MOBILE.matches && !item.contains(event.relatedTarget)) {
                    setDropdown(item, false);
                }
            });
        });

        // The hamburger button on phones and tablets.
        // Adapted from W3Schools, "How To Create a Responsive Top Navigation Menu"
        // https://www.w3schools.com/howto/howto_js_topnav_responsive.asp
        // Changed: toggles an "is-open" class (W3Schools adds "responsive"), slides in a side
        // drawer instead of stacking links, updates the button's label, and keeps keyboard focus
        // inside the menu while it is open.
        function setOpen(open, returnFocus) {
            if (open) {
                const bar = navbar.querySelector(".navbar-container").getBoundingClientRect();
                navbar.style.setProperty("--nav-bottom", Math.round(bar.bottom + (navbar.classList.contains("is-floating") ? 8 : 0)) + "px");
            }
            navbar.classList.toggle("is-open", open);
            toggle.setAttribute("aria-expanded", String(open));
            toggle.querySelector(".navbar-toggle-label").textContent = open ? "Close menu" : "Open menu";
            document.documentElement.classList.toggle("nav-locked", open && MOBILE.matches);
            if (MOBILE.matches) {
                drawer.inert = !open;
                if (open) {
                    scrim.hidden = false;
                } else {
                    window.setTimeout(() => {
                        if (!navbar.classList.contains("is-open")) {
                            scrim.hidden = true;
                        }
                    }, REDUCE_MOTION.matches ? 0 : 300);
                }
            }
            if (open) {
                dropdowns.forEach((item) => setDropdown(item, item.dataset.current === "true"));
                const first = drawer.querySelector(".navbar-link-item");
                window.setTimeout(() => first && first.focus(), REDUCE_MOTION.matches ? 0 : 80);
            } else if (returnFocus) {
                toggle.focus();
            }
        }

        toggle.addEventListener("click", () => setOpen(!navbar.classList.contains("is-open"), false));
        scrim.addEventListener("click", () => setOpen(false, true));

        links.addEventListener("click", (event) => {
            if (event.target.closest("a") && navbar.classList.contains("is-open")) {
                setOpen(false, false);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                if (navbar.classList.contains("is-open")) {
                    setOpen(false, true);
                    return;
                }
                const open = dropdowns.find((item) => item.classList.contains("is-open") || item.matches(":hover") || item.contains(document.activeElement));
                if (open) {
                    setDropdown(open, false);
                    open.classList.add("is-dismissed");
                    if (open.contains(document.activeElement)) {
                        open.querySelector(".navbar-sub-toggle").focus();
                    }
                }
                return;
            }
            if (event.key === "Tab" && navbar.classList.contains("is-open") && MOBILE.matches) {
                const focusable = Array.from(navbar.querySelectorAll("a[href], button")).filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });

        // Close the dropdown menu if the user clicks outside of it (W3Schools dropdown, above).
        document.addEventListener("click", (event) => {
            if (!navbar.contains(event.target)) {
                closeDropdowns(null);
            }
        });

        function syncMode() {
            if (MOBILE.matches) {
                drawer.inert = !navbar.classList.contains("is-open");
            } else {
                drawer.inert = false;
                scrim.hidden = true;
                if (navbar.classList.contains("is-open")) {
                    setOpen(false, false);
                }
                closeDropdowns(null);
            }
        }
        MOBILE.addEventListener("change", syncMode);
        syncMode();

        navbar.querySelectorAll("[data-nav-ship]").forEach((el) => (el.textContent = shipLabel(new Date())));

        // One gold indicator that glides to the hovered link and rests on the current page.
        const indicator = document.createElement("span");
        indicator.className = "navbar-indicator is-instant";
        indicator.setAttribute("aria-hidden", "true");
        links.appendChild(indicator);
        navbar.classList.add("has-indicator");
        const topLinks = Array.from(links.querySelectorAll(":scope > li:not(.navbar-drawer-only) > .navbar-link-item"));
        const resting = topLinks.find((link) => link.getAttribute("aria-current") === "page" || link.classList.contains("is-current"));

        function moveIndicator(link) {
            if (MOBILE.matches || !link) {
                indicator.classList.remove("is-visible");
                return;
            }
            const box = links.getBoundingClientRect();
            const rect = link.getBoundingClientRect();
            const style = getComputedStyle(link);
            const left = rect.left - box.left + parseFloat(style.paddingLeft);
            const width = rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            indicator.style.setProperty("--x", left.toFixed(1) + "px");
            indicator.style.width = width.toFixed(1) + "px";
            indicator.classList.add("is-visible");
        }

        topLinks.forEach((link) => {
            const item = link.parentElement;
            item.addEventListener("mouseenter", () => moveIndicator(link));
            item.addEventListener("focusin", () => moveIndicator(link));
        });
        links.addEventListener("mouseleave", () => moveIndicator(resting));
        links.addEventListener("focusout", (event) => {
            if (!links.contains(event.relatedTarget)) {
                moveIndicator(resting);
            }
        });

        function placeResting() {
            indicator.classList.add("is-instant");
            moveIndicator(resting);
            requestAnimationFrame(() => indicator.classList.remove("is-instant"));
        }
        placeResting();
        window.addEventListener("resize", placeResting);
        MOBILE.addEventListener("change", placeResting);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(placeResting);
        }

        // Past the top of the page the bar lifts into a floating capsule.
        // Adapted from W3Schools, "How To Shrink a Header on Scroll"
        // https://www.w3schools.com/howto/howto_js_shrink_header_scroll.asp
        // Changed: toggles a class (CSS does the animation) instead of setting a font size,
        // uses a passive listener so scrolling stays smooth, and stays put while the phone menu is open.
        const container = navbar.querySelector(".navbar-container");
        function scrollFunction() {
            const scrolled = document.body.scrollTop > 72 || document.documentElement.scrollTop > 72;
            const floating = scrolled && !navbar.classList.contains("is-open");
            if (floating !== navbar.classList.contains("is-floating")) {
                navbar.classList.toggle("is-floating", floating);
                closeDropdowns(null);
            }
        }
        window.addEventListener("scroll", scrollFunction, { passive: true });
        scrollFunction();
        container.addEventListener("transitionend", (event) => {
            if (event.target === container && event.propertyName === "width") {
                placeResting();
            }
        });

        initSearch(navbar);

        const cart = navbar.querySelector(".navbar-cart");
        const badge = cart.querySelector(".navbar-cart_badge");
        let lastCount = null;

        function renderCount(count) {
            badge.textContent = count > 9 ? "9+" : String(count);
            badge.hidden = count === 0;
            cart.setAttribute("aria-label", count ? "Cart, " + count + (count === 1 ? " item" : " items") : "Cart, empty");
            if (lastCount !== null && count !== lastCount && !REDUCE_MOTION.matches) {
                badge.classList.remove("is-bumped");
                void badge.offsetWidth;
                badge.classList.add("is-bumped");
            }
            lastCount = count;
        }

        function storedCount() {
            const items = readJson(CART_KEY, []);
            return Array.isArray(items) ? items.reduce((total, item) => total + (Number(item && item.qty) || 0), 0) : 0;
        }

        const signIns = Array.from(navbar.querySelectorAll(".navbar-sign-in"));
        signIns.forEach((link) => (link.dataset.label = link.textContent.trim()));

        function renderUser(user) {
            signIns.forEach((link) => {
                link.replaceChildren();
                if (user && user.firstName) {
                    const avatar = document.createElement("span");
                    avatar.className = "navbar-avatar";
                    avatar.setAttribute("aria-hidden", "true");
                    avatar.textContent = initials(user.name || user.firstName);
                    link.append(avatar, document.createTextNode(user.firstName));
                    link.setAttribute("aria-label", "Your account, signed in as " + (user.name || user.firstName));
                } else {
                    link.textContent = link.dataset.label;
                    link.removeAttribute("aria-label");
                }
                link.classList.toggle("is-signed-in", Boolean(user && user.firstName));
            });
        }

        renderCount(storedCount());
        renderUser(readJson(USER_KEY, null));

        document.addEventListener("marlowby:cart", (event) => {
            renderCount(event.detail && typeof event.detail.count === "number" ? event.detail.count : storedCount());
        });
        document.addEventListener("marlowby:account", (event) => renderUser(event.detail ? event.detail.user : null));
        window.addEventListener("storage", (event) => {
            if (event.key === CART_KEY) {
                renderCount(storedCount());
            }
            if (event.key === USER_KEY) {
                renderUser(readJson(USER_KEY, null));
            }
        });

        window.MarlowbyNav = {
            close: () => setOpen(false, false),
            cart
        };
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

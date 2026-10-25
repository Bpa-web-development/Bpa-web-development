(function () {
    "use strict";

    const CART_KEY = "marlowbyCart";
    const USER_KEY = "marlowbyUserHint";
    const MOBILE = window.matchMedia("(max-width: 1180px)");
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
        if (seen !== NOTICE_VERSION) {
            window.setTimeout(() => show(false), 600);
        }
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

        function setOpen(open, returnFocus) {
            if (open) {
                navbar.style.setProperty("--nav-bottom", Math.round(navbar.getBoundingClientRect().bottom) + "px");
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

        const onScroll = () => navbar.classList.toggle("is-scrolled", window.scrollY > 8);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

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

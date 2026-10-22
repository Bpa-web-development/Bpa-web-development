(function () {
    "use strict";

    const PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

    const NEWS_KEY = "marlowbyNewsletter";
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function readNews() {
        try {
            return JSON.parse(localStorage.getItem(NEWS_KEY) || "null");
        } catch (error) {
            return null;
        }
    }

    function saveNews(value) {
        try {
            if (value) {
                localStorage.setItem(NEWS_KEY, JSON.stringify(value));
            } else {
                localStorage.removeItem(NEWS_KEY);
            }
        } catch (error) {
        }
    }

    function initNewsletter() {
        const form = document.querySelector("[data-newsletter]");
        if (!form) {
            return;
        }
        const field = form.querySelector(".site-footer-news_field");
        const input = form.querySelector("input[type=email]");
        const msg = form.querySelector(".site-footer-news_msg");
        const done = document.querySelector("[data-newsletter-done]");
        const doneText = done.querySelector("[data-newsletter-text]");

        function showDone(entry, fresh) {
            form.hidden = true;
            done.hidden = false;
            doneText.textContent = fresh
                ? "You're in! Here's your welcome code."
                : "Subscribed as " + entry.email + ".";
        }

        function setError(text) {
            msg.textContent = text;
            msg.classList.toggle("is-error", Boolean(text));
            field.classList.toggle("is-invalid", Boolean(text));
            input.setAttribute("aria-invalid", text ? "true" : "false");
        }

        const saved = readNews();
        if (saved && saved.email) {
            showDone(saved, false);
        }

        input.addEventListener("input", () => {
            if (field.classList.contains("is-invalid") && EMAIL_RE.test(input.value.trim())) {
                setError("");
            }
        });

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const email = input.value.trim().toLowerCase();
            if (!email) {
                setError("Enter your email address to subscribe.");
                input.focus();
                return;
            }
            if (!EMAIL_RE.test(email)) {
                setError("Enter a valid email, like name@example.com.");
                input.focus();
                return;
            }
            const topics = Array.from(form.querySelectorAll("input[name=topics]:checked")).map((box) => box.value);
            const entry = { email, topics, since: new Date().toISOString() };
            setError("");
            saveNews(entry);
            showDone(entry, true);
            done.querySelector("[data-newsletter-focus]").focus();
        });

        const copy = done.querySelector("[data-newsletter-copy]");
        copy.addEventListener("click", () => {
            const code = copy.dataset.newsletterCopy;
            const finish = (ok) => {
                copy.textContent = ok ? "Copied" : "Select and copy";
                window.setTimeout(() => (copy.textContent = "Copy code"), 2000);
            };
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(code).then(() => finish(true), () => finish(false));
            } else {
                finish(false);
            }
        });

        done.querySelector(".site-footer-news_reset").addEventListener("click", () => {
            saveNews(null);
            done.hidden = true;
            form.hidden = false;
            form.reset();
            msg.textContent = "You're unsubscribed.";
            input.focus();
        });
    }

    function initFooterExtras() {
        const a11y = document.querySelector("[data-open-a11y]");
        const opener = document.getElementById("accessibilityOpen");
        if (a11y) {
            if (opener) {
                a11y.addEventListener("click", () => opener.click());
            } else {
                a11y.closest("li").remove();
            }
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        initNewsletter();
        initFooterExtras();
    });

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

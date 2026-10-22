(function () {
    "use strict";

    const M = window.Marlowby;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const MAKERS = [
        { name: "Pure maple syrup", blurb: "Tapped in the Green Mountains and boiled down in a wood-fired sugarhouse.", box: "In every Basic and Premium box this month." },
        { name: "Maple cream candies", blurb: "Melt-in-your-mouth leaves made from nothing but maple syrup, cooked and stirred by hand.", box: "In every Basic and Premium box this month." },
        { name: "Small-batch dark chocolate", blurb: "Bean-to-bar bars from a tiny kitchen near Lake Champlain, wrapped in local art.", box: "In every Basic and Premium box this month." },
        { name: "Sharp cheddar crackers", blurb: "Baked with aged Vermont cheddar for a snap that tastes like a farm stand.", box: "In every Basic and Premium box this month." },
        { name: "Hand-thrown stoneware mug", blurb: "Each one is shaped and glazed by a potter whose studio looks out on the lake.", box: "A Premium box exclusive." },
        { name: "Wool-blend trail socks", blurb: "Knit in a family mill that has kept Vermont hikers warm for three generations.", box: "A Premium box exclusive." },
        { name: "Apple cider donut mix", blurb: "The orchard's famous fall recipe, ready for your kitchen in one bag.", box: "A Premium box exclusive." }
    ];

    function initBoardStatus() {
        const status = $("[data-board-status]");
        const rows = $$(".sp-board_table tbody tr");
        const render = () => {
            const code = M.cart.discount().code;
            rows.forEach((row) => {
                const button = $("[data-promo-apply]", row);
                const applied = Boolean(button) && button.dataset.promoApply === code;
                row.classList.toggle("is-applied", applied);
                if (button) {
                    button.textContent = applied ? "Applied" : "Apply";
                }
            });
            status.textContent = code ? code + " is applied to your cart" : "All codes active";
        };
        document.addEventListener("marlowby:cart", render);
        render();
    }

    function initWallet() {
        const list = $("#walletList");
        const status = $("#walletStatus");
        if (!list) {
            return;
        }

        function promos() {
            const data = M.catalog.data.promos || {};
            return Object.keys(data).map((code) => Object.assign({ code }, data[code]));
        }

        function build() {
            list.replaceChildren();
            promos().forEach((promo) => {
                const li = document.createElement("li");
                li.className = "sp-coupon";
                li.dataset.code = promo.code;
                const code = document.createElement("span");
                code.className = "sp-coupon_code";
                code.textContent = promo.code;
                const label = document.createElement("p");
                label.className = "sp-coupon_label";
                label.textContent = promo.label.charAt(0).toUpperCase() + promo.label.slice(1);
                const hint = document.createElement("p");
                hint.className = "sp-coupon_hint";
                hint.textContent = promo.hint || "Works on any plan or gift box.";
                const actions = document.createElement("div");
                actions.className = "sp-coupon_actions";
                const apply = document.createElement("button");
                apply.type = "button";
                apply.className = "deal-button";
                apply.dataset.promoApply = promo.code;
                apply.dataset.noFlash = "";
                apply.textContent = "Apply";
                apply.setAttribute("aria-label", "Apply " + promo.code);
                const copy = document.createElement("button");
                copy.type = "button";
                copy.className = "deal-button deal-button--ghost";
                copy.dataset.promoCopy = promo.code;
                copy.textContent = "Copy";
                copy.setAttribute("aria-label", "Copy " + promo.code);
                actions.append(apply, copy);
                li.append(code, label, hint, actions);
                list.appendChild(li);
            });
            $$("[data-code-count]").forEach((node) => (node.textContent = String(promos().length + 1)));
            render();
        }

        function render() {
            const discount = M.cart.discount();
            $$(".sp-coupon", list).forEach((item) => {
                const applied = item.dataset.code === discount.code;
                item.classList.toggle("is-applied", applied);
                const apply = $("[data-promo-apply]", item);
                apply.textContent = applied ? "In your cart" : "Apply";
                apply.classList.toggle("is-done", applied);
            });
            status.classList.toggle("is-applied", Boolean(discount.code));
            if (!discount.code) {
                status.textContent = "No code in your cart yet. Pick one below.";
            } else if (discount.amount) {
                status.textContent = discount.code + " is in your cart. You're saving " + M.money(discount.amount) + ".";
            } else {
                status.textContent = discount.code + " is saved in your cart. " + discount.note;
            }
        }

        build();
        document.addEventListener("marlowby:catalog", build);
        document.addEventListener("marlowby:cart", render);

        const form = $("#codeCheck");
        const input = $("#codeCheckInput");
        const message = $("#codeCheckMsg");
        input.addEventListener("input", () => {
            input.value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
            message.textContent = "";
        });
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!input.value.trim()) {
                message.textContent = "Type a code first.";
                message.className = "sp-check_msg is-error";
                input.focus();
                return;
            }
            const result = M.shop ? M.shop.applyPromo(input.value) : M.cart.applyPromo(input.value);
            message.textContent = result.message;
            message.className = "sp-check_msg " + (result.ok ? "is-ok" : "is-error");
            if (result.ok) {
                input.value = "";
            } else {
                input.focus();
            }
        });
    }

    function initMaker() {
        const name = $("[data-maker-name]");
        if (!name) {
            return;
        }
        const maker = MAKERS[new Date().getDay()];
        name.textContent = maker.name;
        $("[data-maker-blurb]").textContent = maker.blurb;
        $("[data-maker-box]").textContent = maker.box;
    }

    function initWeek() {
        const label = $("[data-week-left]");
        if (!label) {
            return;
        }
        const days = (7 - new Date().getDay()) % 7;
        label.textContent = days === 0 ? "Last day: ends tonight." : "Ends Sunday, " + days + (days === 1 ? " day" : " days") + " from now.";
    }

    function initNavHeight() {
        const navbar = $(".navbar");
        if (!navbar) {
            return;
        }
        const set = () => {
            const sticky = getComputedStyle(navbar).position === "sticky" || getComputedStyle(navbar).position === "fixed";
            document.documentElement.style.setProperty("--sp-nav-h", (sticky ? navbar.offsetHeight : 0) + "px");
        };
        set();
        if ("ResizeObserver" in window) {
            new ResizeObserver(set).observe(navbar);
        } else {
            window.addEventListener("resize", set);
        }
    }

    function initJump() {
        const links = $$("[data-jump]");
        if (!links.length || !("IntersectionObserver" in window)) {
            return;
        }
        const sections = links.map((link) => document.getElementById(link.dataset.jump)).filter(Boolean);
        const visible = new Map();
        const pick = () => {
            let best = null;
            sections.forEach((section) => {
                if (visible.get(section) && (!best || section.offsetTop > best.offsetTop)) {
                    best = section;
                }
            });
            links.forEach((link) => {
                const on = Boolean(best) && link.dataset.jump === best.id;
                link.classList.toggle("is-current", on);
                if (on) {
                    link.setAttribute("aria-current", "location");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
            pick();
        }, { rootMargin: "-35% 0px -55% 0px" });
        sections.forEach((section) => observer.observe(section));
    }

    function initLiveDeals() {
        const pill = $("[data-jump-save]");
        const cards = $$(".deal");
        function codesIn(card) {
            return $$("[data-promo-apply], [data-deal-code]", card).map((node) => node.dataset.promoApply || node.dataset.dealCode);
        }

        function render() {
            const discount = M.cart.discount();
            const code = discount.code || "";
            cards.forEach((card) => card.classList.toggle("is-applied", Boolean(code) && codesIn(card).includes(code)));
            if (pill) {
                pill.classList.toggle("is-saving", Boolean(code));
                let long = "No code yet";
                let short = "No code yet";
                if (code && discount.amount) {
                    long = "You're saving " + M.money(discount.amount) + " with " + code;
                    short = M.money(discount.amount) + " off";
                } else if (code) {
                    long = code + " is in your cart";
                    short = code;
                }
                const longSpan = document.createElement("span");
                longSpan.className = "sp-jump_long";
                longSpan.textContent = long;
                const shortSpan = document.createElement("span");
                shortSpan.className = "sp-jump_short";
                shortSpan.textContent = short;
                pill.replaceChildren(longSpan, shortSpan);
            }

        }

        document.addEventListener("marlowby:cart", render);
        render();
    }

    function initReveal() {
        const targets = $$("[data-reveal]");
        if (reduceMotion || !("IntersectionObserver" in window)) {
            targets.forEach((element) => element.classList.add("is-visible"));
            return;
        }
        document.documentElement.classList.add("has-reveal");
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
        targets.forEach((element, index) => {
            element.style.setProperty("--reveal-delay", (index % 3) * 90 + "ms");
            observer.observe(element);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initNavHeight();
        initJump();
        initReveal();
        initMaker();
        initWeek();
        if (M) {
            initBoardStatus();
            initWallet();
            initLiveDeals();
        }
    });
})();

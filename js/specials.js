(function () {
    "use strict";

    const M = window.Marlowby;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const PICK_KEY = "marlowbyPick";
    const PICK_PRIZES = ["BURLINGTON15", "PASSPORT10", "MIDNIGHT"];
    const PICK_LABELS = { BURLINGTON15: "15% off everything", PASSPORT10: "$10 off any order", MIDNIGHT: "10% off tonight" };

    const MAKERS = [
        { name: "Pure maple syrup", blurb: "Tapped in the Green Mountains and boiled down in a wood-fired sugarhouse.", box: "In every Basic and Premium box this month." },
        { name: "Maple cream candies", blurb: "Melt-in-your-mouth leaves made from nothing but maple syrup, cooked and stirred by hand.", box: "In every Basic and Premium box this month." },
        { name: "Small-batch dark chocolate", blurb: "Bean-to-bar bars from a tiny kitchen near Lake Champlain, wrapped in local art.", box: "In every Basic and Premium box this month." },
        { name: "Sharp cheddar crackers", blurb: "Baked with aged Vermont cheddar for a snap that tastes like a farm stand.", box: "In every Basic and Premium box this month." },
        { name: "Hand-thrown stoneware mug", blurb: "Each one is shaped and glazed by a potter whose studio looks out on the lake.", box: "A Premium box exclusive." },
        { name: "Wool-blend trail socks", blurb: "Knit in a family mill that has kept Vermont hikers warm for three generations.", box: "A Premium box exclusive." },
        { name: "Apple cider donut mix", blurb: "The orchard's famous fall recipe, ready for your kitchen in one bag.", box: "A Premium box exclusive." }
    ];

    function todayKey(date = new Date()) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }

    function seeded(seed) {
        let value = 0;
        for (let i = 0; i < seed.length; i += 1) {
            value = (value * 31 + seed.charCodeAt(i)) % 2147483647;
        }
        return () => {
            value = (value * 48271) % 2147483647;
            return value / 2147483647;
        };
    }

    function initFlaps() {
        const cells = $$("[data-flap]");
        cells.forEach((cell, index) => {
            const text = cell.textContent.trim();
            cell.textContent = "";
            const hidden = document.createElement("span");
            hidden.className = "visually-hidden";
            hidden.textContent = text;
            const flap = document.createElement("span");
            flap.className = "flap";
            flap.setAttribute("aria-hidden", "true");
            const letters = Array.from(text).map((char) => {
                const span = document.createElement("span");
                span.textContent = char === " " ? " " : char;
                flap.appendChild(span);
                return { span, char };
            });
            cell.append(hidden, flap);
            if (reduceMotion) {
                return;
            }
            letters.forEach(({ span, char }, position) => {
                if (char === " ") {
                    return;
                }
                let spins = 6 + position + (index % 5) * 2;
                const step = () => {
                    if (spins <= 0) {
                        span.textContent = char;
                        return;
                    }
                    spins -= 1;
                    span.textContent = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
                    span.classList.remove("is-flipping");
                    void span.offsetWidth;
                    span.classList.add("is-flipping");
                    window.setTimeout(step, 70);
                };
                window.setTimeout(step, 250 + index * 120);
            });
        });

        const clock = $("[data-board-clock]");
        if (clock) {
            const tick = () => {
                clock.textContent = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            };
            tick();
            window.setInterval(tick, 15000);
        }
    }

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
                    button.textContent = applied ? "Boarded" : "Board";
                }
            });
            const hours = 24 - new Date().getHours();
            status.textContent = code ? code + " is boarding in your cart" : hours <= 3 ? "Last call for MIDNIGHT" : "All deals on time";
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

    function initPick() {
        const cards = $$("[data-pick]");
        if (!cards.length) {
            return;
        }
        const result = $("#pickResult");
        const actions = $("#pickActions");
        const day = todayKey();
        const random = seeded("marlowby-" + day);
        const prizes = PICK_PRIZES.slice();
        for (let i = prizes.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [prizes[i], prizes[j]] = [prizes[j], prizes[i]];
        }

        cards.forEach((card, index) => {
            const back = $(".sp-postcard_back", card);
            const small = document.createElement("small");
            small.textContent = "Code";
            const strong = document.createElement("strong");
            strong.textContent = prizes[index];
            const em = document.createElement("em");
            em.textContent = PICK_LABELS[prizes[index]];
            back.append(small, strong, em);
        });

        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(PICK_KEY) || "null");
        } catch (error) {
        }

        function reveal(index, animate) {
            const code = prizes[index];
            cards.forEach((card, position) => {
                card.disabled = true;
                const delay = !animate || position === index ? 0 : 650;
                window.setTimeout(() => {
                    card.classList.add("is-flipped");
                    card.classList.toggle("is-winner", position === index);
                    card.classList.toggle("is-missed", position !== index);
                }, delay);
                $(".visually-hidden", card).textContent = position === index ? "Your postcard: " + prizes[position] : "Postcard " + (position + 1) + ": " + prizes[position];
            });
            result.replaceChildren(document.createTextNode("You found "), Object.assign(document.createElement("strong"), { id: "pickCode", textContent: code }), document.createTextNode(", " + PICK_LABELS[code] + ". Come back tomorrow for a new pick."));
            actions.hidden = false;
            $("#pickApply").dataset.code = code;
        }

        if (saved && saved.day === day && typeof saved.index === "number") {
            reveal(saved.index, false);
        }

        cards.forEach((card, index) => {
            card.addEventListener("click", () => {
                try {
                    localStorage.setItem(PICK_KEY, JSON.stringify({ day, index }));
                } catch (error) {
                }
                reveal(index, !reduceMotion);
                $("#pickApply").focus();
            });
        });

        $("#pickApply").addEventListener("click", (event) => {
            if (M.shop) {
                const outcome = M.shop.applyPromo(event.currentTarget.dataset.code);
                if (outcome.ok) {
                    event.currentTarget.textContent = "Applied!";
                }
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

    function burstAt(element) {
        if (reduceMotion || !element || !element.isConnected) {
            return;
        }
        const rect = element.getBoundingClientRect();
        if (!rect.width) {
            return;
        }
        const burst = document.createElement("span");
        burst.className = "sp-burst";
        burst.setAttribute("aria-hidden", "true");
        burst.style.left = rect.left + rect.width / 2 + "px";
        burst.style.top = rect.top + rect.height / 2 + "px";
        const colors = ["#e3a83b", "#b0491f", "#5f7d64", "#ffcf5c", "#1d2a3a"];
        for (let n = 0; n < 16; n += 1) {
            const piece = document.createElement("i");
            const angle = (n / 16) * Math.PI * 2;
            const reach = 40 + Math.random() * 40;
            piece.style.setProperty("--x", Math.cos(angle) * reach + "px");
            piece.style.setProperty("--y", Math.sin(angle) * reach + "px");
            piece.style.setProperty("--r", Math.round(Math.random() * 360) + "deg");
            piece.style.setProperty("--c", colors[n % colors.length]);
            burst.appendChild(piece);
        }
        document.body.appendChild(burst);
        window.setTimeout(() => burst.remove(), 800);
    }

    function initLiveDeals() {
        const pill = $("[data-jump-save]");
        const cards = $$(".deal");
        let lastCode = M.cart.discount().code || "";
        let lastTrigger = null;

        document.addEventListener("click", (event) => {
            const trigger = event.target.closest("[data-promo-apply], [data-deal-add], #pickApply, #codeCheck button");
            if (trigger) {
                lastTrigger = trigger;
            }
        }, true);

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
            if (code && code !== lastCode) {
                burstAt(lastTrigger || pill);
                if (pill && !reduceMotion) {
                    pill.classList.remove("is-pop");
                    void pill.offsetWidth;
                    pill.classList.add("is-pop");
                }
            }
            lastCode = code;
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
        initFlaps();
        initMaker();
        initWeek();
        initPick();
        if (M) {
            initBoardStatus();
            initWallet();
            initLiveDeals();
        }
    });
})();

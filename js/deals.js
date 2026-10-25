(function () {
    "use strict";

    const M = window.Marlowby;
    if (!M) {
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const SEEN_KEY = "marlowbyPopups";

    const WELCOME = { code: "BURLINGTON15", city: "Burlington", state: "Vermont" };
    const EXIT = { code: "PASSPORT10" };

    const TICKET_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/></svg>';

    const TEMPLATE = `
<dialog class="deal-pop deal-pop--postcard" id="dealPostcard" aria-labelledby="dealPostcardTitle">
    <button type="button" class="deal-pop_close" data-deal-close aria-label="Close">&times;</button>
    <p class="deal-pop_eyebrow">You've got mail</p>
    <h2 id="dealPostcardTitle" tabindex="-1">A postcard from ${WELCOME.city}</h2>
    <div class="postcard" id="dealCard">
        <div class="postcard_inner">
            <div class="postcard_face postcard_front" id="dealCardFront">
                <div class="postcard_scene" aria-hidden="true">
                    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
                        <rect width="320" height="180" fill="#f4c27a"/>
                        <circle cx="236" cy="70" r="30" fill="#f8e3b3"/>
                        <path d="M0 112 L60 70 L110 104 L170 52 L232 100 L284 74 L320 96 V180 H0Z" fill="#5f7d64"/>
                        <path d="M0 132 L70 104 L130 128 L200 96 L260 124 L320 112 V180 H0Z" fill="#3f5a46"/>
                        <rect y="142" width="320" height="38" fill="#2c4a6b"/>
                        <path d="M20 156 h40 M90 164 h60 M190 154 h50 M260 166 h40" stroke="#9cc0d8" stroke-width="3" stroke-linecap="round"/>
                        <path d="M150 142 v-14 l10 -8 l10 8 v14" fill="#b0491f"/>
                    </svg>
                </div>
                <p class="postcard_greeting" aria-hidden="true"><span>Greetings from</span><strong>${WELCOME.city}</strong></p>
                <button type="button" class="deal-button deal-button--light postcard_flip" id="dealFlip">Flip it over</button>
            </div>
            <div class="postcard_face postcard_back" id="dealCardBack" inert>
                <div class="postcard_note">
                    <p class="postcard_hand">Wish you were here! The maple syrup is unreal. Here's 15% off your whole first order, on us.</p>
                    <p class="postcard_sign">Love, the Marlowby crew</p>
                </div>
                <div class="postcard_side">
                    <span class="postcard_stamp" aria-hidden="true">VT<small>15%</small></span>
                    <p class="postcard_code"><span>Your code</span><strong>${WELCOME.code}</strong></p>
                </div>
            </div>
        </div>
    </div>
    <div class="deal-pop_actions">
        <button type="button" class="deal-button" data-promo-apply="${WELCOME.code}">Use 15% off</button>
        <button type="button" class="deal-button deal-button--ghost" data-promo-copy="${WELCOME.code}">Copy code</button>
    </div>
    <button type="button" class="deal-pop_skip" data-deal-close>Maybe later</button>
</dialog>

<dialog class="deal-pop deal-pop--exit" id="dealExit" aria-labelledby="dealExitTitle">
    <button type="button" class="deal-pop_close" data-deal-close aria-label="Close">&times;</button>
    <div class="deal-exit_tag" aria-hidden="true"><span>$10</span><small>off</small></div>
    <p class="deal-pop_eyebrow">Before you hit the road</p>
    <h2 id="dealExitTitle" tabindex="-1">Take $10 for the trip</h2>
    <p class="deal-exit_text">Your passport is still waiting for its first stamp. Use this code on any plan or gift box.</p>
    <p class="deal-exit_code"><strong>${EXIT.code}</strong></p>
    <div class="deal-pop_actions">
        <button type="button" class="deal-button" data-promo-apply="${EXIT.code}">Use $10 off</button>
        <button type="button" class="deal-button deal-button--ghost" data-promo-copy="${EXIT.code}">Copy code</button>
    </div>
    <button type="button" class="deal-pop_skip" data-deal-close>No thanks, I'll pay full price</button>
</dialog>

<button type="button" class="deal-ticket" id="dealTicket" hidden>${TICKET_ICON}<span>15% off</span></button>`;

    const SEEN_DAYS = 7;

    function readStore(store) {
        try {
            return JSON.parse(store.getItem(SEEN_KEY) || "{}") || {};
        } catch (error) {
            return {};
        }
    }

    function readSeen() {
        const seen = Object.assign({}, readStore(sessionStorage));
        const kept = readStore(localStorage);
        const cutoff = Date.now() - SEEN_DAYS * 86400000;
        Object.keys(kept).forEach((name) => {
            if (kept[name] > cutoff) {
                seen[name] = 1;
            }
        });
        return seen;
    }

    function markSeen(name) {
        const session = readStore(sessionStorage);
        session[name] = 1;
        session.auto = 1;
        const kept = readStore(localStorage);
        kept[name] = Date.now();
        try {
            sessionStorage.setItem(SEEN_KEY, JSON.stringify(session));
            localStorage.setItem(SEEN_KEY, JSON.stringify(kept));
        } catch (error) {
        }
    }

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
        }
        return Promise.resolve(fallbackCopy(text));
    }

    function fallbackCopy(text) {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try {
            ok = document.execCommand("copy");
        } catch (error) {
        }
        area.remove();
        return ok;
    }

    function pad(value) {
        return String(value).padStart(2, "0");
    }

    function init() {
        const host = document.createElement("div");
        host.className = "deal-root";
        host.innerHTML = TEMPLATE;
        document.body.appendChild(host);

        const postcard = $("#dealPostcard");
        const exit = $("#dealExit");
        const ticket = $("#dealTicket");
        const card = $("#dealCard");

        function say(message) {
            if (M.shop && M.shop.announce) {
                M.shop.announce(message);
            }
        }

        function hasPromo() {
            return Boolean(M.cart.discount().code);
        }

        function refreshTicket() {
            ticket.hidden = !document.body.matches(".plans-page, .specials-page") || !readSeen().welcome || hasPromo();
        }

        function flip(open) {
            card.classList.toggle("is-flipped", open);
            $("#dealCardFront").inert = open;
            $("#dealCardBack").inert = !open;
        }

        function close(dialog) {
            if (!dialog.open) {
                return;
            }
            dialog.classList.add("is-closing");
            window.setTimeout(() => {
                dialog.classList.remove("is-closing");
                dialog.close();
                refreshTicket();
            }, reduceMotion ? 0 : 200);
        }

        function openPostcard(source) {
            if (postcard.open) {
                return;
            }
            markSeen("welcome");
            flip(false);
            postcard.showModal();
            $("#dealPostcardTitle").focus();
            if (source !== "button" && !reduceMotion) {
                window.setTimeout(() => postcard.open && !card.classList.contains("is-flipped") && card.classList.add("is-wiggling"), 900);
            }
        }

        $("#dealFlip").addEventListener("click", () => {
            card.classList.remove("is-wiggling");
            flip(true);
            $(".deal-pop_actions [data-promo-apply]", postcard).focus();
            say("The postcard says: 15% off your whole first order with code " + WELCOME.code + ".");
        });

        [postcard, exit].forEach((dialog) => {
            dialog.addEventListener("click", (event) => {
                if (event.target === dialog || event.target.closest("[data-deal-close]")) {
                    close(dialog);
                }
            });
            dialog.addEventListener("cancel", (event) => {
                event.preventDefault();
                close(dialog);
            });
        });

        ticket.addEventListener("click", () => {
            openPostcard("button");
            flip(true);
        });

        document.addEventListener("click", (event) => {
            const apply = event.target.closest("[data-promo-apply]");
            if (apply && M.shop) {
                const result = M.shop.applyPromo(apply.dataset.promoApply);
                const dialog = apply.closest("dialog.deal-pop");
                if (dialog) {
                    close(dialog);
                }
                if (result.ok && !("noFlash" in apply.dataset)) {
                    flashLabel(apply, "Applied!");
                }
                refreshTicket();
                return;
            }
            const copy = event.target.closest("[data-promo-copy]");
            if (copy) {
                const target = copy.dataset.promoCopyFrom ? document.getElementById(copy.dataset.promoCopyFrom) : null;
                const code = target ? target.textContent.trim() : copy.dataset.promoCopy;
                copyText(code).then((ok) => {
                    flashLabel(copy, ok ? "Copied!" : "Press Ctrl+C");
                    say(ok ? code + " copied to your clipboard." : "Select the code and copy it.");
                });
            }
            const opener = event.target.closest("[data-open-postcard]");
            if (opener) {
                openPostcard("button");
            }
        });

        const labelTimers = new WeakMap();
        function flashLabel(button, text) {
            if (!labelTimers.has(button)) {
                button.dataset.label = button.textContent;
            }
            window.clearTimeout(labelTimers.get(button));
            button.textContent = text;
            button.classList.add("is-done");
            labelTimers.set(button, window.setTimeout(() => {
                button.textContent = button.dataset.label;
                button.classList.remove("is-done");
                labelTimers.delete(button);
            }, 1600));
        }

        document.addEventListener("marlowby:cart", refreshTicket);
        refreshTicket();

        initRibbon();
        initDealsSection();
    }

    function initRibbon() {
        const ribbon = $("[data-ribbon]");
        if (!ribbon) {
            return;
        }
        const items = $$(".deal-ribbon_list li", ribbon);
        const pause = $(".deal-ribbon_pause", ribbon);
        let index = 0;
        let paused = reduceMotion;
        let hovering = false;
        pause.textContent = paused ? "Play" : "Pause";
        function show(next) {
            items[index].classList.remove("is-active");
            index = (next + items.length) % items.length;
            items[index].classList.add("is-active");
        }
        window.setInterval(() => {
            if (!paused && !hovering && !document.hidden) {
                show(index + 1);
            }
        }, 4500);
        pause.addEventListener("click", () => {
            paused = !paused;
            pause.textContent = paused ? "Play" : "Pause";
        });
        ribbon.addEventListener("mouseenter", () => (hovering = true));
        ribbon.addEventListener("mouseleave", () => (hovering = false));
        ribbon.addEventListener("focusin", () => (hovering = true));
        ribbon.addEventListener("focusout", () => (hovering = false));
    }

    function parseAdds(text) {
        return String(text || "").split(",").map((pair) => pair.trim().split(":")).filter((pair) => pair.length === 2);
    }

    function dealPrice(adds, code) {
        const was = adds.reduce((total, [plan, term]) => total + M.catalog.dueToday(plan, term), 0);
        const promo = code ? M.catalog.promo(code) : null;
        if (!promo) {
            return { was, now: was };
        }
        const eligible = promo.terms ? adds.filter(([, term]) => promo.terms.includes(term)).reduce((total, [plan, term]) => total + M.catalog.dueToday(plan, term), 0) : was;
        const off = promo.type === "percent" ? eligible * promo.value / 100 : Math.min(promo.value, eligible);
        return { was, now: Math.max(0, Math.round((was - off) * 100) / 100) };
    }

    function initDealsSection() {
        $$("[data-flash-clock]").forEach((clock) => {
            const tick = () => {
                const now = new Date();
                const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                const left = Math.max(0, Math.floor((midnight - now) / 1000));
                clock.textContent = pad(Math.floor(left / 3600)) + ":" + pad(Math.floor((left % 3600) / 60)) + ":" + pad(left % 60);
            };
            tick();
            window.setInterval(tick, 1000);
        });

        const addButtons = $$("[data-deal-add]");
        function renderPrices() {
            addButtons.forEach((button) => {
                const scope = button.closest(".deal") || document;
                const price = dealPrice(parseAdds(button.dataset.dealAdd), button.dataset.dealCode);
                $$("[data-deal-was]", scope).forEach((node) => (node.textContent = M.money(price.was)));
                $$("[data-deal-now]", scope).forEach((node) => (node.textContent = M.money(price.now)));
            });
        }
        renderPrices();
        document.addEventListener("marlowby:catalog", renderPrices);
        addButtons.forEach((button) => {
            const label = button.textContent;
            button.addEventListener("click", () => {
                if (!M.shop) {
                    return;
                }
                parseAdds(button.dataset.dealAdd).forEach(([plan, term]) => M.shop.add(plan, term, button));
                if (button.dataset.dealCode) {
                    M.shop.applyPromo(button.dataset.dealCode);
                }
                button.classList.add("is-done");
                button.textContent = "Added to your cart!";
                window.setTimeout(() => {
                    button.textContent = label;
                    button.classList.remove("is-done");
                }, 1800);
            });
        });

        const refInput = $("#refName");
        const refCode = $("#refCode");
        if (refInput && refCode) {
            const suffix = (M.catalog.data.referral || { suffix: "-MB10" }).suffix;
            const render = () => {
                const clean = refInput.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 12);
                refCode.textContent = (clean.length >= 2 ? clean : "YOURNAME") + suffix;
                refCode.classList.toggle("is-ready", clean.length >= 2);
                $$("[data-ref-action]").forEach((button) => (button.disabled = clean.length < 2));
            };
            try {
                const passport = JSON.parse(localStorage.getItem("marlowbyPassport") || "{}") || {};
                if (passport.name) {
                    refInput.value = passport.name.split(/\s+/)[0];
                }
            } catch (error) {
            }
            refInput.addEventListener("input", render);
            render();
        }

        const meters = $$("[data-reward-fill]");
        if (meters.length) {
            const render = () => {
                const reward = M.catalog.reward();
                const total = M.cart.total();
                const left = Math.max(0, reward.threshold - total);
                meters.forEach((meter) => {
                    const card = meter.closest(".deal") || document.body;
                    meter.style.width = Math.min(100, (total / reward.threshold) * 100) + "%";
                    $$("[data-reward-text]", card).forEach((text) => {
                        text.textContent = left === 0 ? "Unlocked! Your tote ships with your first box." : total ? "Your cart is at " + M.money(total) + ". Just " + M.money(left) + " to go." : "Your cart is empty. Fill it to " + M.money(reward.threshold) + ".";
                    });
                    card.classList.toggle("is-unlocked", left === 0);
                });
            };
            document.addEventListener("marlowby:cart", render);
            render();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

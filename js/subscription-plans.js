(function () {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function nextShipDate(now) {
        const ship = new Date(now.getFullYear(), now.getMonth(), 5, 9, 0, 0);
        if (now >= ship) {
            ship.setMonth(ship.getMonth() + 1);
        }
        return ship;
    }

    const PRICES = {
        basic: { monthly: 34, half: 31, annual: 29 },
        premium: { monthly: 59, half: 54, annual: 50 },
        gift: { 3: 99, 6: 189, 12: 349 }
    };

    const BILLING_LABELS = {
        monthly: "Billed monthly",
        half: "Billed every 6 months",
        annual: "Billed yearly"
    };

    const ITEMS_PER_BOX = { basic: 5, premium: 8 };

    const SAMPLE_BOX = {
        city: "Burlington, Vermont",
        basic: ["Pure maple syrup", "Maple cream candies", "Small-batch dark chocolate", "Cheddar crackers", "Letterpress lake postcard"],
        premium: ["Pure maple syrup", "Maple cream candies", "Small-batch dark chocolate", "Cheddar crackers", "Letterpress lake postcard", "Hand-thrown stoneware mug", "Wool-blend trail socks", "Apple cider donut mix"]
    };

    const CITIES = [
        { name: "Burlington", abbr: "VT", hint: "Picture maple syrup, lake sunsets, and outdoorsy makers." },
        { name: "Santa Fe", abbr: "NM", hint: "Think red rock, turquoise, and green chile that people argue about." },
        { name: "Portland", abbr: "ME", hint: "Picture lighthouses, lobster boats, and blueberry everything." },
        { name: "Asheville", abbr: "NC", hint: "Mountain air, banjo music, and a lot of local craft." },
        { name: "Milwaukee", abbr: "WI", hint: "Lakefront breezes, old breweries, and a serious love of cheese." },
        { name: "Tucson", abbr: "AZ", hint: "Desert sunsets, saguaros, and the best tortillas you've had." },
        { name: "New Orleans", abbr: "LA", hint: "Brass bands, beignets, and a little bit of magic." },
        { name: "Boise", abbr: "ID", hint: "River trails, potatoes with personality, and a growing art scene." },
        { name: "San Antonio", abbr: "TX", hint: "A famous river walk, bright papel picado, and smoky salsas." },
        { name: "Duluth", abbr: "MN", hint: "A big lake, bigger winters, and cozy wool everything." },
        { name: "Charleston", abbr: "SC", hint: "Rainbow row houses, sweetgrass baskets, and benne wafers." },
        { name: "Bozeman", abbr: "MT", hint: "Big sky, huckleberry treats, and trail-ready gear." }
    ];

    const FIRST_SHIP = nextShipDate(new Date());

    const state = {
        billing: "monthly",
        giftMonths: 3,
        tripPlan: "premium",
        displayed: { basic: 34, premium: 59, gift: 99 }
    };

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const money = (value) => "$" + value.toLocaleString("en-US");

    function animateNumber(element, from, to, duration = 450) {
        if (reduceMotion || from === to) {
            element.textContent = to;
            return;
        }
        const start = performance.now();
        function frame(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = Math.round(from + (to - from) * eased);
            if (progress < 1) {
                requestAnimationFrame(frame);
            }
        }
        requestAnimationFrame(frame);
        element.classList.remove("is-bumped");
        void element.offsetWidth;
        element.classList.add("is-bumped");
    }

    function setupRadioGroup(group, onChange) {
        const inputs = $$("input[type='radio']", group);
        function sync() {
            const checked = inputs.find((input) => input.checked);
            inputs.forEach((input) => input.closest("label").classList.toggle("is-checked", input === checked));
            onChange(checked);
        }
        group.addEventListener("change", sync);
        return sync;
    }

    function currentPrice(plan) {
        return plan === "gift" ? PRICES.gift[state.giftMonths] : PRICES[plan][state.billing];
    }

    function refreshPrices() {
        ["basic", "premium", "gift"].forEach((plan) => {
            const element = $("[data-price-" + plan + "]");
            const target = currentPrice(plan);
            animateNumber(element, state.displayed[plan], target);
            state.displayed[plan] = target;
        });
        ["basic", "premium"].forEach((plan) => {
            const billed = $("[data-billed-" + plan + "]");
            const price = PRICES[plan][state.billing];
            if (state.billing === "monthly") {
                billed.textContent = BILLING_LABELS.monthly;
            } else {
                const months = state.billing === "half" ? 6 : 12;
                billed.textContent = BILLING_LABELS[state.billing] + " (" + money(price * months) + ")";
            }
        });
    }

    function initBilling() {
        const group = $(".billing-switch");
        const pill = $(".billing-switch_pill", group);
        function movePill() {
            const option = $(".billing-switch_option.is-checked", group);
            pill.style.width = option.offsetWidth + "px";
            pill.style.transform = "translateX(" + option.offsetLeft + "px)";
        }
        const sync = setupRadioGroup(group, (input) => {
            state.billing = input.value;
            refreshPrices();
            movePill();
        });
        sync();
        window.addEventListener("resize", movePill);
        if (document.fonts) {
            document.fonts.ready.then(movePill);
        }

        setupRadioGroup($(".gift-length"), (input) => {
            state.giftMonths = Number(input.value);
            refreshPrices();
        })();
    }

    function initCards() {
        $$("[data-sample-city]").forEach((element) => {
            element.textContent = SAMPLE_BOX.city;
        });
        $$("[data-sample]").forEach((list) => {
            SAMPLE_BOX[list.dataset.sample].forEach((item, index) => {
                const li = document.createElement("li");
                li.textContent = item;
                li.style.setProperty("--delay", index * 60 + "ms");
                list.appendChild(li);
            });
        });

        $$(".plan-card").forEach((card) => {
            const front = $(".plan-card_front", card);
            const back = $(".plan-card_back", card);
            $$("[data-flip]", card).forEach((button) => {
                button.addEventListener("click", () => {
                    const flipped = card.classList.toggle("is-flipped");
                    front.inert = flipped;
                    back.inert = !flipped;
                    $("[data-flip]", flipped ? back : front).focus({ preventScroll: true });
                });
            });

            if (finePointer && !reduceMotion) {
                card.addEventListener("pointermove", (event) => {
                    const rect = card.getBoundingClientRect();
                    const x = (event.clientX - rect.left) / rect.width - 0.5;
                    const y = (event.clientY - rect.top) / rect.height - 0.5;
                    card.style.setProperty("--tilt-x", (y * -8).toFixed(2) + "deg");
                    card.style.setProperty("--tilt-y", (x * 10).toFixed(2) + "deg");
                    card.style.setProperty("--glow-x", ((x + 0.5) * 100).toFixed(1) + "%");
                    card.style.setProperty("--glow-y", ((y + 0.5) * 100).toFixed(1) + "%");
                });
                card.addEventListener("pointerleave", () => {
                    card.style.setProperty("--tilt-x", "0deg");
                    card.style.setProperty("--tilt-y", "0deg");
                });
            }
        });
    }

    function initCountdown() {
        const fields = {
            days: $("#cdDays"),
            hours: $("#cdHours"),
            mins: $("#cdMins"),
            secs: $("#cdSecs")
        };
        const target = FIRST_SHIP;
        $("#nextMonthName").textContent = target.toLocaleString("en-US", { month: "long" });
        const pad = (value) => String(value).padStart(2, "0");
        function tick() {
            const remaining = Math.max(0, target - new Date());
            const seconds = Math.floor(remaining / 1000);
            fields.days.textContent = pad(Math.floor(seconds / 86400));
            fields.hours.textContent = pad(Math.floor((seconds % 86400) / 3600));
            fields.mins.textContent = pad(Math.floor((seconds % 3600) / 60));
            fields.secs.textContent = pad(seconds % 60);
        }
        tick();
        setInterval(tick, 1000);
    }

    function initQuiz() {
        const form = $("#planQuiz");
        const steps = $$(".quiz-step", form);
        const bar = $("#quizBar");
        const result = $("#quizResult");
        const answers = {};

        const RESULTS = {
            basic: { name: "Basic", why: "A focused box of local favorites that keeps the monthly cost low." },
            premium: { name: "Premium", why: "You want the whole city, so you get more products, a signature item, and the digital city guide." },
            gift: { name: "Gift", why: "A prepaid set of boxes with a personal note, and it never renews on its own." }
        };

        function showStep(index, focus = true) {
            steps.forEach((step, stepIndex) => {
                const active = stepIndex === index;
                step.classList.toggle("is-active", active);
                step.disabled = !active;
            });
            bar.style.width = (index / steps.length) * 100 + "%";
            const first = $("input", steps[index]);
            if (first && focus) {
                first.focus({ preventScroll: true });
            }
        }

        function finish() {
            let plan = "basic";
            if (answers.who === "gift") {
                plan = "gift";
            } else if (answers.depth === "full" || answers.budget === "high") {
                plan = "premium";
            }
            bar.style.width = "100%";
            steps.forEach((step) => {
                step.classList.remove("is-active");
                step.disabled = true;
            });
            form.hidden = true;
            result.hidden = false;
            $("#quizPlan").textContent = RESULTS[plan].name;
            $("#quizWhy").textContent = RESULTS[plan].why;
            $("#quizGo").href = "#" + plan;
            $("#quizGo").dataset.target = plan;
        }

        form.addEventListener("change", (event) => {
            const step = event.target.closest(".quiz-step");
            const index = steps.indexOf(step);
            answers[event.target.name] = event.target.value;
            if (index === 0 && event.target.value === "gift") {
                setTimeout(finish, 250);
                return;
            }
            setTimeout(() => {
                if (index < steps.length - 1) {
                    showStep(index + 1);
                } else {
                    finish();
                }
            }, 250);
        });

        $("#quizGo").addEventListener("click", (event) => {
            const card = document.getElementById(event.currentTarget.dataset.target);
            if (!card) {
                return;
            }
            event.preventDefault();
            card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
            card.classList.remove("is-spotlit");
            void card.offsetWidth;
            card.classList.add("is-spotlit");
            setTimeout(() => $(".plan-card_cta", card).focus({ preventScroll: true }), reduceMotion ? 0 : 600);
        });

        $("#quizReset").addEventListener("click", () => {
            $$("input", form).forEach((input) => {
                input.checked = false;
            });
            Object.keys(answers).forEach((key) => delete answers[key]);
            result.hidden = true;
            form.hidden = false;
            showStep(0);
        });

        showStep(0, false);
    }

    function initTrip() {
        const range = $("#tripMonths");
        const stamps = $("#tripStamps");
        const start = FIRST_SHIP;

        CITIES.forEach((city, index) => {
            const month = new Date(start.getFullYear(), start.getMonth() + index, 1);
            const li = document.createElement("li");
            li.className = "trip-stamp";
            li.style.setProperty("--turn", ((index % 5) - 2) * 3 + "deg");
            li.innerHTML =
                '<span class="trip-stamp_abbr"></span>' +
                '<span class="trip-stamp_city"></span>' +
                '<span class="trip-stamp_month"></span>';
            $(".trip-stamp_abbr", li).textContent = city.abbr;
            $(".trip-stamp_city", li).textContent = city.name;
            $(".trip-stamp_month", li).textContent = month.toLocaleString("en-US", { month: "short", year: "numeric" });
            stamps.appendChild(li);
        });

        const stampItems = $$(".trip-stamp", stamps);
        const shown = { items: 0, total: 0, save: 0 };

        function rateFor(months) {
            if (months >= 12) {
                return "annual";
            }
            return months >= 6 ? "half" : "monthly";
        }

        function update() {
            const months = Number(range.value);
            const plan = state.tripPlan;
            const rate = rateFor(months);
            const total = PRICES[plan][rate] * months;
            const save = PRICES[plan].monthly * months - total;
            const items = ITEMS_PER_BOX[plan] * months;

            range.style.setProperty("--fill", ((months - 1) / 11) * 100 + "%");
            range.setAttribute("aria-valuetext", months + (months === 1 ? " month" : " months"));
            $("#tripMonthsOut").textContent = months;
            $("#tripCities").textContent = months;

            const animateMoney = (id, key, value) => {
                const element = $(id);
                const from = shown[key];
                shown[key] = value;
                if (reduceMotion) {
                    element.textContent = key === "items" ? value : money(value);
                    return;
                }
                const begin = performance.now();
                const step = (now) => {
                    const progress = Math.min((now - begin) / 350, 1);
                    const current = Math.round(from + (value - from) * progress);
                    element.textContent = key === "items" ? current : money(current);
                    if (progress < 1) {
                        requestAnimationFrame(step);
                    }
                };
                requestAnimationFrame(step);
            };
            animateMoney("#tripItems", "items", items);
            animateMoney("#tripTotal", "total", total);
            animateMoney("#tripSave", "save", save);

            stampItems.forEach((stamp, index) => {
                stamp.classList.toggle("is-stamped", index < months);
            });
        }

        range.addEventListener("input", update);
        setupRadioGroup($(".trip-plan"), (input) => {
            state.tripPlan = input.value;
            update();
        })();
    }

    function initCompare() {
        const table = $("#compareTable");
        const toggle = $("#diffToggle");
        toggle.addEventListener("click", () => {
            const on = toggle.getAttribute("aria-pressed") !== "true";
            toggle.setAttribute("aria-pressed", String(on));
            table.classList.toggle("is-diff-only", on);
        });

        const rows = $$("tr", table);
        table.addEventListener("pointerover", (event) => {
            const cell = event.target.closest("td, th");
            if (!cell || cell.cellIndex === 0) {
                return;
            }
            rows.forEach((row) => {
                Array.from(row.cells).forEach((item, index) => {
                    item.classList.toggle("is-col-hover", index === cell.cellIndex);
                });
            });
        });
        table.addEventListener("pointerleave", () => {
            $$(".is-col-hover", table).forEach((item) => item.classList.remove("is-col-hover"));
        });
    }

    function initFaq() {
        $$(".plans-faq details").forEach((details) => {
            const summary = $("summary", details);
            const body = $(".plans-faq_body", details);
            summary.addEventListener("click", (event) => {
                if (reduceMotion) {
                    return;
                }
                event.preventDefault();
                if (details.open) {
                    body.style.height = body.scrollHeight + "px";
                    requestAnimationFrame(() => {
                        body.style.height = "0px";
                    });
                    body.addEventListener("transitionend", () => {
                        details.open = false;
                        body.style.height = "";
                    }, { once: true });
                } else {
                    $$(".plans-faq details[open]").forEach((other) => {
                        if (other !== details) {
                            $("summary", other).click();
                        }
                    });
                    details.open = true;
                    const height = body.scrollHeight;
                    body.style.height = "0px";
                    requestAnimationFrame(() => {
                        body.style.height = height + "px";
                    });
                    body.addEventListener("transitionend", () => {
                        body.style.height = "";
                    }, { once: true });
                }
            });
        });
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
        }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
        targets.forEach((element, index) => {
            element.style.setProperty("--reveal-delay", (index % 3) * 90 + "ms");
            observer.observe(element);
        });
    }

    const confetti = { pieces: [], running: false };

    function launchConfetti(originX, originY, count = 140) {
        if (reduceMotion) {
            return;
        }
        const canvas = $("#confetti");
        const context = canvas.getContext("2d");
        const startX = originX === undefined ? window.innerWidth / 2 : originX;
        const startY = originY === undefined ? window.innerHeight / 2 : originY;
        const colors = ["#b0491f", "#e3a83b", "#5f7d64", "#1d2a3a", "#f4d6c4"];

        for (let i = 0; i < count; i += 1) {
            confetti.pieces.push({
                x: startX + (Math.random() - 0.5) * 60,
                y: startY,
                vx: (Math.random() - 0.5) * 14,
                vy: Math.random() * -14 - 4,
                size: Math.random() * 7 + 5,
                spin: Math.random() * Math.PI,
                spinSpeed: (Math.random() - 0.5) * 0.3,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 0
            });
        }

        if (typeof canvas.showPopover === "function") {
            if (canvas.matches(":popover-open")) {
                canvas.hidePopover();
            }
            canvas.showPopover();
        } else {
            canvas.classList.add("is-active");
        }

        if (confetti.running) {
            return;
        }
        confetti.running = true;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * ratio;
        canvas.height = window.innerHeight * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);

        function frame() {
            context.clearRect(0, 0, window.innerWidth, window.innerHeight);
            confetti.pieces = confetti.pieces.filter((piece) => piece.life < 170 && piece.y < window.innerHeight + 40);
            confetti.pieces.forEach((piece) => {
                piece.vy += 0.35;
                piece.vx *= 0.99;
                piece.x += piece.vx;
                piece.y += piece.vy;
                piece.spin += piece.spinSpeed;
                piece.life += 1;
                context.save();
                context.translate(piece.x, piece.y);
                context.rotate(piece.spin);
                context.fillStyle = piece.color;
                context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
                context.restore();
            });
            if (confetti.pieces.length) {
                requestAnimationFrame(frame);
            } else {
                confetti.running = false;
                context.clearRect(0, 0, window.innerWidth, window.innerHeight);
                if (typeof canvas.hidePopover === "function" && canvas.matches(":popover-open")) {
                    canvas.hidePopover();
                }
                canvas.classList.remove("is-active");
            }
        }
        requestAnimationFrame(frame);
    }

    function syncCatalog(data) {
        if (!data || !data.plans) {
            return;
        }
        Object.keys(PRICES).forEach((plan) => {
            if (data.plans[plan]) {
                Object.assign(PRICES[plan], data.plans[plan].prices);
            }
        });
        ["basic", "premium"].forEach((plan) => {
            if (data.plans[plan]) {
                ITEMS_PER_BOX[plan] = data.plans[plan].itemsPerBox;
            }
        });
        Object.keys(BILLING_LABELS).forEach((term) => {
            if (data.billing && data.billing[term]) {
                BILLING_LABELS[term] = data.billing[term].billed;
            }
        });
        refreshPrices();
    }

    function initCart() {
        const M = window.Marlowby;
        if (!M) {
            return;
        }
        document.addEventListener("marlowby:catalog", (event) => syncCatalog(event.detail));
        if (M.catalog.loaded) {
            syncCatalog(M.catalog.data);
        }

        $$(".plan-card").forEach((card) => {
            const chip = document.createElement("span");
            chip.className = "plan-card_incart";
            chip.setAttribute("aria-hidden", "true");
            chip.textContent = "In your cart";
            const cta = $(".plan-card_cta", card);
            cta.parentNode.insertBefore(chip, cta);
        });

        function markCards() {
            $$(".plan-card").forEach((card) => card.classList.toggle("is-in-cart", M.cart.has(card.id)));
        }

        const timers = new WeakMap();
        $$("[data-plan]").forEach((button) => {
            const label = button.textContent;
            button.addEventListener("click", () => {
                const plan = button.dataset.plan;
                const term = plan === "gift" ? state.giftMonths : state.billing;
                if (!M.shop || !M.shop.add(plan, term, button)) {
                    return;
                }
                button.textContent = "Added to cart";
                button.classList.add("is-added");
                window.clearTimeout(timers.get(button));
                timers.set(button, window.setTimeout(() => {
                    button.textContent = label;
                    button.classList.remove("is-added");
                }, 1800));
            });
        });

        document.addEventListener("marlowby:cart", markCards);
        markCards();

        document.addEventListener("marlowby:purchase", (event) => {
            launchConfetti();
            const first = event.detail.lines.find((line) => line.plan !== "gift") || event.detail.lines[0];
            if (passportApi.stampMember && first) {
                passportApi.stampMember(M.catalog.plan(first.plan).name);
            }
        });
    }

    const STATES = [
        ["Alabama", "AL"], ["Alaska", "AK"], ["Arizona", "AZ"], ["Arkansas", "AR"], ["California", "CA"],
        ["Colorado", "CO"], ["Connecticut", "CT"], ["Delaware", "DE"], ["Florida", "FL"], ["Georgia", "GA"],
        ["Hawaii", "HI"], ["Idaho", "ID"], ["Illinois", "IL"], ["Indiana", "IN"], ["Iowa", "IA"],
        ["Kansas", "KS"], ["Kentucky", "KY"], ["Louisiana", "LA"], ["Maine", "ME"], ["Maryland", "MD"],
        ["Massachusetts", "MA"], ["Michigan", "MI"], ["Minnesota", "MN"], ["Mississippi", "MS"], ["Missouri", "MO"],
        ["Montana", "MT"], ["Nebraska", "NE"], ["Nevada", "NV"], ["New Hampshire", "NH"], ["New Jersey", "NJ"],
        ["New Mexico", "NM"], ["New York", "NY"], ["North Carolina", "NC"], ["North Dakota", "ND"], ["Ohio", "OH"],
        ["Oklahoma", "OK"], ["Oregon", "OR"], ["Pennsylvania", "PA"], ["Rhode Island", "RI"], ["South Carolina", "SC"],
        ["South Dakota", "SD"], ["Tennessee", "TN"], ["Texas", "TX"], ["Utah", "UT"], ["Vermont", "VT"],
        ["Virginia", "VA"], ["Washington", "WA"], ["West Virginia", "WV"], ["Wisconsin", "WI"], ["Wyoming", "WY"]
    ];

    const STAMP_SLOTS = [
        { x: 6, y: 6, turn: -12 },
        { x: 50, y: 4, turn: 9 },
        { x: 26, y: 36, turn: -4 },
        { x: 4, y: 64, turn: 7 },
        { x: 52, y: 62, turn: -9 }
    ];

    const INKS = ["#b0491f", "#4a6650", "#1d2a3a", "#7d5a12", "#6b3a6e"];

    const passportApi = {};

    function loadPassport() {
        try {
            const saved = JSON.parse(localStorage.getItem("marlowbyPassport") || "null");
            if (saved && Array.isArray(saved.stamps)) {
                return saved;
            }
        } catch (error) {
        }
        return {
            name: "",
            state: "",
            plan: "",
            stamps: [],
            number: "MB-" + String(Math.floor(100000 + Math.random() * 900000)),
            since: new Date().toISOString().slice(0, 10)
        };
    }

    function initPassport() {
        const passport = $("#passport");
        const cover = $("#passportCover");
        const closeButton = $("#passportClose");
        const nameInput = $("#ppNameInput");
        const stateInput = $("#ppStateInput");
        const stampButton = $("#ppStampButton");
        const stampArea = $("#ppStamps");
        const empty = $("#ppEmpty");
        const status = $("#ppStatus");
        const data = loadPassport();

        STATES.forEach(([name, abbr]) => {
            const option = document.createElement("option");
            option.value = abbr;
            option.textContent = name;
            stateInput.appendChild(option);
        });

        function save() {
            try {
                localStorage.setItem("marlowbyPassport", JSON.stringify(data));
            } catch (error) {
            }
        }

        function stateName(abbr) {
            const match = STATES.find((item) => item[1] === abbr);
            return match ? match[0] : "";
        }

        function mrz() {
            const clean = (text) => text.toUpperCase().replace(/[^A-Z ]/g, "").trim();
            const parts = clean(data.name || "Your Name").split(/\s+/);
            const last = parts.length > 1 ? parts.pop() : parts[0];
            const first = parts.length && parts[0] !== last ? parts.join("<") : "";
            const line1 = ("P<USA" + last + "<<" + first).padEnd(30, "<").slice(0, 30);
            const date = data.since.replace(/-/g, "").slice(2);
            const line2 = (data.number.replace("-", "") + "<" + (data.state || "XX") + date + "<MARLOWBY").padEnd(30, "<").slice(0, 30);
            return line1 + "\n" + line2;
        }

        function renderId() {
            const name = data.name.trim();
            const initials = name ? name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase() : "YOU";
            $("#ppInitials").textContent = initials;
            $("#ppName").textContent = name || "Your Name";
            $("#ppState").textContent = data.state ? stateName(data.state) : "Anywhere, USA";
            $("#ppSince").textContent = new Date(data.since + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            $("#ppNumber").textContent = data.number;
            $("#ppPlan").textContent = data.plan || "Not chosen yet";
            $("#ppMrz").textContent = mrz();
        }

        function stampElement(stamp, index, slam) {
            const slot = STAMP_SLOTS[index % STAMP_SLOTS.length];
            const element = document.createElement("div");
            element.className = "ink-stamp ink-stamp--" + (stamp.kind === "member" ? "member" : index % 2 ? "rect" : "round");
            element.style.setProperty("--ink", stamp.kind === "member" ? "#b0491f" : INKS[index % INKS.length]);
            element.style.setProperty("--turn", slot.turn + "deg");
            element.style.left = slot.x + "%";
            element.style.top = slot.y + "%";
            const top = document.createElement("span");
            const big = document.createElement("strong");
            const bottom = document.createElement("span");
            top.textContent = stamp.kind === "member" ? "Marlowby" : stamp.abbr;
            big.textContent = stamp.kind === "member" ? stamp.plan : stamp.city;
            bottom.textContent = stamp.kind === "member" ? "Member" : stamp.month;
            if (big.textContent.length > 9) {
                element.classList.add("ink-stamp--long");
            }
            element.append(top, big, bottom);
            if (slam && !reduceMotion) {
                element.classList.add("is-slamming");
                setTimeout(() => {
                    passport.classList.remove("is-thud");
                    void passport.offsetWidth;
                    passport.classList.add("is-thud");
                }, 260);
            }
            return element;
        }

        function renderStamps(slamLast) {
            $$(".ink-stamp", stampArea).forEach((element) => element.remove());
            const visible = data.stamps.slice(-STAMP_SLOTS.length);
            visible.forEach((stamp, index) => {
                stampArea.appendChild(stampElement(stamp, index, slamLast && index === visible.length - 1));
            });
            empty.hidden = data.stamps.length > 0;
        }

        function setOpen(open) {
            passport.classList.toggle("is-open", open);
            cover.setAttribute("aria-expanded", String(open));
            $("#ppIdPage").inert = !open;
            cover.tabIndex = open ? -1 : 0;
        }

        function addStamp(stamp) {
            const wasOpen = passport.classList.contains("is-open");
            setOpen(true);
            data.stamps.push(stamp);
            save();
            setTimeout(() => renderStamps(true), wasOpen ? 0 : 700);
        }

        passportApi.name = () => data.name.trim();
        passportApi.stampMember = (planName) => {
            data.plan = planName;
            renderId();
            addStamp({ kind: "member", plan: planName });
        };

        cover.addEventListener("click", () => {
            setOpen(true);
            closeButton.focus({ preventScroll: true });
        });
        closeButton.addEventListener("click", () => {
            setOpen(false);
            cover.focus({ preventScroll: true });
        });

        nameInput.value = data.name;
        stateInput.value = data.state;
        nameInput.addEventListener("input", () => {
            data.name = nameInput.value.replace(/[^A-Za-z .'-]/g, "");
            if (nameInput.value !== data.name) {
                nameInput.value = data.name;
            }
            if (!passport.classList.contains("is-open")) {
                setOpen(true);
            }
            renderId();
            save();
        });
        stateInput.addEventListener("change", () => {
            data.state = stateInput.value;
            renderId();
            save();
        });

        stampButton.addEventListener("click", () => {
            const cityStamps = data.stamps.filter((stamp) => stamp.kind === "city").length;
            const city = CITIES[cityStamps % CITIES.length];
            const month = new Date(FIRST_SHIP.getFullYear(), FIRST_SHIP.getMonth() + cityStamps, 1);
            const label = month.toLocaleString("en-US", { month: "short", year: "numeric" });
            addStamp({ kind: "city", city: city.name, abbr: city.abbr, month: label });
            status.textContent = "Stamped " + city.name + ", " + city.abbr + " for " + label + ".";
            stampButton.textContent = "Stamp the next city";
        });

        renderId();
        renderStamps(false);
        $("#ppIdPage").inert = true;
        if (data.stamps.length) {
            stampButton.textContent = "Stamp the next city";
        }
    }

    function initScramble() {
        const target = $("#heroScramble");
        const words = CITIES.map((city) => city.name + ".").concat(["the city."]);
        const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (reduceMotion) {
            return;
        }
        let index = 0;
        function scrambleTo(word, done) {
            const from = target.textContent;
            const length = Math.max(from.length, word.length);
            let frame = 0;
            const total = 22;
            function step() {
                let output = "";
                for (let i = 0; i < length; i += 1) {
                    const settleAt = (i / length) * total * 0.7 + total * 0.3;
                    if (frame >= settleAt) {
                        output += word[i] || "";
                    } else if (word[i] === " " || word[i] === ".") {
                        output += word[i];
                    } else {
                        output += glyphs[Math.floor(Math.random() * glyphs.length)].toLowerCase();
                    }
                }
                target.textContent = output;
                frame += 1;
                if (frame <= total) {
                    requestAnimationFrame(step);
                } else {
                    target.textContent = word;
                    done();
                }
            }
            step();
        }
        function next() {
            const word = words[index % words.length];
            index += 1;
            const pause = word === "the city." ? 4200 : 1500;
            scrambleTo(word, () => setTimeout(next, pause));
        }
        setTimeout(next, 3000);
    }

    function initScratch() {
        const wrap = $("#scratch");
        const canvas = $("#scratchFoil");
        const prize = $("#scratchPrize");
        const status = $("#scratchStatus");
        const reveal = $("#scratchReveal");
        const context = canvas.getContext("2d");
        const city = CITIES[0];
        const monthName = FIRST_SHIP.toLocaleString("en-US", { month: "long" });
        let revealed = false;
        let drawing = false;
        let strokes = 0;

        $("#scratchCity").textContent = city.name + ", " + city.abbr;
        $("#scratchHint").textContent = city.hint;

        function paintFoil() {
            const ratio = window.devicePixelRatio || 1;
            const rect = wrap.getBoundingClientRect();
            canvas.width = Math.round(rect.width * ratio);
            canvas.height = Math.round(rect.height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.globalCompositeOperation = "source-over";
            const foil = context.createLinearGradient(0, 0, rect.width, rect.height);
            foil.addColorStop(0, "#c98f2a");
            foil.addColorStop(0.35, "#f3d48b");
            foil.addColorStop(0.55, "#d9a542");
            foil.addColorStop(1, "#f6e2ad");
            context.fillStyle = foil;
            context.fillRect(0, 0, rect.width, rect.height);
            context.fillStyle = "rgba(29, 42, 58, 0.08)";
            for (let x = -rect.height; x < rect.width; x += 14) {
                context.fillRect(x, 0, 4, rect.height * 3);
            }
            context.fillStyle = "#1d2a3a";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.font = "700 18px 'Playfair Display', Georgia, serif";
            context.fillText("Scratch to reveal the " + monthName + " city", rect.width / 2, rect.height / 2 - 8);
            context.font = "700 11px Lato, Arial, sans-serif";
            context.fillText("DRAG ACROSS THE GOLD FOIL", rect.width / 2, rect.height / 2 + 16);
        }

        function finish() {
            if (revealed) {
                return;
            }
            revealed = true;
            wrap.classList.add("is-revealed");
            prize.setAttribute("aria-hidden", "false");
            reveal.disabled = true;
            reveal.textContent = "City revealed";
            status.textContent = "The " + monthName + " city is " + city.name + ", " + city.abbr + ". " + city.hint;
            const rect = wrap.getBoundingClientRect();
            launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 60);
        }

        function clearedShare() {
            const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let clear = 0;
            let total = 0;
            for (let i = 3; i < data.length; i += 4 * 40) {
                total += 1;
                if (data[i] === 0) {
                    clear += 1;
                }
            }
            return clear / total;
        }

        function scratchAt(event) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            context.globalCompositeOperation = "destination-out";
            context.beginPath();
            context.arc(x, y, 22, 0, Math.PI * 2);
            context.fill();
            strokes += 1;
            if (strokes % 12 === 0 && clearedShare() > 0.45) {
                finish();
            }
        }

        canvas.addEventListener("pointerdown", (event) => {
            if (revealed) {
                return;
            }
            drawing = true;
            canvas.setPointerCapture(event.pointerId);
            scratchAt(event);
        });
        canvas.addEventListener("pointermove", (event) => {
            if (drawing && !revealed) {
                scratchAt(event);
            }
        });
        ["pointerup", "pointercancel"].forEach((type) => {
            canvas.addEventListener(type, () => {
                drawing = false;
            });
        });

        reveal.addEventListener("click", finish);
        window.addEventListener("resize", () => {
            if (!revealed) {
                paintFoil();
            }
        });
        paintFoil();
        if (document.fonts) {
            document.fonts.ready.then(() => {
                if (!revealed) {
                    paintFoil();
                }
            });
        }
    }

    function initTicker() {
        const track = $("#cityTicker");
        const run = CITIES.map((city) => '<span class="city-ticker_item"><b>' + city.abbr + "</b>" + city.name + "</span>").join("");
        track.innerHTML = reduceMotion ? run : run + run;
    }

    function initRoad() {
        const fill = $("#roadFill");
        const box = $("#roadBox");
        let ticking = false;
        function update() {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
            fill.style.transform = "scaleY(" + progress.toFixed(4) + ")";
            box.style.setProperty("--progress", progress.toFixed(4));
            box.classList.toggle("is-arrived", progress > 0.98);
            ticking = false;
        }
        window.addEventListener("scroll", () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });
        window.addEventListener("resize", update);
        update();
    }

    function initMagnetic() {
        if (!finePointer || reduceMotion) {
            return;
        }
        $$(".plans-button").forEach((button) => {
            button.addEventListener("pointermove", (event) => {
                const rect = button.getBoundingClientRect();
                const x = event.clientX - rect.left - rect.width / 2;
                const y = event.clientY - rect.top - rect.height / 2;
                button.style.translate = (x * 0.18).toFixed(1) + "px " + (y * 0.3).toFixed(1) + "px";
            });
            button.addEventListener("pointerleave", () => {
                button.style.translate = "";
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initPassport();
        initScramble();
        initScratch();
        initTicker();
        initRoad();
        initMagnetic();
        initCountdown();
        initBilling();
        initCards();
        initQuiz();
        initTrip();
        initCompare();
        initFaq();
        initReveal();
        initCart();
    });
})();

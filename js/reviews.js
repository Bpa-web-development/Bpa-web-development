(function () {
    "use strict";

    const HELPFUL_KEY = "marlowbyHelpful";
    const MINE_KEY = "marlowbyMyReviews";
    const PAGE = 6;
    const BOXES = ["Savannah", "Providence", "Lexington", "Burlington"];
    const BOX_LABELS = { Savannah: "Savannah, GA", Providence: "Providence, RI", Lexington: "Lexington, KY", Burlington: "Burlington, VT" };
    const TOTALS = {
        Savannah: [268, 41, 9, 3, 1],
        Providence: [241, 46, 11, 2, 2],
        Lexington: [255, 38, 8, 4, 1],
        Burlington: [187, 21, 3, 1, 0]
    };

    const REVIEWS = [
        { id: "r01", box: "Burlington", plan: "Premium", rating: 5, date: "2026-04-14", name: "Hannah P.", state: "Ohio", helpful: 41, title: "The mug alone was worth it", body: "The stoneware mug has a blue-grey glaze that looks like the lake in the photo on the story card. I drink my coffee out of it every morning now. The maple syrup is the real deal too, dark and smoky." },
        { id: "r02", box: "Burlington", plan: "Basic", rating: 5, date: "2026-04-11", name: "Marcus T.", state: "Texas", helpful: 27, title: "Maple cream candies disappeared in a day", body: "I meant to save the maple cream candies. My kids found them first. The cheddar crackers are sharp in the best way and the little card about the bakery made us want to visit." },
        { id: "r03", box: "Burlington", plan: "Gift", rating: 4, date: "2026-04-09", name: "Priya S.", state: "New Jersey", helpful: 12, title: "My dad loved the trail socks", body: "Sent a 3-month gift to my dad, who hikes every weekend. He has not taken the wool socks off. Shipping took a day longer than I expected, but the gift note was printed beautifully." },
        { id: "r04", box: "Burlington", plan: "Premium", rating: 5, date: "2026-04-06", name: "Leah R.", state: "Oregon", helpful: 19, title: "Cider donuts on a Sunday morning", body: "The apple cider donut mix was so easy. One skillet, one bag, and the whole apartment smelled like a fall orchard. The letterpress lake postcard is now framed on my desk." },
        { id: "r05", box: "Lexington", plan: "Premium", rating: 5, date: "2026-03-22", name: "Daniel K.", state: "Illinois", helpful: 34, title: "That green pottery bowl", body: "The hand-thrown bowl is glazed in a deep bluegrass green and it is heavier than it looks. Every one is a little different, and the card told us the potter's name. That is the kind of detail I pay for." },
        { id: "r06", box: "Lexington", plan: "Basic", rating: 4, date: "2026-03-18", name: "Sofia M.", state: "Florida", helpful: 9, title: "Sorghum caramels were new to me", body: "I had never tried sorghum before. The caramels taste like molasses and butter. The smoked sea salt is great on eggs. I wish the playlist card had a few more songs on it." },
        { id: "r07", box: "Lexington", plan: "Gift", rating: 5, date: "2026-03-15", name: "Grace W.", state: "Virginia", helpful: 15, title: "Perfect for a horse-crazy niece", body: "My niece is obsessed with horses, so the postcard set of the pastures was a hit. She has them pinned above her bed. The box arrived with her name on the passport page, which made her day." },
        { id: "r08", box: "Lexington", plan: "Premium", rating: 5, date: "2026-03-10", name: "Omar H.", state: "Michigan", helpful: 11, title: "The fiddle playlist is on repeat", body: "Put on the bluegrass playlist while cooking with the smoked salt and it honestly felt like a little trip. Love that a local fiddle teacher picked the songs." },
        { id: "r09", box: "Providence", plan: "Premium", rating: 5, date: "2026-02-20", name: "Emily C.", state: "Colorado", helpful: 38, title: "Coffee milk is my new thing", body: "I did not know coffee milk was Rhode Island's state drink until this box. The syrup is sweet, rich and dangerous. The wool beanie got me through a cold February too." },
        { id: "r10", box: "Providence", plan: "Basic", rating: 4, date: "2026-02-16", name: "Jake L.", state: "Arizona", helpful: 7, title: "Great caramels, small bracelet", body: "The sea salt caramels were the best thing in the box. The brass bracelet is lovely, but it ran a little small on my wrist. Customer support offered to swap it, which I appreciated." },
        { id: "r11", box: "Providence", plan: "Premium", rating: 5, date: "2026-02-12", name: "Nina B.", state: "Washington", helpful: 21, title: "The art print is gallery quality", body: "The riverfront print was screen-printed by a design student and you can feel the ink on the paper. Reading the story card about WaterFire made me want to plan a real trip." },
        { id: "r12", box: "Providence", plan: "Gift", rating: 3, date: "2026-02-08", name: "Chris D.", state: "Georgia", helpful: 5, title: "Good box, slow first delivery", body: "The goods were great, especially the caramels. My gift arrived four days after the date I picked, so it missed the birthday. The team refunded the shipping without me asking twice." },
        { id: "r13", box: "Savannah", plan: "Premium", rating: 5, date: "2026-01-21", name: "Ava J.", state: "Minnesota", helpful: 44, title: "A warm box in a cold January", body: "Opening pecan pralines and peach jam in a Minnesota snowstorm felt unfair in the best way. The block-printed tea towel of the squares is too pretty to dry dishes with." },
        { id: "r14", box: "Savannah", plan: "Basic", rating: 5, date: "2026-01-17", name: "Tyler N.", state: "California", helpful: 16, title: "Hot sauce with real character", body: "The Lowcountry hot sauce is fermented and tangy, not just hot. I have already ordered two more bottles straight from the maker using the link on the card." },
        { id: "r15", box: "Savannah", plan: "Gift", rating: 5, date: "2026-01-12", name: "Maria G.", state: "New York", helpful: 13, title: "My mom lit the candle right away", body: "Gave my mom the Savannah box. She lit the live oak candle the same night and said it smells like her grandmother's porch. That is exactly the feeling I wanted to give her." },
        { id: "r16", box: "Savannah", plan: "Premium", rating: 4, date: "2026-01-08", name: "Ben F.", state: "Pennsylvania", helpful: 6, title: "Pralines were a little sweet for me", body: "Everything was well made and the packaging was careful, with no broken jars. The pralines were sweeter than I like, but my roommate finished them happily. The jam was perfect." },
        { id: "r17", box: "Burlington", plan: "Basic", rating: 5, date: "2026-04-02", name: "Rachel O.", state: "Maryland", helpful: 8, title: "Chocolate wrapped in local art", body: "The dark chocolate bar comes wrapped in a print by a Burlington artist and it tastes like a fancy shop bar. Basic is a great price for this much care." }
    ];

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    function read(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "null");
            return value === null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
        }
    }

    function stars(rating, size) {
        const wrap = document.createElement("span");
        wrap.className = "rv-stars" + (size ? " rv-stars--" + size : "");
        wrap.setAttribute("role", "img");
        wrap.setAttribute("aria-label", "Rated " + rating + " out of 5 stars");
        for (let i = 1; i <= 5; i += 1) {
            const star = document.createElement("span");
            star.className = "rv-star" + (i <= Math.round(rating) ? " is-on" : "");
            star.setAttribute("aria-hidden", "true");
            wrap.appendChild(star);
        }
        return wrap;
    }

    function formatDate(iso) {
        const date = new Date(iso + "T12:00:00");
        return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }

    function init() {
        const root = $("#reviews");
        if (!root) {
            return;
        }
        const list = $("#rvList", root);
        const more = $("#rvMore", root);
        const count = $("#rvCount", root);
        const sort = $("#rvSort", root);
        const empty = $("#rvEmpty", root);
        const state = { box: "All", plan: "All", sort: "recent", shown: PAGE };
        let helpful = read(HELPFUL_KEY, []);
        let mine = read(MINE_KEY, []);
        if (!Array.isArray(helpful)) {
            helpful = [];
        }
        if (!Array.isArray(mine)) {
            mine = [];
        }

        function totals() {
            const boxes = state.box === "All" ? BOXES : [state.box];
            const sums = [0, 0, 0, 0, 0];
            boxes.forEach((box) => TOTALS[box].forEach((n, i) => (sums[i] += n)));
            return sums;
        }

        function renderSummary() {
            const sums = totals();
            const total = sums.reduce((a, b) => a + b, 0);
            const score = sums.reduce((acc, n, i) => acc + n * (5 - i), 0) / total;
            const recommend = Math.round(((sums[0] + sums[1]) / total) * 100);
            $("#rvScore", root).textContent = score.toFixed(1);
            const holder = $("#rvScoreStars", root);
            holder.replaceChildren(stars(score, "lg"));
            $("#rvTotal", root).textContent = total.toLocaleString("en-US") + " reviews" + (state.box === "All" ? "" : " for " + BOX_LABELS[state.box]);
            $("#rvRecommend", root).textContent = recommend + "%";
            $$(".rv-bar", root).forEach((bar, i) => {
                const pct = Math.round((sums[i] / total) * 100);
                $(".rv-bar_fill", bar).style.width = pct + "%";
                $(".rv-bar_pct", bar).textContent = pct + "%";
            });
        }

        function filtered() {
            const all = mine.concat(REVIEWS);
            const rows = all.filter((review) => (state.box === "All" || review.box === state.box) && (state.plan === "All" || review.plan === state.plan));
            const sorters = {
                recent: (a, b) => (a.pending === b.pending ? b.date.localeCompare(a.date) : a.pending ? -1 : 1),
                rating: (a, b) => b.rating - a.rating || b.date.localeCompare(a.date),
                helpful: (a, b) => b.helpful + (helpful.includes(b.id) ? 1 : 0) - (a.helpful + (helpful.includes(a.id) ? 1 : 0))
            };
            return rows.sort(sorters[state.sort]);
        }

        function card(review) {
            const item = document.createElement("li");
            item.className = "rv-card" + (review.pending ? " is-pending" : "");
            const head = document.createElement("div");
            head.className = "rv-card_head";
            head.appendChild(stars(review.rating));
            const date = document.createElement("time");
            date.className = "rv-card_date";
            date.dateTime = review.date;
            date.textContent = formatDate(review.date);
            head.appendChild(date);
            const title = document.createElement("h3");
            title.className = "rv-card_title";
            title.textContent = review.title;
            const body = document.createElement("p");
            body.className = "rv-card_body";
            body.textContent = review.body;
            const meta = document.createElement("div");
            meta.className = "rv-card_meta";
            const who = document.createElement("p");
            who.className = "rv-card_who";
            const name = document.createElement("strong");
            name.textContent = review.name;
            who.append(name, document.createTextNode(" · " + review.state));
            const tags = document.createElement("p");
            tags.className = "rv-card_tags";
            const badge = document.createElement("span");
            badge.className = review.pending ? "rv-badge rv-badge--pending" : "rv-badge";
            badge.textContent = review.pending ? "Pending review" : "Verified subscriber";
            const box = document.createElement("span");
            box.className = "rv-tag";
            box.textContent = BOX_LABELS[review.box] + " box · " + review.plan;
            tags.append(badge, box);
            meta.append(who, tags);
            item.append(head, title, body, meta);
            if (review.pending) {
                const note = document.createElement("p");
                note.className = "rv-card_note";
                note.textContent = "Only you can see this review until our team checks it.";
                item.appendChild(note);
            } else {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "rv-helpful";
                const voted = helpful.includes(review.id);
                button.setAttribute("aria-pressed", String(voted));
                button.textContent = "Helpful (" + (review.helpful + (voted ? 1 : 0)) + ")";
                button.addEventListener("click", () => {
                    const on = helpful.includes(review.id);
                    helpful = on ? helpful.filter((id) => id !== review.id) : helpful.concat(review.id);
                    write(HELPFUL_KEY, helpful);
                    button.setAttribute("aria-pressed", String(!on));
                    button.textContent = "Helpful (" + (review.helpful + (on ? 0 : 1)) + ")";
                });
                item.appendChild(button);
            }
            return item;
        }

        function renderList() {
            const rows = filtered();
            list.replaceChildren(...rows.slice(0, state.shown).map(card));
            const shown = Math.min(state.shown, rows.length);
            count.textContent = rows.length ? "Showing " + shown + " of " + rows.length + " featured reviews" : "";
            empty.hidden = rows.length > 0;
            more.hidden = rows.length <= state.shown;
        }

        function render() {
            renderSummary();
            renderList();
        }

        $$("[data-rv-filter]", root).forEach((button) => {
            button.addEventListener("click", () => {
                const key = button.dataset.rvFilter;
                state[key] = button.dataset.value;
                state.shown = PAGE;
                $$('[data-rv-filter="' + key + '"]', root).forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
                render();
            });
        });

        sort.addEventListener("change", () => {
            state.sort = sort.value;
            state.shown = PAGE;
            renderList();
        });

        more.addEventListener("click", () => {
            const first = state.shown;
            state.shown += PAGE;
            renderList();
            const next = list.children[first];
            if (next) {
                next.setAttribute("tabindex", "-1");
                next.focus();
            }
        });

        initForm(root, (review) => {
            mine = [review].concat(mine).slice(0, 10);
            write(MINE_KEY, mine);
            state.box = "All";
            state.plan = "All";
            state.sort = "recent";
            state.shown = PAGE;
            sort.value = "recent";
            $$("[data-rv-filter]", root).forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.value === "All")));
            render();
        });

        render();
    }

    function initForm(root, onAdd) {
        const toggle = $("#rvWrite", root);
        const panel = $("#rvFormPanel", root);
        const form = $("#rvForm", root);
        const text = $("#rvText", form);
        const counter = $("#rvCounter", form);
        const done = $("#rvDone", root);
        const max = Number(text.getAttribute("maxlength")) || 500;

        toggle.addEventListener("click", () => {
            const open = panel.hidden;
            panel.hidden = !open;
            toggle.setAttribute("aria-expanded", String(open));
            if (open) {
                done.hidden = true;
                $("input[name='rvRating']", form).focus();
            }
        });

        $("#rvCancel", form).addEventListener("click", () => {
            panel.hidden = true;
            toggle.setAttribute("aria-expanded", "false");
            toggle.focus();
        });

        const updateCount = () => {
            counter.textContent = text.value.length + " / " + max;
        };
        text.addEventListener("input", updateCount);
        updateCount();

        function setError(id, message) {
            const field = $("#" + id, form);
            const error = $("#" + id + "Error", form);
            error.textContent = message;
            if (message) {
                field.setAttribute("aria-invalid", "true");
            } else {
                field.removeAttribute("aria-invalid");
            }
            return !message;
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const rating = $("input[name='rvRating']:checked", form);
            const box = $("#rvBox", form);
            const title = $("#rvTitle", form);
            const name = $("#rvName", form);
            const checks = [
                setError("rvRatingSet", rating ? "" : "Choose a star rating."),
                setError("rvBox", box.value ? "" : "Choose which box you received."),
                setError("rvTitle", title.value.trim().length >= 3 ? "" : "Give your review a short title."),
                setError("rvText", text.value.trim().length >= 20 ? "" : "Tell us a little more. At least 20 characters."),
                setError("rvName", name.value.trim().length >= 2 ? "" : "Add your first name.")
            ];
            if (checks.includes(false)) {
                const first = $("[aria-invalid='true']", form);
                if (first) {
                    (first.matches("fieldset") ? $("input", first) : first).focus();
                }
                return;
            }
            const parts = name.value.trim().split(/\s+/);
            const display = parts[0] + (parts[1] ? " " + parts[1][0].toUpperCase() + "." : "");
            onAdd({
                id: "mine-" + Date.now(),
                box: box.value,
                plan: $("#rvPlan", form).value,
                rating: Number(rating.value),
                date: new Date().toISOString().slice(0, 10),
                name: display,
                state: $("#rvState", form).value.trim() || "USA",
                helpful: 0,
                title: title.value.trim(),
                body: text.value.trim(),
                pending: true
            });
            form.reset();
            updateCount();
            panel.hidden = true;
            toggle.setAttribute("aria-expanded", "false");
            done.hidden = false;
            done.focus();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

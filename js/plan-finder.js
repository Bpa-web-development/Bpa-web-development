(function () {
    "use strict";

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const KEY = "marlowbyFinder";
    const FALLBACK = {
        basic: { monthly: 34, half: 31, annual: 29 },
        premium: { monthly: 59, half: 54, annual: 50 },
        gift: { 3: 99, 6: 189, 12: 349 }
    };
    const MONTHS = { monthly: 1, half: 6, annual: 12 };
    const TERM_TEXT = { monthly: "Billed monthly", half: "6-month plan, billed every 6 months", annual: "Yearly plan, billed once a year" };
    const BOX = {
        basic: "Pure maple syrup, maple cream candies, small-batch dark chocolate, sharp cheddar crackers and a letterpress lake postcard.",
        premium: "Everything in Basic plus a hand-thrown stoneware mug, wool-blend trail socks and apple cider donut mix.",
        gift: "Five Burlington favorites, a passport in their name and your personal note card."
    };

    function money(value) {
        const M = window.Marlowby;
        if (M && M.money) {
            return M.money(value);
        }
        return "$" + Number(value).toFixed(Number.isInteger(value) ? 0 : 2);
    }

    function price(plan, term) {
        const M = window.Marlowby;
        const live = M && M.catalog ? M.catalog.price(plan, term) : 0;
        return live || FALLBACK[plan][term] || 0;
    }

    function read() {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY) || "null");
            return saved && saved.answers ? saved : null;
        } catch (error) {
            return null;
        }
    }

    function write(data) {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
        } catch (error) {
        }
    }

    function match(answers) {
        if (answers.who === "gift") {
            return { plan: "gift", term: answers.term || "3" };
        }
        let score = 0;
        if (answers.budget === "high") {
            score += 3;
        } else if (answers.budget === "mid") {
            score += 1;
        } else {
            score -= 3;
        }
        if (answers.who === "home") {
            score += 1;
        }
        if (answers.love === "made" || answers.love === "all") {
            score += 1;
        }
        return { plan: score >= 2 ? "premium" : "basic", term: answers.term || "monthly" };
    }

    function reasons(answers, result) {
        const list = [];
        if (result.plan === "gift") {
            list.push("Boxes are prepaid and it never renews on its own, so there's nothing for them to cancel.");
            list.push("They get their own Marlowby passport and a stamp from every city.");
            list.push("You can add a personal note and choose the month it starts.");
            if (answers.love === "made") {
                list.push("Each box comes with a printed maker stories card about the people who made their goods.");
            } else {
                list.push("Every box is filled with treats from one city's small businesses.");
            }
            return list;
        }
        if (result.plan === "premium") {
            list.push(answers.budget === "low" ? "It fits your budget on a longer plan." : "It fits the budget you picked, with 7 to 9 products in every box.");
            if (answers.love === "made" || answers.love === "all") {
                list.push("Premium is the only plan with handmade exclusives, like this month's stoneware mug.");
            } else {
                list.push("You get one full-size signature item on top of the snacks and treats.");
            }
            if (answers.who === "home") {
                list.push("There's enough in each box to share with everyone at home.");
            }
            list.push("It includes the digital city guide, a playlist and early access to Specials.");
        } else {
            list.push("At " + money(price("basic", result.term)) + " a box it stays inside your budget.");
            list.push(answers.love === "food" ? "It's packed with 4 to 5 local treats, which is exactly what you said you're excited about." : "You still get 4 to 5 local goods and a printed maker stories card.");
            if (answers.who === "home") {
                list.push("It's an easy start for a household, and you can upgrade to Premium anytime.");
            } else {
                list.push("You can skip a month or cancel anytime, with no calls and no fees.");
            }
        }
        if (result.term === "monthly") {
            list.push("Month to month keeps you flexible. A yearly plan would save you 15%.");
        } else {
            list.push("Your " + (result.term === "annual" ? "yearly" : "6-month") + " plan lowers the price of every box.");
        }
        return list;
    }

    function badgeFor(result) {
        if (result.term === "annual" || result.term === "12") {
            return "Best value";
        }
        if (result.plan === "premium") {
            return "Most popular";
        }
        if (result.plan === "basic" && result.term === "monthly") {
            return "Easiest start";
        }
        return "";
    }

    function init() {
        const section = $("#finder");
        if (!section) {
            return;
        }
        const form = $("#finderForm");
        const intro = $("#finderIntro");
        const resultBox = $("#finderResult");
        const steps = $$(".finder_step", form);
        const next = $("#finderNext");
        const back = $("#finderBack");
        const live = $("#finderLive");
        const answers = {};
        let current = 0;
        let lastPointer = 0;
        let latest = null;

        function question(index) {
            const step = steps[index];
            if (index === 3) {
                return $(answers.who === "gift" ? "[data-q-gift]" : "[data-q-self]", step);
            }
            return $(".finder_q", step);
        }

        function syncTermGroup() {
            const gift = answers.who === "gift";
            const step = steps[3];
            $("[data-terms-self]", step).hidden = gift;
            $("[data-terms-gift]", step).hidden = !gift;
            $("[data-q-self]", step).hidden = gift;
            $("[data-q-gift]", step).hidden = !gift;
            $$("input[name=term]", step).forEach((input) => {
                const inGift = Boolean(input.closest("[data-terms-gift]"));
                input.disabled = inGift !== gift;
                if (input.disabled && input.checked) {
                    input.checked = false;
                    delete answers.term;
                }
            });
        }

        function track() {
            const names = ["who", "budget", "love", "term"];
            $$("[data-track]").forEach((item, index) => {
                const input = $("input[name=" + names[index] + "]:checked:not(:disabled)", form);
                $("[data-track-answer]", item).textContent = input ? input.dataset.label : "Not answered";
                item.classList.toggle("is-done", Boolean(input));
                item.classList.toggle("is-current", !form.hidden && index === current);
                if (!form.hidden && index === current) {
                    item.setAttribute("aria-current", "step");
                } else {
                    item.removeAttribute("aria-current");
                }
            });
        }

        function show(index, focus = true) {
            current = index;
            steps.forEach((step, position) => {
                step.hidden = position !== index;
            });
            if (index === 3) {
                syncTermGroup();
            }
            $("#finderCount").textContent = "Step " + (index + 1) + " of " + steps.length;
            $(".finder_bar", form).setAttribute("aria-valuenow", String(index + 1));
            $("#finderBar").style.width = ((index + 1) / steps.length) * 100 + "%";
            back.hidden = index === 0;
            next.textContent = index === steps.length - 1 ? "See my match" : "Next";
            next.disabled = !$("input:checked:not(:disabled)", steps[index]);
            track();
            if (focus) {
                question(index).focus({ preventScroll: true });
            }
        }

        function open(panel) {
            intro.hidden = panel !== intro;
            form.hidden = panel !== form;
            resultBox.hidden = panel !== resultBox;
            section.classList.toggle("is-result", panel === resultBox);
        }

        function render(result, saved) {
            latest = result;
            const plan = result.plan;
            const term = result.term;
            const each = price(plan, term);
            const names = { basic: "Basic", premium: "Premium", gift: "Gift" };
            $("#finderPlan").textContent = names[plan];
            const badge = badgeFor(result);
            $("#finderBadge").textContent = badge;
            $("#finderBadge").hidden = !badge;
            if (plan === "gift") {
                $("#finderTerm").textContent = term + " prepaid boxes, one each month. Never renews.";
                $("#finderPrice").textContent = money(each);
                $("#finderPer").textContent = "one time, about " + money(Math.round((each / Number(term)) * 100) / 100) + " a box";
                const full = price("gift", "3") / 3 * Number(term);
                const saveGift = Math.round(full - each);
                $("#finderSave").hidden = saveGift <= 0;
                $("#finderSave").textContent = "You save " + money(saveGift) + " compared with 3-box gifts.";
            } else {
                $("#finderTerm").textContent = TERM_TEXT[term];
                $("#finderPrice").textContent = money(each);
                $("#finderPer").textContent = "a box, free shipping";
                const months = MONTHS[term];
                const saved = Math.round((price(plan, "monthly") - each) * months);
                $("#finderSave").hidden = saved <= 0;
                $("#finderSave").textContent = "You save " + money(saved) + " compared with paying month to month.";
            }
            const why = $("#finderWhy");
            why.replaceChildren(...reasons(result.answers, result).map((text) => {
                const li = document.createElement("li");
                li.textContent = text;
                return li;
            }));
            $("#finderBox").textContent = BOX[plan];
            const alt = $("#finderAlt");
            alt.replaceChildren();
            if (plan !== "gift") {
                const other = plan === "basic" ? "premium" : "basic";
                alt.append("Close call? ");
                const link = document.createElement("a");
                link.href = "#" + other;
                link.textContent = names[other] + " is " + money(price(other, term)) + " a box on the same billing.";
                alt.append(link);
            } else {
                alt.textContent = "Want a box for yourself too? Basic starts at " + money(price("basic", "annual")) + " a box.";
            }
            $("#finderAdd").textContent = "Add " + names[plan] + " to cart";
            $("#finderAdd").disabled = false;
            open(resultBox);
            track();
            live.textContent = "Your best match is " + names[plan] + ", " + money(each) + (plan === "gift" ? " for " + term + " boxes." : " a box.");
            if (!saved) {
                write({ plan, term, answers: result.answers, at: Date.now() });
            }
            $("#finderPlan").focus({ preventScroll: true });
            if (!reduceMotion) {
                resultBox.classList.remove("is-in");
                void resultBox.offsetWidth;
                resultBox.classList.add("is-in");
            }
        }

        function finish() {
            const result = match(answers);
            result.answers = Object.assign({}, answers);
            render(result, false);
        }

        form.addEventListener("pointerdown", () => {
            lastPointer = Date.now();
        });

        form.addEventListener("change", (event) => {
            const input = event.target;
            if (input.type !== "radio") {
                return;
            }
            answers[input.name] = input.value;
            if (input.name === "who") {
                syncTermGroup();
            }
            next.disabled = false;
            track();
            if (Date.now() - lastPointer < 800) {
                window.setTimeout(() => {
                    if (current === steps.indexOf(input.closest(".finder_step"))) {
                        form.requestSubmit ? form.requestSubmit(next) : next.click();
                    }
                }, reduceMotion ? 0 : 260);
            }
        });

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!$("input:checked:not(:disabled)", steps[current])) {
                return;
            }
            if (current < steps.length - 1) {
                show(current + 1);
            } else {
                finish();
            }
        });

        back.addEventListener("click", () => {
            if (current > 0) {
                show(current - 1);
            }
        });

        $("#finderStart").addEventListener("click", () => {
            open(form);
            show(0);
        });

        $("#finderRestart").addEventListener("click", () => {
            $$("input", form).forEach((input) => {
                input.checked = false;
            });
            Object.keys(answers).forEach((key) => delete answers[key]);
            open(form);
            show(0);
        });

        $("#finderLast").addEventListener("click", () => {
            const saved = read();
            if (saved) {
                render({ plan: saved.plan, term: saved.term, answers: saved.answers }, true);
            }
        });

        $("#finderAdd").addEventListener("click", (event) => {
            const M = window.Marlowby;
            if (!latest || !M || !M.shop) {
                return;
            }
            const button = event.currentTarget;
            const added = M.shop.add(latest.plan, latest.term, button);
            if (added) {
                button.textContent = "Added to cart";
                window.setTimeout(() => {
                    button.textContent = "Add another to cart";
                }, 2200);
            }
        });

        $$("#finderAlt, #finderCompare").forEach((node) => {
            node.addEventListener("click", (event) => {
                const link = event.target.closest("a");
                if (!link) {
                    return;
                }
                const target = document.getElementById(link.getAttribute("href").slice(1));
                if (target && target.classList.contains("plan-card")) {
                    event.preventDefault();
                    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
                    target.classList.remove("is-spotlit");
                    void target.offsetWidth;
                    target.classList.add("is-spotlit");
                }
            });
        });

        if (read()) {
            $("#finderLast").hidden = false;
        }
        open(intro);
        track();

        const finderSection = $("#finder");
        if (finderSection && "IntersectionObserver" in window) {
            new IntersectionObserver((entries) => {
                document.documentElement.classList.toggle("is-finder-view", entries[0].isIntersecting);
            }, { rootMargin: "-20% 0px -20% 0px" }).observe(finderSection);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

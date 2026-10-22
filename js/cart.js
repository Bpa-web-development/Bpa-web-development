(function () {
    "use strict";

    const M = window.Marlowby;
    if (!M) {
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const PLAN_INK = { basic: "#4a6650", premium: "#1d2a3a", gift: "#b0491f" };
    const PLAN_NOTES = {
        basic: "A taste of each city, picked by our local scouts.",
        premium: "The whole city, plus a full-size signature item.",
        gift: "Prepaid boxes and a personal note. Never auto-renews."
    };

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    function titleFor(item) {
        const entry = M.catalog.plan(item.plan);
        return entry.name + (entry.renews ? " plan" : " box");
    }

    function giftRate(term) {
        return M.catalog.price("gift", term) / Number(term);
    }

    function lineSavings(item) {
        const entry = M.catalog.plan(item.plan);
        if (!entry) {
            return 0;
        }
        if (entry.renews) {
            const monthly = M.catalog.price(item.plan, "monthly");
            const months = M.catalog.months(item.plan, item.term);
            return Math.max(0, (monthly - M.catalog.price(item.plan, item.term)) * months * item.qty);
        }
        const terms = Object.keys(entry.prices).sort((a, b) => Number(a) - Number(b));
        const base = giftRate(terms[0]);
        return Math.max(0, Math.round((base * Number(item.term) - M.catalog.price(item.plan, item.term)) * item.qty * 100) / 100);
    }

    function termOptions(item) {
        const entry = M.catalog.plan(item.plan);
        return Object.keys(entry.prices).map((term) => {
            const price = M.catalog.price(item.plan, term);
            const label = entry.renews
                ? M.catalog.termLabel(item.plan, term) + ", " + M.money(price) + " a box"
                : term + " boxes, " + M.money(price) + " prepaid";
            return { term, label };
        });
    }

    function init() {
        const lines = $("#cartLines");
        const empty = $("#cartEmpty");
        const undoBox = $("#cartUndo");
        const message = $("#cartPromoMsg");
        let undoItem = null;
        let undoTimer = 0;
        let fresh = "";

        function setStep(step) {
            $$("#cartSteps li").forEach((li, index) => {
                const current = index === step;
                li.classList.toggle("is-current", current);
                li.classList.toggle("is-done", index < step);
                if (current) {
                    li.setAttribute("aria-current", "step");
                } else {
                    li.removeAttribute("aria-current");
                }
            });
        }

        function changeTerm(item, term) {
            const entry = M.catalog.plan(item.plan);
            if (entry.renews) {
                fresh = item.key;
                M.cart.add(item.plan, term);
                return;
            }
            const qty = item.qty;
            M.cart.remove(item.key);
            const added = M.cart.add(item.plan, term);
            if (added) {
                fresh = added.key;
                M.cart.setQty(added.key, Math.min(M.cart.maxQty, added.qty - 1 + qty));
            }
        }

        function upgrade(item) {
            const qty = item.qty;
            const term = item.term;
            M.cart.remove(item.key);
            const added = M.cart.add("premium", term);
            if (added) {
                fresh = added.key;
                M.cart.setQty(added.key, Math.min(M.cart.maxQty, added.qty - 1 + qty));
            }
        }

        function showUndo(item) {
            undoItem = { plan: item.plan, term: item.term, qty: item.qty };
            $("#cartUndoText").textContent = titleFor(item) + " was removed.";
            undoBox.hidden = false;
            window.clearTimeout(undoTimer);
            undoTimer = window.setTimeout(() => {
                undoBox.hidden = true;
                undoItem = null;
            }, 8000);
        }

        $("#cartUndoButton").addEventListener("click", () => {
            if (!undoItem) {
                return;
            }
            const restore = undoItem;
            undoItem = null;
            undoBox.hidden = true;
            const added = M.cart.add(restore.plan, restore.term);
            if (added) {
                fresh = added.key;
                M.cart.setQty(added.key, Math.min(M.cart.maxQty, added.qty - 1 + restore.qty));
            }
            $("#cartItemsTitle").focus();
        });

        function stepper(item) {
            const wrap = el("div", "cart-qty");
            const title = titleFor(item);
            const minus = el("button", "cart-qty_button", "−");
            minus.type = "button";
            minus.setAttribute("aria-label", "One fewer " + title + " box");
            minus.disabled = item.qty <= 1;
            minus.addEventListener("click", () => M.cart.setQty(item.key, item.qty - 1));
            const value = el("output", "cart-qty_value", String(item.qty));
            value.setAttribute("aria-label", item.qty + (item.qty === 1 ? " box" : " boxes"));
            const plus = el("button", "cart-qty_button", "+");
            plus.type = "button";
            plus.setAttribute("aria-label", "One more " + title + " box");
            plus.disabled = item.qty >= M.cart.maxQty;
            plus.addEventListener("click", () => M.cart.setQty(item.key, item.qty + 1));
            wrap.append(minus, value, plus);
            return wrap;
        }

        function line(item) {
            const entry = M.catalog.plan(item.plan);
            const li = el("li", "cart-line");
            li.dataset.key = item.key;
            li.style.setProperty("--line-ink", PLAN_INK[item.plan] || "#1d2a3a");
            if (fresh === item.key) {
                li.classList.add("is-fresh");
            }

            const stamp = el("div", "cart-line_stamp");
            stamp.setAttribute("aria-hidden", "true");
            stamp.append(el("strong", "", entry.name.charAt(0)), el("small", "", entry.renews ? M.catalog.months(item.plan, item.term) + " mo" : item.term + " box"));

            const info = el("div", "cart-line_info");
            const heading = el("h3", "cart-line_title", titleFor(item));
            info.append(heading, el("p", "cart-line_note", PLAN_NOTES[item.plan] || entry.tagline));

            const tags = el("ul", "cart-line_tags");
            tags.setAttribute("aria-label", "Included");
            [entry.itemsPerBox + " local items a box", "Passport and city stamp", "Free shipping"].forEach((text) => tags.appendChild(el("li", "", text)));
            info.appendChild(tags);

            const field = el("div", "cart-line_term");
            const id = "cartTerm-" + item.key;
            const label = el("label", "", entry.renews ? "Billing" : "Boxes");
            label.htmlFor = id;
            const select = el("select");
            select.id = id;
            termOptions(item).forEach((option) => {
                const node = el("option", "", option.label);
                node.value = option.term;
                node.selected = option.term === item.term;
                select.appendChild(node);
            });
            select.addEventListener("change", () => changeTerm(item, select.value));
            field.append(label, select);
            info.appendChild(field);

            const saved = lineSavings(item);
            if (saved > 0) {
                info.appendChild(el("p", "cart-line_saving", "Saving " + M.money(saved) + (entry.renews ? " compared with paying monthly" : " compared with the 3-box rate")));
            }

            if (item.plan === "basic" && !M.cart.has("premium")) {
                const gap = M.catalog.price("premium", item.term) - M.catalog.price("basic", item.term);
                const nudge = el("button", "cart-line_upgrade");
                nudge.type = "button";
                nudge.append(el("strong", "", "Upgrade to Premium"), el("span", "", "3 more local items and a signature piece for " + M.money(gap) + " more a box"));
                nudge.addEventListener("click", () => upgrade(item));
                info.appendChild(nudge);
            }

            const side = el("div", "cart-line_side");
            const price = el("p", "cart-line_price", M.money(M.catalog.dueToday(item.plan, item.term) * item.qty));
            const per = el("p", "cart-line_per", entry.renews
                ? M.money(M.catalog.price(item.plan, item.term)) + " a box, " + ((M.catalog.data.billing[item.term] || {}).billed || "").toLowerCase()
                : "Prepaid, never auto-renews");
            const remove = el("button", "cart-text-button cart-line_remove", "Remove");
            remove.type = "button";
            remove.setAttribute("aria-label", "Remove " + titleFor(item));
            remove.addEventListener("click", () => {
                const snapshot = Object.assign({}, item);
                li.classList.add("is-leaving");
                window.setTimeout(() => {
                    M.cart.remove(snapshot.key);
                    showUndo(snapshot);
                    $("#cartItemsTitle").focus();
                }, reduceMotion ? 0 : 240);
            });
            side.append(price, per, stepper(item), remove);

            li.append(stamp, info, side);
            return li;
        }

        function renderLines() {
            const items = M.cart.items;
            lines.replaceChildren(...items.map(line));
            fresh = "";
            const count = M.cart.count();
            empty.hidden = items.length > 0;
            $("#cartClear").hidden = items.length === 0;
            $("#cartCount").textContent = count ? "(" + count + (count === 1 ? " box)" : " boxes)") : "";
        }

        function renderMore() {
            const list = $("#cartMore");
            list.replaceChildren();
            const plans = ["basic", "premium", "gift"].filter((plan) => M.catalog.plan(plan) && !M.cart.has(plan));
            $(".cart-more").hidden = plans.length === 0;
            $("#cartMoreLead").textContent = M.cart.items.length
                ? "Add a plan or send a gift."
                : "Switch or cancel anytime.";
            plans.forEach((plan) => {
                const entry = M.catalog.plan(plan);
                const term = entry.renews ? "monthly" : Object.keys(entry.prices)[0];
                const li = el("li", "cart-more_card");
                li.style.setProperty("--line-ink", PLAN_INK[plan]);
                const from = entry.renews ? M.money(Math.min(...Object.values(entry.prices).map(Number))) : M.money(M.catalog.price(plan, term));
                li.append(
                    el("h3", "", entry.name),
                    el("p", "cart-more_tagline", entry.tagline),
                    el("p", "cart-more_price", entry.renews ? "From " + from + " a box" : from + " for " + term + " boxes")
                );
                const button = el("button", "cart-button cart-button--small", "Add " + entry.name);
                button.type = "button";
                button.dataset.cartPlan = plan;
                button.dataset.cartTerm = term;
                li.appendChild(button);
                list.appendChild(li);
            });
        }

        function renderSummary() {
            const discount = M.cart.discount();
            const total = M.cart.total();
            const items = M.cart.items;
            $("#cartSubtotal").textContent = M.money(M.cart.subtotal());
            $("#cartTotal").textContent = M.money(total);
            $("#cartDiscountRow").hidden = !discount.amount;
            $("#cartDiscountLabel").textContent = discount.code ? "Code " + discount.code : "Promo";
            $("#cartDiscount").textContent = "−" + M.money(discount.amount);

            const saved = items.reduce((sum, item) => sum + lineSavings(item), 0);
            const savedNote = $("#cartSaved");
            savedNote.hidden = saved <= 0 && !discount.amount;
            savedNote.textContent = "You're saving " + M.money(Math.round((saved + discount.amount) * 100) / 100) + " on this order.";

            $("#cartPromoForm").hidden = Boolean(discount.code);
            const applied = $("#cartPromoApplied");
            applied.hidden = !discount.code;
            applied.classList.toggle("is-waiting", Boolean(discount.code && !discount.amount));
            $("#cartPromoCode").textContent = discount.code;
            $("#cartPromoLabel").textContent = discount.amount ? discount.label + ". You save " + M.money(discount.amount) + "." : discount.note;

            const reward = M.catalog.reward();
            const left = Math.max(0, reward.threshold - total);
            const box = $("#cartReward");
            box.classList.toggle("is-unlocked", items.length > 0 && left === 0);
            $("#cartRewardText").textContent = !items.length
                ? "Spend " + M.money(reward.threshold) + " and we'll add " + reward.label + "."
                : left === 0
                    ? "You unlocked " + reward.label + "! It ships with your first box."
                    : "You're " + M.money(left) + " away from " + reward.label + ".";
            $("#cartRewardFill").style.width = Math.min(100, (total / reward.threshold) * 100) + "%";

            const checkout = $("#cartCheckout");
            checkout.disabled = items.length === 0;
            $("#cartRenewNote").textContent = !items.length
                ? "Add a plan to check out."
                : items.some((item) => M.catalog.plan(item.plan).renews)
                    ? "Renews at the same price. Cancel anytime. No charge until launch."
                    : "Gifts are prepaid and never renew. No charge until launch.";
        }

        function render() {
            renderLines();
            renderMore();
            renderSummary();
        }

        function stamp() {
            const code = $("#cartPromoCode");
            if (reduceMotion) {
                return;
            }
            code.classList.remove("is-slammed");
            void code.offsetWidth;
            code.classList.add("is-slammed");
        }

        function apply(code) {
            const result = M.cart.applyPromo(code);
            message.textContent = result.message;
            message.classList.toggle("is-error", !result.ok);
            message.classList.toggle("is-quiet", result.ok);
            if (result.ok) {
                stamp();
                $("#cartPromoRemove").focus();
            }
            return result;
        }

        $("#cartPromoForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const input = $("#cartPromoInput");
            if (!input.value.trim()) {
                message.textContent = "Type a code first.";
                message.classList.add("is-error");
                input.setAttribute("aria-invalid", "true");
                input.focus();
                return;
            }
            const result = apply(input.value);
            input.setAttribute("aria-invalid", String(!result.ok));
            if (result.ok) {
                input.value = "";
            } else {
                input.focus();
            }
        });

        $("#cartPromoInput").addEventListener("input", (event) => {
            event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
            event.target.removeAttribute("aria-invalid");
            message.textContent = "";
            message.classList.remove("is-error", "is-quiet");
        });

        $$(".cart-chip").forEach((chip) => chip.addEventListener("click", () => apply(chip.dataset.code)));

        $("#cartPromoRemove").addEventListener("click", () => {
            const code = M.cart.discount().code;
            M.cart.removePromo();
            message.classList.remove("is-error", "is-quiet");
            message.textContent = code + " removed.";
            $("#cartPromoInput").focus();
        });

        $("#cartClear").addEventListener("click", () => {
            const items = M.cart.items.slice();
            if (!items.length) {
                return;
            }
            items.forEach((item) => M.cart.remove(item.key));
            undoItem = null;
            const count = items.length;
            $("#cartUndoText").textContent = count + (count === 1 ? " plan was" : " plans were") + " removed.";
            undoBox.hidden = false;
            const restoreAll = () => {
                items.forEach((item) => {
                    const added = M.cart.add(item.plan, item.term);
                    if (added) {
                        M.cart.setQty(added.key, Math.min(M.cart.maxQty, added.qty - 1 + item.qty));
                    }
                });
            };
            undoItem = null;
            const button = $("#cartUndoButton");
            const once = () => {
                button.removeEventListener("click", once);
                undoBox.hidden = true;
                restoreAll();
            };
            button.addEventListener("click", once);
            window.clearTimeout(undoTimer);
            undoTimer = window.setTimeout(() => {
                button.removeEventListener("click", once);
                undoBox.hidden = true;
            }, 8000);
            $("#cartItemsTitle").focus();
        });

        $("#cartCheckout").addEventListener("click", () => {
            if (!M.cart.items.length || !M.shop || !M.shop.openCheckout) {
                return;
            }
            setStep(1);
            M.shop.openCheckout();
        });

        const drawer = $("#shopCart");
        if (drawer) {
            drawer.addEventListener("close", () => {
                if (!$("#cartDone").hidden) {
                    return;
                }
                setStep(0);
            });
        }

        document.addEventListener("marlowby:cart", (event) => {
            const detail = event.detail || {};
            if (detail.item && /add|more|switch/.test(detail.reason)) {
                fresh = detail.item.key;
                $("#cartDone").hidden = true;
                setStep(0);
            }
            render();
        });

        document.addEventListener("marlowby:catalog", render);

        document.addEventListener("marlowby:purchase", (event) => {
            const detail = event.detail || {};
            const first = String(detail.name || "").split(/\s+/)[0] || "traveler";
            $("#cartDoneText").textContent = "Thanks, " + first + ". Order " + detail.order + " is reserved. We'll email " + detail.email + " before it ships.";
            $("#cartDone").hidden = false;
            setStep(2);
        });

        $$("#cartItemsTitle").forEach((heading) => heading.setAttribute("tabindex", "-1"));
        render();
        if (window.location.hash === "#checkout" && M.cart.items.length) {
            window.setTimeout(() => $("#cartCheckout").click(), 300);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

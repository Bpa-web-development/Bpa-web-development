(function () {
    "use strict";

    const M = window.Marlowby;
    if (!M) {
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const CART_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6"/></svg>';
    const LOCK_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

    const TEMPLATE = `
<dialog class="shop-drawer" id="shopCart" aria-labelledby="shopCartTitle">
    <div class="shop-drawer_head">
        <div>
            <p class="shop-eyebrow">Your suitcase</p>
            <h2 id="shopCartTitle" tabindex="-1">Cart <span class="shop-drawer_count" id="shopCartCount"></span></h2>
        </div>
        <button type="button" class="shop-close" data-shop-close aria-label="Close cart">&times;</button>
    </div>

    <div class="shop-view" data-view="cart">
        <div class="shop-drawer_body">
            <div class="shop-reward" id="shopReward">
                <p class="shop-reward_text" id="shopRewardText"></p>
                <div class="shop-reward_track" aria-hidden="true"><span class="shop-reward_fill" id="shopRewardFill"></span></div>
            </div>
            <ul class="shop-lines" id="shopLines"></ul>
            <div class="shop-empty" id="shopEmpty">
                <svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="22" width="92" height="60" rx="10"/><path d="M44 22v-8a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v8"/><path d="M14 46h92"/><circle cx="84" cy="62" r="11"/><path d="M78 62h12M84 56v12"/></svg>
                <h3>Your suitcase is empty</h3>
                <p>Pick a plan and your first city stamp is on its way.</p>
                <a class="shop-button shop-button--ghost" href="/html/SubscriptionPlans.html#plans" data-shop-close>Browse plans</a>
            </div>
        </div>
        <div class="shop-drawer_foot" id="shopCartFoot">
            <form class="shop-promo" id="shopPromoForm" novalidate>
                <label for="shopPromoInput">Promo code</label>
                <div class="shop-promo_row">
                    <input type="text" id="shopPromoInput" name="promo" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="Try BURLINGTON15">
                    <button type="submit" class="shop-promo_apply">Apply</button>
                </div>
            </form>
            <div class="shop-promo_applied" id="shopPromoApplied" hidden>
                <span class="shop-promo_stamp" id="shopPromoCode"></span>
                <p class="shop-promo_label" id="shopPromoLabel"></p>
                <button type="button" class="shop-line_remove" id="shopPromoRemove">Remove</button>
            </div>
            <p class="shop-promo_msg" id="shopPromoMsg" role="status"></p>
            <dl class="shop-totals">
                <div><dt>Subtotal</dt><dd id="shopSubtotal">$0</dd></div>
                <div class="shop-totals_discount" id="shopDiscountRow" hidden><dt id="shopDiscountLabel">Discount</dt><dd id="shopDiscount">$0</dd></div>
                <div><dt>Shipping</dt><dd>Free</dd></div>
                <div class="shop-totals_due"><dt>Due today</dt><dd id="shopTotal">$0</dd></div>
            </dl>
            <p class="shop-fine" id="shopRenewNote"></p>
            <button type="button" class="shop-button" id="shopToCheckout">Check out</button>
            <p class="shop-account-hint" id="shopAccountHint"></p>
        </div>
    </div>

    <div class="shop-view" data-view="checkout" hidden>
        <form class="shop-drawer_body" id="shopCheckoutForm" novalidate>
            <button type="button" class="shop-back" id="shopBack">Back to cart</button>
            <h3 class="shop-step-title" id="shopCheckoutTitle" tabindex="-1">Where should we send it?</h3>
            <ul class="shop-summary" id="shopSummary"></ul>
            <div class="shop-field">
                <label for="shopName">Full name</label>
                <input type="text" id="shopName" name="name" autocomplete="name" required>
                <p class="shop-field_error" id="shopNameError"></p>
            </div>
            <div class="shop-field">
                <label for="shopEmail">Email</label>
                <input type="email" id="shopEmail" name="email" autocomplete="email" required>
                <p class="shop-field_error" id="shopEmailError"></p>
            </div>
            <div class="shop-field">
                <label for="shopZip">ZIP code</label>
                <input type="text" id="shopZip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" required>
                <p class="shop-field_error" id="shopZipError"></p>
            </div>
            <div class="shop-field" id="shopNoteField" hidden>
                <label for="shopNote">Gift note <span class="shop-field_hint">(optional)</span></label>
                <textarea id="shopNote" name="note" rows="3" maxlength="200"></textarea>
            </div>
            <div class="shop-save" id="shopSave"></div>
        </form>
        <div class="shop-drawer_foot">
            <dl class="shop-totals">
                <div class="shop-totals_discount" id="shopCheckoutDiscountRow" hidden><dt>You save</dt><dd id="shopCheckoutDiscount">$0</dd></div>
                <div class="shop-totals_due"><dt>Due today</dt><dd id="shopCheckoutTotal">$0</dd></div>
            </dl>
            <button type="submit" class="shop-button" form="shopCheckoutForm" id="shopPlaceOrder">Place my order</button>
            <p class="shop-fine">You won't be charged until launch. Cancel anytime.</p>
        </div>
    </div>

    <div class="shop-view shop-done" data-view="done" hidden>
        <div class="shop-drawer_body">
            <svg class="shop-done_check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27 l8 8 l15 -17"/></svg>
            <h3 id="shopDoneTitle" tabindex="-1">Your passport is stamped!</h3>
            <p id="shopDoneMessage"></p>
            <p class="shop-done_order">Order <strong id="shopOrderNumber"></strong></p>
            <p class="shop-done_saved" id="shopDoneSaved"></p>
            <button type="button" class="shop-button" data-shop-close>Keep exploring</button>
        </div>
    </div>
</dialog>

<dialog class="shop-modal" id="shopAccount" aria-labelledby="shopAccountTitle">
    <button type="button" class="shop-close" data-shop-close aria-label="Close account">&times;</button>

    <div data-account-view="auth">
        <p class="shop-eyebrow">Marlowby account</p>
        <h2 id="shopAccountTitle" tabindex="-1">Welcome back</h2>
        <div class="shop-switch" role="group" aria-label="Account options">
            <button type="button" class="shop-switch_option" data-mode="signin" aria-pressed="true">Sign in</button>
            <button type="button" class="shop-switch_option" data-mode="signup" aria-pressed="false">Create account</button>
        </div>
        <form id="shopAuthForm" novalidate>
            <div class="shop-field" id="shopAuthNameField" hidden>
                <label for="shopAuthName">Full name</label>
                <input type="text" id="shopAuthName" name="name" autocomplete="name">
                <p class="shop-field_error" id="shopAuthNameError"></p>
            </div>
            <div class="shop-field">
                <label for="shopAuthEmail">Email</label>
                <input type="email" id="shopAuthEmail" name="email" autocomplete="username" required>
                <p class="shop-field_error" id="shopAuthEmailError"></p>
            </div>
            <div class="shop-field">
                <label for="shopAuthPassword">Password</label>
                <div class="shop-password">
                    <input type="password" id="shopAuthPassword" name="password" autocomplete="current-password" required>
                    <button type="button" class="shop-password_toggle" id="shopShowPassword" aria-pressed="false" aria-controls="shopAuthPassword">Show</button>
                </div>
                <p class="shop-field_error" id="shopAuthPasswordError"></p>
                <div class="shop-strength" id="shopStrength" hidden>
                    <div class="shop-strength_bars" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
                    <p class="shop-strength_label" id="shopStrengthLabel">At least 8 characters with a letter and a number.</p>
                </div>
            </div>
            <p class="shop-form-error" id="shopAuthError" role="alert"></p>
            <button type="submit" class="shop-button shop-button--wide" id="shopAuthSubmit">Sign in</button>
        </form>
        <p class="shop-secure">${LOCK_ICON}<span>Your email and profile are encrypted on this device with AES-256. Your password is never saved, only a salted PBKDF2 check.</span></p>
    </div>

    <div data-account-view="profile" hidden>
        <div class="shop-profile">
            <span class="shop-avatar" id="shopAvatar" aria-hidden="true"></span>
            <div>
                <p class="shop-eyebrow">Signed in</p>
                <h2 id="shopProfileName" tabindex="-1">Your account</h2>
                <p class="shop-profile_email" id="shopProfileEmail"></p>
            </div>
        </div>
        <p class="shop-profile_since" id="shopProfileSince"></p>
        <h3 class="shop-step-title">Your subscriptions</h3>
        <ul class="shop-subs" id="shopSubs"></ul>
        <p class="shop-subs_empty" id="shopSubsEmpty">No subscriptions yet. Anything you check out while signed in lands here.</p>
        <details class="shop-vault">
            <summary>${LOCK_ICON}<span>See what's actually saved on this device</span></summary>
            <p>This is the raw record in localStorage. Your email, name and subscriptions only exist inside the encrypted data.</p>
            <pre id="shopVault"></pre>
        </details>
        <div class="shop-profile_actions">
            <button type="button" class="shop-button" id="shopSignOut">Sign out</button>
            <button type="button" class="shop-button shop-button--danger" id="shopDeleteStart">Delete account</button>
        </div>
        <form class="shop-delete" id="shopDeleteForm" novalidate hidden>
            <p>This removes your account and its subscriptions from this device. Enter your password to confirm.</p>
            <div class="shop-field">
                <label for="shopDeletePassword">Password</label>
                <input type="password" id="shopDeletePassword" autocomplete="current-password">
                <p class="shop-field_error" id="shopDeletePasswordError"></p>
            </div>
            <div class="shop-profile_actions">
                <button type="submit" class="shop-button shop-button--danger">Delete for good</button>
                <button type="button" class="shop-button shop-button--ghost" id="shopDeleteCancel">Keep my account</button>
            </div>
        </form>
    </div>
</dialog>

<div class="shop-toast" id="shopToast" hidden>
    <p id="shopToastText"></p>
    <button type="button" class="shop-toast_button" id="shopToastView">View cart</button>
</div>
<p class="shop-sr" id="shopLive" aria-live="polite"></p>`;

    const PLAN_INK = { basic: "#4a6650", premium: "#1d2a3a", gift: "#b0491f" };

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

    function formatDate(iso) {
        return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    function lineDetail(item) {
        const entry = M.catalog.plan(item.plan);
        const price = M.catalog.price(item.plan, item.term);
        if (!entry.renews) {
            return M.money(price) + " prepaid, never auto-renews";
        }
        const months = M.catalog.months(item.plan, item.term);
        const billing = M.catalog.data.billing[item.term] || {};
        return M.money(price) + " a box, " + (billing.billed || "").toLowerCase() + (months > 1 ? " (" + M.money(price * months) + ")" : "");
    }

    function lineTitle(item) {
        const entry = M.catalog.plan(item.plan);
        return entry.name + (entry.renews ? " plan, " + M.catalog.termLabel(item.plan, item.term) : " box");
    }

    function init() {
        const host = document.createElement("div");
        host.className = "shop-root";
        host.innerHTML = TEMPLATE;
        document.body.appendChild(host);

        const drawer = $("#shopCart");
        const modal = $("#shopAccount");
        const live = $("#shopLive");
        const toast = $("#shopToast");
        const views = $$(".shop-view", drawer);
        let toastTimer = 0;
        let lastCount = M.cart.count();

        function announce(message) {
            live.textContent = "";
            window.setTimeout(() => (live.textContent = message), 30);
        }

        function showView(name) {
            views.forEach((view) => (view.hidden = view.dataset.view !== name));
            drawer.dataset.view = name;
        }

        function openDialog(dialog) {
            if (!dialog.open) {
                dialog.showModal();
            }
        }

        function closeDialog(dialog) {
            if (dialog.open) {
                dialog.classList.add("is-closing");
                const finish = () => {
                    dialog.classList.remove("is-closing");
                    dialog.close();
                };
                if (reduceMotion) {
                    finish();
                } else {
                    window.setTimeout(finish, 220);
                }
            }
        }

        [drawer, modal].forEach((dialog) => {
            dialog.addEventListener("click", (event) => {
                if (event.target === dialog || event.target.closest("[data-shop-close]")) {
                    closeDialog(dialog);
                }
            });
            dialog.addEventListener("cancel", (event) => {
                event.preventDefault();
                closeDialog(dialog);
            });
        });

        drawer.addEventListener("close", () => {
            if (drawer.dataset.view === "done") {
                showView("cart");
            }
        });

        const navCarts = $$(".navbar-cart");
        const container = $(".navbar-container");
        const toggle = $("#navbarToggle");
        if (container) {
            const mobileCart = el("button", "shop-mobile-cart");
            mobileCart.type = "button";
            mobileCart.innerHTML = CART_ICON;
            if (toggle && toggle.parentNode === container) {
                container.insertBefore(mobileCart, toggle);
            } else {
                container.appendChild(mobileCart);
            }
            navCarts.push(mobileCart);
        }

        navCarts.forEach((link) => {
            link.classList.add("shop-cart-trigger");
            link.appendChild(el("span", "shop-badge"));
            link.lastChild.setAttribute("aria-hidden", "true");
            link.addEventListener("click", (event) => {
                event.preventDefault();
                openCart();
            });
        });

        function renderBadges() {
            const count = M.cart.count();
            navCarts.forEach((link) => {
                const badge = $(".shop-badge", link);
                badge.textContent = count > 9 ? "9+" : String(count);
                badge.hidden = count === 0;
                link.setAttribute("aria-label", count ? "Cart, " + count + (count === 1 ? " item" : " items") : "Cart, empty");
                if (count !== lastCount && !reduceMotion) {
                    badge.classList.remove("is-bumped");
                    void badge.offsetWidth;
                    badge.classList.add("is-bumped");
                }
            });
            lastCount = count;
        }

        function stepper(item) {
            const wrap = el("div", "shop-qty");
            const title = lineTitle(item);
            const minus = el("button", "shop-qty_button", "−");
            minus.type = "button";
            minus.setAttribute("aria-label", item.qty === 1 ? "Remove " + title : "One fewer " + title + " box");
            minus.addEventListener("click", () => M.cart.setQty(item.key, item.qty - 1));
            const value = el("span", "shop-qty_value", String(item.qty));
            value.setAttribute("aria-label", item.qty + (item.qty === 1 ? " box" : " boxes"));
            const plus = el("button", "shop-qty_button", "+");
            plus.type = "button";
            plus.setAttribute("aria-label", "One more " + title + " box");
            plus.disabled = item.qty >= M.cart.maxQty;
            plus.addEventListener("click", () => M.cart.setQty(item.key, item.qty + 1));
            wrap.append(minus, value, plus);
            return wrap;
        }

        function renderCart(detail) {
            const items = M.cart.items;
            const lines = $("#shopLines");
            const count = M.cart.count();
            lines.replaceChildren();
            items.forEach((item) => {
                const entry = M.catalog.plan(item.plan);
                const li = el("li", "shop-line");
                li.dataset.key = item.key;
                li.style.setProperty("--shop-line-ink", PLAN_INK[item.plan] || "#1d2a3a");
                if (detail && detail.item === item && /add|more|switch/.test(detail.reason)) {
                    li.classList.add("is-fresh");
                }
                const stamp = el("span", "shop-line_stamp");
                stamp.setAttribute("aria-hidden", "true");
                stamp.append(el("strong", "", entry.name.charAt(0)), el("small", "", M.catalog.months(item.plan, item.term) + " mo"));
                const info = el("div", "shop-line_info");
                const heading = el("h3", "shop-line_title", entry.name + (entry.renews ? " plan" : " box"));
                heading.append(el("span", "shop-line_term", entry.renews ? M.catalog.termLabel(item.plan, item.term) : item.term + " boxes"));
                info.append(heading, el("p", "shop-line_detail", lineDetail(item)));
                const tags = el("p", "shop-line_tags");
                tags.append(el("span", "", "Passport + city stamp"), el("span", "", entry.itemsPerBox + " items a box"));
                info.append(tags);
                const side = el("div", "shop-line_side");
                const remove = el("button", "shop-line_remove", "Remove");
                remove.type = "button";
                remove.setAttribute("aria-label", "Remove " + lineTitle(item));
                remove.addEventListener("click", () => {
                    li.classList.add("is-leaving");
                    window.setTimeout(() => M.cart.remove(item.key), reduceMotion ? 0 : 220);
                });
                side.append(el("p", "shop-line_price", M.money(M.catalog.dueToday(item.plan, item.term) * item.qty)), stepper(item), remove);
                li.append(stamp, info, side);
                lines.appendChild(li);
            });
            $("#shopEmpty").hidden = items.length > 0;
            $("#shopCartFoot").hidden = items.length === 0;
            $("#shopCartCount").textContent = count ? "(" + count + ")" : "";
            renderPromo();
            $("#shopRenewNote").textContent = items.some((item) => M.catalog.plan(item.plan).renews)
                ? "Plans renew automatically at the same price. Skip, switch or cancel anytime."
                : "Gift boxes are prepaid and never auto-renew.";
            if (!items.length && drawer.dataset.view === "checkout") {
                showView("cart");
            }
            renderSummary();
            renderBadges();
        }

        function renderPromo() {
            const discount = M.cart.discount();
            const total = M.cart.total();
            $("#shopSubtotal").textContent = M.money(M.cart.subtotal());
            $("#shopTotal").textContent = M.money(total);
            $("#shopCheckoutTotal").textContent = M.money(total);
            $("#shopDiscountRow").hidden = !discount.amount;
            $("#shopCheckoutDiscountRow").hidden = !discount.amount;
            $("#shopDiscountLabel").textContent = discount.code ? "Code " + discount.code : "Discount";
            $("#shopDiscount").textContent = "\u2212" + M.money(discount.amount);
            $("#shopCheckoutDiscount").textContent = "\u2212" + M.money(discount.amount);
            $("#shopPromoForm").hidden = Boolean(discount.code);
            $("#shopPromoApplied").hidden = !discount.code;
            $("#shopPromoApplied").classList.toggle("is-waiting", Boolean(discount.code && !discount.amount));
            $("#shopPromoCode").textContent = discount.code;
            $("#shopPromoLabel").textContent = discount.amount ? discount.label + ". You save " + M.money(discount.amount) + "." : discount.note;
            const reward = M.catalog.reward();
            const left = Math.max(0, reward.threshold - total);
            const box = $("#shopReward");
            box.classList.toggle("is-unlocked", left === 0);
            $("#shopRewardText").textContent = left === 0 ? "You unlocked " + reward.label + "! It ships with your first box." : "You're " + M.money(left) + " away from " + reward.label + ".";
            $("#shopRewardFill").style.width = Math.min(100, (total / reward.threshold) * 100) + "%";
        }

        function applyPromo(code, quiet) {
            const result = M.cart.applyPromo(code);
            const message = $("#shopPromoMsg");
            message.textContent = result.ok ? "" : result.message;
            message.classList.toggle("is-error", !result.ok);
            if (result.ok) {
                announce(result.message);
                if (!quiet && !drawer.open) {
                    showToast(result.message);
                }
                const stamp = $("#shopPromoCode");
                stamp.classList.remove("is-slammed");
                void stamp.offsetWidth;
                stamp.classList.add("is-slammed");
            }
            return result;
        }

        $("#shopPromoForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const input = $("#shopPromoInput");
            if (!input.value.trim()) {
                $("#shopPromoMsg").textContent = "Type a code first.";
                $("#shopPromoMsg").classList.add("is-error");
                input.focus();
                return;
            }
            const result = applyPromo(input.value, true);
            if (result.ok) {
                input.value = "";
                $("#shopPromoRemove").focus();
            } else {
                input.focus();
            }
        });

        $("#shopPromoInput").addEventListener("input", (event) => {
            event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
            $("#shopPromoMsg").textContent = "";
        });

        $("#shopPromoRemove").addEventListener("click", () => {
            const code = M.cart.discount().code;
            M.cart.removePromo();
            announce(code + " removed.");
            $("#shopPromoInput").focus();
        });

        function renderSummary() {
            const summary = $("#shopSummary");
            summary.replaceChildren();
            M.cart.items.forEach((item) => {
                const li = el("li");
                li.append(el("span", "", (item.qty > 1 ? item.qty + " × " : "") + lineTitle(item)), el("strong", "", M.money(M.catalog.dueToday(item.plan, item.term) * item.qty)));
                summary.appendChild(li);
            });
            const discount = M.cart.discount();
            if (discount.amount) {
                const li = el("li", "shop-summary_discount");
                li.append(el("span", "", "Code " + discount.code), el("strong", "", "\u2212" + M.money(discount.amount)));
                summary.appendChild(li);
            }
            $("#shopNoteField").hidden = !M.cart.has("gift");
        }

        function renderAccountBits() {
            const user = M.account.publicUser();
            const hint = $("#shopAccountHint");
            hint.replaceChildren();
            const save = $("#shopSave");
            save.replaceChildren();
            if (user) {
                hint.textContent = "Signed in as " + user.firstName + ". Your subscriptions save to your account.";
                save.className = "shop-save is-signed-in";
                save.innerHTML = LOCK_ICON;
                save.appendChild(el("span", "", "This order saves to " + user.firstName + "'s encrypted account."));
            } else {
                hint.append(document.createTextNode("Have an account? "));
                const button = el("button", "shop-link", "Sign in");
                button.type = "button";
                button.addEventListener("click", () => openAccount("signin"));
                hint.append(button, document.createTextNode(" to save your subscriptions."));
                save.className = "shop-save";
                save.innerHTML = LOCK_ICON;
                const text = el("span", "", "Checking out as a guest. ");
                const link = el("button", "shop-link", "Sign in or create an account");
                link.type = "button";
                link.addEventListener("click", () => openAccount("signup"));
                text.append(link, document.createTextNode(" to keep this order."));
                save.appendChild(text);
            }
            $$(".navbar-sign-in, a[href$='sign-in.html']").forEach((link) => {
                const isNav = link.classList.contains("navbar-sign-in");
                if (!link.dataset.shopLabel) {
                    link.dataset.shopLabel = link.textContent.trim();
                }
                if (user) {
                    link.replaceChildren();
                    if (isNav) {
                        const avatar = el("span", "shop-nav-avatar", initials(user.name));
                        avatar.setAttribute("aria-hidden", "true");
                        link.append(avatar);
                    }
                    link.append(document.createTextNode(isNav ? user.firstName : "My Account"));
                    link.setAttribute("aria-label", "Account for " + user.name);
                } else {
                    link.textContent = link.dataset.shopLabel;
                    link.removeAttribute("aria-label");
                }
                link.classList.toggle("is-signed-in", Boolean(user));
            });
        }

        function initials(name) {
            return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
        }

        function showToast(message) {
            $("#shopToastText").textContent = message;
            toast.hidden = false;
            toast.classList.remove("is-showing");
            void toast.offsetWidth;
            toast.classList.add("is-showing");
            window.clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => {
                toast.classList.remove("is-showing");
                window.setTimeout(() => (toast.hidden = true), 300);
            }, 4200);
        }

        $("#shopToastView").addEventListener("click", () => {
            toast.hidden = true;
            openCart();
        });

        function cartMessage(detail) {
            if (!detail.item) {
                return "";
            }
            const title = lineTitle(detail.item);
            const map = {
                add: title + " added to your cart.",
                more: "Another " + title + " box added. You have " + detail.item.qty + ".",
                switch: "Switched your " + M.catalog.plan(detail.item.plan).name + " plan to " + M.catalog.termLabel(detail.item.plan, detail.item.term) + ".",
                max: "You can ship up to " + M.cart.maxQty + " " + title + " boxes at once.",
                remove: title + " removed from your cart."
            };
            return map[detail.reason] || "";
        }

        document.addEventListener("marlowby:cart", (event) => {
            renderCart(event.detail);
            const message = cartMessage(event.detail);
            if (message) {
                announce(message + " Cart has " + event.detail.count + (event.detail.count === 1 ? " item." : " items."));
                if (/add|more|switch|max/.test(event.detail.reason) && !drawer.open) {
                    showToast(message);
                }
            }
        });

        document.addEventListener("marlowby:catalog", () => renderCart());

        function flyFrom(source) {
            const visible = navCarts.find((link) => link.offsetParent !== null && link.getBoundingClientRect().width > 0);
            if (!source || !visible || reduceMotion || !source.getBoundingClientRect) {
                return;
            }
            const from = source.getBoundingClientRect();
            const to = visible.getBoundingClientRect();
            const ghost = el("span", "shop-fly");
            ghost.setAttribute("aria-hidden", "true");
            ghost.innerHTML = '<svg viewBox="0 0 40 40"><rect x="6" y="12" width="28" height="22" rx="3"/><path d="M6 19h28M20 12v22"/></svg>';
            const startX = from.left + from.width / 2 - 20;
            const startY = from.top + from.height / 2 - 20;
            const endX = to.left + to.width / 2 - 20;
            const endY = to.top + to.height / 2 - 20;
            ghost.style.left = startX + "px";
            ghost.style.top = startY + "px";
            document.body.appendChild(ghost);
            const dx = endX - startX;
            const dy = endY - startY;
            const animation = ghost.animate([
                { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
                { transform: "translate(" + dx * 0.45 + "px, " + (dy * 0.2 - 120) + "px) scale(1.15) rotate(-14deg)", opacity: 1, offset: 0.45 },
                { transform: "translate(" + dx + "px, " + dy + "px) scale(0.35) rotate(10deg)", opacity: 0.4 }
            ], { duration: 820, easing: "cubic-bezier(0.45, 0, 0.25, 1)" });
            animation.onfinish = () => {
                ghost.remove();
                visible.classList.remove("is-caught");
                void visible.offsetWidth;
                visible.classList.add("is-caught");
            };
        }

        function openCart() {
            const nav = $(".navbar.is-open");
            if (nav && toggle) {
                toggle.click();
            }
            toast.hidden = true;
            if (drawer.dataset.view !== "checkout" || !M.cart.items.length) {
                showView("cart");
            }
            renderCart();
            openDialog(drawer);
            $("#shopCartTitle").focus();
        }

        const rules = {
            shopName: (value) => (value.trim().length >= 2 ? "" : "Please enter your name."),
            shopEmail: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? "" : "Please enter a valid email address."),
            shopZip: (value) => (/^\d{5}$/.test(value.trim()) ? "" : "Please enter a 5-digit ZIP code."),
            shopAuthName: (value) => (value.trim().length >= 2 ? "" : "Please enter your name."),
            shopAuthEmail: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? "" : "Please enter a valid email address."),
            shopAuthPassword: (value) => (authMode === "signup" ? M.account.checkPassword(value) : value ? "" : "Please enter your password."),
            shopDeletePassword: (value) => (value ? "" : "Please enter your password.")
        };

        function setError(input, message) {
            const field = input.closest(".shop-field");
            const error = $("#" + input.id + "Error");
            field.classList.toggle("has-error", Boolean(message));
            error.textContent = message;
            input.setAttribute("aria-invalid", String(Boolean(message)));
            if (message) {
                input.setAttribute("aria-describedby", error.id);
            } else {
                input.removeAttribute("aria-describedby");
            }
            return !message;
        }

        function validate(input) {
            return setError(input, rules[input.id](input.value));
        }

        function validateAll(ids) {
            const inputs = ids.map((id) => document.getElementById(id));
            const valid = inputs.map(validate).every(Boolean);
            if (!valid) {
                inputs.find((input) => input.getAttribute("aria-invalid") === "true").focus();
            }
            return valid;
        }

        Object.keys(rules).forEach((id) => {
            const input = document.getElementById(id);
            input.addEventListener("blur", () => input.value && validate(input));
            input.addEventListener("input", () => input.closest(".has-error") && validate(input));
        });

        $("#shopZip").addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/\D/g, "").slice(0, 5);
        });

        function prefillCheckout() {
            const user = M.account.publicUser();
            let passportName = "";
            try {
                passportName = (JSON.parse(localStorage.getItem("marlowbyPassport") || "{}") || {}).name || "";
            } catch (error) {
            }
            const name = $("#shopName");
            const email = $("#shopEmail");
            const zip = $("#shopZip");
            if (user) {
                name.value = name.value || user.name;
                email.value = user.email;
                zip.value = zip.value || user.zip;
            } else if (!name.value && passportName) {
                name.value = passportName;
            }
        }

        $("#shopToCheckout").addEventListener("click", () => {
            showView("checkout");
            prefillCheckout();
            renderSummary();
            $("#shopCheckoutTitle").focus();
        });

        $("#shopBack").addEventListener("click", () => {
            showView("cart");
            $("#shopCartTitle").focus();
        });

        $("#shopCheckoutForm").addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!M.cart.items.length || !validateAll(["shopName", "shopEmail", "shopZip"])) {
                return;
            }
            const button = $("#shopPlaceOrder");
            button.disabled = true;
            const lines = M.cart.items.map((item) => Object.assign({}, item));
            const order = M.orderNumber();
            const discount = M.cart.discount();
            const total = M.cart.total();
            const name = $("#shopName").value.trim();
            const email = $("#shopEmail").value.trim();
            const zip = $("#shopZip").value.trim();
            let saved = false;
            if (M.account.user) {
                try {
                    await M.account.addSubscriptions(lines, { order, zip, promo: discount.amount ? discount.code : "" });
                    saved = true;
                } catch (error) {
                }
            }
            try {
                localStorage.setItem("marlowbyPlan", JSON.stringify({ plan: lines[0].plan, billing: lines[0].term, order }));
            } catch (error) {
            }
            const firstName = name.split(/\s+/)[0];
            const names = lines.map((item) => M.catalog.plan(item.plan).name);
            const unique = names.filter((value, index) => names.indexOf(value) === index);
            $("#shopDoneMessage").textContent = "Thanks, " + firstName + ". Your " + (unique.length > 1 ? unique.slice(0, -1).join(", ") + " and " + unique[unique.length - 1] : unique[0]) + (lines.length > 1 ? " boxes are" : " box is") +
                " reserved and your Marlowby passport just got its member stamp." + (discount.amount ? " You saved " + M.money(discount.amount) + " with " + discount.code + "." : "") +
                (total >= M.catalog.reward().threshold ? " " + M.catalog.reward().label.charAt(0).toUpperCase() + M.catalog.reward().label.slice(1) + " is coming too." : "") + " We'll email " + email + " before it ships.";
            $("#shopOrderNumber").textContent = order;
            $("#shopDoneSaved").textContent = saved ? "Saved to your encrypted account." : "Create an account next time to keep your orders in one place.";
            M.cart.clear();
            showView("done");
            $("#shopCheckoutForm").reset();
            button.disabled = false;
            $("#shopDoneTitle").focus();
            announce("Order " + order + " placed. " + M.money(total) + " due at launch.");
            document.dispatchEvent(new CustomEvent("marlowby:purchase", { detail: { lines, order, name, email, total, saved, promo: discount.code, discount: discount.amount } }));
        });

        let authMode = "signin";

        function setAuthMode(mode) {
            authMode = mode;
            $$(".shop-switch_option", modal).forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
            const signup = mode === "signup";
            $("#shopAuthNameField").hidden = !signup;
            $("#shopStrength").hidden = !signup;
            $("#shopAccountTitle").textContent = signup ? "Get your passport" : "Welcome back";
            $("#shopAuthSubmit").textContent = signup ? "Create my account" : "Sign in";
            $("#shopAuthPassword").setAttribute("autocomplete", signup ? "new-password" : "current-password");
            $("#shopAuthError").textContent = "";
            ["shopAuthName", "shopAuthEmail", "shopAuthPassword"].forEach((id) => setError(document.getElementById(id), ""));
        }

        $$(".shop-switch_option", modal).forEach((button) => {
            button.addEventListener("click", () => setAuthMode(button.dataset.mode));
        });

        $("#shopShowPassword").addEventListener("click", (event) => {
            const input = $("#shopAuthPassword");
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            event.currentTarget.setAttribute("aria-pressed", String(show));
            event.currentTarget.textContent = show ? "Hide" : "Show";
        });

        const STRENGTH = ["Too short", "Weak", "Okay", "Strong", "Excellent"];
        $("#shopAuthPassword").addEventListener("input", (event) => {
            const value = event.target.value;
            const score = value ? Math.max(M.account.checkPassword(value) ? 0 : 1, M.account.passwordStrength(value)) : 0;
            $("#shopStrength").dataset.score = value ? String(score) : "";
            $("#shopStrengthLabel").textContent = value ? STRENGTH[score] + (M.account.checkPassword(value) ? ". " + M.account.checkPassword(value) : "") : "At least 8 characters with a letter and a number.";
        });

        function renderProfile() {
            const user = M.account.publicUser();
            $("[data-account-view='auth']", modal).hidden = Boolean(user);
            $("[data-account-view='profile']", modal).hidden = !user;
            modal.setAttribute("aria-labelledby", user ? "shopProfileName" : "shopAccountTitle");
            if (!user) {
                return;
            }
            $("#shopAvatar").textContent = initials(user.name);
            $("#shopProfileName").textContent = user.name;
            $("#shopProfileEmail").textContent = user.email;
            $("#shopProfileSince").textContent = "Member since " + formatDate(user.created);
            const list = $("#shopSubs");
            list.replaceChildren();
            user.subscriptions.slice().reverse().forEach((sub) => {
                const entry = M.catalog.plan(sub.plan);
                if (!entry) {
                    return;
                }
                const li = el("li", "shop-sub");
                li.style.setProperty("--shop-line-ink", PLAN_INK[sub.plan] || "#1d2a3a");
                const title = el("p", "shop-sub_title", (sub.qty > 1 ? sub.qty + " × " : "") + lineTitle(sub));
                const meta = el("p", "shop-sub_meta", "Order " + sub.order + ", " + formatDate(sub.date) + (sub.promo ? ", code " + sub.promo : ""));
                li.append(el("span", "shop-sub_dot"), el("div", "", ""), el("strong", "", M.money(sub.due)));
                li.children[1].append(title, meta);
                list.appendChild(li);
            });
            $("#shopSubsEmpty").hidden = user.subscriptions.length > 0;
            const record = M.account.storedRecord();
            if (record) {
                const clip = (text) => (text.length > 44 ? text.slice(0, 44) + "…" : text);
                $("#shopVault").textContent = JSON.stringify({
                    id: clip(record.id),
                    salt: record.salt,
                    iterations: record.iterations,
                    verifier: clip(record.verifier),
                    iv: record.iv,
                    data: clip(record.data)
                }, null, 2);
            }
        }

        function openAccount(mode) {
            const nav = $(".navbar.is-open");
            if (nav && toggle) {
                toggle.click();
            }
            if (!M.account.user) {
                setAuthMode(mode || "signin");
                $("#shopAuthForm").reset();
                $("#shopStrength").dataset.score = "";
            }
            $("#shopDeleteForm").hidden = true;
            renderProfile();
            openDialog(modal);
            if (M.account.user) {
                $("#shopProfileName").focus();
            } else {
                $("#shopAuthEmail").focus();
            }
        }

        $$(".navbar-sign-in, a[href$='sign-in.html']").forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                openAccount("signin");
            });
        });

        $("#shopAuthForm").addEventListener("submit", async (event) => {
            event.preventDefault();
            const ids = authMode === "signup" ? ["shopAuthName", "shopAuthEmail", "shopAuthPassword"] : ["shopAuthEmail", "shopAuthPassword"];
            const errorBox = $("#shopAuthError");
            errorBox.textContent = "";
            if (!validateAll(ids)) {
                return;
            }
            const button = $("#shopAuthSubmit");
            button.disabled = true;
            button.textContent = authMode === "signup" ? "Encrypting your account…" : "Unlocking…";
            modal.classList.add("is-busy");
            const payload = {
                name: $("#shopAuthName").value,
                email: $("#shopAuthEmail").value,
                password: $("#shopAuthPassword").value
            };
            try {
                const user = authMode === "signup" ? await M.account.signUp(payload) : await M.account.signIn(payload);
                $("#shopAuthForm").reset();
                renderProfile();
                $("#shopProfileName").focus();
                announce((authMode === "signup" ? "Account created. Welcome, " : "Signed in. Welcome back, ") + user.firstName + ".");
                if (drawer.open) {
                    closeDialog(modal);
                    prefillCheckout();
                } else {
                    showToast(authMode === "signup" ? "Welcome aboard, " + user.firstName + "!" : "Welcome back, " + user.firstName + "!");
                }
            } catch (error) {
                errorBox.textContent = error.message || "Something went wrong. Please try again.";
                if (error.code === "exists") {
                    setAuthMode("signin");
                    $("#shopAuthEmail").value = payload.email;
                    errorBox.textContent = error.message;
                }
                $("#shopAuthPassword").focus();
            } finally {
                button.disabled = false;
                button.textContent = authMode === "signup" ? "Create my account" : "Sign in";
                modal.classList.remove("is-busy");
            }
        });

        $("#shopSignOut").addEventListener("click", () => {
            const name = M.account.publicUser().firstName;
            M.account.signOut();
            $("#shopCheckoutForm").reset();
            setAuthMode("signin");
            renderProfile();
            $("#shopAuthEmail").focus();
            announce("Signed out. See you soon, " + name + ".");
        });

        $("#shopDeleteStart").addEventListener("click", () => {
            $("#shopDeleteForm").hidden = false;
            $("#shopDeletePassword").focus();
        });

        $("#shopDeleteCancel").addEventListener("click", () => {
            $("#shopDeleteForm").hidden = true;
            $("#shopDeleteForm").reset();
            $("#shopDeleteStart").focus();
        });

        $("#shopDeleteForm").addEventListener("submit", async (event) => {
            event.preventDefault();
            const input = $("#shopDeletePassword");
            if (!validate(input)) {
                input.focus();
                return;
            }
            try {
                await M.account.remove(input.value);
                $("#shopDeleteForm").reset();
                $("#shopCheckoutForm").reset();
                setAuthMode("signup");
                renderProfile();
                $("#shopAuthEmail").focus();
                announce("Your account was deleted from this device.");
                $("#shopAuthError").textContent = "Your account was deleted from this device.";
            } catch (error) {
                setError(input, error.message);
                input.focus();
            }
        });

        document.addEventListener("marlowby:account", () => {
            renderAccountBits();
            if (modal.open) {
                renderProfile();
            }
        });

        document.addEventListener("click", (event) => {
            const trigger = event.target.closest("[data-cart-plan]");
            if (trigger) {
                event.preventDefault();
                add(trigger.dataset.cartPlan, trigger.dataset.cartTerm || "monthly", trigger);
            }
        });

        function add(plan, term, source) {
            const item = M.cart.add(plan, term);
            if (item) {
                flyFrom(source);
            }
            return item;
        }

        M.shop = { add, openCart, openAccount, applyPromo, toast: showToast, announce };
        renderCart();
        renderAccountBits();
        document.dispatchEvent(new CustomEvent("marlowby:shop-ready"));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

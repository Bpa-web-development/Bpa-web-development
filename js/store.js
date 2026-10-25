(function () {
    "use strict";

    const KEYS = {
        cart: "marlowbyCart",
        promo: "marlowbyPromo",
        userHint: "marlowbyUserHint"
    };

    const LEGACY_KEYS = ["marlowbyAccounts", "marlowbySession", "marlowbyLock"];

    const DEFAULT_CATALOG = {
        currency: "USD",
        plans: {
            basic: { name: "Basic", tagline: "A taste of a new city every month.", itemsPerBox: 5, renews: true, prices: { monthly: 34, half: 31, annual: 29 } },
            premium: { name: "Premium", tagline: "The whole city, delivered.", itemsPerBox: 8, renews: true, prices: { monthly: 59, half: 54, annual: 50 } },
            gift: { name: "Gift", tagline: "Send someone on a road trip.", itemsPerBox: 5, renews: false, prices: { 3: 99, 6: 189, 12: 349 } }
        },
        billing: {
            monthly: { label: "Monthly", months: 1, billed: "Billed monthly" },
            half: { label: "Every 6 months", months: 6, billed: "Billed every 6 months" },
            annual: { label: "Yearly", months: 12, billed: "Billed yearly" }
        },
        promos: {
            BURLINGTON15: { type: "percent", value: 15, label: "15% off your whole order" },
            PASSPORT10: { type: "amount", value: 10, label: "$10 off any order" },
            MAPLE20: { type: "percent", value: 20, label: "20% off yearly plans", terms: ["annual"], hint: "Switch a plan to Yearly to unlock it." },
            BUNDLE25: { type: "amount", value: 25, label: "$25 off Premium plus a Gift", requires: ["premium", "gift"], hint: "Add Premium and a Gift to unlock it." },
            MIDNIGHT: { type: "percent", value: 10, label: "10% off tonight only" },
            HOLIDAY12: { type: "percent", value: 15, label: "15% off 12-month gifts", terms: ["12"], hint: "Add a 12-month Gift to unlock it." }
        },
        referral: { suffix: "-MB10", type: "amount", value: 10, label: "$10 off from a friend" },
        reward: { threshold: 300, label: "a free Burlington tote bag" }
    };

    const MAX_QTY = 5;

    function emit(name, detail) {
        document.dispatchEvent(new CustomEvent("marlowby:" + name, { detail }));
    }

    function readJson(storage, key, fallback) {
        try {
            const value = JSON.parse(storage.getItem(key) || "null");
            return value === null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(storage, key, value) {
        try {
            storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function removeKey(storage, key) {
        try {
            storage.removeItem(key);
        } catch (error) {
        }
    }

    const money = (value) => { const amount = Number(value); const cents = Math.round(amount * 100) % 100 !== 0; return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 }); };

    const catalog = {
        data: DEFAULT_CATALOG,
        loaded: false,
        plan(id) {
            return this.data.plans[id] || null;
        },
        price(plan, term) {
            const entry = this.plan(plan);
            return entry ? Number(entry.prices[term]) || 0 : 0;
        },
        termLabel(plan, term) {
            const entry = this.plan(plan);
            if (!entry) {
                return "";
            }
            if (!entry.renews) {
                return term + " prepaid boxes";
            }
            return (this.data.billing[term] || {}).label || term;
        },
        months(plan, term) {
            const entry = this.plan(plan);
            if (!entry) {
                return 1;
            }
            return entry.renews ? (this.data.billing[term] || { months: 1 }).months : Number(term);
        },
        promo(code) {
            const clean = String(code || "").trim().toUpperCase();
            const promos = this.data.promos || DEFAULT_CATALOG.promos;
            if (promos[clean]) {
                return Object.assign({ code: clean }, promos[clean]);
            }
            const referral = this.data.referral || DEFAULT_CATALOG.referral;
            if (referral && clean.endsWith(referral.suffix) && /^[A-Z]{2,12}$/.test(clean.slice(0, -referral.suffix.length))) {
                return Object.assign({ code: clean }, referral);
            }
            return null;
        },
        reward() {
            return this.data.reward || DEFAULT_CATALOG.reward;
        },
        dueToday(plan, term) {
            const entry = this.plan(plan);
            if (!entry) {
                return 0;
            }
            return entry.renews ? this.price(plan, term) * this.months(plan, term) : this.price(plan, term);
        }
    };

    const catalogReady = fetch("/data/plans.json", { cache: "no-cache" })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
        .then((data) => {
            if (data && data.plans && data.billing) {
                catalog.data = data;
                catalog.loaded = true;
            }
        })
        .catch(() => {})
        .then(() => {
            emit("catalog", catalog.data);
            cart.reprice();
            return catalog;
        });

    function lineKey(plan, term) {
        const entry = catalog.plan(plan);
        return entry && entry.renews ? plan : plan + "-" + term;
    }

    const cart = {
        items: [],
        load() {
            const saved = readJson(localStorage, KEYS.cart, []);
            this.items = Array.isArray(saved) ? saved.filter((item) => item && catalog.plan(item.plan)) : [];
            this.promoCode = String(readJson(localStorage, KEYS.promo, "") || "");
        },
        save(reason, item) {
            writeJson(localStorage, KEYS.cart, this.items);
            emit("cart", this.snapshot({ reason, item }));
        },
        snapshot(extra) {
            return Object.assign({ items: this.items.slice(), count: this.count(), subtotal: this.subtotal(), discount: this.discount(), total: this.total() }, extra);
        },
        reprice() {
            this.items.forEach((item) => {
                item.price = catalog.price(item.plan, item.term);
                item.due = catalog.dueToday(item.plan, item.term) * item.qty;
            });
            this.save("reprice");
        },
        add(plan, term) {
            const entry = catalog.plan(plan);
            if (!entry || !(String(term) in entry.prices)) {
                return null;
            }
            term = String(term);
            const key = lineKey(plan, term);
            let item = this.items.find((line) => line.key === key);
            let reason = "add";
            if (item && entry.renews && item.term !== term) {
                item.term = term;
                reason = "switch";
            } else if (item) {
                if (item.qty >= MAX_QTY) {
                    this.save("max", item);
                    return item;
                }
                item.qty += 1;
                reason = "more";
            } else {
                item = { key, plan, term, qty: 1, added: Date.now() };
                this.items.push(item);
            }
            item.price = catalog.price(plan, term);
            item.due = catalog.dueToday(plan, term) * item.qty;
            this.save(reason, item);
            return item;
        },
        setQty(key, qty) {
            const item = this.items.find((line) => line.key === key);
            if (!item) {
                return;
            }
            if (qty <= 0) {
                this.remove(key);
                return;
            }
            item.qty = Math.min(MAX_QTY, qty);
            item.due = catalog.dueToday(item.plan, item.term) * item.qty;
            this.save("qty", item);
        },
        remove(key) {
            const item = this.items.find((line) => line.key === key);
            this.items = this.items.filter((line) => line.key !== key);
            this.save("remove", item);
        },
        clear() {
            this.items = [];
            this.promoCode = "";
            removeKey(localStorage, KEYS.promo);
            this.save("clear");
        },
        promoCode: "",
        applyPromo(code) {
            const promo = catalog.promo(code);
            if (!promo) {
                return { ok: false, message: "We don't recognize that code. Check the spelling and try again." };
            }
            this.promoCode = promo.code;
            writeJson(localStorage, KEYS.promo, promo.code);
            const result = this.discount();
            this.save("promo");
            return { ok: true, promo, message: result.amount > 0 ? promo.code + " applied: " + promo.label + "." : promo.code + " is saved. " + result.note };
        },
        removePromo() {
            this.promoCode = "";
            removeKey(localStorage, KEYS.promo);
            this.save("promo-remove");
        },
        discount() {
            const promo = this.promoCode ? catalog.promo(this.promoCode) : null;
            if (!promo) {
                return { code: "", amount: 0, label: "", note: "" };
            }
            const base = { code: promo.code, label: promo.label, amount: 0, note: "" };
            if (!this.items.length) {
                return Object.assign(base, { note: "Add a plan to use it." });
            }
            if (promo.requires && !promo.requires.every((plan) => this.has(plan))) {
                const missing = promo.requires.filter((plan) => !this.has(plan)).map((plan) => catalog.plan(plan).name);
                return Object.assign(base, { note: "Add " + missing.join(" and ") + " to unlock it." });
            }
            const lines = promo.terms ? this.items.filter((item) => promo.terms.includes(item.term)) : this.items;
            if (!lines.length) {
                return Object.assign(base, { note: promo.hint || "Add an eligible plan to unlock it." });
            }
            const eligible = lines.reduce((total, item) => total + catalog.dueToday(item.plan, item.term) * item.qty, 0);
            const raw = promo.type === "percent" ? eligible * promo.value / 100 : promo.value;
            return Object.assign(base, { amount: Math.round(Math.min(raw, eligible) * 100) / 100 });
        },
        total() {
            return Math.max(0, Math.round((this.subtotal() - this.discount().amount) * 100) / 100);
        },
        count() {
            return this.items.reduce((total, item) => total + item.qty, 0);
        },
        subtotal() {
            return this.items.reduce((total, item) => total + catalog.dueToday(item.plan, item.term) * item.qty, 0);
        },
        has(plan) {
            return this.items.some((item) => item.plan === plan);
        },
        maxQty: MAX_QTY
    };

    cart.load();

    window.addEventListener("storage", (event) => {
        if (event.key === KEYS.cart || event.key === KEYS.promo) {
            cart.load();
            emit("cart", cart.snapshot({ reason: "sync" }));
        }
        if (event.key === KEYS.userHint && !event.newValue && account.user) {
            account.user = null;
            emit("account", { user: null, reason: "signout" });
        } else if (event.key === KEYS.userHint && event.newValue && !account.user) {
            account.restore();
        }
    });

    function fail(message, code, fields) {
        const error = new Error(message);
        error.code = code;
        error.fields = fields || {};
        return error;
    }

    // Talks to the serverless API in /api. The session lives in an HttpOnly cookie,
    // so page scripts never see it.
    async function api(path, options) {
        const settings = options || {};
        let response;
        try {
            response = await fetch("/api/" + path, {
                method: settings.method || "GET",
                credentials: "same-origin",
                headers: settings.body ? { "Content-Type": "application/json" } : {},
                body: settings.body ? JSON.stringify(settings.body) : undefined
            });
        } catch (error) {
            throw fail("We couldn't reach Marlowby. Check your internet connection and try again.", "network");
        }
        let data = {};
        try {
            data = await response.json();
        } catch (error) {
        }
        if (!response.ok) {
            const problem = data.error || {};
            throw fail(problem.message || "Something went wrong. Please try again.", problem.code || "http_" + response.status, problem.fields);
        }
        return data;
    }

    LEGACY_KEYS.forEach((key) => {
        removeKey(localStorage, key);
        removeKey(sessionStorage, key);
    });

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    function checkPassword(password) {
        if (password.length < 8) {
            return "Use at least 8 characters.";
        }
        if (new TextEncoder().encode(password).length > 72) {
            return "Use 72 characters or fewer.";
        }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            return "Mix in at least one letter and one number.";
        }
        return "";
    }

    function passwordStrength(password) {
        let score = 0;
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        return Math.min(4, score);
    }

    const account = {
        user: null,
        available: typeof fetch === "function",
        checkPassword,
        passwordStrength,
        normalizeEmail,
        setUser(user, reason) {
            this.user = user || null;
            if (this.user) {
                writeJson(localStorage, KEYS.userHint, { firstName: this.user.firstName, name: this.user.name });
            } else {
                removeKey(localStorage, KEYS.userHint);
            }
            emit("account", { user: this.publicUser(), reason });
            return this.publicUser();
        },
        publicUser() {
            if (!this.user) {
                return null;
            }
            const user = this.user;
            return {
                name: user.name,
                firstName: user.firstName || user.name.split(/\s+/)[0],
                email: user.email,
                zip: user.zip || "",
                created: user.created,
                subscriptions: (user.subscriptions || []).slice(),
                security: user.security || null
            };
        },
        async signUp({ name, email, password }) {
            const data = await api("auth/register", { method: "POST", body: { name: name.trim(), email: normalizeEmail(email), password } });
            this.emailed = Boolean(data.emailed);
            return this.setUser(data.user, "signin");
        },
        async signIn({ email, password }) {
            const data = await api("auth/login", { method: "POST", body: { email: normalizeEmail(email), password } });
            return this.setUser(data.user, "signin");
        },
        async restore() {
            try {
                const data = await api("auth/me");
                if (data.user) {
                    return this.setUser(data.user, "restore");
                }
                if (readJson(localStorage, KEYS.userHint, null)) {
                    this.setUser(null, "expired");
                }
            } catch (error) {
            }
            return null;
        },
        async update(changes) {
            if (!this.user) {
                return null;
            }
            const data = await api("account", { method: "PATCH", body: changes });
            return this.setUser(data.user, "update");
        },
        signOut() {
            const request = api("auth/logout", { method: "POST", body: {} }).catch(() => {});
            this.setUser(null, "signout");
            return request;
        },
        async remove(password) {
            if (!this.user) {
                return false;
            }
            await api("account", { method: "DELETE", body: { password } });
            this.setUser(null, "signout");
            return true;
        }
    };

    // Orders are priced again on the server from plans.json, so the browser can't change a price.
    const orders = {
        async place({ name, email, zip, note, items, promo }) {
            const data = await api("orders", {
                method: "POST",
                body: {
                    name,
                    email,
                    zip,
                    note: note || "",
                    promo: promo || "",
                    items: items.map((item) => ({ plan: item.plan, term: item.term, qty: item.qty }))
                }
            });
            if (data.user) {
                account.setUser(data.user, "subscriptions");
            }
            return data;
        }
    };

    const accountReady = account.restore();

    window.Marlowby = {
        money,
        catalog,
        cart,
        account,
        orders,
        api,
        ready: Promise.all([catalogReady, accountReady]).then(() => window.Marlowby)
    };
})();

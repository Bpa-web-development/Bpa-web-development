(function () {
    "use strict";

    const KEYS = {
        cart: "marlowbyCart",
        promo: "marlowbyPromo",
        accounts: "marlowbyAccounts",
        session: "marlowbySession",
        lock: "marlowbyLock"
    };

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
    const ITERATIONS = 250000;
    const MAX_FAILURES = 5;
    const LOCK_MS = 30000;

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

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

    const money = (value) => "$" + Number(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

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
        if (event.key === KEYS.accounts && account.user && !readAccounts().users[account.user.id]) {
            account.signOut();
        }
    });

    function toHex(buffer) {
        return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    function toBase64(buffer) {
        let text = "";
        new Uint8Array(buffer).forEach((byte) => (text += String.fromCharCode(byte)));
        return btoa(text);
    }

    function fromBase64(text) {
        return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
    }

    function sameBytes(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        let diff = 0;
        for (let i = 0; i < a.length; i += 1) {
            diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return diff === 0;
    }

    const cryptoReady = Boolean(window.crypto && window.crypto.subtle);

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    async function emailId(email) {
        const digest = await crypto.subtle.digest("SHA-256", encoder.encode("marlowby-account:" + normalizeEmail(email)));
        return toHex(digest);
    }

    async function deriveSecrets(password, salt, iterations) {
        const base = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
        const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, 512));
        return { verifier: toHex(bits.slice(0, 32)), keyBytes: bits.slice(32) };
    }

    function importAesKey(keyBytes) {
        return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    }

    async function encryptProfile(key, id, profile) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(id) }, key, encoder.encode(JSON.stringify(profile)));
        return { iv: toBase64(iv), data: toBase64(cipher) };
    }

    async function decryptProfile(key, id, record) {
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(record.iv), additionalData: encoder.encode(id) }, key, fromBase64(record.data));
        return JSON.parse(decoder.decode(plain));
    }

    function readAccounts() {
        const store = readJson(localStorage, KEYS.accounts, null);
        return store && store.users ? store : { version: 1, users: {} };
    }

    function writeAccounts(store) {
        return writeJson(localStorage, KEYS.accounts, store);
    }

    function lockState() {
        const lock = readJson(sessionStorage, KEYS.lock, { failures: 0, until: 0 });
        return lock && typeof lock.failures === "number" ? lock : { failures: 0, until: 0 };
    }

    function fail(message, code) {
        const error = new Error(message);
        error.code = code;
        return error;
    }

    function checkPassword(password) {
        if (password.length < 8) {
            return "Use at least 8 characters.";
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
        key: null,
        available: cryptoReady,
        iterations: ITERATIONS,
        checkPassword,
        passwordStrength,
        normalizeEmail,
        async startSession(id, keyBytes, profile) {
            this.user = { id, profile };
            this.key = await importAesKey(keyBytes);
            writeJson(sessionStorage, KEYS.session, { id, key: toBase64(keyBytes) });
            emit("account", { user: this.publicUser(), reason: "signin" });
        },
        publicUser() {
            if (!this.user) {
                return null;
            }
            const profile = this.user.profile;
            return {
                name: profile.name,
                firstName: profile.name.split(/\s+/)[0],
                email: profile.email,
                zip: profile.zip || "",
                created: profile.created,
                subscriptions: profile.subscriptions.slice()
            };
        },
        async signUp({ name, email, password }) {
            if (!cryptoReady) {
                throw fail("Accounts need a secure connection. Open the site through Live Server or https.", "crypto");
            }
            const store = readAccounts();
            const id = await emailId(email);
            if (store.users[id]) {
                throw fail("There's already an account for that email. Try signing in.", "exists");
            }
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const secrets = await deriveSecrets(password, salt, ITERATIONS);
            const profile = {
                name: name.trim(),
                email: email.trim(),
                zip: "",
                created: new Date().toISOString(),
                subscriptions: []
            };
            const key = await importAesKey(secrets.keyBytes);
            const sealed = await encryptProfile(key, id, profile);
            store.users[id] = { salt: toBase64(salt), iterations: ITERATIONS, verifier: secrets.verifier, iv: sealed.iv, data: sealed.data };
            if (!writeAccounts(store)) {
                throw fail("This browser won't let us save an account right now.", "storage");
            }
            await this.startSession(id, secrets.keyBytes, profile);
            return this.publicUser();
        },
        async signIn({ email, password }) {
            if (!cryptoReady) {
                throw fail("Accounts need a secure connection. Open the site through Live Server or https.", "crypto");
            }
            const lock = lockState();
            if (lock.until > Date.now()) {
                throw fail("Too many tries. Wait " + Math.ceil((lock.until - Date.now()) / 1000) + " seconds and try again.", "locked");
            }
            const id = await emailId(email);
            const record = readAccounts().users[id];
            const salt = record ? fromBase64(record.salt) : crypto.getRandomValues(new Uint8Array(16));
            const secrets = await deriveSecrets(password, salt, record ? record.iterations : ITERATIONS);
            if (!record || !sameBytes(secrets.verifier, record.verifier)) {
                lock.failures += 1;
                if (lock.failures >= MAX_FAILURES) {
                    lock.failures = 0;
                    lock.until = Date.now() + LOCK_MS;
                }
                writeJson(sessionStorage, KEYS.lock, lock);
                throw fail("That email and password don't match an account on this device.", "mismatch");
            }
            removeKey(sessionStorage, KEYS.lock);
            const key = await importAesKey(secrets.keyBytes);
            const profile = await decryptProfile(key, id, record);
            await this.startSession(id, secrets.keyBytes, profile);
            return this.publicUser();
        },
        async restore() {
            const session = readJson(sessionStorage, KEYS.session, null);
            if (!cryptoReady || !session || !session.id) {
                return null;
            }
            const record = readAccounts().users[session.id];
            if (!record) {
                removeKey(sessionStorage, KEYS.session);
                return null;
            }
            try {
                const key = await importAesKey(fromBase64(session.key));
                const profile = await decryptProfile(key, session.id, record);
                this.user = { id: session.id, profile };
                this.key = key;
                emit("account", { user: this.publicUser(), reason: "restore" });
                return this.publicUser();
            } catch (error) {
                removeKey(sessionStorage, KEYS.session);
                return null;
            }
        },
        async persist() {
            const store = readAccounts();
            const record = store.users[this.user.id];
            if (!record) {
                this.signOut();
                throw fail("This account was removed on this device.", "missing");
            }
            const sealed = await encryptProfile(this.key, this.user.id, this.user.profile);
            record.iv = sealed.iv;
            record.data = sealed.data;
            writeAccounts(store);
        },
        async update(changes) {
            if (!this.user) {
                return null;
            }
            Object.assign(this.user.profile, changes);
            await this.persist();
            emit("account", { user: this.publicUser(), reason: "update" });
            return this.publicUser();
        },
        async addSubscriptions(lines, details) {
            if (!this.user) {
                return null;
            }
            const now = new Date().toISOString();
            lines.forEach((line) => {
                this.user.profile.subscriptions.push({
                    plan: line.plan,
                    term: line.term,
                    qty: line.qty,
                    due: catalog.dueToday(line.plan, line.term) * line.qty,
                    order: details.order,
                    promo: details.promo || "",
                    saved: details.saved || 0,
                    date: now
                });
            });
            if (details.zip) {
                this.user.profile.zip = details.zip;
            }
            await this.persist();
            emit("account", { user: this.publicUser(), reason: "subscriptions" });
            return this.publicUser();
        },
        signOut() {
            this.user = null;
            this.key = null;
            removeKey(sessionStorage, KEYS.session);
            emit("account", { user: null, reason: "signout" });
        },
        async remove(password) {
            if (!this.user) {
                return false;
            }
            const store = readAccounts();
            const record = store.users[this.user.id];
            if (record) {
                const secrets = await deriveSecrets(password, fromBase64(record.salt), record.iterations);
                if (!sameBytes(secrets.verifier, record.verifier)) {
                    throw fail("That password isn't right.", "mismatch");
                }
                delete store.users[this.user.id];
                writeAccounts(store);
            }
            this.signOut();
            return true;
        },
        storedRecord() {
            if (!this.user) {
                return null;
            }
            const record = readAccounts().users[this.user.id];
            return record ? Object.assign({ id: this.user.id }, record) : null;
        },
        count() {
            return Object.keys(readAccounts().users).length;
        }
    };

    const accountReady = account.restore();

    window.Marlowby = {
        money,
        catalog,
        cart,
        account,
        ready: Promise.all([catalogReady, accountReady]).then(() => window.Marlowby),
        orderNumber() {
            return "MB" + Date.now().toString(36).toUpperCase().slice(-6) + toHex(crypto.getRandomValues(new Uint8Array(2))).toUpperCase();
        }
    };
})();

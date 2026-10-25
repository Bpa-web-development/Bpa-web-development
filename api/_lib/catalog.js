import { readFileSync } from "node:fs";
import { join } from "node:path";

// The same plans.json the pages use, so prices and promo codes can never disagree.
let cached = null;

export function catalog() {
    if (!cached) {
        cached = JSON.parse(readFileSync(join(process.cwd(), "data", "plans.json"), "utf8"));
    }
    return cached;
}

const round = (value) => Math.round(value * 100) / 100;

export function dueToday(planId, term) {
    const data = catalog();
    const plan = data.plans[planId];
    if (!plan || !(String(term) in plan.prices)) {
        return null;
    }
    const price = Number(plan.prices[term]);
    return plan.renews ? price * ((data.billing[term] || { months: 1 }).months) : price;
}

export function findPromo(code) {
    const data = catalog();
    const clean = String(code || "").trim().toUpperCase();
    if (!clean) return null;
    if (data.promos[clean]) {
        return Object.assign({ code: clean }, data.promos[clean]);
    }
    const referral = data.referral;
    if (referral && clean.endsWith(referral.suffix) && /^[A-Z]{2,12}$/.test(clean.slice(0, -referral.suffix.length))) {
        return Object.assign({ code: clean }, referral);
    }
    return null;
}

// Recomputes an order from plan ids and terms only. Prices sent by the browser are ignored.
export function priceOrder(items, promoCode) {
    const data = catalog();
    const lines = [];
    const seen = new Set();
    for (const raw of Array.isArray(items) ? items.slice(0, 10) : []) {
        const plan = String(raw && raw.plan || "");
        const term = String(raw && raw.term || "");
        const qty = Math.floor(Number(raw && raw.qty));
        const due = dueToday(plan, term);
        if (due === null || !(qty >= 1 && qty <= 5)) {
            return { error: "One of the plans in your cart isn't available. Please refresh and try again." };
        }
        const key = data.plans[plan].renews ? plan : plan + "-" + term;
        if (seen.has(key)) {
            return { error: "Your cart has the same plan twice. Please refresh and try again." };
        }
        seen.add(key);
        lines.push({ plan, term, qty, unitPrice: Number(data.plans[plan].prices[term]), due: round(due * qty) });
    }
    if (!lines.length) {
        return { error: "Your cart is empty." };
    }
    const subtotal = round(lines.reduce((sum, line) => sum + line.due, 0));
    let discount = 0;
    let appliedCode = "";
    const promo = findPromo(promoCode);
    if (promo) {
        const hasAll = !promo.requires || promo.requires.every((plan) => lines.some((line) => line.plan === plan));
        const eligible = promo.terms ? lines.filter((line) => promo.terms.includes(line.term)) : lines;
        if (hasAll && eligible.length) {
            const base = eligible.reduce((sum, line) => sum + line.due, 0);
            discount = round(Math.min(promo.type === "percent" ? base * promo.value / 100 : promo.value, base));
            appliedCode = promo.code;
        }
    }
    return { lines, subtotal, discount, promo: appliedCode, total: round(Math.max(0, subtotal - discount)) };
}

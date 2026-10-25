// Runs the real API handlers against an in-memory Postgres (pglite). Usage: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.DATABASE_URL = "pglite:memory";
delete process.env.RESEND_API_KEY;
delete process.env.GMAIL_USER;
delete process.env.GMAIL_APP_PASSWORD;
delete process.env.SUPPORT_EMAIL;

const load = async (path) => (await import(new URL("../api/" + path + ".js", import.meta.url))).default;
let handlers;

before(async () => {
    handlers = {
        register: await load("auth/register"),
        login: await load("auth/login"),
        logout: await load("auth/logout"),
        me: await load("auth/me"),
        account: await load("account"),
        orders: await load("orders"),
        contact: await load("contact"),
        newsletter: await load("newsletter")
    };
});

function call(handler, { method = "GET", body, cookie = "", headers = {}, url = "/api/test" } = {}) {
    const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
    Object.assign(req, {
        method,
        url,
        headers: Object.assign({ host: "localhost:3000", "content-type": "application/json", cookie, "x-forwarded-for": "203.0.113." + Math.floor(Math.random() * 250) }, headers),
        socket: {}
    });
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            headers: {},
            setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
            end(data) {
                const cookieHeader = this.headers["set-cookie"] || "";
                resolve({ status: this.statusCode, body: data ? JSON.parse(data) : null, cookie: String(cookieHeader).split(";")[0] });
            }
        };
        handler(req, res);
    });
}

const PASSWORD = "maple2026trip";

test("register validates input on the server", async () => {
    const res = await call(handlers.register, { method: "POST", body: { name: "A", email: "bad", password: "short" } });
    assert.equal(res.status, 422);
    assert.ok(res.body.error.fields.name && res.body.error.fields.email && res.body.error.fields.password);
});

test("register, me, logout and login round trip", async () => {
    const created = await call(handlers.register, { method: "POST", body: { name: "Casey Lin", email: "Casey@Example.com", password: PASSWORD } });
    assert.equal(created.status, 201);
    assert.equal(created.body.user.email, "casey@example.com");
    assert.match(created.cookie, /^mb_session=.{40,}/);
    assert.equal(created.body.user.password_hash, undefined);

    const me = await call(handlers.me, { cookie: created.cookie });
    assert.equal(me.body.user.name, "Casey Lin");

    const dup = await call(handlers.register, { method: "POST", body: { name: "Casey Lin", email: "casey@example.com", password: PASSWORD } });
    assert.equal(dup.status, 409);

    await call(handlers.logout, { method: "POST", body: {}, cookie: created.cookie });
    const after = await call(handlers.me, { cookie: created.cookie });
    assert.equal(after.body.user, null, "logout must revoke the session on the server");

    const wrong = await call(handlers.login, { method: "POST", body: { email: "casey@example.com", password: "nope12345" } });
    assert.equal(wrong.status, 401);
    const right = await call(handlers.login, { method: "POST", body: { email: "casey@example.com", password: PASSWORD } });
    assert.equal(right.status, 200);
});

test("passwords are stored as bcrypt hashes", async () => {
    const { query } = await import("../api/_lib/db.js");
    await call(handlers.register, { method: "POST", body: { name: "Hash Check", email: "hash@example.com", password: PASSWORD } });
    const [row] = await query("SELECT password_hash FROM users WHERE email = 'hash@example.com'");
    assert.match(row.password_hash, /^\$2[aby]\$12\$/);
    assert.ok(!row.password_hash.includes(PASSWORD));
});

test("login is rate limited per email", async () => {
    await call(handlers.register, { method: "POST", body: { name: "Rate Limit", email: "rate@example.com", password: PASSWORD } });
    let last;
    for (let i = 0; i < 9; i += 1) {
        last = await call(handlers.login, { method: "POST", body: { email: "rate@example.com", password: "wrong12345" } });
    }
    assert.equal(last.status, 429);
});

test("orders are priced on the server and ignore browser prices", async () => {
    const res = await call(handlers.orders, {
        method: "POST",
        body: { name: "Guest Buyer", email: "guest@example.com", zip: "05401", promo: "BUNDLE25", items: [{ plan: "premium", term: "annual", qty: 1, price: 1 }, { plan: "gift", term: "3", qty: 1 }] }
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.order.subtotal, 699);
    assert.equal(res.body.order.discount, 25);
    assert.equal(res.body.order.total, 674);
    assert.match(res.body.order.number, /^MB-[A-Z0-9]{6}$/);

    const bad = await call(handlers.orders, { method: "POST", body: { name: "Guest Buyer", email: "guest@example.com", zip: "05401", items: [{ plan: "platinum", term: "annual", qty: 1 }] } });
    assert.equal(bad.status, 422);
});

test("signed-in orders show up in the account", async () => {
    const created = await call(handlers.register, { method: "POST", body: { name: "Order Owner", email: "owner@example.com", password: PASSWORD } });
    await call(handlers.orders, { method: "POST", cookie: created.cookie, body: { name: "Order Owner", email: "owner@example.com", zip: "10001", items: [{ plan: "basic", term: "monthly", qty: 2 }] } });
    const me = await call(handlers.me, { cookie: created.cookie });
    assert.equal(me.body.user.subscriptions.length, 1);
    assert.equal(me.body.user.subscriptions[0].due, 68);
    assert.equal(me.body.user.zip, "10001");
});

test("help desk tickets and newsletter signups are saved", async () => {
    const ticket = await call(handlers.contact, { method: "POST", body: { name: "Sam Ortiz", email: "sam@example.com", topic: "Gifts", message: "Where is my gift box?" } });
    assert.equal(ticket.status, 201);
    assert.match(ticket.body.ticket.id, /^HD-/);

    const badTopic = await call(handlers.contact, { method: "POST", body: { name: "Sam Ortiz", email: "sam@example.com", topic: "Hacking", message: "Where is my gift box?" } });
    assert.equal(badTopic.status, 422);

    const sub = await call(handlers.newsletter, { method: "POST", body: { email: "sam@example.com", topics: ["deals", "bogus"] } });
    assert.equal(sub.status, 201);
    const unsub = await call(handlers.newsletter, { method: "DELETE", body: { token: sub.body.token } });
    assert.equal(unsub.body.subscribed, false);
});

test("new accounts, orders and help desk tickets email the Gmail inbox", async () => {
    const { setGmailTransport } = await import("../api/_lib/email.js");
    const sent = [];
    setGmailTransport({ sendMail: async (mail) => { sent.push(mail); return { messageId: "<" + sent.length + "@test>" }; } });
    process.env.GMAIL_USER = "marlowbybox@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    try {
        const created = await call(handlers.register, { method: "POST", body: { name: "Riley Park", email: "riley@example.com", password: PASSWORD } });
        assert.equal(created.body.emailed, true);
        const welcome = sent.find((mail) => mail.to === "riley@example.com");
        assert.equal(welcome.subject, "Welcome Riley to Marlowby");
        assert.equal(welcome.from, '"Marlowby" <marlowbybox@gmail.com>');
        const joined = sent.find((mail) => mail.to === "marlowbybox@gmail.com");
        assert.equal(joined.subject, "New account: Welcome Riley Park to Marlowby");
        assert.equal(joined.replyTo, "riley@example.com");

        sent.length = 0;
        const order = await call(handlers.orders, { method: "POST", body: { name: "Test Buyer", email: "not-a-real-inbox@example.com", zip: "05401", items: [{ plan: "premium", term: "monthly", qty: 1 }] } });
        assert.equal(order.status, 201);
        assert.ok(sent.some((mail) => mail.to === "not-a-real-inbox@example.com" && /is confirmed/.test(mail.subject)));
        const notice = sent.find((mail) => mail.to === "marlowbybox@gmail.com");
        assert.match(notice.subject, new RegExp("^New order " + order.body.order.number + ": \\$59 from Test Buyer$"));

        sent.length = 0;
        const ticket = await call(handlers.contact, { method: "POST", body: { name: "Sam Ortiz", email: "sam@example.com", topic: "Gifts", message: "Can I change the gift note?" } });
        assert.equal(ticket.body.forwarded, true);
        assert.equal(ticket.body.emailed, true);
        const staff = sent.find((mail) => mail.to === "marlowbybox@gmail.com");
        assert.equal(staff.subject, `[Help desk] ${ticket.body.ticket.id} · Gifts · Sam Ortiz`);
        assert.equal(staff.replyTo, "sam@example.com");
        assert.ok(staff.html.includes("Can I change the gift note?"));
    } finally {
        delete process.env.GMAIL_USER;
        delete process.env.GMAIL_APP_PASSWORD;
        setGmailTransport(null);
    }
});

test("account deletion needs the password and removes sessions", async () => {
    const created = await call(handlers.register, { method: "POST", body: { name: "Delete Me", email: "delete@example.com", password: PASSWORD } });
    const wrong = await call(handlers.account, { method: "DELETE", cookie: created.cookie, body: { password: "wrong12345" } });
    assert.equal(wrong.status, 401);
    const ok = await call(handlers.account, { method: "DELETE", cookie: created.cookie, body: { password: PASSWORD } });
    assert.equal(ok.status, 200);
    const me = await call(handlers.me, { cookie: created.cookie });
    assert.equal(me.body.user, null);
});

test("cross-site and non-JSON posts are refused", async () => {
    const evil = await call(handlers.login, { method: "POST", body: {}, headers: { origin: "https://evil.example" } });
    assert.equal(evil.status, 403);
    const form = await call(handlers.login, { method: "POST", body: {}, headers: { "content-type": "application/x-www-form-urlencoded" } });
    assert.equal(form.status, 415);
    const wrongMethod = await call(handlers.login, { method: "GET" });
    assert.equal(wrongMethod.status, 405);
});

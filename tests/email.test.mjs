// Checks the Gmail and Resend requests without sending real mail. Usage: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { sendEmail, setGmailTransport, teamInbox } from "../api/_lib/email.js";
import { welcomeEmail, ticketStaffEmail } from "../api/_lib/templates.js";

test("sendEmail posts to Resend with the API key and sender", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "Marlowby <hello@example.com>";
    const original = globalThis.fetch;
    let request;
    globalThis.fetch = async (url, options) => {
        request = { url, options };
        return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    };
    try {
        const result = await sendEmail(Object.assign({ to: "casey@example.com" }, welcomeEmail({ name: "Casey Lin", site: "https://marlowbybox.vercel.app" })));
        assert.deepEqual(result, { sent: true, id: "email_1" });
        assert.equal(request.url, "https://api.resend.com/emails");
        assert.equal(request.options.headers.Authorization, "Bearer re_test_123");
        const body = JSON.parse(request.options.body);
        assert.equal(body.from, "Marlowby <hello@example.com>");
        assert.deepEqual(body.to, ["casey@example.com"]);
        assert.equal(body.subject, "Welcome Casey to Marlowby");
    } finally {
        globalThis.fetch = original;
        delete process.env.RESEND_API_KEY;
        delete process.env.EMAIL_FROM;
    }
});

test("sendEmail skips quietly when not configured", async () => {
    const result = await sendEmail({ to: "a@example.com", subject: "x", html: "x", text: "x" });
    assert.equal(result.sent, false);
});

test("templates escape visitor text", () => {
    const mail = ticketStaffEmail({ ticket: { ticket_code: "HD-ABC123", name: "<script>x</script>", email: "a@example.com", topic: "Gifts", order_ref: "", message: "<img src=x onerror=alert(1)>" }, site: "https://marlowbybox.vercel.app" });
    assert.ok(!mail.html.includes("<script>x"));
    assert.ok(!mail.html.includes("<img src=x"));
    assert.ok(mail.html.includes("&lt;img src=x"));
});

test("Gmail wins over Resend and is the default team inbox", async () => {
    process.env.GMAIL_USER = "marlowbybox@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "Marlowby <hello@example.com>";
    const sent = [];
    setGmailTransport({ sendMail: async (mail) => { sent.push(mail); return { messageId: "<1@test>" }; } });
    try {
        const result = await sendEmail({ to: "casey@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi", replyTo: "team@example.com" });
        assert.deepEqual(result, { sent: true, id: "<1@test>" });
        assert.equal(sent[0].from, '"Marlowby" <marlowbybox@gmail.com>');
        assert.equal(sent[0].replyTo, "team@example.com");
        assert.equal(teamInbox(), "marlowbybox@gmail.com", "the Gmail address is the team inbox by default");
        process.env.SUPPORT_EMAIL = "help@example.com";
        assert.equal(teamInbox(), "help@example.com");
    } finally {
        setGmailTransport(null);
        for (const key of ["GMAIL_USER", "GMAIL_APP_PASSWORD", "RESEND_API_KEY", "EMAIL_FROM", "SUPPORT_EMAIL"]) delete process.env[key];
    }
});

test("a Gmail failure is reported, not thrown", async () => {
    process.env.GMAIL_USER = "marlowbybox@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "wrong";
    setGmailTransport({ sendMail: async () => { throw new Error("535 Username and Password not accepted"); } });
    try {
        const result = await sendEmail({ to: "casey@example.com", subject: "Hi", html: "x", text: "x" });
        assert.deepEqual(result, { sent: false, reason: "network_error" });
    } finally {
        setGmailTransport(null);
        delete process.env.GMAIL_USER;
        delete process.env.GMAIL_APP_PASSWORD;
    }
});

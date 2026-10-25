import { randomBytes } from "node:crypto";
import { route, sendJson, HttpError } from "./_lib/http.js";
import { one } from "./_lib/db.js";
import { assertValid, checkEmail, normalizeEmail, NEWS_TOPICS } from "./_lib/validate.js";
import { limit } from "./_lib/rate-limit.js";
import { sendEmail, siteUrl } from "./_lib/email.js";
import { newsletterEmail, esc } from "./_lib/templates.js";

function unsubscribePage(res, ok) {
    res.statusCode = ok ? 200 : 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    const heading = ok ? "You're unsubscribed" : "That link has expired";
    const text = ok ? "You won't get any more postcards from us. You can sign up again any time from the footer." : "This unsubscribe link isn't valid anymore. If you're still getting emails, reply to one and we'll remove you.";
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Marlowby | ${esc(heading)}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fbf6ee;font-family:Lato,Arial,sans-serif;color:#1d2a3a">
<main style="max-width:28rem;padding:2rem;text-align:center"><h1 style="font-family:'Playfair Display',Georgia,serif">${esc(heading)}</h1><p style="line-height:1.6">${esc(text)}</p>
<p><a href="/" style="display:inline-block;padding:0.75rem 1.25rem;border-radius:999px;background:#b0491f;color:#fff;font-weight:700;text-decoration:none">Back to Marlowby</a></p></main></body></html>`);
}

export default route({
    async GET(req, res) {
        const token = new URL(req.url, "http://localhost").searchParams.get("unsubscribe") || "";
        if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
            unsubscribePage(res, false);
            return;
        }
        const row = await one("UPDATE newsletter_subscribers SET unsubscribed_at = now() WHERE unsubscribe_token = $1 RETURNING id", [token]);
        unsubscribePage(res, Boolean(row));
    },

    async POST(req, res, { body, ip }) {
        assertValid({ email: checkEmail(body.email) });
        await limit("news-ip", ip, 10, 60 * 60);
        const email = normalizeEmail(body.email);
        const topics = (Array.isArray(body.topics) ? body.topics : []).filter((topic) => NEWS_TOPICS.includes(topic));
        const row = await one(
            `INSERT INTO newsletter_subscribers (email, topics, unsubscribe_token)
             VALUES ($1, $2, $3)
             ON CONFLICT (email) DO UPDATE SET topics = EXCLUDED.topics, unsubscribed_at = NULL,
                 subscribed_at = CASE WHEN newsletter_subscribers.unsubscribed_at IS NULL THEN newsletter_subscribers.subscribed_at ELSE now() END
             RETURNING unsubscribe_token, (xmax = 0) AS created`,
            [email, topics, randomBytes(24).toString("base64url")]
        );
        const site = siteUrl(req);
        const mail = await sendEmail(Object.assign({ to: email }, newsletterEmail({ unsubscribeUrl: `${site}/api/newsletter?unsubscribe=${row.unsubscribe_token}`, site })));
        sendJson(res, 201, { subscribed: true, token: row.unsubscribe_token, emailed: mail.sent });
    },

    async DELETE(req, res, { body }) {
        const token = String(body.token || "");
        if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
            throw new HttpError(400, "We couldn't find that subscription.", "bad_token");
        }
        await one("UPDATE newsletter_subscribers SET unsubscribed_at = now() WHERE unsubscribe_token = $1 RETURNING id", [token]);
        sendJson(res, 200, { subscribed: false });
    }
});

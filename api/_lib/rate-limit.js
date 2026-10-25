import { createHash } from "node:crypto";
import { one } from "./db.js";
import { HttpError } from "./http.js";

// Fixed-window counter stored in Postgres, so limits hold across serverless instances.
export async function limit(bucket, identity, max, windowSeconds) {
    const key = bucket + ":" + createHash("sha256").update(String(identity)).digest("hex").slice(0, 40);
    const row = await one(
        `INSERT INTO rate_limits (key, count, reset_at)
         VALUES ($1, 1, now() + make_interval(secs => $2))
         ON CONFLICT (key) DO UPDATE SET
             count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
             reset_at = CASE WHEN rate_limits.reset_at <= now() THEN now() + make_interval(secs => $2) ELSE rate_limits.reset_at END
         RETURNING count, EXTRACT(EPOCH FROM (reset_at - now()))::int AS retry_after`,
        [key, windowSeconds]
    );
    if (Math.random() < 0.02) {
        await one("DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'");
        // Retention promised in html/privacy.html: orders and tickets 12 months, unsubscribed emails 30 days.
        await one("DELETE FROM orders WHERE created_at < now() - interval '12 months'");
        await one("DELETE FROM tickets WHERE created_at < now() - interval '12 months'");
        await one("DELETE FROM newsletter_subscribers WHERE unsubscribed_at < now() - interval '30 days'");
    }
    if (row && row.count > max) {
        const wait = Math.max(1, Number(row.retry_after) || windowSeconds);
        const error = new HttpError(429, "Too many tries. Please wait " + humanWait(wait) + " and try again.", "rate_limited");
        error.retryAfter = wait;
        throw error;
    }
}

export async function clearLimit(bucket, identity) {
    const key = bucket + ":" + createHash("sha256").update(String(identity)).digest("hex").slice(0, 40);
    await one("DELETE FROM rate_limits WHERE key = $1", [key]);
}

function humanWait(seconds) {
    if (seconds < 90) return seconds + " seconds";
    return Math.ceil(seconds / 60) + " minutes";
}

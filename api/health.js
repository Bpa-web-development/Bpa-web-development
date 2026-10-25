import { route, sendJson } from "./_lib/http.js";
import { one } from "./_lib/db.js";
import { emailProvider, teamInbox } from "./_lib/email.js";

// Quick setup check: open /api/health after deploying.
export default route({
    async GET(req, res) {
        let database = "ok";
        try {
            const row = await one("SELECT to_regclass('public.users') IS NOT NULL AS ready");
            if (!row || !row.ready) database = "connected, but tables are missing (run npm run db:migrate)";
        } catch (error) {
            database = error.code === "db_not_configured" ? "DATABASE_URL is not set" : "cannot connect";
        }
        sendJson(res, database === "ok" ? 200 : 503, {
            ok: database === "ok",
            database,
            email: emailProvider() === "gmail" ? "configured (Gmail)" : emailProvider() === "resend" ? "configured (Resend)" : "GMAIL_USER and GMAIL_APP_PASSWORD are not set (emails are skipped)",
            supportInbox: teamInbox() ? "configured" : "no team inbox (set GMAIL_USER or SUPPORT_EMAIL; tickets are saved but not forwarded)"
        });
    }
});

import { route, sendJson, HttpError } from "./_lib/http.js";
import { query, one } from "./_lib/db.js";
import { requireUser, verifyPassword, endSession } from "./_lib/auth.js";
import { assertValid, checkName, checkZip, cleanText } from "./_lib/validate.js";
import { limit } from "./_lib/rate-limit.js";
import { sendEmail, siteUrl } from "./_lib/email.js";
import { accountDeletedEmail } from "./_lib/templates.js";
import { publicUser } from "./_lib/users.js";

export default route({
    async GET(req, res) {
        const user = await requireUser(req);
        sendJson(res, 200, { user: await publicUser(user) });
    },

    async PATCH(req, res, { body }) {
        const user = await requireUser(req);
        assertValid({
            name: body.name === undefined ? "" : checkName(body.name),
            zip: body.zip === undefined || body.zip === "" ? "" : checkZip(body.zip)
        });
        const updated = await one(
            `UPDATE users SET name = COALESCE($2, name), zip = COALESCE($3, zip), updated_at = now()
             WHERE id = $1 RETURNING id, email, name, zip, password_hash, created_at`,
            [user.id, body.name === undefined ? null : cleanText(body.name), body.zip === undefined ? null : String(body.zip).trim()]
        );
        sendJson(res, 200, { user: await publicUser(updated) });
    },

    async DELETE(req, res, { body, ip }) {
        const user = await requireUser(req);
        await limit("delete-ip", ip, 10, 15 * 60);
        if (typeof body.password !== "string" || !(await verifyPassword(body.password.slice(0, 200), user.password_hash))) {
            throw new HttpError(401, "That password isn't right.", "mismatch", { password: "That password isn't right." });
        }
        await endSession(req, res);
        await query("DELETE FROM users WHERE id = $1", [user.id]);
        await sendEmail(Object.assign({ to: user.email }, accountDeletedEmail({ name: user.name, site: siteUrl(req) })));
        sendJson(res, 200, { ok: true });
    }
});

import { route, sendJson, HttpError } from "../_lib/http.js";
import { one } from "../_lib/db.js";
import { verifyPassword, startSession } from "../_lib/auth.js";
import { assertValid, checkEmail, normalizeEmail } from "../_lib/validate.js";
import { limit, clearLimit } from "../_lib/rate-limit.js";
import { publicUser } from "../_lib/users.js";

export default route({
    async POST(req, res, { body, ip }) {
        assertValid({
            email: checkEmail(body.email),
            password: typeof body.password === "string" && body.password ? "" : "Please enter your password."
        });
        const email = normalizeEmail(body.email);
        await limit("login-ip", ip, 30, 15 * 60);
        await limit("login-email", email, 8, 15 * 60);

        const user = await one("SELECT id, email, name, zip, password_hash, created_at FROM users WHERE email = $1", [email]);
        const ok = await verifyPassword(String(body.password).slice(0, 200), user && user.password_hash);
        if (!user || !ok) {
            throw new HttpError(401, "That email and password don't match an account.", "mismatch");
        }

        await clearLimit("login-email", email);
        await startSession(res, user.id, req);
        sendJson(res, 200, { user: await publicUser(user) });
    }
});

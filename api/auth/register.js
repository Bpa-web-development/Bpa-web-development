import { route, sendJson, HttpError } from "../_lib/http.js";
import { one } from "../_lib/db.js";
import { hashPassword, startSession } from "../_lib/auth.js";
import { assertValid, checkEmail, checkName, checkPassword, cleanText, normalizeEmail } from "../_lib/validate.js";
import { limit } from "../_lib/rate-limit.js";
import { notifyTeam, sendEmail, siteUrl } from "../_lib/email.js";
import { accountTeamEmail, welcomeEmail } from "../_lib/templates.js";
import { publicUser } from "../_lib/users.js";

export default route({
    async POST(req, res, { body, ip }) {
        assertValid({
            name: checkName(body.name),
            email: checkEmail(body.email),
            password: checkPassword(body.password)
        });
        await limit("register-ip", ip, 10, 60 * 60);

        const name = cleanText(body.name);
        const email = normalizeEmail(body.email);
        const passwordHash = await hashPassword(body.password);
        const user = await one(
            `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
             ON CONFLICT (email) DO NOTHING
             RETURNING id, email, name, zip, password_hash, created_at`,
            [email, name, passwordHash]
        );
        if (!user) {
            throw new HttpError(409, "There's already an account for that email. Try signing in.", "exists", { email: "There's already an account for that email." });
        }

        await startSession(res, user.id, req);
        const site = siteUrl(req);
        const [mail] = await Promise.all([
            sendEmail(Object.assign({ to: email }, welcomeEmail({ name, site }))),
            notifyTeam(Object.assign({ replyTo: email }, accountTeamEmail({ user, site })))
        ]);
        sendJson(res, 201, { user: await publicUser(user), emailed: mail.sent });
    }
});

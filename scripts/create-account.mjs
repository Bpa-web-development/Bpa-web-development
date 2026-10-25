// Creates (or resets the password of) an account, e.g. a login for the judges.
// Usage: npm run account:create -- "BPA Judge" judge@yourdomain.com "Passw0rd-here"
import "./load-env.mjs";
import { query } from "../api/_lib/db.js";
import { hashPassword } from "../api/_lib/auth.js";
import { checkEmail, checkName, checkPassword, cleanText, normalizeEmail } from "../api/_lib/validate.js";

const [name, email, password] = process.argv.slice(2);
const problem = checkName(name) || checkEmail(email) || checkPassword(password);
if (problem) {
    console.error("✗ " + problem + '\nUsage: npm run account:create -- "Full Name" email@example.com "Password1"');
    process.exit(1);
}

await query(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, updated_at = now()`,
    [normalizeEmail(email), cleanText(name), await hashPassword(password)]
);
await query("DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = $1)", [normalizeEmail(email)]);
console.log(`✓ Account ready: ${normalizeEmail(email)}`);

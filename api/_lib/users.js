import { query } from "./db.js";

// Shapes a user row for the browser. Never includes the password hash.
export async function publicUser(user) {
    if (!user) {
        return null;
    }
    const lines = await query(
        `SELECT l.plan, l.term, l.qty, l.due, o.order_number, o.promo_code, o.created_at
         FROM order_lines l JOIN orders o ON o.id = l.order_id
         WHERE o.user_id = $1
         ORDER BY o.created_at, l.id`,
        [user.id]
    );
    return {
        name: user.name,
        firstName: user.name.split(/\s+/)[0],
        email: user.email,
        zip: user.zip || "",
        created: new Date(user.created_at).toISOString(),
        subscriptions: lines.map((line) => ({
            plan: line.plan,
            term: line.term,
            qty: Number(line.qty),
            due: Number(line.due),
            order: line.order_number,
            promo: line.promo_code || "",
            date: new Date(line.created_at).toISOString()
        })),
        security: {
            passwordStorage: "bcrypt, cost 12",
            hashPreview: String(user.password_hash || "").slice(0, 7) + "…",
            session: "HttpOnly, Secure, SameSite=Lax cookie"
        }
    };
}

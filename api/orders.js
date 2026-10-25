import { route, sendJson, HttpError } from "./_lib/http.js";
import { query, one } from "./_lib/db.js";
import { currentUser, requireUser } from "./_lib/auth.js";
import { assertValid, checkEmail, checkName, checkZip, cleanText, normalizeEmail } from "./_lib/validate.js";
import { limit } from "./_lib/rate-limit.js";
import { catalog, priceOrder } from "./_lib/catalog.js";
import { publicCode } from "./_lib/codes.js";
import { notifyTeam, sendEmail, siteUrl } from "./_lib/email.js";
import { orderEmail, orderTeamEmail } from "./_lib/templates.js";
import { publicUser } from "./_lib/users.js";

export default route({
    async GET(req, res) {
        const user = await requireUser(req);
        const orders = await query(
            "SELECT order_number, promo_code, subtotal, discount, total, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
            [user.id]
        );
        sendJson(res, 200, {
            orders: orders.map((order) => ({
                order: order.order_number,
                promo: order.promo_code,
                subtotal: Number(order.subtotal),
                discount: Number(order.discount),
                total: Number(order.total),
                date: new Date(order.created_at).toISOString()
            }))
        });
    },

    async POST(req, res, { body, ip }) {
        const note = cleanText(body.note).slice(0, 200);
        assertValid({
            name: checkName(body.name),
            email: checkEmail(body.email),
            zip: checkZip(body.zip)
        });
        await limit("order-ip", ip, 20, 60 * 60);

        const priced = priceOrder(body.items, body.promo);
        if (priced.error) {
            throw new HttpError(422, priced.error, "bad_cart");
        }

        const user = await currentUser(req);
        const zip = String(body.zip).trim();
        const lines = JSON.stringify(priced.lines.map((line) => ({ plan: line.plan, term: line.term, qty: line.qty, unit_price: line.unitPrice, due: line.due })));
        let order = null;
        for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
            // One statement inserts the order and its lines, so an order is never saved half-written.
            order = await one(
                `WITH new_order AS (
                     INSERT INTO orders (order_number, user_id, name, email, zip, gift_note, promo_code, subtotal, discount, total)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (order_number) DO NOTHING
                     RETURNING id, order_number, name, email, zip, promo_code, subtotal, discount, total, created_at
                 ), new_lines AS (
                     INSERT INTO order_lines (order_id, plan, term, qty, unit_price, due)
                     SELECT new_order.id, line.plan, line.term, line.qty, line.unit_price, line.due
                     FROM new_order, jsonb_to_recordset($11::jsonb) AS line(plan TEXT, term TEXT, qty INTEGER, unit_price NUMERIC, due NUMERIC)
                 )
                 SELECT * FROM new_order`,
                [publicCode("MB"), user ? user.id : null, cleanText(body.name), normalizeEmail(body.email), zip, note, priced.promo, priced.subtotal, priced.discount, priced.total, lines]
            );
        }
        if (!order) {
            throw new Error("Could not allocate an order number");
        }
        let account = null;
        if (user) {
            const updated = await one(
                "UPDATE users SET zip = $2, updated_at = now() WHERE id = $1 RETURNING id, email, name, zip, password_hash, created_at",
                [user.id, zip]
            );
            account = await publicUser(updated);
        }

        const site = siteUrl(req);
        const [mail] = await Promise.all([
            sendEmail(Object.assign({ to: order.email }, orderEmail({ order, lines: priced.lines, catalog: catalog(), site }))),
            notifyTeam(Object.assign({ replyTo: order.email }, orderTeamEmail({ order, lines: priced.lines, catalog: catalog(), site, member: Boolean(user) })))
        ]);
        sendJson(res, 201, {
            order: {
                number: order.order_number,
                subtotal: priced.subtotal,
                discount: priced.discount,
                promo: priced.promo,
                total: priced.total,
                lines: priced.lines
            },
            user: account,
            emailed: mail.sent
        });
    }
});

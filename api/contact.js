import { route, sendJson } from "./_lib/http.js";
import { one } from "./_lib/db.js";
import { currentUser } from "./_lib/auth.js";
import { assertValid, checkEmail, checkName, cleanText, normalizeEmail, TOPICS } from "./_lib/validate.js";
import { limit } from "./_lib/rate-limit.js";
import { publicCode } from "./_lib/codes.js";
import { notifyTeam, sendEmail, siteUrl, teamInbox } from "./_lib/email.js";
import { ticketCustomerEmail, ticketStaffEmail } from "./_lib/templates.js";

export default route({
    async POST(req, res, { body, ip }) {
        const message = String(body.message || "").replace(/\r\n/g, "\n").trim();
        const orderRef = cleanText(body.order).toUpperCase();
        assertValid({
            name: checkName(body.name),
            email: checkEmail(body.email),
            order: !orderRef || /^MB-?[A-Z0-9]{4,14}$/.test(orderRef) ? "" : "Order numbers start with MB, like MB-4821.",
            topic: TOPICS.includes(body.topic) ? "" : "Please choose a topic.",
            message: message.length < 10 ? "Please tell us a little more, at least 10 characters." : message.length > 600 ? "Please keep it under 600 characters." : ""
        });
        if (body.website) {
            sendJson(res, 201, { ticket: { id: publicCode("HD"), created: new Date().toISOString() }, emailed: false });
            return;
        }
        await limit("contact-ip", ip, 5, 10 * 60);

        const user = await currentUser(req);
        let ticket = null;
        for (let attempt = 0; attempt < 3 && !ticket; attempt += 1) {
            ticket = await one(
                `INSERT INTO tickets (ticket_code, user_id, name, email, order_ref, topic, message)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (ticket_code) DO NOTHING
                 RETURNING ticket_code, name, email, order_ref, topic, message, created_at`,
                [publicCode("HD"), user ? user.id : null, cleanText(body.name), normalizeEmail(body.email), orderRef, body.topic, message]
            );
        }
        if (!ticket) {
            throw new Error("Could not allocate a ticket code");
        }

        const site = siteUrl(req);
        const [staff, customer] = await Promise.all([
            notifyTeam(Object.assign({ replyTo: ticket.email }, ticketStaffEmail({ ticket, site }))),
            sendEmail(Object.assign({ to: ticket.email, replyTo: teamInbox() || undefined }, ticketCustomerEmail({ ticket, site })))
        ]);
        sendJson(res, 201, {
            ticket: { id: ticket.ticket_code, created: new Date(ticket.created_at).toISOString() },
            emailed: customer.sent,
            forwarded: staff.sent
        });
    }
});

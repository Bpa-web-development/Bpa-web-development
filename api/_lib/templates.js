// Branded email templates. Every value from a visitor goes through esc() before it
// reaches the HTML.
const money = (value) => "$" + Number(value).toFixed(2).replace(/\.00$/, "");

export function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function layout({ preheader, heading, body, cta, site }) {
    const button = cta
        ? `<p style="margin:28px 0 8px"><a href="${esc(cta.href)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#b0491f;color:#ffffff;font-weight:700;text-decoration:none">${esc(cta.label)}</a></p>`
        : "";
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#fbf6ee;font-family:Lato,'Helvetica Neue',Arial,sans-serif;color:#1d2a3a">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf6ee;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4dccd">
<tr><td style="background:#17222f;padding:20px 28px;color:#fbf6ee;font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:700">Marlowby</td></tr>
<tr><td style="height:3px;background:#e3a83b;line-height:3px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-family:'Playfair Display',Georgia,serif;font-size:26px;line-height:1.25;color:#17222f">${esc(heading)}</h1>
${body}
${button}
</td></tr>
<tr><td style="padding:18px 28px;background:#f3eadb;font-size:12px;line-height:1.5;color:#5b6470">
Marlowby: Explore your city, one box at a time.<br>
<a href="${esc(site)}" style="color:#5b6470">${esc(site.replace(/^https?:\/\//, ""))}</a> &middot; <a href="${esc(site)}/html/privacy.html" style="color:#5b6470">Privacy Policy</a> &middot; Questions? Reply to this email.<br>
Marlowby is a student project for Business Professionals of America.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const factTable = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;margin:0 0 16px">${rows.map(([label, value]) => `<tr><td style="padding:7px 12px 7px 0;color:#5b6470;white-space:nowrap;vertical-align:top;border-bottom:1px solid #efe7da">${esc(label)}</td><td style="padding:7px 0;border-bottom:1px solid #efe7da">${esc(value)}</td></tr>`).join("")}</table>`;

const p = (html) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6">${html}</p>`;

export function welcomeEmail({ name, site }) {
    const first = name.split(/\s+/)[0];
    return {
        subject: `Welcome ${first} to Marlowby`,
        text: `Welcome ${first} to Marlowby!\n\nYour account is ready. Your passport's first stamp will be Burlington, VT.\n\nPick a plan: ${site}/html/SubscriptionPlans.html\n\nIf you didn't create this account, reply to this email and we'll remove it.\n\nMarlowby`,
        html: layout({
            preheader: "Your account is ready. First stop: Burlington, VT.",
            heading: `Welcome ${first} to Marlowby!`,
            body: p("Your Marlowby account is ready. Every box adds a new city stamp to your passport, and the first one is <strong>Burlington, VT</strong>.") +
                p("Sign in any time to see your orders and keep checkout quick.") +
                p(`<span style="color:#5b6470;font-size:14px">If you didn't create this account, reply to this email and we'll remove it.</span>`),
            cta: { href: site + "/html/SubscriptionPlans.html", label: "Pick your plan" },
            site
        })
    };
}

// Notice to the team inbox when someone creates an account.
export function accountTeamEmail({ user, site }) {
    const when = new Date(user.created_at || Date.now()).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
    return {
        subject: `New account: Welcome ${user.name} to Marlowby`,
        text: `Welcome ${user.name} to Marlowby!\n\nA new account was created.\nName: ${user.name}\nEmail: ${user.email}\nCreated: ${when} ET\n\nThey were sent a welcome email.`,
        html: layout({
            preheader: `${user.name} just joined.`,
            heading: `Welcome ${user.name} to Marlowby`,
            body: p("A new account was just created on the site.") +
                factTable([["Name", user.name], ["Email", user.email], ["Created", when + " ET"]]) +
                p(`<span style="color:#5b6470;font-size:14px">They were sent a welcome email. Reply to this one to write to them directly.</span>`),
            site
        })
    };
}

function orderLineLabel(line, catalog) {
    const plan = catalog.plans[line.plan];
    const term = plan.renews ? (catalog.billing[line.term] || {}).label : line.term + " prepaid boxes";
    return `${line.qty > 1 ? line.qty + " × " : ""}${plan.name} box, ${term}`;
}

export function orderEmail({ order, lines, catalog, site }) {
    const first = order.name.split(/\s+/)[0];
    const lineLabel = (line) => orderLineLabel(line, catalog);
    const rows = lines.map((line) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e4dccd">${esc(lineLabel(line))}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e4dccd">${money(line.due)}</td></tr>`).join("");
    const discountRow = Number(order.discount) > 0
        ? `<tr><td style="padding:8px 0;color:#4a6650">Code ${esc(order.promo_code)}</td><td align="right" style="padding:8px 0;color:#4a6650">&minus;${money(order.discount)}</td></tr>`
        : "";
    return {
        subject: `Order ${order.order_number} is confirmed`,
        text: `Thanks, ${first}!\n\nOrder ${order.order_number}\n${lines.map((line) => `- ${lineLabel(line)}: ${money(line.due)}`).join("\n")}\n${Number(order.discount) > 0 ? `Code ${order.promo_code}: -${money(order.discount)}\n` : ""}Total due at launch: ${money(order.total)}\nShipping to ZIP ${order.zip}. Free shipping.\n\nBoxes ship on the 5th of each month. This is a student project, so no card was charged.\n\nMarlowby`,
        html: layout({
            preheader: `Order ${order.order_number}: ${money(order.total)} due at launch.`,
            heading: `Thanks, ${first}. Your box is reserved.`,
            body: p(`Order <strong>${esc(order.order_number)}</strong>`) +
                `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;margin:0 0 14px">${rows}${discountRow}
                <tr><td style="padding:10px 0;font-weight:700">Total due at launch</td><td align="right" style="padding:10px 0;font-weight:700">${money(order.total)}</td></tr></table>` +
                p(`Shipping to ZIP ${esc(order.zip)}, free. Boxes ship on the 5th of each month with tracking.`) +
                p(`<span style="color:#5b6470;font-size:14px">Marlowby is a student project, so no card was charged.</span>`),
            cta: { href: site + "/html/burlington.html", label: "See this month's box" },
            site
        })
    };
}

// Notice to the team inbox for every order placed on the site.
export function orderTeamEmail({ order, lines, catalog, site, member }) {
    const items = lines.map((line) => `${orderLineLabel(line, catalog)} (${money(line.due)})`).join("; ");
    return {
        subject: `New order ${order.order_number}: ${money(order.total)} from ${order.name}`,
        text: `New order ${order.order_number}\n\nCustomer: ${order.name} <${order.email}>\nAccount: ${member ? "signed in" : "guest checkout"}\nZIP: ${order.zip}\nItems: ${items}\n${order.promo_code ? `Code: ${order.promo_code} (-${money(order.discount)})\n` : ""}Total: ${money(order.total)}\n\nNo card is charged on the student site.`,
        html: layout({
            preheader: `${order.name}: ${items}`,
            heading: `Order ${order.order_number}`,
            body: factTable([
                ["Customer", `${order.name} <${order.email}>`],
                ["Account", member ? "Signed in" : "Guest checkout"],
                ["Ship to ZIP", order.zip],
                ["Items", items],
                ["Code", order.promo_code ? `${order.promo_code} (−${money(order.discount)})` : "None"],
                ["Total", money(order.total)]
            ]) + p(`<span style="color:#5b6470;font-size:14px">The customer was sent a confirmation. No card is charged on the student site. Reply to this email to write to them.</span>`),
            site
        })
    };
}

export function ticketStaffEmail({ ticket, site }) {
    const first = ticket.name.split(/\s+/)[0];
    const reply = `mailto:${ticket.email}?subject=${encodeURIComponent(`Re: ${ticket.topic} (${ticket.ticket_code})`)}`;
    return {
        subject: `[Help desk] ${ticket.ticket_code} · ${ticket.topic} · ${ticket.name}`,
        text: `New help desk ticket ${ticket.ticket_code}\n\nFrom: ${ticket.name} <${ticket.email}>\nTopic: ${ticket.topic}\nOrder: ${ticket.order_ref || "none"}\n\n${ticket.message}\n\nReply to this email to answer ${first} directly. We promise a reply within one business day.`,
        html: layout({
            preheader: `${ticket.name}: ${ticket.message.slice(0, 90)}`,
            heading: `Help desk ticket ${ticket.ticket_code}`,
            body: factTable([
                ["From", `${ticket.name} <${ticket.email}>`],
                ["Topic", ticket.topic],
                ["Order", ticket.order_ref || "None given"]
            ]) +
                `<div style="padding:14px 16px;border-left:3px solid #e3a83b;background:#fbf6ee;white-space:pre-wrap;font-size:15px;line-height:1.6">${esc(ticket.message)}</div>` +
                p(`<br><span style="color:#5b6470;font-size:14px">Hit reply to answer ${esc(first)} directly. The site promises a reply within one business day.</span>`),
            cta: { href: reply, label: `Reply to ${first}` },
            site
        })
    };
}

export function ticketCustomerEmail({ ticket, site }) {
    const first = ticket.name.split(/\s+/)[0];
    return {
        subject: `We got your message (${ticket.ticket_code})`,
        text: `Hi ${first},\n\nThanks for writing in. Your ticket number is ${ticket.ticket_code} and we'll reply within one business day.\n\nTopic: ${ticket.topic}\nYour message:\n${ticket.message}\n\nMarlowby help desk`,
        html: layout({
            preheader: `Ticket ${ticket.ticket_code}. We'll reply within one business day.`,
            heading: `Thanks, ${first}. We're on it.`,
            body: p(`Your ticket number is <strong>${esc(ticket.ticket_code)}</strong>. We reply within one business day, Monday to Friday.`) +
                p(`<strong>Topic:</strong> ${esc(ticket.topic)}`) +
                `<div style="padding:14px 16px;border-left:3px solid #e3a83b;background:#fbf6ee;white-space:pre-wrap;font-size:15px;line-height:1.6">${esc(ticket.message)}</div>`,
            cta: { href: site + "/html/faq.html", label: "Browse the FAQs" },
            site
        })
    };
}

export function newsletterEmail({ unsubscribeUrl, site }) {
    return {
        subject: "You're on the list. Here's $10 off.",
        text: `Thanks for subscribing to Postcards from the Road.\n\nYour welcome code: PASSPORT10 ($10 off any order).\nUse it here: ${site}/html/SubscriptionPlans.html\n\nUnsubscribe: ${unsubscribeUrl}\n\nMarlowby`,
        html: layout({
            preheader: "Your welcome code is PASSPORT10.",
            heading: "Postcards from the road start now",
            body: p("Thanks for subscribing. We'll send one email when each box ships, plus subscriber-only codes.") +
                p(`Your welcome code: <strong style="font-size:20px;letter-spacing:0.06em;color:#b0491f">PASSPORT10</strong> for $10 off any order.`) +
                p(`<span style="color:#5b6470;font-size:13px">Changed your mind? <a href="${esc(unsubscribeUrl)}" style="color:#5b6470">Unsubscribe</a> with one click.</span>`),
            cta: { href: site + "/html/SubscriptionPlans.html", label: "Use my code" },
            site
        })
    };
}

export function accountDeletedEmail({ name, site }) {
    const first = name.split(/\s+/)[0];
    return {
        subject: "Your Marlowby account was deleted",
        text: `Hi ${first},\n\nYour Marlowby account and saved sign-ins were deleted. If you didn't do this, reply to this email right away.\n\nMarlowby`,
        html: layout({
            preheader: "Your account and saved sign-ins were removed.",
            heading: "Your account was deleted",
            body: p(`Hi ${esc(first)}, your Marlowby account and every saved sign-in were removed.`) +
                p("If you didn't do this, reply to this email right away."),
            site
        })
    };
}

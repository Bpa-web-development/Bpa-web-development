// Sends mail through one of two providers:
//   1. Gmail over SMTP (GMAIL_USER + GMAIL_APP_PASSWORD), using nodemailer.
//   2. Resend's REST API (RESEND_API_KEY + EMAIL_FROM), https://resend.com/docs/api-reference/emails/send-email
// Gmail wins when both are set. With neither, the message is logged instead, so local
// development works offline.
import nodemailer from "nodemailer";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

let gmailTransport = null;

export function emailProvider() {
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        return "gmail";
    }
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
        return "resend";
    }
    return null;
}

export function emailConfigured() {
    return emailProvider() !== null;
}

// The team inbox that gets help desk tickets and new order and account notices.
export function teamInbox() {
    return (process.env.SUPPORT_EMAIL || process.env.GMAIL_USER || "").trim();
}

function sender() {
    if (emailProvider() === "gmail") {
        // Gmail only sends as the signed-in address, so only the display name can change.
        const name = (process.env.EMAIL_FROM_NAME || "Marlowby").replace(/["<>\r\n]/g, "");
        return `"${name}" <${process.env.GMAIL_USER}>`;
    }
    return process.env.EMAIL_FROM;
}

function gmail() {
    if (!gmailTransport) {
        gmailTransport = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.GMAIL_USER,
                // Google shows app passwords in groups of four; spaces are not part of it.
                pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "")
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000
        });
    }
    return gmailTransport;
}

// Lets tests swap in a fake SMTP transport.
export function setGmailTransport(transport) {
    gmailTransport = transport;
}

async function sendWithGmail({ to, subject, html, text, replyTo }) {
    const info = await gmail().sendMail({
        from: sender(),
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html,
        text,
        replyTo: replyTo || undefined
    });
    return { sent: true, id: info.messageId || "" };
}

async function sendWithResend({ to, subject, html, text, replyTo }) {
    const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: sender(),
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text,
            reply_to: replyTo || undefined
        }),
        signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error(`[email] Resend returned ${response.status}: ${detail.slice(0, 300)}`);
        return { sent: false, reason: "provider_error" };
    }
    const data = await response.json().catch(() => ({}));
    return { sent: true, id: data.id || "" };
}

export async function sendEmail(message) {
    const provider = emailProvider();
    if (!provider) {
        console.info(`[email] not sent (no email provider set): "${message.subject}" to ${message.to}`);
        return { sent: false, reason: "not_configured" };
    }
    if (!message.to) {
        return { sent: false, reason: "no_recipient" };
    }
    try {
        return provider === "gmail" ? await sendWithGmail(message) : await sendWithResend(message);
    } catch (error) {
        console.error(`[email] ${provider} send failed:`, error && error.message ? error.message : error);
        return { sent: false, reason: "network_error" };
    }
}

// Sends a notice to the team inbox. Never throws, so a notice can't break the visitor's request.
export async function notifyTeam(message) {
    const inbox = teamInbox();
    if (!inbox) {
        return { sent: false, reason: "no_inbox" };
    }
    return sendEmail(Object.assign({}, message, { to: inbox }));
}

export function siteUrl(req) {
    if (process.env.APP_URL) {
        return process.env.APP_URL.replace(/\/+$/, "");
    }
    const host = req && (req.headers["x-forwarded-host"] || req.headers.host);
    const proto = req && req.headers["x-forwarded-proto"] ? String(req.headers["x-forwarded-proto"]).split(",")[0] : "https";
    return host ? `${proto}://${host}` : "https://marlowbybox.vercel.app";
}

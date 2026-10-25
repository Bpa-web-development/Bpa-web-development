import { HttpError } from "./http.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

export const TOPICS = ["Boxes and shipping", "Plans and billing", "Gifts", "Deals and codes", "Your account", "Something else"];
export const NEWS_TOPICS = ["boxes", "deals", "makers"];

export function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

export function cleanText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

export function checkName(value) {
    const name = cleanText(value);
    if (name.length < 2) return "Please enter your name.";
    if (name.length > 80) return "Please keep your name under 80 characters.";
    if (CONTROL_RE.test(name) || /[<>]/.test(name)) return "Your name can't include < or >.";
    return "";
}

export function checkEmail(value) {
    const email = normalizeEmail(value);
    if (!email) return "Please enter your email address.";
    if (email.length > 254 || !EMAIL_RE.test(email)) return "Please enter a valid email address, like you@example.com.";
    return "";
}

// bcrypt only reads the first 72 bytes, so longer passwords are rejected instead of silently truncated.
export function checkPassword(value) {
    const password = typeof value === "string" ? value : "";
    if (password.length < 8) return "Use at least 8 characters.";
    if (Buffer.byteLength(password, "utf8") > 72) return "Use 72 characters or fewer.";
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Mix in at least one letter and one number.";
    return "";
}

export function checkZip(value) {
    return /^\d{5}$/.test(String(value || "").trim()) ? "" : "Please enter a 5-digit ZIP code.";
}

// Throws a 422 listing every field that failed, so the form can show each message.
export function assertValid(checks) {
    const fields = {};
    Object.entries(checks).forEach(([field, message]) => {
        if (message) fields[field] = message;
    });
    const keys = Object.keys(fields);
    if (keys.length) {
        throw new HttpError(422, fields[keys[0]], "invalid", fields);
    }
}

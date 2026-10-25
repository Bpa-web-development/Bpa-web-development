import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { query, one } from "./db.js";
import { HttpError } from "./http.js";

export const COOKIE_NAME = "mb_session";
export const BCRYPT_COST = 12;
const SESSION_DAYS = Number(process.env.SESSION_DAYS) || 30;

// Compared against when an email has no account, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "$2b$12$dlBp8FkACPeoGSx0AQzo4eVyINhO.fhjxpyBWLsN9VVzl53ryOqVG";

export function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash || DUMMY_HASH);
}

function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
}

function readCookie(req, name) {
    const header = String(req.headers.cookie || "");
    for (const part of header.split(";")) {
        const index = part.indexOf("=");
        if (index > -1 && part.slice(0, index).trim() === name) {
            return decodeURIComponent(part.slice(index + 1).trim());
        }
    }
    return "";
}

function sessionCookie(value, maxAge) {
    return [
        `${COOKIE_NAME}=${value}`,
        "Path=/",
        "HttpOnly",
        process.env.INSECURE_COOKIES === "1" ? "" : "Secure",
        "SameSite=Lax",
        `Max-Age=${maxAge}`
    ].filter(Boolean).join("; ");
}

// Sessions are random 256-bit tokens. Only their SHA-256 hash is stored, so a leaked
// database can't be used to sign in as anyone.
export async function startSession(res, userId, req) {
    const token = randomBytes(32).toString("base64url");
    const maxAge = SESSION_DAYS * 24 * 60 * 60;
    await query(
        "INSERT INTO sessions (token_hash, user_id, expires_at, user_agent) VALUES ($1, $2, now() + make_interval(days => $3), $4)",
        [hashToken(token), userId, SESSION_DAYS, String(req.headers["user-agent"] || "").slice(0, 200)]
    );
    res.setHeader("Set-Cookie", sessionCookie(token, maxAge));
    await query("DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()", [userId]);
}

export async function currentUser(req) {
    const token = readCookie(req, COOKIE_NAME);
    if (!token || token.length > 100) {
        return null;
    }
    return one(
        `SELECT u.id, u.email, u.name, u.zip, u.password_hash, u.created_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [hashToken(token)]
    );
}

export async function requireUser(req) {
    const user = await currentUser(req);
    if (!user) {
        throw new HttpError(401, "Please sign in first.", "not_signed_in");
    }
    return user;
}

export async function endSession(req, res) {
    const token = readCookie(req, COOKIE_NAME);
    if (token) {
        await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
    }
    res.setHeader("Set-Cookie", sessionCookie("", 0));
}

export function clearCookie(res) {
    res.setHeader("Set-Cookie", sessionCookie("", 0));
}

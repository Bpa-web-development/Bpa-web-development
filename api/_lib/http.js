export class HttpError extends Error {
    constructor(status, message, code, fields) {
        super(message);
        this.status = status;
        this.code = code || "error";
        this.fields = fields || undefined;
    }
}

const MAX_BODY = 16 * 1024;

export function sendJson(res, status, data, headers = {}) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    Object.entries(headers).forEach(([name, value]) => res.setHeader(name, value));
    res.end(status === 204 ? undefined : JSON.stringify(data));
}

async function readBody(req) {
    let body;
    try {
        body = req.body;
    } catch (error) {
        throw new HttpError(400, "We couldn't read that request.", "bad_json");
    }
    if (body !== undefined && body !== null && typeof body === "object" && !Buffer.isBuffer(body)) {
        return body;
    }
    let text = typeof body === "string" ? body : Buffer.isBuffer(body) ? body.toString("utf8") : null;
    if (text === null) {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
            size += chunk.length;
            if (size > MAX_BODY) {
                throw new HttpError(413, "That request is too large.", "too_large");
            }
            chunks.push(chunk);
        }
        text = Buffer.concat(chunks).toString("utf8");
    }
    if (text.length > MAX_BODY) {
        throw new HttpError(413, "That request is too large.", "too_large");
    }
    if (!text.trim()) {
        return {};
    }
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        throw new HttpError(400, "We couldn't read that request.", "bad_json");
    }
}

// Blocks cross-site form posts: state-changing requests must be JSON and, when the
// browser sends an Origin header, it must match this site.
function checkSameOrigin(req) {
    const type = String(req.headers["content-type"] || "");
    if (!type.toLowerCase().startsWith("application/json")) {
        throw new HttpError(415, "Requests must be sent as JSON.", "bad_content_type");
    }
    const origin = req.headers.origin;
    if (!origin) {
        return;
    }
    const allowed = new Set([req.headers["x-forwarded-host"], req.headers.host].filter(Boolean));
    String(process.env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean).forEach((value) => {
        try {
            allowed.add(new URL(value).host);
        } catch (error) {
        }
    });
    let host = "";
    try {
        host = new URL(origin).host;
    } catch (error) {
    }
    if (!allowed.has(host)) {
        throw new HttpError(403, "This request came from another site and was blocked.", "bad_origin");
    }
}

export function clientIp(req) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    return forwarded || String(req.headers["x-real-ip"] || "") || (req.socket && req.socket.remoteAddress) || "unknown";
}

// Wraps a route: `routes` maps HTTP methods to async (req, res, ctx) functions.
export function route(routes) {
    return async function handler(req, res) {
        const method = String(req.method || "GET").toUpperCase();
        const action = routes[method];
        try {
            if (!action) {
                res.setHeader("Allow", Object.keys(routes).join(", "));
                throw new HttpError(405, "That method isn't allowed here.", "method_not_allowed");
            }
            let body = {};
            if (method !== "GET" && method !== "HEAD") {
                checkSameOrigin(req);
                body = await readBody(req);
            }
            await action(req, res, { body, ip: clientIp(req) });
        } catch (error) {
            if (error instanceof HttpError) {
                const headers = error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {};
                sendJson(res, error.status, { error: { code: error.code, message: error.message, fields: error.fields } }, headers);
                return;
            }
            console.error("[api] unexpected error", error);
            sendJson(res, 500, { error: { code: "server_error", message: "Something went wrong on our end. Please try again." } });
        }
    };
}

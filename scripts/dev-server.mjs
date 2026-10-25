// Local development server: serves the static site and runs the /api functions the same
// way Vercel does. Usage: npm run dev, then open http://localhost:3000
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "./load-env.mjs";

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    process.env.DATABASE_URL = "pglite:" + join(root, ".data", "marlowby-dev");
    console.log("No DATABASE_URL set, so using a local database in .data/ (pglite).");
}

// Some browsers (Safari) drop Secure cookies on http://localhost, so dev sessions skip the flag.
process.env.INSECURE_COOKIES = process.env.INSECURE_COOKIES || "1";

const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
    ".md": "text/markdown; charset=utf-8"
};
const BLOCKED = ["api", "scripts", "tests", "node_modules", ".data", ".env", ".env.local", ".git"];

async function serveApi(req, res, pathname) {
    const name = pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
    if (!/^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(name)) {
        res.writeHead(404).end();
        return;
    }
    const file = join(root, "api", name + ".js");
    try {
        await stat(file);
    } catch (error) {
        res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: { code: "not_found", message: "No such endpoint." } }));
        return;
    }
    req.headers["x-forwarded-for"] = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const { default: handler } = await import(pathToFileURL(file).href);
    await handler(req, res);
}

async function serveStatic(res, pathname) {
    let path = decodeURIComponent(pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(root, path));
    const top = path.split("/")[1] || "";
    if (!file.startsWith(root + sep) || BLOCKED.includes(top)) {
        res.writeHead(404).end("Not found");
        return;
    }
    try {
        const body = await readFile(file);
        res.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
        res.end(body);
    } catch (error) {
        res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    }
}

createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    try {
        if (pathname.startsWith("/api/")) {
            await serveApi(req, res, pathname);
        } else {
            await serveStatic(res, pathname);
        }
    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.writeHead(500).end("Server error");
    }
}).listen(PORT, () => {
    console.log(`Marlowby running at http://localhost:${PORT}`);
});

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { HttpError } from "./http.js";

// Production uses Neon Postgres over HTTP, which suits short-lived serverless functions.
// Local development can set DATABASE_URL=pglite:memory (or pglite:./.data/db) to run an
// in-process Postgres with no account needed.
let runner = null;

async function connect() {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
    if (!url) {
        throw new HttpError(503, "Accounts are temporarily unavailable. Please try again soon.", "db_not_configured");
    }
    if (url.startsWith("pglite:")) {
        const moduleName = "@electric-sql/pglite";
        const { PGlite } = await import(moduleName);
        const target = url.slice("pglite:".length);
        const db = new PGlite(target === "memory" || !target ? undefined : target);
        await db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
        return async (text, params) => (await db.query(text, params)).rows;
    }
    const sql = neon(url);
    return (text, params) => sql.query(text, params);
}

export async function query(text, params = []) {
    if (!runner) {
        runner = connect().catch((error) => {
            runner = null;
            throw error;
        });
    }
    const run = await runner;
    return run(text, params);
}

export async function one(text, params = []) {
    const rows = await query(text, params);
    return rows[0] || null;
}

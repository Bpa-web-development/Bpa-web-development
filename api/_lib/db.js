import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { HttpError } from "./http.js";

// Production uses Neon Postgres over HTTP, which suits short-lived serverless functions.
// Local development can set DATABASE_URL=pglite:memory (or pglite:./.data/db) to run an
// in-process Postgres with no account needed.
let runner = null;

const URL_NAMES = ["DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

export function databaseUrl() {
    const name = URL_NAMES.find((key) => process.env[key]);
    return name ? process.env[name] : "";
}

function schemaStatements() {
    return readFileSync(new URL("./schema.sql", import.meta.url), "utf8")
        .replace(/--.*$/gm, "")
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean);
}

async function connect() {
    const url = databaseUrl();
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
    // Creates the tables on first use, so a fresh Neon database works without running
    // npm run db:migrate. Every statement is CREATE ... IF NOT EXISTS, so this is safe.
    const [row] = await sql.query("SELECT to_regclass('public.rate_limits') IS NOT NULL AS ready");
    if (!row || !row.ready) {
        for (const statement of schemaStatements()) {
            await sql.query(statement);
        }
    }
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

// Creates or updates the database tables. Usage: npm run db:migrate
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./load-env.mjs";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
    console.error("DATABASE_URL is not set. Put it in .env.local (see .env.example) or run: vercel env pull .env.local");
    process.exit(1);
}
if (url.startsWith("pglite:")) {
    console.log("pglite databases create their tables automatically. Nothing to do.");
    process.exit(0);
}

const { neon } = await import("@neondatabase/serverless");
const sql = neon(url);
const schema = readFileSync(join(root, "api/_lib/schema.sql"), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
const statements = schema.split(/;\s*$/m).map((statement) => statement.trim()).filter(Boolean);

for (const statement of statements) {
    await sql.query(statement);
    console.log("✓ " + statement.split("\n")[0].replace(/\s*\($/, ""));
}
console.log(`\nDatabase is ready (${statements.length} statements).`);

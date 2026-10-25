// Copies partials/navbar.html into every page so the navbar markup is identical site-wide.
// Usage: node scripts/sync-navbar.mjs          (write changes)
//        node scripts/sync-navbar.mjs --check  (exit 1 if any page is out of date)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const START = "<!-- site-nav:start (generated from partials/navbar.html, run `npm run nav:sync` after editing) -->";
const END = "<!-- site-nav:end -->";
const CSS_TAG = '<link rel="stylesheet" href="/css/navbar.css">';
const JS_TAG = '<script src="/js/navbar.js" defer></script>';
const INDENT = "    ";

const partial = readFileSync(join(root, "partials/navbar.html"), "utf8").trimEnd();
const block = [START, ...partial.split("\n"), END]
    .map((line) => (line ? INDENT + line : line))
    .join("\n");

const pages = ["index.html", ...readdirSync(join(root, "html")).filter((name) => name.endsWith(".html")).map((name) => "html/" + name)];

const markerRe = new RegExp("[ \\t]*" + escape(START) + "[\\s\\S]*?" + escape(END));
const legacyRe = /[ \t]*<nav class="navbar"[^>]*>[\s\S]*?<\/nav>/;

function escape(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let stale = 0;
for (const page of pages) {
    const file = join(root, page);
    const before = readFileSync(file, "utf8");
    const eol = before.includes("\r\n") ? "\r\n" : "\n";
    let html = before.replace(/\r\n/g, "\n");

    if (markerRe.test(html)) {
        html = html.replace(markerRe, () => block);
    } else if (legacyRe.test(html)) {
        html = html.replace(legacyRe, () => block);
    } else {
        console.error(`✗ ${page}: no navbar found. Add an empty ${START} ... ${END} block where it belongs.`);
        process.exitCode = 1;
        continue;
    }

    html = html.replace(/[ \t]*<script src="https:\/\/kit\.fontawesome\.com\/[^"]+"[^>]*><\/script>\n?/, "");
    html = html.replace(/[ \t]*<!-- Font Awesome Icon Link -->\n\s*\n?/, "");

    if (!html.includes(CSS_TAG)) {
        html = html.replace(/([ \t]*)(<link rel="stylesheet" href="\/css\/style\.css">)/, `$1$2\n$1${CSS_TAG}`);
    }
    if (!html.includes(JS_TAG)) {
        html = html.replace(/([ \t]*)(<link rel="stylesheet" href="\/css\/navbar\.css">)/, `$1$2\n$1${JS_TAG}`);
    }
    if (!html.includes(CSS_TAG) || !html.includes(JS_TAG)) {
        console.error(`✗ ${page}: could not add navbar.css/navbar.js (no /css/style.css link found).`);
        process.exitCode = 1;
        continue;
    }

    const after = html.replace(/\n/g, eol);
    if (after !== before) {
        stale += 1;
        if (check) {
            console.error(`✗ ${page} has an out-of-date navbar`);
        } else {
            writeFileSync(file, after);
            console.log(`✓ updated ${page}`);
        }
    }
}

if (check && stale) {
    console.error(`\n${stale} page(s) out of date. Run: npm run nav:sync`);
    process.exitCode = 1;
} else if (!stale && !process.exitCode) {
    console.log(`✓ navbar identical on all ${pages.length} pages`);
}

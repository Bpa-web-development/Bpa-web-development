(function () {
    "use strict";

    function escape(text) {
        return text.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
    }

    function highlight(text, query) {
        if (!query) {
            return escape(text);
        }
        const index = text.toLowerCase().indexOf(query);
        if (index < 0) {
            return escape(text);
        }
        return escape(text.slice(0, index)) + "<mark>" + escape(text.slice(index, index + query.length)) + "</mark>" + escape(text.slice(index + query.length));
    }

    document.addEventListener("DOMContentLoaded", () => {
        const input = document.getElementById("smFilter");
        const count = document.getElementById("smCount");
        const empty = document.getElementById("smEmpty");
        const form = document.querySelector("[data-sitemap-search]");
        if (!input) {
            return;
        }
        const groups = Array.from(document.querySelectorAll("[data-sitemap-group]"));
        const items = Array.from(document.querySelectorAll("[data-sitemap-item]")).map((item) => {
            const link = item.querySelector("a");
            const note = item.querySelector("span");
            return { item, link, note, name: link.textContent, desc: note.textContent };
        });
        const total = items.length;
        let timer = null;

        function run() {
            const query = input.value.trim().toLowerCase();
            let shown = 0;
            items.forEach((entry) => {
                const group = entry.item.closest("[data-sitemap-group]").querySelector("h2").textContent.toLowerCase();
                const match = !query || entry.name.toLowerCase().includes(query) || entry.desc.toLowerCase().includes(query) || group.includes(query);
                entry.item.hidden = !match;
                entry.link.innerHTML = highlight(entry.name, query);
                entry.note.innerHTML = highlight(entry.desc, query);
                if (match) {
                    shown += 1;
                }
            });
            groups.forEach((group) => {
                group.hidden = !group.querySelector("[data-sitemap-item]:not([hidden])");
            });
            empty.hidden = shown > 0;
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                count.textContent = query ? "Showing " + shown + " of " + total + " pages and sections for “" + input.value.trim() + "”." : "Showing all " + total + " pages and sections.";
            }, 250);
        }

        input.addEventListener("input", run);
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const first = items.find((entry) => !entry.item.hidden);
            if (first) {
                first.link.focus();
            }
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "/" && document.activeElement && !/input|textarea|select/i.test(document.activeElement.tagName)) {
                event.preventDefault();
                input.focus();
            }
        });
    });
})();

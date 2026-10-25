(function () {
    "use strict";

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const TICKET_KEY = "marlowbyTickets";
    const MESSAGE_MAX = 600;
    const STEPS = ["Received", "Assigned", "Answered"];

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function initStatus() {
        const badge = $("#fqStatus");
        const text = $("#fqStatusText");
        if (!badge) {
            return;
        }
        const render = () => {
            const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
            const get = (type) => (parts.find((part) => part.type === type) || {}).value;
            const day = get("weekday");
            const hour = Number(get("hour"));
            const weekday = !["Sat", "Sun"].includes(day);
            const open = weekday && hour >= 9 && hour < 18;
            badge.classList.toggle("is-open", open);
            if (open) {
                text.textContent = "Open now until 6pm ET";
            } else if (weekday && hour < 9) {
                text.textContent = "Closed. Opens today at 9am ET";
            } else {
                text.textContent = "Closed. Tickets are still welcome";
            }
        };
        render();
        window.setInterval(render, 60000);
    }

    function initAnswers() {
        const input = $("#fqSearch");
        const clear = $("#fqClear");
        const count = $("#fqCount");
        const empty = $("#fqEmpty");
        const emptyTerm = $("#fqEmptyTerm");
        const groups = $$(".fq-group");
        const items = $$(".fq-item");
        const chips = $$(".fq-chip");
        let topic = "all";

        items.forEach((item) => {
            const summary = $("summary", item);
            const body = $(".fq-item_body", item);
            item.dataset.text = (summary.textContent + " " + body.textContent).toLowerCase();
            summary.dataset.original = summary.innerHTML;
            $$("p", body).forEach((p) => (p.dataset.original = p.innerHTML));
            item.addEventListener("toggle", () => {
                if (!item.open) {
                    return;
                }
                $$(".fq-item", item.parentElement).forEach((other) => {
                    if (other !== item && other.open) {
                        other.open = false;
                    }
                });
            });
        });

        function highlight(element, pattern) {
            element.innerHTML = element.dataset.original;
            if (!pattern) {
                return;
            }
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (walker.nextNode()) {
                nodes.push(walker.currentNode);
            }
            nodes.forEach((node) => {
                const value = node.nodeValue;
                pattern.lastIndex = 0;
                if (!pattern.test(value)) {
                    return;
                }
                pattern.lastIndex = 0;
                const fragment = document.createDocumentFragment();
                let last = 0;
                value.replace(pattern, (match, offset) => {
                    fragment.appendChild(document.createTextNode(value.slice(last, offset)));
                    const mark = document.createElement("mark");
                    mark.textContent = match;
                    fragment.appendChild(mark);
                    last = offset + match.length;
                    return match;
                });
                fragment.appendChild(document.createTextNode(value.slice(last)));
                node.parentNode.replaceChild(fragment, node);
            });
        }

        function apply() {
            const query = input.value.trim().toLowerCase();
            const words = query.split(/\s+/).filter(Boolean);
            const pattern = words.length ? new RegExp(words.map(escapeRegex).join("|"), "gi") : null;
            let shown = 0;
            items.forEach((item) => {
                const group = item.closest(".fq-group").dataset.group;
                const topicOk = topic === "all" || topic === group;
                const textOk = words.every((word) => item.dataset.text.includes(word));
                const visible = topicOk && textOk;
                item.hidden = !visible;
                highlight($("summary", item), visible ? pattern : null);
                $$(".fq-item_body p", item).forEach((p) => highlight(p, visible ? pattern : null));
                if (visible) {
                    shown += 1;
                }
            });
            groups.forEach((group) => {
                group.hidden = !$$(".fq-item", group).some((item) => !item.hidden);
            });
            clear.hidden = !query;
            empty.hidden = shown > 0;
            emptyTerm.textContent = query ? "“" + input.value.trim() + "”" : "that topic";
            if (!query && topic === "all") {
                count.textContent = "";
            } else {
                count.textContent = shown === 0 ? "No answers match." : shown + (shown === 1 ? " answer matches." : " answers match.");
            }
        }

        let timer = 0;
        input.addEventListener("input", () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(apply, 120);
        });
        $("#fqSearchForm").addEventListener("submit", (event) => {
            event.preventDefault();
            apply();
            const first = items.find((item) => !item.hidden);
            if (first) {
                first.open = true;
                $("summary", first).focus();
            }
        });
        clear.addEventListener("click", () => {
            input.value = "";
            apply();
            input.focus();
        });

        chips.forEach((chip) => {
            chip.addEventListener("click", () => {
                topic = chip.dataset.topic;
                chips.forEach((other) => {
                    const on = other === chip;
                    other.classList.toggle("is-active", on);
                    other.setAttribute("aria-pressed", String(on));
                });
                apply();
                if (topic !== "all") {
                    const target = $("#" + topic);
                    if (target && !target.hidden) {
                        target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
                    }
                }
            });
        });

        const hash = window.location.hash.slice(1);
        const start = chips.find((chip) => chip.dataset.topic === hash);
        if (start) {
            start.click();
        }
    }

    function readTickets() {
        try {
            const list = JSON.parse(localStorage.getItem(TICKET_KEY) || "[]");
            return Array.isArray(list) ? list : [];
        } catch (error) {
            return [];
        }
    }

    function saveTickets(list) {
        try {
            localStorage.setItem(TICKET_KEY, JSON.stringify(list));
            return true;
        } catch (error) {
            return false;
        }
    }

    function initHelpdesk() {
        const form = $("#fqTicket");
        if (!form) {
            return;
        }
        const live = $("#fqLive");
        const list = $("#fqTicketsList");
        const emptyNote = $("#fqTicketsEmpty");
        const message = $("#tkMessage");
        const honeypot = $("#tkWebsite");
        const counter = $("#tkCount");
        const fields = {
            name: $("#tkName"),
            email: $("#tkEmail"),
            order: $("#tkOrder"),
            topic: $("#tkTopic"),
            message
        };
        let tickets = readTickets();

        function say(text) {
            live.textContent = "";
            window.setTimeout(() => (live.textContent = text), 60);
        }

        function render() {
            list.replaceChildren();
            emptyNote.hidden = tickets.length > 0;
            tickets.forEach((ticket) => {
                const li = document.createElement("li");
                li.className = "fq-tk";
                const top = document.createElement("div");
                top.className = "fq-tk_top";
                const id = document.createElement("p");
                id.className = "fq-tk_id";
                id.textContent = ticket.id;
                const date = document.createElement("p");
                date.className = "fq-tk_date";
                date.textContent = new Date(ticket.created).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
                top.append(id, date);
                const topicLine = document.createElement("p");
                topicLine.className = "fq-tk_topic";
                topicLine.textContent = ticket.topic + (ticket.order ? " · " + ticket.order : "");
                const steps = document.createElement("ol");
                steps.className = "fq-tk_steps";
                steps.setAttribute("aria-label", "Ticket status: " + STEPS[0]);
                STEPS.forEach((step, index) => {
                    const item = document.createElement("li");
                    item.textContent = step;
                    if (index === 0) {
                        item.classList.add("is-done");
                        item.setAttribute("aria-current", "step");
                    }
                    steps.appendChild(item);
                });
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "fq-tk_remove";
                remove.textContent = "Remove ticket";
                remove.setAttribute("aria-label", "Remove ticket " + ticket.id);
                remove.addEventListener("click", () => {
                    tickets = tickets.filter((entry) => entry.id !== ticket.id);
                    saveTickets(tickets);
                    render();
                    say("Ticket " + ticket.id + " removed.");
                    const next = $(".fq-tk_remove", list);
                    (next || fields.name).focus();
                });
                li.append(top, topicLine, steps, remove);
                list.appendChild(li);
            });
        }

        function setError(field, text) {
            const wrap = field.closest(".fq-field");
            const error = $(".fq-error", wrap);
            error.textContent = text;
            wrap.classList.toggle("has-error", Boolean(text));
            if (text) {
                field.setAttribute("aria-invalid", "true");
            } else {
                field.removeAttribute("aria-invalid");
            }
            return !text;
        }

        const checks = {
            name: () => setError(fields.name, fields.name.value.trim().length >= 2 ? "" : "Please enter your name."),
            email: () => setError(fields.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email.value.trim()) ? "" : "Please enter a valid email address, like you@example.com."),
            order: () => {
                const value = fields.order.value.trim();
                return setError(fields.order, !value || /^MB-?[A-Z0-9]{4,14}$/i.test(value) ? "" : "Order numbers start with MB, like MB-4821.");
            },
            topic: () => setError(fields.topic, fields.topic.value ? "" : "Please choose a topic."),
            message: () => setError(message, message.value.trim().length >= 10 ? "" : "Please tell us a little more, at least 10 characters.")
        };

        Object.keys(fields).forEach((key) => {
            const field = fields[key];
            field.addEventListener(field.tagName === "SELECT" ? "change" : "blur", () => {
                if (field.value.trim() || field.closest(".fq-field").classList.contains("has-error")) {
                    checks[key]();
                }
            });
            field.addEventListener("input", () => {
                if (field.closest(".fq-field").classList.contains("has-error")) {
                    checks[key]();
                }
            });
        });

        fields.order.addEventListener("input", () => {
            const caret = fields.order.selectionStart;
            fields.order.value = fields.order.value.toUpperCase();
            fields.order.setSelectionRange(caret, caret);
        });

        function updateCounter() {
            const length = message.value.length;
            counter.textContent = length + " of " + MESSAGE_MAX + " characters";
            counter.classList.toggle("is-near", length > MESSAGE_MAX - 60);
        }
        message.addEventListener("input", updateCounter);
        updateCounter();

        const submitButton = $("button[type=submit]", form);

        async function sendTicket(payload) {
            if (window.Marlowby && window.Marlowby.api) {
                return window.Marlowby.api("contact", { method: "POST", body: payload });
            }
            const response = await fetch("/api/contact", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const error = new Error((data.error && data.error.message) || "We couldn't send your ticket. Please try again.");
                error.fields = (data.error && data.error.fields) || {};
                throw error;
            }
            return data;
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const results = Object.keys(checks).map((key) => [key, checks[key]()]);
            const firstBad = results.find(([, ok]) => !ok);
            if (firstBad) {
                fields[firstBad[0]].focus();
                say("Please fix the highlighted fields.");
                return;
            }
            const order = fields.order.value.trim().toUpperCase();
            const payload = {
                name: fields.name.value.trim(),
                email: fields.email.value.trim(),
                order,
                topic: fields.topic.value,
                message: message.value.trim(),
                website: honeypot ? honeypot.value : ""
            };
            const label = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = "Sending…";
            let result;
            try {
                result = await sendTicket(payload);
            } catch (error) {
                const fieldErrors = error.fields || {};
                Object.keys(fieldErrors).forEach((key) => {
                    const field = key === "message" ? message : fields[key];
                    if (field) {
                        setError(field, fieldErrors[key]);
                    }
                });
                say(error.message || "We couldn't send your ticket. Please try again.");
                submitButton.disabled = false;
                submitButton.textContent = label;
                return;
            }
            submitButton.disabled = false;
            submitButton.textContent = label;
            const ticket = {
                id: result.ticket.id,
                created: Date.parse(result.ticket.created) || Date.now(),
                name: payload.name,
                email: payload.email,
                order,
                topic: payload.topic,
                message: payload.message
            };
            tickets = [ticket].concat(tickets).slice(0, 20);
            saveTickets(tickets);
            render();
            fields.order.value = "";
            fields.topic.value = "";
            message.value = "";
            updateCounter();
            say("Ticket " + ticket.id + " sent." + (result.emailed ? " We emailed a copy to " + ticket.email + "." : "") + " We'll reply within one business day.");
            const first = $(".fq-tk_id", list);
            if (first) {
                first.setAttribute("tabindex", "-1");
                first.focus();
            }
        });

        function prefill() {
            const M = window.Marlowby;
            const user = M && M.account && typeof M.account.publicUser === "function" ? M.account.publicUser() : null;
            if (!user) {
                return;
            }
            if (!fields.name.value) {
                fields.name.value = user.name || "";
            }
            if (!fields.email.value) {
                fields.email.value = user.email || "";
            }
        }
        document.addEventListener("marlowby:account", prefill);
        prefill();
        render();
    }

    function initCopy() {
        const button = $("#fqCopyEmail");
        const value = $("#fqEmail");
        if (!button) {
            return;
        }
        let timer = 0;
        function done(ok) {
            button.textContent = ok ? "Copied!" : "Press Ctrl+C to copy";
            button.classList.toggle("is-done", ok);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                button.textContent = "Copy email";
                button.classList.remove("is-done");
            }, 2000);
        }
        function selectText() {
            const range = document.createRange();
            range.selectNodeContents(value);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
        button.addEventListener("click", () => {
            const text = value.textContent.trim();
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => done(true), () => {
                    selectText();
                    done(false);
                });
            } else {
                selectText();
                done(false);
            }
        });
    }

    function init() {
        initStatus();
        initAnswers();
        initHelpdesk();
        initCopy();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

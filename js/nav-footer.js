(function () {
    "use strict";

    const NEWS_KEY = "marlowbyNewsletter";
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function readNews() {
        try {
            return JSON.parse(localStorage.getItem(NEWS_KEY) || "null");
        } catch (error) {
            return null;
        }
    }

    function saveNews(value) {
        try {
            if (value) {
                localStorage.setItem(NEWS_KEY, JSON.stringify(value));
            } else {
                localStorage.removeItem(NEWS_KEY);
            }
        } catch (error) {
        }
    }

    function initNewsletter() {
        const form = document.querySelector("[data-newsletter]");
        if (!form) {
            return;
        }
        const field = form.querySelector(".site-footer-news_field");
        const input = form.querySelector("input[type=email]");
        const msg = form.querySelector(".site-footer-news_msg");
        const done = document.querySelector("[data-newsletter-done]");
        const doneText = done.querySelector("[data-newsletter-text]");

        function showDone(entry, fresh) {
            form.hidden = true;
            done.hidden = false;
            doneText.textContent = fresh
                ? "You're in! Here's your welcome code."
                : "Subscribed as " + entry.email + ".";
        }

        function setError(text) {
            msg.textContent = text;
            msg.classList.toggle("is-error", Boolean(text));
            field.classList.toggle("is-invalid", Boolean(text));
            input.setAttribute("aria-invalid", text ? "true" : "false");
        }

        const saved = readNews();
        if (saved && saved.email) {
            showDone(saved, false);
        }

        input.addEventListener("input", () => {
            if (field.classList.contains("is-invalid") && EMAIL_RE.test(input.value.trim())) {
                setError("");
            }
        });

        async function callNewsletter(method, body) {
            const response = await fetch("/api/newsletter", {
                method,
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error((data.error && data.error.message) || "We couldn't reach Marlowby. Please try again.");
            }
            return data;
        }

        const submit = form.querySelector("button[type=submit]");

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = input.value.trim().toLowerCase();
            if (!email) {
                setError("Enter your email address to subscribe.");
                input.focus();
                return;
            }
            if (!EMAIL_RE.test(email)) {
                setError("Enter a valid email, like name@example.com.");
                input.focus();
                return;
            }
            const topics = Array.from(form.querySelectorAll("input[name=topics]:checked")).map((box) => box.value);
            setError("");
            submit.disabled = true;
            msg.textContent = "Subscribing…";
            try {
                const result = await callNewsletter("POST", { email, topics });
                const entry = { email, topics, token: result.token, since: new Date().toISOString() };
                saveNews(entry);
                msg.textContent = "";
                showDone(entry, true);
                if (result.emailed) {
                    doneText.textContent = "You're in! We emailed your welcome code to " + email + ".";
                }
                done.querySelector("[data-newsletter-focus]").focus();
            } catch (error) {
                setError(error.message);
            } finally {
                submit.disabled = false;
            }
        });

        const copy = done.querySelector("[data-newsletter-copy]");
        copy.addEventListener("click", () => {
            const code = copy.dataset.newsletterCopy;
            const finish = (ok) => {
                copy.textContent = ok ? "Copied" : "Select and copy";
                window.setTimeout(() => (copy.textContent = "Copy code"), 2000);
            };
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(code).then(() => finish(true), () => finish(false));
            } else {
                finish(false);
            }
        });

        done.querySelector(".site-footer-news_reset").addEventListener("click", async () => {
            const saved = readNews();
            if (saved && saved.token) {
                try {
                    await callNewsletter("DELETE", { token: saved.token });
                } catch (error) {
                    msg.textContent = error.message;
                    return;
                }
            }
            saveNews(null);
            done.hidden = true;
            form.hidden = false;
            form.reset();
            msg.textContent = "You're unsubscribed.";
            input.focus();
        });
    }

    function initFooterExtras() {
        const a11y = document.querySelector("[data-open-a11y]");
        const opener = document.getElementById("accessibilityOpen");
        if (a11y) {
            if (opener) {
                a11y.addEventListener("click", () => opener.click());
            } else {
                a11y.closest("li").remove();
            }
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        initNewsletter();
        initFooterExtras();
    });
})();

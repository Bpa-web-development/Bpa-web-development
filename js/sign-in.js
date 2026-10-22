(function () {
    "use strict";

    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const LEVELS = ["Too weak", "Weak", "Okay", "Strong", "Very strong"];
    const $ = (selector) => document.querySelector(selector);

    function setError(input, message) {
        const box = document.getElementById(input.id + "Error");
        box.textContent = message;
        if (message) {
            input.setAttribute("aria-invalid", "true");
        } else {
            input.removeAttribute("aria-invalid");
        }
        return !message;
    }

    function checkName(input) {
        const value = input.value.trim();
        if (!value) {
            return setError(input, "Enter your name.");
        }
        if (value.length < 2) {
            return setError(input, "Your name needs at least 2 letters.");
        }
        return setError(input, "");
    }

    function checkEmail(input) {
        const value = input.value.trim();
        if (!value) {
            return setError(input, "Enter your email address.");
        }
        if (!EMAIL.test(value)) {
            return setError(input, "That email looks incomplete. Try name@example.com.");
        }
        return setError(input, "");
    }

    function checkPassword(input, M, strict) {
        if (!input.value) {
            return setError(input, "Enter your password.");
        }
        return setError(input, strict ? M.account.checkPassword(input.value) : "");
    }

    function initials(name) {
        return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    }

    function formatDate(iso) {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
            return "Today";
        }
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    function init(M) {
        const card = $(".si-card");
        const auth = $("#siAuth");
        const profile = $("#siProfile");
        const status = $("#siStatus");
        const tabs = {
            signin: { tab: $("#siTabSignin"), panel: $("#siPanelSignin"), first: $("#siInEmail") },
            signup: { tab: $("#siTabSignup"), panel: $("#siPanelSignup"), first: $("#siUpName") }
        };
        let active = "signin";
        let fresh = false;

        function flash() {
            card.classList.remove("is-switching");
            void card.offsetWidth;
            card.classList.add("is-switching");
        }

        function selectTab(name, focus) {
            active = name;
            Object.keys(tabs).forEach((key) => {
                const on = key === name;
                tabs[key].tab.setAttribute("aria-selected", String(on));
                tabs[key].tab.tabIndex = on ? 0 : -1;
                tabs[key].panel.hidden = !on;
            });
            flash();
            if (focus === "tab") {
                tabs[name].tab.focus();
            } else if (focus === "field") {
                tabs[name].first.focus();
            }
            if (history.replaceState) {
                history.replaceState(null, "", name === "signup" ? "#create" : location.pathname);
            }
        }

        Object.keys(tabs).forEach((key) => {
            tabs[key].tab.addEventListener("click", () => selectTab(key));
            tabs[key].tab.addEventListener("keydown", (event) => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                    event.preventDefault();
                    const next = event.key === "Home" ? "signin" : event.key === "End" ? "signup" : active === "signin" ? "signup" : "signin";
                    selectTab(next, "tab");
                }
            });
        });

        document.querySelectorAll("[data-si-tab]").forEach((button) => {
            button.addEventListener("click", () => {
                const target = button.dataset.siTab;
                const email = active === "signin" ? $("#siInEmail").value : $("#siUpEmail").value;
                if (target === "signup" && email && !$("#siUpEmail").value) {
                    $("#siUpEmail").value = email;
                }
                if (target === "signin" && email && !$("#siInEmail").value) {
                    $("#siInEmail").value = email;
                }
                selectTab(target, "field");
            });
        });

        document.querySelectorAll(".si-eye").forEach((button) => {
            const input = document.getElementById(button.getAttribute("aria-controls"));
            button.setAttribute("aria-label", "Show password");
            button.addEventListener("click", () => {
                const show = input.type === "password";
                input.type = show ? "text" : "password";
                button.textContent = show ? "Hide" : "Show";
                button.setAttribute("aria-pressed", String(show));
                button.setAttribute("aria-label", show ? "Hide password" : "Show password");
                input.focus();
            });
        });

        const meterBar = $("#siMeterBar");
        const meterLabel = $("#siMeterLabel");
        $("#siUpPassword").addEventListener("input", (event) => {
            const value = event.target.value;
            if (!value) {
                meterBar.style.width = "0";
                meterLabel.textContent = "";
                return;
            }
            const level = M.account.passwordStrength(value);
            meterBar.dataset.level = String(level);
            meterBar.style.width = Math.max(10, level * 25) + "%";
            meterLabel.textContent = "Strength: " + LEVELS[level] + ".";
            if (event.target.getAttribute("aria-invalid") === "true") {
                checkPassword(event.target, M, true);
            }
        });

        const validators = {
            siInEmail: (input) => checkEmail(input),
            siInPassword: (input) => checkPassword(input, M, false),
            siUpName: (input) => checkName(input),
            siUpEmail: (input) => checkEmail(input),
            siUpPassword: (input) => checkPassword(input, M, true)
        };

        Object.keys(validators).forEach((id) => {
            const input = document.getElementById(id);
            input.addEventListener("blur", () => {
                if (input.value) {
                    validators[id](input);
                }
            });
            input.addEventListener("input", () => {
                if (input.getAttribute("aria-invalid") === "true" && id !== "siUpPassword") {
                    validators[id](input);
                }
            });
        });

        function validate(ids) {
            let firstBad = null;
            ids.forEach((id) => {
                const input = document.getElementById(id);
                if (!validators[id](input) && !firstBad) {
                    firstBad = input;
                }
            });
            if (firstBad) {
                firstBad.focus();
            }
            return !firstBad;
        }

        async function submit(form, ids, alertBox, button, busyText, action) {
            alertBox.textContent = "";
            status.textContent = "";
            if (!validate(ids)) {
                return;
            }
            const label = button.textContent;
            button.disabled = true;
            button.textContent = busyText;
            try {
                await action();
                form.reset();
                document.querySelectorAll(".si-eye").forEach((eye) => {
                    document.getElementById(eye.getAttribute("aria-controls")).type = "password";
                    eye.textContent = "Show";
                    eye.setAttribute("aria-pressed", "false");
                    eye.setAttribute("aria-label", "Show password");
                });
                meterBar.style.width = "0";
                meterLabel.textContent = "";
            } catch (error) {
                alertBox.textContent = error && error.message ? error.message : "Something went wrong. Please try again.";
                if (error && error.code === "exists") {
                    const link = document.createElement("button");
                    link.type = "button";
                    link.className = "si-link";
                    link.textContent = "Sign in with this email";
                    link.addEventListener("click", () => {
                        $("#siInEmail").value = $("#siUpEmail").value;
                        selectTab("signin");
                        $("#siInPassword").focus();
                    });
                    alertBox.append(" ", link);
                }
            } finally {
                button.disabled = false;
                button.textContent = label;
            }
        }

        $("#siSigninForm").addEventListener("submit", (event) => {
            event.preventDefault();
            submit(event.target, ["siInEmail", "siInPassword"], $("#siSigninAlert"), $("#siSigninSubmit"), "Unlocking…", () => M.account.signIn({
                email: $("#siInEmail").value.trim(),
                password: $("#siInPassword").value
            }));
        });

        $("#siSignupForm").addEventListener("submit", (event) => {
            event.preventDefault();
            submit(event.target, ["siUpName", "siUpEmail", "siUpPassword"], $("#siSignupAlert"), $("#siSignupSubmit"), "Creating your account…", () => {
                fresh = true;
                return M.account.signUp({
                    name: $("#siUpName").value.trim(),
                    email: $("#siUpEmail").value.trim(),
                    password: $("#siUpPassword").value
                }).catch((error) => {
                    fresh = false;
                    throw error;
                });
            });
        });

        function renderPlan(user) {
            const box = $("#siPlan");
            box.replaceChildren();
            const subs = user.subscriptions || [];
            if (!subs.length) {
                const text = document.createElement("p");
                text.style.margin = "0";
                const strong = document.createElement("b");
                strong.textContent = "No box yet.";
                text.append(strong, " Your first stamp will be Burlington, VT.");
                box.append(text);
                $("#siPlansLink").textContent = "Pick your plan";
                return;
            }
            const title = document.createElement("b");
            title.textContent = "Your boxes";
            const list = document.createElement("ul");
            subs.slice(-3).reverse().forEach((sub) => {
                const plan = M.catalog.plan(sub.plan);
                const term = M.catalog.data.billing && M.catalog.data.billing[sub.term];
                const item = document.createElement("li");
                item.textContent = (plan ? plan.name : sub.plan) + " box" + (term && term.label ? ", " + term.label : "") + (sub.qty > 1 ? " x" + sub.qty : "");
                list.append(item);
            });
            box.append(title, list);
            $("#siPlansLink").textContent = "Add another box";
        }

        function render(user) {
            const signedIn = Boolean(user);
            auth.hidden = signedIn;
            profile.hidden = !signedIn;
            flash();
            if (signedIn) {
                $("#siAvatar").textContent = initials(user.name);
                $("#siHello").textContent = (fresh ? "Welcome, " : "Welcome back, ") + user.firstName;
                $("#siEmail").textContent = user.email;
                $("#siSince").textContent = formatDate(user.created);
                $("#siSubs").textContent = String((user.subscriptions || []).length);
                renderPlan(user);
            }
        }

        $("#siSignOut").addEventListener("click", () => {
            fresh = false;
            M.account.signOut();
        });

        document.addEventListener("marlowby:account", (event) => {
            const detail = event.detail || {};
            render(detail.user);
            if (detail.reason === "signin") {
                status.textContent = "You're signed in as " + detail.user.firstName + ".";
                $("#siHello").focus();
            } else if (detail.reason === "signout") {
                status.textContent = "You've signed out. See you next month.";
                selectTab("signin", "field");
            }
        });

        if (!M.account.available) {
            const warn = "Accounts need a secure connection. Open the site through Live Server or https to sign in.";
            $("#siSigninAlert").textContent = warn;
            $("#siSignupAlert").textContent = warn;
        }

        render(M.account.publicUser());
        if (!M.account.user && location.hash === "#create") {
            selectTab("signup");
        }
        card.classList.remove("is-switching");
    }

    function start() {
        if (!window.Marlowby || !window.Marlowby.ready) {
            return;
        }
        window.Marlowby.ready.then(init);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();

// Accessibility menu: the round button in the bottom right of every page (not Our Mission).
// The menu is built from data/accessibility.json. Settings are saved in the browser and put a
// class on <html> (for example "accessibility-contrast"), and css/style.css does the rest.
(function () {
    "use strict";

    const STORAGE_KEY = "marlowbyAccessibility";
    const opener = document.getElementById("accessibilityOpen");
    const accessibilityMenu = document.getElementById("accessibilityMenu");
    if (!opener || !accessibilityMenu) {
        return;
    }

    // Text size steps, in percent of the browser's own size. Replaced by the list in the JSON.
    let textLevels = [100, 112.5, 125, 150];
    let dialog = null;
    let status = null;
    let guide = null;
    let mask = null;
    let settings = loadSettings();

    // Icons for the menu.
    // Adapted from Lucide Icons (https://lucide.dev), ISC License: the 24 x 24 stroke icons
    // person-standing, zap, eye, target, book-open, type, link, heading, contrast, droplet,
    // scan, mouse-pointer, pause, image-off, volume-2, rotate-ccw, file-text and x.
    // Changed: a few are simplified, and "spacing", "align", "guide", "mask" and "mono" are drawn
    // in the same style for this menu.
    const ICONS = {
        person: '<circle cx="12" cy="4.5" r="1.6"/><path d="m9 20 3-6 3 6"/><path d="m5.5 8.5 6.5 2 6.5-2"/><path d="M12 10.5V14"/>',
        zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
        eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
        book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
        type: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
        spacing: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><path d="m7 3-3 3 3 3"/><path d="m17 3 3 3-3 3"/>',
        align: '<path d="M3 6h18"/><path d="M3 12h11"/><path d="M3 18h15"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
        heading: '<path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/>',
        contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor"/>',
        mono: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18"/><path d="M12 3v18"/><path d="M3 3l9 9" />',
        droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5.5 12 3c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z"/>',
        guide: '<path d="M3 12h18"/><path d="M3 7h10" opacity=".45"/><path d="M3 17h13" opacity=".45"/>',
        mask: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9.5h18"/><path d="M3 14.5h18"/>',
        focus: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
        cursor: '<path d="m4 3 7 17 2.5-7.5L21 10z"/><path d="m13.5 13.5 6 6"/>',
        pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
        imageOff: '<path d="m2 2 20 20"/><path d="M10.4 10.4a2 2 0 1 1-2.8-2.8"/><path d="M13.5 13.5 6 21"/><path d="m18 12 3 3"/><path d="M3.6 3.6A2 2 0 0 0 3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 1.4-.6"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/>',
        volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
        reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
        statement: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>',
        close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        minus: '<path d="M5 12h14"/>',
        plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
        check: '<path d="M20 6 9 17l-5-5"/>'
    };

    function icon(name) {
        return '<svg class="a11y-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>";
    }

    // A cleaner round button: the same <button>, with the picture swapped for a crisp icon.
    opener.innerHTML = icon("person") + '<span class="accessibility-icon_tip" aria-hidden="true">Accessibility</span>';

    // Saving the settings in the browser.
    // Based on W3Schools, "HTML Web Storage API" (localStorage.setItem / localStorage.getItem)
    // https://www.w3schools.com/html/html5_webstorage.asp
    // Changed: stores the settings as JSON, and a try/catch keeps the menu working when storage
    // is blocked. Older saves (a plain list of ids) still load.
    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            if (Array.isArray(saved)) {
                return { on: saved, text: 0 };
            }
            return {
                on: Array.isArray(saved.on) ? saved.on : [],
                text: Number.isInteger(saved.text) ? saved.text : 0
            };
        } catch (error) {
            return { on: [], text: 0 };
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            // Storage is blocked, so the settings only last for this page.
        }
    }

    function isOn(id) {
        return settings.on.includes(id);
    }

    // Turn the saved settings back on as soon as the page loads, before the menu is built.
    settings.on.forEach((id) => applySetting(id, true));
    applyTextSize();

    // LOAD ACCESSIBILITY DATA
    // Adapted from MDN Web Docs, "Using the Fetch API" (the async getData() example)
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    async function loadAccessibilityMenu() {
        try {
            const response = await fetch("/data/accessibility.json");
            if (!response.ok) {
                throw new Error("Could not load accessibility.json");
            }
            buildAccessibilityMenu(await response.json());
        } catch (error) {
            console.error("Accessibility menu error:", error);
        }
    }

    // BUILD ACCESSIBILITY MENU
    // The menu is a modal dialog.
    // Follows the W3C WAI-ARIA Authoring Practices, "Dialog (Modal) Pattern": focus moves into the
    // dialog when it opens, Tab stays inside it, Escape closes it, and it is labelled by its title.
    // https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
    // Built on <dialog> and showModal() (MDN, "<dialog>: The Dialog element"), which gives us the
    // focus trap and the Escape key for free.
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
    function buildAccessibilityMenu(data) {
        textLevels = data.textSize.levels;
        if (settings.text >= textLevels.length) {
            settings.text = 0;
        }
        const canSpeak = "speechSynthesis" in window;

        accessibilityMenu.innerHTML = `
            <dialog class="accessibility-panel" id="accessibilityDialog" aria-labelledby="accessibilityTitle" aria-describedby="accessibilitySubtitle">
                <header class="accessibility-header">
                    <span class="accessibility-header_badge">${icon("person")}</span>
                    <div class="accessibility-header_text">
                        <h2 id="accessibilityTitle">${data.title}</h2>
                        <p id="accessibilitySubtitle">${data.subtitle}</p>
                    </div>
                    <button type="button" class="accessibility-close" id="accessibilityClose" aria-label="Close accessibility menu">${icon("close")}</button>
                </header>

                <div class="accessibility-body">
                    <div class="accessibility-actions">
                        <button type="button" class="accessibility-action" data-action="reset">${icon("reset")}<span>Reset all</span></button>
                        <button type="button" class="accessibility-action" data-action="statement" aria-expanded="false" aria-controls="accessibilityStatement">${icon("statement")}<span>Our statement</span></button>
                    </div>

                    <section class="accessibility-statement" id="accessibilityStatement" aria-labelledby="accessibilityStatementTitle" hidden>
                        <h3 id="accessibilityStatementTitle">Our accessibility statement</h3>
                        ${data.statement.map((line) => `<p>${line}</p>`).join("")}
                        <p><a href="/html/faq.html">Contact us in the Help Center</a></p>
                    </section>

                    <section class="accessibility-group" aria-labelledby="a11yProfilesTitle">
                        <h3 class="accessibility-group_title" id="a11yProfilesTitle">${data.profilesTitle}</h3>
                        <ul class="accessibility-profiles" role="list">
                            ${data.profiles.map((profile) => `
                                <li class="accessibility-profile">
                                    <span class="accessibility-profile_icon">${icon(profile.icon)}</span>
                                    <span class="accessibility-profile_text">
                                        <span class="accessibility-profile_name" id="a11yLabel-${profile.id}">${profile.title}</span>
                                        <span class="accessibility-profile_desc" id="a11yDesc-${profile.id}">${profile.description}</span>
                                    </span>
                                    <button type="button" class="accessibility-switch" role="switch" aria-checked="false"
                                        data-setting="${profile.id}" aria-labelledby="a11yLabel-${profile.id}" aria-describedby="a11yDesc-${profile.id}">
                                        <span class="accessibility-switch_thumb" aria-hidden="true"></span>
                                    </button>
                                </li>
                            `).join("")}
                        </ul>
                    </section>

                    <section class="accessibility-group" aria-labelledby="a11yTextSizeTitle">
                        <div class="accessibility-size">
                            <h3 class="accessibility-group_title" id="a11yTextSizeTitle">${data.textSize.title}</h3>
                            <div class="accessibility-stepper" role="group" aria-labelledby="a11yTextSizeTitle">
                                <button type="button" class="accessibility-step" data-step="-1" aria-label="Smaller text">${icon("minus")}</button>
                                <output class="accessibility-step_value" id="a11yTextSizeValue" aria-live="off">100%</output>
                                <button type="button" class="accessibility-step" data-step="1" aria-label="Bigger text">${icon("plus")}</button>
                            </div>
                        </div>
                    </section>

                    ${data.groups.map((group, index) => `
                        <section class="accessibility-group" aria-labelledby="a11yGroup-${index}">
                            <h3 class="accessibility-group_title" id="a11yGroup-${index}">${group.title}</h3>
                            <div class="accessibility-tiles">
                                ${group.tools.map((tool) => `
                                    <button type="button" class="accessibility-tile" aria-pressed="false" data-setting="${tool.id}" id="a11yTool-${tool.id}">
                                        <span class="accessibility-tile_check" aria-hidden="true">${icon("check")}</span>
                                        ${icon(tool.icon)}
                                        <span class="accessibility-tile_label" id="a11yLabel-${tool.id}">${tool.title}</span>
                                    </button>
                                `).join("")}
                            </div>
                        </section>
                    `).join("")}

                    ${canSpeak ? `
                        <section class="accessibility-group" aria-labelledby="a11yListenTitle">
                            <h3 class="accessibility-group_title" id="a11yListenTitle">Listen</h3>
                            <button type="button" class="accessibility-listen" id="a11yReadAloud" aria-pressed="false" aria-describedby="a11yListenHint"
                                data-start="${data.readAloud.title}" data-stop="${data.readAloud.stopTitle}">
                                ${icon("volume")}<span class="accessibility-listen_label">${data.readAloud.title}</span>
                            </button>
                            <p class="accessibility-hint" id="a11yListenHint">${data.readAloud.hint}</p>
                        </section>
                    ` : ""}

                    <p class="accessibility-status" id="accessibilityStatus" role="status" aria-live="polite"></p>
                </div>

                <footer class="accessibility-footer">
                    <span>${data.footer.text}</span>
                    <a href="${data.footer.link}" target="_blank" rel="noopener">${data.footer.linkText}<span aria-hidden="true"> ›</span><span class="visually-hidden"> (opens in a new tab)</span></a>
                </footer>
            </dialog>
        `;
        dialog = document.getElementById("accessibilityDialog");
        status = document.getElementById("accessibilityStatus");
        setupAccessibilityEvents(data);
        syncControls();
    }

    // EVENT LISTENERS
    function setupAccessibilityEvents(data) {
        document.getElementById("accessibilityClose").addEventListener("click", closeAccessibilityMenu);
        dialog.addEventListener("close", () => {
            opener.classList.remove("hidden");
            opener.setAttribute("aria-expanded", "false");
            // Give focus back to the button that opened the menu (APG Dialog pattern).
            opener.focus();
        });
        // A click on the dark backdrop closes the menu.
        // Adapted from W3Schools, "How To Create a Modal Box" ("When the user clicks anywhere
        // outside of the modal, close it"): https://www.w3schools.com/howto/howto_css_modals.asp
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) {
                closeAccessibilityMenu();
            }
        });
        // Tab from the last control goes back to the first one, and Shift+Tab from the first goes
        // to the last, so focus never leaves the menu (APG Dialog pattern, Keyboard Interaction).
        dialog.addEventListener("keydown", (event) => {
            if (event.key !== "Tab") {
                return;
            }
            const focusable = Array.from(dialog.querySelectorAll("button:not(:disabled), a[href]")).filter((node) => node.offsetParent !== null);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        // The profiles are switches.
        // Adapted from the W3C WAI-ARIA Authoring Practices, "Switch Example Using HTML Button"
        // (switch-button.js, toggleStatus()): https://www.w3.org/WAI/ARIA/apg/patterns/switch/examples/switch-button/
        // Software from the W3C is used under the W3C Software License.
        // Changed: one listener for every switch, and each switch also turns its setting on the page
        // on or off, saves it, and announces the change.
        dialog.querySelectorAll(".accessibility-switch").forEach((button) => {
            button.addEventListener("click", () => {
                const currentState = button.getAttribute("aria-checked") === "true";
                setSetting(button.dataset.setting, !currentState);
            });
        });

        // The tools are toggle buttons: a <button> with aria-pressed.
        // Follows the W3C WAI-ARIA Authoring Practices, "Button Pattern" (toggle button)
        // https://www.w3.org/WAI/ARIA/apg/patterns/button/
        dialog.querySelectorAll(".accessibility-tile").forEach((button) => {
            button.addEventListener("click", () => {
                setSetting(button.dataset.setting, button.getAttribute("aria-pressed") !== "true");
            });
        });

        dialog.querySelectorAll(".accessibility-step").forEach((button) => {
            button.addEventListener("click", () => {
                const next = Math.min(textLevels.length - 1, Math.max(0, settings.text + Number(button.dataset.step)));
                settings.text = next;
                saveSettings();
                applyTextSize();
                syncControls();
                announce("Text size " + textLevels[next] + "%.");
            });
        });

        dialog.querySelector('[data-action="reset"]').addEventListener("click", () => {
            settings.on.slice().forEach((id) => setSetting(id, false, true));
            settings.text = 0;
            saveSettings();
            applyTextSize();
            stopReading();
            syncControls();
            announce("All accessibility settings are off.");
        });

        // Statement button shows and hides the statement.
        // Follows the W3C WAI-ARIA Authoring Practices, "Disclosure (Show/Hide) Pattern":
        // a button with aria-expanded and aria-controls. https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
        const statementButton = dialog.querySelector('[data-action="statement"]');
        const statement = document.getElementById("accessibilityStatement");
        statementButton.addEventListener("click", () => {
            const open = statementButton.getAttribute("aria-expanded") !== "true";
            statementButton.setAttribute("aria-expanded", String(open));
            statement.hidden = !open;
        });

        const listen = document.getElementById("a11yReadAloud");
        if (listen) {
            listen.addEventListener("click", () => {
                if (listen.getAttribute("aria-pressed") === "true") {
                    stopReading();
                    announce("Stopped reading.");
                } else {
                    readAloud();
                }
            });
        }
    }

    // TOGGLE ACCESSIBILITY SETTING
    function setSetting(id, on, quiet) {
        settings.on = settings.on.filter((item) => item !== id);
        if (on) {
            settings.on.push(id);
        }
        saveSettings();
        applySetting(id, on);
        syncControls();
        if (!quiet) {
            const label = document.getElementById("a11yLabel-" + id);
            announce((label ? label.textContent : id) + (on ? " is on." : " is off."));
        }
    }

    function syncControls() {
        if (!dialog) {
            return;
        }
        dialog.querySelectorAll(".accessibility-switch").forEach((button) => {
            button.setAttribute("aria-checked", String(isOn(button.dataset.setting)));
        });
        dialog.querySelectorAll(".accessibility-tile").forEach((button) => {
            button.setAttribute("aria-pressed", String(isOn(button.dataset.setting)));
        });
        const value = document.getElementById("a11yTextSizeValue");
        value.textContent = textLevels[settings.text] + "%";
        dialog.querySelector('[data-step="-1"]').disabled = settings.text === 0;
        dialog.querySelector('[data-step="1"]').disabled = settings.text === textLevels.length - 1;
    }

    // Screen readers hear each change through a polite live region.
    // Based on MDN Web Docs, "ARIA live regions" (aria-live="polite" example)
    // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions
    function announce(message) {
        if (!status) {
            return;
        }
        status.textContent = "";
        window.setTimeout(() => {
            status.textContent = message;
        }, 50);
    }

    // APPLY SETTINGS
    function applySetting(id, on) {
        document.documentElement.classList.toggle("accessibility-" + id, on);
        updateMotion();
        updateOverlays();
        if (id === "vision") {
            applyTextSize();
        }
    }

    // Text size. The site's text is sized in rem, so changing the root size grows all of it.
    // Based on WCAG 2.2 Success Criterion 1.4.4 Resize Text: https://www.w3.org/TR/WCAG22/#resize-text
    function applyTextSize() {
        const chosen = textLevels[settings.text] || 100;
        const size = isOn("vision") ? Math.max(chosen, 118.75) : chosen;
        document.documentElement.style.fontSize = size > 100 ? size + "%" : "";
        // The wide navbar has no room to grow, so css/style.css keeps it at its normal size on
        // desktop (the phone menu has room and grows with the text).
        document.documentElement.classList.toggle("accessibility-bigtext", size > 100);
        if (size > 100) {
            document.documentElement.style.setProperty("--a11y-scale", String(size / 100));
        } else {
            document.documentElement.style.removeProperty("--a11y-scale");
        }
    }

    // Seizure Safety, ADHD Friendly and Stop animation stop motion. The CSS side switches off CSS
    // animations and transitions; GSAP animations are sped up so they jump straight to their end.
    // Based on WCAG Technique C39, "Using the CSS prefers-reduced-motion query to prevent motion"
    // (we do the same thing from a setting instead of the device's media query).
    // https://www.w3.org/WAI/WCAG21/Techniques/css/C39
    function motionOff() {
        return isOn("seizure") || isOn("adhd") || isOn("motion");
    }

    function updateMotion() {
        if (window.gsap) {
            window.gsap.globalTimeline.timeScale(motionOff() ? 1000 : 1);
        }
    }

    // GSAP loads after this file on most pages, so check again once everything has loaded.
    window.addEventListener("load", updateMotion);

    // Reading guide (a line under the pointer) and reading mask (dims everything but a band
    // around the pointer) help keep your place.
    // Based on MDN Web Docs, "Element: pointermove event"
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/pointermove_event
    // Changed: moves with a transform (no layout work) and only while a setting is on.
    function movePointerTools(event) {
        if (guide) {
            guide.style.transform = "translateY(" + (event.clientY + 14) + "px)";
        }
        if (mask) {
            mask.style.transform = "translateY(" + (event.clientY - 60) + "px)";
        }
    }

    function makeOverlay(className) {
        const node = document.createElement("div");
        node.className = className;
        node.setAttribute("aria-hidden", "true");
        node.style.transform = "translateY(" + (window.innerHeight / 2 - 60) + "px)";
        document.body.appendChild(node);
        return node;
    }

    function updateOverlays() {
        if (!document.body) {
            document.addEventListener("DOMContentLoaded", updateOverlays, { once: true });
            return;
        }
        const wantGuide = isOn("adhd") || isOn("guide");
        const wantMask = isOn("mask");
        if (wantGuide && !guide) {
            guide = makeOverlay("accessibility-reading-guide");
        } else if (!wantGuide && guide) {
            guide.remove();
            guide = null;
        }
        if (wantMask && !mask) {
            mask = makeOverlay("accessibility-reading-mask");
        } else if (!wantMask && mask) {
            mask.remove();
            mask = null;
        }
        if (guide || mask) {
            document.addEventListener("pointermove", movePointerTools, { passive: true });
        } else {
            document.removeEventListener("pointermove", movePointerTools);
        }
    }

    // Read aloud, with the browser's own voice.
    // Based on MDN Web Docs, "Using the Web Speech API" (speech synthesis: SpeechSynthesisUtterance
    // and speechSynthesis.speak()): https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
    // Changed: reads the selected text or the page's main content, a few sentences at a time,
    // because some browsers stop long utterances part way through.
    function readAloud() {
        const selected = String(window.getSelection ? window.getSelection() : "").trim();
        const main = document.querySelector("main") || document.body;
        const text = (selected || main.innerText).replace(/\s+/g, " ").trim();
        if (!text) {
            return;
        }
        window.speechSynthesis.cancel();
        const chunks = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
        const button = document.getElementById("a11yReadAloud");
        chunks.forEach((chunk, index) => {
            const utterance = new SpeechSynthesisUtterance(chunk);
            utterance.lang = document.documentElement.lang || "en-US";
            if (index === chunks.length - 1) {
                utterance.addEventListener("end", () => setListening(false));
            }
            window.speechSynthesis.speak(utterance);
        });
        setListening(true);
        announce(button && selected ? "Reading your selection." : "Reading the page.");
    }

    function stopReading() {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        setListening(false);
    }

    function setListening(on) {
        const button = document.getElementById("a11yReadAloud");
        if (!button) {
            return;
        }
        button.setAttribute("aria-pressed", String(on));
        button.querySelector(".accessibility-listen_label").textContent = on ? button.dataset.stop : button.dataset.start;
    }

    // OPEN / CLOSE
    function openAccessibilityMenu() {
        if (!dialog) {
            return;
        }
        opener.classList.add("hidden");
        opener.setAttribute("aria-expanded", "true");
        dialog.showModal();
        document.getElementById("accessibilityClose").focus();
    }

    function closeAccessibilityMenu() {
        if (dialog && dialog.open) {
            dialog.close();
        }
    }

    opener.setAttribute("aria-haspopup", "dialog");
    opener.setAttribute("aria-expanded", "false");
    opener.addEventListener("click", openAccessibilityMenu);

    // start
    loadAccessibilityMenu();
})();

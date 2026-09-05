const accessibilityMenu = document.getElementById("accessibilityMenu");
let accessibilityData = null;

// LOAD ACCESSIBILITY DATA

async function loadAccessibilityMenu() {
    try {
        const response = await fetch("/data/accessibility.json");

        if (!response.ok) {
            throw new Error("Could not load accessibility.json");
        }

        accessibilityData = await response.json();
        buildAccessibilityMenu();

    } 
    catch (error) {
        console.error("Accessibility menu error:", error);
    }
}


// BUILD ACCESSIBILITY MENU


function buildAccessibilityMenu() {
    const data = accessibilityData;
    console.log(data)
    accessibilityMenu.innerHTML = `
        <div id="accessibility-overlay">
            <div class="accessibility-panel">
                <!-- Header -->
                <header class="accessibility-header">
                    <button
                        class="accessibility-close"
                        id="accessibilityClose"
                        aria-label="Close accessibility menu">
                        ×
                    </button>

                    <div class="accessibility-language">
                        <span>🇺🇸</span>
                        ${data.language}
                        <span>⌄</span>
                    </div>
                    <h2>${data.title}</h2>
                </header>

                <!-- Top Buttons -->
                <div class="accessibility-top-buttons">

                    ${data.topButtons.map(button => 
                        `
                        <button
                            class="accessibility-top-button"
                            id="${button.id}"
                            data-action="${button.action}">

                            <span class="accessibility-button-icon">
                                ${button.icon}
                            </span>
                            <span>${button.label}</span>

                        </button>
                    `).join("")}

                </div>

                <!-- Settings -->
                <section class="accessibility-settings">
                    <h3 class="accessibility-section-title">
                        ${data.title}
                    </h3>
                    <div class="accessibility-options">
                        ${data.settings.map(setting => `
                            <div
                                class="accessibility-option"
                                data-setting="${setting.id}">
                                <div class="accessibility-toggle">
                                    <button
                                        class="toggle-button"
                                        data-setting="${setting.id}"
                                        aria-pressed="false">

                                        <span class="toggle-off">
                                            OFF
                                        </span>

                                        <span class="toggle-on">
                                            ON
                                        </span>
                                    </button>
                                </div>

                                <div class="accessibility-option-info">
                                    <h4>
                                        ${setting.title}
                                    </h4>

                                    <p>
                                        ${setting.description}
                                    </p>
                                </div>

                                <div class="accessibility-option-icon">
                                <img src="${setting.icon}" alt="${setting.title} icon" />
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </section>

                <!-- Footer -->
                <footer class="accessibility-footer">
                    <span>
                        ${data.footer.text}
                    </span>

                    <span class="accessibility-footer-brand">
                        Learn More ›
                    </span>
                </footer>
            </div>
        </div>
    `;
    openAccessibilityMenu();
    setupAccessibilityEvents();
}
// EVENT LISTENERS

function setupAccessibilityEvents() {

    // Close menu
    const closeButton = document.getElementById("accessibilityClose");
    // console.log(closeButton)
    closeButton.addEventListener("click", () =>{
        closeAccessibilityMenu()
    });

    // Setting toggles
    document.querySelectorAll(".toggle-button").forEach(button => {
        button.addEventListener("click", () => {
            const settingId = button.dataset.setting;
            openAccessibilityMenu()
            toggleAccessibilitySetting(settingId, button);

        });

    });

    // Top buttons

    const resetButton = document.getElementById("ResetButton")
    resetButton.addEventListener("click", () =>{
        console.log("Reset Button Clicked")
        document.querySelectorAll(".toggle-button").forEach(button => {
            const settingId = button.dataset.setting;
            const currentlyEnabled = button.getAttribute("aria-pressed") === "true";
            if (currentlyEnabled){
                toggleAccessibilitySetting(settingId, button)
            }
        })
    })

    // document.querySelectorAll(".accessibility-top-button").forEach(button => {
    //     button.addEventListener("click", () => {
    //         const action = button.dataset.action;
    //         handleAccessibilityAction(action);

    //     });

    // });
}

// TOGGLE ACCESSIBILITY SETTING

function toggleAccessibilitySetting(settingId, button) {
    const currentlyEnabled =
        button.getAttribute("aria-pressed") === "true";

    const newState = !currentlyEnabled;

    button.setAttribute("aria-pressed", newState);

    button.classList.toggle("active", newState);

    applyAccessibilitySetting(settingId, newState);
}



// APPLY SETTINGS


function applyAccessibilitySetting(settingId, enabled) {
    document.documentElement.classList.toggle(
        `accessibility-${settingId}`,
        enabled
    );
    // console.log(
    //     `${settingId}: ${enabled ? "ON" : "OFF"}`
    // );
}



// TOP BUTTON ACTIONS

function handleAccessibilityAction(action) {
    switch (action) {

        case "reset":
            resetAccessibilitySettings();
            break;

        case "statement":
            console.log("Accessibility statement opened.");
            break;

        case "hide":
            closeAccessibilityMenu();
            break;

        default:
            console.warn(
                `Unknown accessibility action: ${action}`
            );
    }
}

// RESET SETTINGS

function resetAccessibilitySettings() {
    document.querySelectorAll(".toggle-button").forEach(button => {

        button.setAttribute("aria-pressed", "false");
        button.classList.remove("active");

    });

    document
        .querySelectorAll("[class*='accessibility-']")
        .forEach(element => {

            element.classList.remove(
                ...Array.from(element.classList)
                    .filter(className =>
                        className.startsWith("accessibility-")
                    )
            );

        });
}

// OPEN / CLOSE

function openAccessibilityMenu() {
    const button = document.getElementById("accessibilityOpen")
    // console.log(button)
    button.addEventListener("click", () => {
        button.classList.add("hidden")

        const accessibilityOverlay = document.getElementById("accessibility-overlay")
        accessibilityOverlay.classList.add("open");

        const accessibilityMenu = document.getElementById("accessibilityMenu") 
        accessibilityMenu.style.display = "flex"
        console.log(button)
    })


    

    document.body.classList.add(
        "accessibility-menu-open"
    );
}

function closeAccessibilityMenu() {
    console.log("Close button clicked")
    const accessibilityOverlay = document.getElementById("accessibility-overlay");
    accessibilityOverlay.classList.remove("open");

    const button = document.getElementById("accessibilityOpen")
    button.classList.remove("hidden")

    const accessibilityMenu = document.getElementById("accessibilityMenu") 
    accessibilityMenu.style.display = "none"
}

//start
loadAccessibilityMenu();


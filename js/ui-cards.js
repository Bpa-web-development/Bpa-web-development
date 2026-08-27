const cardsContainer = document.getElementById("cardsContainer");

let cards = [];


// Load card data
async function loadCards() {
    try {
        const response = await fetch("/Res/Data/ui-card.json");

        if (!response.ok) {
            throw new Error("Could not load ui-card.json");
        }

        cards = await response.json();

        displayCards();

    } catch (error) {
        console.error("UI Card Error:", error);

        cardsContainer.innerHTML = `
            <p class="cards-error">
                Could not load information.
            </p>
        `;
    }
}


// Display cards
function displayCards() {

    cardsContainer.innerHTML = "";

    cards.forEach(function(cardData) {

        const card = document.createElement("article");

        card.classList.add("info-card");


        // Image
        if (cardData.image) {

            const image = document.createElement("img");

            image.src = cardData.image;
            image.alt = cardData.imageAlt || "";

            card.appendChild(image);
        }


        // Content
        const content = document.createElement("div");

        content.classList.add("info-card-content");


        // Category
        if (cardData.category) {

            const category = document.createElement("p");

            category.classList.add("info-card-category");
            category.textContent = cardData.category;

            content.appendChild(category);
        }


        // Name
        const title = document.createElement("h3");

        title.classList.add("info-card-title");
        title.textContent = cardData.name || "";

        content.appendChild(title);


        // Location
        if (cardData.location) {

            const location = document.createElement("p");

            location.classList.add("info-card-location");
            location.textContent = cardData.location;

            content.appendChild(location);
        }


        // Description
        if (cardData.description) {

            const description = document.createElement("p");

            description.classList.add("info-card-description");
            description.textContent = cardData.description;

            content.appendChild(description);
        }


        // Hours
        if (cardData.hours) {

            const hours = document.createElement("p");

            hours.classList.add("info-card-hours");
            hours.textContent = cardData.hours;

            content.appendChild(hours);
        }


        // Price
        if (cardData.price) {

            const price = document.createElement("p");

            price.classList.add("info-card-price");
            price.textContent = cardData.price;

            content.appendChild(price);
        }


        // Website
        if (cardData.website) {

            const website = document.createElement("a");

            website.classList.add("info-card-link");

            website.href = cardData.website;
            website.textContent = "Visit Website";

            website.target = "_blank";
            website.rel = "noopener noreferrer";

            content.appendChild(website);
        }


        card.appendChild(content);

        cardsContainer.appendChild(card);
    });
}


// Start
loadCards();

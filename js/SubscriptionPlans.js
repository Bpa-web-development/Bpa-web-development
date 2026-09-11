document.addEventListener("DOMContentLoaded", () => {
  //IMAGE GALLERY CLICK CHANGE IDK IF GONNA KEEP
  const mainImage = document.querySelector(".main-image");
  const thumbnails = document.querySelectorAll(".thumbnail-grid img");

  thumbnails.forEach(thumb => {
    thumb.addEventListener("click", () => {
      if (mainImage) {
        mainImage.src = thumb.src;
        mainImage.alt = thumb.alt;
      }
    });
  });

  //PRICE CHANGE RADIO TBD TO BE STYLED AND FLASHY
  const radioOptions = document.querySelectorAll('input[name="purchase_option"]');
  const priceDisplay = document.querySelector(".price-tag");

  radioOptions.forEach(radio => {
    radio.addEventListener("change", (e) => {
      if (priceDisplay) {
        if (e.target.value === "subscribe") {
          priceDisplay.innerHTML = `$42.49 <span>/ or included with Monthly Subscription</span>`;
        } else {
          priceDisplay.innerHTML = `$49.99 <span>/ one-time purchase</span>`;
        }
      }
    });
  });

  //FORM SUBMIT AND CART COUNT TBD NEEDS WORK
  const purchaseForm = document.querySelector(".purchase-form");
  const cartBadge = document.getElementById("cart-count");

  if (purchaseForm) {
    purchaseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const qtySelect = document.getElementById("quantity");
      const addedQty = parseInt(qtySelect?.value, 10) || 1;

      if (cartBadge) {
        const currentCount = parseInt(cartBadge.textContent, 10) || 0;
        cartBadge.textContent = currentCount + addedQty;
      }
      alert(`Added ${addedQty} box(es) to your cart!`);
    });
  }

  //json fetch fall back (yt video) TBD MAYBE NOT NEEDED
  fetch("/data/ui-cards.json")
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (data && data.standardItems) {
        console.log("Loaded JSON Items:", data.standardItems);
      }
    })
    .catch(err => console.log("JSON fetch optional fallback initialized:", err));
});
document.addEventListener("DOMContentLoaded", () => {
  // 1. CRAZY GSAP PLUGIN BRO
  gsap.registerPlugin(ScrollTrigger);

  // 2. FETCH JSON & RENDER REALISTIC BOX TIERS FUNDAMENTALS BRO
  fetch("data/ui-cards.json")
    .then((res) => res.json())
    .then((data) => {
      renderTiers(data.boxTiers);
      initVerticalScrollWipe();
    })
    .catch((err) => console.log("JSON Load Error: Falling back to default layout.", err));

  // 3. THUMBNAIL IMAGE GALLERY INTERACTIVITY FOSHO
  const mainImage = document.querySelector(".main-image");
  const thumbnails = document.querySelectorAll(".thumbnail-grid img");

  thumbnails.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      if (mainImage) mainImage.src = thumb.src;
    });
  });

  // 4. ADD TO CART FORM SUBMISSION PAGE NEEDS WORK
  const cartBadge = document.getElementById("cart-count");
  const purchaseForm = document.querySelector(".purchase-form");

  if (purchaseForm) {
    purchaseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const qtyInput = document.getElementById("quantity");
      const currentQty = parseInt(cartBadge.textContent) || 0;
      const addedQty = parseInt(qtyInput?.value) || 1;
      cartBadge.textContent = currentQty + addedQty;
    });
  }
});

// DYNAMICALLY RENDER TIER CARDS FROM JSON DATA SUPER COOL
function renderTiers(tiers) {
  const container = document.getElementById("tiers-container");
  if (!container) return;

  container.innerHTML = tiers
    .map(
      (tier) => `
    <div class="tier-card ${tier.id === "tier-2" ? "featured" : ""}">
      <div>
        <span class="badge">${tier.badge}</span>
        <h3>${tier.name}</h3>
        <div class="tier-price">${tier.price}</div>
        <p><small>${tier.description}</small></p>
        <ul>
          ${tier.features.map((feature) => `<li>✓ ${feature}</li>`).join("")}
        </ul>
      </div>
      <button class="btn-primary" style="width: 100%; margin-top: 1rem;">Select ${tier.name}</button>
    </div>
  `
    )
    .join("");
}

// SMOOTH VERTICAL SCREEN WIPE SCROLL ANIMATION (GSAP) DUDE WOW
function initVerticalScrollWipe() {
  const wipe = document.getElementById("screenWipe");
  const sections = gsap.utils.toArray(".scroll-section");

  sections.forEach((section, i) => {
    if (i === sections.length - 1) return; // Omit last section

    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=100%",
      pin: true,
      scrub: 0.8,
      onUpdate: (self) => {
        let progress = self.progress;

        // Phase 1 (0% to 50%): Curtain wipes down from top to cover screen
        // Phase 2 (50% to 100%): Curtain reveals next section moving towards bottom
        if (progress <= 0.5) {
          let topProgress = progress * 200;
          gsap.set(wipe, {
            clipPath: `polygon(0 0, 100% 0, 100% ${topProgress}%, 0 ${topProgress}%)`,
          });
        } else {
          let bottomProgress = (progress - 0.5) * 200;
          gsap.set(wipe, {
            clipPath: `polygon(0 ${bottomProgress}%, 100% ${bottomProgress}%, 100% 100%, 0 100%)`,
          });
        }
      },
    });
  });
}
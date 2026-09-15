document.addEventListener("DOMContentLoaded", () => {

  // 1. LOAD THIS MONTH'S DATA (Burlington, VT) AND RENDER THE PAGE
  fetch("/data/SubscriptionPlanData.json")
    .then((res) => res.json())
    .then((data) => {
      renderFeaturedBox(data.featuredBox);
      renderTiers(data.boxTiers);
      renderItems(data.monthlyItems);
      applySectionLabels(data.sectionLabels);

      // Gallery + cart interactions depend on markup we just injected
      initGallery();
      initAddToCart(data.featuredBox);
      initLogoStats(data.stats);

      // Curtain transition depends on final section heights, so it runs
      // once everything above has been rendered onto the page.
      initCurtainScrollTransition();
    })
    .catch((err) => {
      console.error("Subscription plan data failed to load:", err);
    });
});

/* ==========================================================================
   RENDERING
   ========================================================================== */

function renderFeaturedBox(box) {
  if (!box) return;

  document.getElementById("boxBadge").textContent = box.badge;
  document.getElementById("box-title").textContent = box.title;
  document.getElementById("boxDescription").textContent = box.description;

  document.getElementById("boxPrice").innerHTML =
    `$${box.subscriptionPrice.toFixed(2)} <span>/mo, or $${box.oneTimePrice.toFixed(2)} one-time</span>`;

  const mainImage = document.getElementById("mainBoxImage");
  mainImage.src = box.mainImage;
  mainImage.alt = box.mainImageAlt || box.title;

  const thumbGrid = document.getElementById("thumbnailGrid");
  thumbGrid.innerHTML = box.thumbnails
    .map((thumb) => `<img src="${thumb.src}" alt="${thumb.alt}">`)
    .join("");

  // Wire the payment-section price labels to the same numbers
  const subLabel = document.getElementById("subPriceLabel");
  const oneLabel = document.getElementById("onePriceLabel");
  if (subLabel) subLabel.textContent = `$${box.subscriptionPrice.toFixed(2)}/mo • Automatically rotates to a new city next month`;
  if (oneLabel) oneLabel.textContent = `$${box.oneTimePrice.toFixed(2)} one-time purchase`;
}

function renderTiers(tiers) {
  const container = document.getElementById("tiers-container");
  if (!container || !tiers) return;

  container.innerHTML = tiers
    .map(
      (tier) => `
    <div class="tier-card ${tier.id === "tier-2" ? "featured" : ""}">
      <div>
        <span class="badge">${tier.badge}</span>
        <h3>${tier.name}</h3>
        <div class="tier-price">${tier.price}</div>
        <p>${tier.description}</p>
        <ul>
          ${tier.features.map((feature) => `<li>✓ ${feature}</li>`).join("")}
        </ul>
      </div>
      <button type="button" class="btn-primary" style="width: 100%; margin-top: 1rem;">Select ${tier.name}</button>
    </div>
  `
    )
    .join("");
}

function renderItems(items) {
  const container = document.getElementById("items-container");
  if (!container || !items) return;

  container.innerHTML = items
    .map(
      (item) => `
    <article class="item-card">
      <img src="${item.image}" alt="${item.alt}">
      <h3>${item.title}</h3>
      <p class="vendor-tag">Category: ${item.category}</p>
      <p>${item.description}</p>
    </article>
  `
    )
    .join("");
}

/*CURTAIN SCROLL TRANSITION: "UP NEXT" LABELS GOOD TBD*/
function applySectionLabels(labels) {
  if (!labels) return;

  const toTiers = document.getElementById("transition-to-tiers");
  const toContents = document.getElementById("transition-to-contents");
  const toPayment = document.getElementById("transition-to-payment");

  if (toTiers && labels.tiers) toTiers.dataset.nextLabel = labels.tiers;
  if (toContents && labels.contents) toContents.dataset.nextLabel = labels.contents;
  if (toPayment && labels.payment) toPayment.dataset.nextLabel = labels.payment;
}

/*THUMB GAL NEEDS WORK TBD*/
function initGallery() {
  const mainImage = document.getElementById("mainBoxImage");
  const thumbnails = document.querySelectorAll(".thumbnail-grid img");

  thumbnails.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      if (mainImage) mainImage.src = thumb.src;
    });
  });
}

/*ADD TO CARD POP GOOD*/
let cartItemCount = 0;

function initAddToCart(featuredBox) {
  const purchaseForm = document.querySelector(".purchase-form");
  const addToCartBtn = document.getElementById("addToCartBtn");
  if (!purchaseForm || !addToCartBtn) return;

  const originalLabel = addToCartBtn.textContent;

  purchaseForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const qtyInput = document.getElementById("quantity");
    const quantity = parseInt(qtyInput?.value, 10) || 1;
    const purchaseOption = purchaseForm.querySelector('input[name="purchase_option"]:checked')?.value;
    const planLabel = purchaseOption === "one-time" ? "Single City Box (one-time)" : "Monthly Subscription";
    const boxTitle = featuredBox?.title || "Subscription Box";

    updateCartCount(cartItemCount + quantity);
    flashCartIcon();
    showCartToast(`Added ${quantity}× ${planLabel} — ${boxTitle} to your cart!`);

    addToCartBtn.textContent = "Added to Cart ✓";
    addToCartBtn.disabled = true;
    setTimeout(() => {
      addToCartBtn.textContent = originalLabel;
      addToCartBtn.disabled = false;
    }, 1600);
  });
}

function updateCartCount(newTotal) {
  cartItemCount = newTotal;
  const statEl = document.getElementById("statCartItems");
  if (!statEl) return;

  statEl.textContent = cartItemCount;
  statEl.classList.remove("is-bumped");
 //RESTART IF BROKE NEEDED
  void statEl.offsetWidth;
  statEl.classList.add("is-bumped");
}

function flashCartIcon() {
  const icon = document.getElementById("cartIcon");
  if (!icon) return;
  icon.classList.remove("is-added");
  void icon.offsetWidth;
  icon.classList.add("is-added");
}

let toastTimer = null;

function showCartToast(message) {
  const toast = document.getElementById("cartToast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
}

/*STATS NOT NEEDED FAKE COULD MAKE IT REAL WHEN DEPLOYED*/
function initLogoStats(stats) {
  const shopperTarget = stats?.shoppersThisMonth ?? 4872;
  const shopperEl = document.getElementById("statShoppers");
  if (shopperEl) animateCountUp(shopperEl, shopperTarget, 1800);

//COUNT CART ITEMS AWESOME
  const cartEl = document.getElementById("statCartItems");
  if (cartEl) cartEl.textContent = cartItemCount;
}

function animateCountUp(el, target, duration = 1500) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    el.textContent = target.toLocaleString();
    return;
  }

  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    // Ease-out so the count settles rather than stopping abruptly
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = current.toLocaleString();

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

//CURTAIN SCROLL TRANSITION: "UP NEXT" LABELS GOOD TBD
function initCurtainScrollTransition() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("GSAP/ScrollTrigger not available — curtain transition skipped.");
    return;
  }

  //ADA COMPLIAMCE: If the user prefers reduced motion, skip the curtain transition entirely.
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  gsap.registerPlugin(ScrollTrigger);

  const wipe = document.getElementById("screenWipe");
  const wipeInner = wipe.querySelector(".wipe-inner");
  const wipeLabel = document.getElementById("wipeLabel");
  const triggers = gsap.utils.toArray(".scroll-transition-trigger");

  triggers.forEach((triggerEl) => {
    const nextLabel = triggerEl.dataset.nextLabel;
    if (!nextLabel) return;

    ScrollTrigger.create({
      trigger: triggerEl,
      start: "top top",
      end: "+=100%",
      pin: true,
      scrub: 0.8,
      onUpdate: (self) => {
        const progress = self.progress;

       //PHASES 1 AND 2 WIPE SCREEN GOOD!
        if (progress <= 0.5) {
          const topProgress = progress * 200;
          wipe.style.clipPath = `polygon(0 0, 100% 0, 100% ${topProgress}%, 0 ${topProgress}%)`;
        } else {
          const bottomProgress = (progress - 0.5) * 200;
          wipe.style.clipPath = `polygon(0 ${bottomProgress}%, 100% ${bottomProgress}%, 100% 100%, 0 100%)`;
        }

       //UP NEXT GOOD
        const showLabel = progress > 0.12 && progress < 0.88;
        wipeInner.classList.toggle("is-visible", showLabel);
      },
      onEnter: () => { wipeLabel.textContent = nextLabel; },
      onEnterBack: () => { wipeLabel.textContent = nextLabel; },
    });
  });

 // Refresh ScrollTrigger after all elements are rendered and the page is fully loaded
  window.addEventListener("load", () => ScrollTrigger.refresh());
}
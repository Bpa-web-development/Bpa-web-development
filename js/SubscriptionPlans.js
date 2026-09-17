/* DOM CONTENT LOADED LES GOO */
document.addEventListener("DOMContentLoaded", () => {

  // Load JSON Data LES GOO
  fetch("/data/SubscriptionPlanData.json")
    .then((res) => res.json())
    .then((data) => {
      renderFeaturedBox(data.featuredBox);
      renderTiers(data.boxTiers);
      renderItems(data.monthlyItems);
      renderExploreSection(data.exploreSection, data.cartDrawer);
      applySectionLabels(data.sectionLabels);

      initGallery();
      initAddToCart(data.featuredBox);
      initTierAddToCart();
      initItemAddToCart();
      initLogoStats(data.stats);
      initCartDrawer(data.cartDrawer);

      initCurtainScrollTransition();
    })
    .catch((err) => {
      console.error("Subscription plan data failed to load:", err);
    });
});

/* ==========================================================================
   RENDERING FUNCTIONS GOOD
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
}

/* RENDER TIERS GRID GOOD */
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
      <button type="button"
              class="btn-primary tier-add-btn"
              style="width: 100%; margin-top: 1rem;"
              data-id="${tier.id}"
              data-name="${tier.name}"
              data-price="${tier.priceValue}">
        Select ${tier.name}
      </button>
    </div>
  `
    )
    .join("");
}

/* RENDER EXTRA ITEMS GOOD */
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
      <div class="item-card-footer">
        <span class="item-price">$${Number(item.price).toFixed(2)}</span>
        <button type="button"
                class="item-add-btn"
                data-id="${item.id}"
                data-name="${item.title}"
                data-price="${item.price}">
          Add to Cart
        </button>
      </div>
    </article>
  `
    )
    .join("");
}

function renderExploreSection(explore, cartDrawer) {
  if (!explore) return;

  const heading = document.getElementById("explore-title");
  const subtext = document.getElementById("exploreSubtext");
  const cartBtn = document.getElementById("exploreCartBtn");
  const linksContainer = document.getElementById("exploreLinks");

  if (heading) heading.textContent = explore.heading;
  if (subtext) subtext.textContent = explore.subtext;

  if (cartBtn && explore.primaryAction) {
    cartBtn.href = explore.primaryAction.href;
    cartBtn.lastChild.textContent = ` ${explore.primaryAction.label}`;
  }

  if (linksContainer && explore.secondaryLinks) {
    linksContainer.innerHTML = explore.secondaryLinks
      .map((link) => `<a href="${link.href}">${link.label}</a>`)
      .join("");
  }

  if (cartDrawer) {
    const viewCartLink = document.getElementById("viewCartLink");
    const supportLink = document.getElementById("supportLink");
    const drawerTitle = document.getElementById("cartDrawerTitle");
    if (viewCartLink && cartDrawer.viewCartHref) viewCartLink.href = cartDrawer.viewCartHref;
    if (supportLink && cartDrawer.supportHref) supportLink.href = cartDrawer.supportHref;
    if (drawerTitle && cartDrawer.title) drawerTitle.textContent = cartDrawer.title;
  }
}

function applySectionLabels(labels) {
  if (!labels) return;

  const toTiers = document.getElementById("transition-to-tiers");
  const toContents = document.getElementById("transition-to-contents");
  const toPayment = document.getElementById("transition-to-payment");
  const toExplore = document.getElementById("transition-to-explore");

  if (toTiers && labels.tiers) toTiers.dataset.nextLabel = labels.tiers;
  if (toContents && labels.contents) toContents.dataset.nextLabel = labels.contents;
  if (toPayment && labels.payment) toPayment.dataset.nextLabel = labels.payment;
  if (toExplore && labels.explore) toExplore.dataset.nextLabel = labels.explore;
}

function initGallery() {
  const mainImage = document.getElementById("mainBoxImage");
  const thumbnails = document.querySelectorAll(".thumbnail-grid img");

  thumbnails.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      if (mainImage) mainImage.src = thumb.src;
    });
  });
}

/* ==========================================================================
   CART ENGINE LES GOO
   ========================================================================== */

let cart = [];

function addToCart({ id, name, price, qty = 1 }) {
  const existing = cart.find((line) => line.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id, name, price: Number(price) || 0, qty });
  }

  flashCartIcon();
  refreshCartUI();
}

function removeFromCart(id) {
  cart = cart.filter((line) => line.id !== id);
  refreshCartUI();
}

function cartTotalItems() {
  return cart.reduce((sum, line) => sum + line.qty, 0);
}

function cartSubtotal() {
  return cart.reduce((sum, line) => sum + line.qty * line.price, 0);
}

function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

function refreshCartUI() {
  const statEl = document.getElementById("statCartItems");
  if (statEl) {
    statEl.textContent = cartTotalItems();
    statEl.classList.remove("is-bumped");
    void statEl.offsetWidth;
    statEl.classList.add("is-bumped");
  }

  renderCartDrawerContents();
}

function renderCartDrawerContents() {
  const itemsContainer = document.getElementById("cartDrawerItems");
  const subtotalEl = document.getElementById("cartSubtotal");
  if (!itemsContainer || !subtotalEl) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `<p class="cart-drawer-empty">Your cart is empty. Add a box or an item to get started.</p>`;
  } else {
    itemsContainer.innerHTML = cart
      .map(
        (line) => `
      <div class="cart-drawer-line" data-id="${line.id}">
        <div class="cart-drawer-line-info">
          <strong>${line.name}</strong>
          <span>Qty ${line.qty} × ${formatCurrency(line.price)}</span>
        </div>
        <div class="cart-drawer-line-actions">
          <span class="cart-drawer-line-total">${formatCurrency(line.qty * line.price)}</span>
          <button type="button" class="cart-drawer-remove" data-remove-id="${line.id}" aria-label="Remove ${line.name} from cart">
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `
      )
      .join("");

    itemsContainer.querySelectorAll("[data-remove-id]").forEach((btn) => {
      btn.addEventListener("click", () => removeFromCart(btn.dataset.removeId));
    });
  }

  subtotalEl.textContent = formatCurrency(cartSubtotal());
}

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
    const isOneTime = purchaseOption === "one-time";
    const planLabel = isOneTime ? "Single City Box (one-time)" : "Monthly Subscription";
    const boxTitle = featuredBox?.title || "Subscription Box";
    const price = isOneTime ? featuredBox?.oneTimePrice : featuredBox?.subscriptionPrice;

    addToCart({
      id: isOneTime ? "box-one-time" : "box-subscription",
      name: `${boxTitle} — ${planLabel}`,
      price: price ?? 0,
      qty: quantity,
    });

    showCartToast(`Added ${quantity}× ${planLabel} — ${boxTitle} to your cart!`);

    addToCartBtn.textContent = "Added to Cart ✓";
    addToCartBtn.disabled = true;
    setTimeout(() => {
      addToCartBtn.textContent = originalLabel;
      addToCartBtn.disabled = false;
    }, 1600);
  });
}

function initTierAddToCart() {
  document.querySelectorAll(".tier-add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToCart({
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        qty: 1,
      });
      showCartToast(`Added ${btn.dataset.name} to your cart!`);
    });
  });
}

function initItemAddToCart() {
  document.querySelectorAll(".item-add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToCart({
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        qty: 1,
      });
      showCartToast(`Added ${btn.dataset.name} to your cart!`);

      const original = btn.textContent;
      btn.textContent = "Added ✓";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1200);
    });
  });
}

function initCartDrawer() {
  const hamburger = document.getElementById("cartHamburger");
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  const closeBtn = document.getElementById("closeCartDrawer");
  const continueBtn = document.getElementById("continueShoppingBtn");
  if (!hamburger || !drawer || !overlay) return;

  function openDrawer() {
    drawer.classList.add("is-open");
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    drawer.setAttribute("aria-hidden", "false");
    hamburger.setAttribute("aria-expanded", "true");
    document.body.classList.add("cart-drawer-open");
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    drawer.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("cart-drawer-open");
    setTimeout(() => { overlay.hidden = true; }, 300);
  }

  hamburger.addEventListener("click", () => {
    const isOpen = drawer.classList.contains("is-open");
    if (isOpen) closeDrawer(); else openDrawer();
  });

  closeBtn?.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  continueBtn?.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
  });

  renderCartDrawerContents();
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

function initLogoStats(stats) {
  const shopperTarget = stats?.shoppersThisMonth ?? 4872;
  const shopperEl = document.getElementById("statShoppers");
  if (shopperEl) animateCountUp(shopperEl, shopperTarget, 1800);

  const cartEl = document.getElementById("statCartItems");
  if (cartEl) cartEl.textContent = cartTotalItems();
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
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = current.toLocaleString();

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* CURTAIN TRANSITION LES GOO */
function initCurtainScrollTransition() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("GSAP/ScrollTrigger not available — curtain transition skipped.");
    return;
  }

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

        if (progress <= 0.5) {
          const topProgress = progress * 200;
          wipe.style.clipPath = `polygon(0 0, 100% 0, 100% ${topProgress}%, 0 ${topProgress}%)`;
        } else {
          const bottomProgress = (progress - 0.5) * 200;
          wipe.style.clipPath = `polygon(0 ${bottomProgress}%, 100% ${bottomProgress}%, 100% 100%, 0 100%)`;
        }

        const showLabel = progress > 0.12 && progress < 0.88;
        wipeInner.classList.toggle("is-visible", showLabel);
      },
      onEnter: () => { wipeLabel.textContent = nextLabel; },
      onEnterBack: () => { wipeLabel.textContent = nextLabel; },
    });
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
}
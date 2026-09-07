// wait till the page actually loads so elements exist lol
document.addEventListener("DOMContentLoaded", () => {
  
  // grab the big pic and all the tiny thumbnails
  const mainPic = document.querySelector(".main-image");
  const thumbs = document.querySelectorAll(".thumbnail-grid img");

  // click a thumbnail -> swap the big image src!
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      if (mainPic) mainPic.src = thumb.src;
    });
  });

  // grab the cart badge in navigation & the buy form
  const cartBadge = document.getElementById("cart-count");
  const buyForm = document.querySelector(".purchase-form");

  // update cart total when someone hits submit
  if (buyForm) {
    buyForm.addEventListener("submit", (e) => {
      e.preventDefault(); // prevent refresh of page for ease
      
      const qtySelect = document.getElementById("quantity");
      const currentCount = parseInt(cartBadge.textContent) || 0;
      const addedQty = parseInt(qtySelect.value) || 1;

      // bump up the counter in the header navbar
      cartBadge.textContent = currentCount + addedQty;
    });
  }

});
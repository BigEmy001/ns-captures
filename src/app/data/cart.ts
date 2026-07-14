// Shopping cart helpers using localStorage and custom events.

export interface CartItem {
  id: string; // e.g., "flower-ear-COMMERCIAL"
  photoId: string;
  title: string;
  license: string;
  price: number;
  image: string;
  photographer: string;
}

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem("ns-cart") || "[]");
  } catch {
    return [];
  }
}

export function addToCart(item: CartItem): boolean {
  const cart = getCart();
  if (!cart.some((i) => i.id === item.id)) {
    cart.push(item);
    localStorage.setItem("ns-cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    // Open cart drawer immediately
    window.dispatchEvent(new Event("cart-open"));
    return true;
  }
  // Open cart drawer if it's already in the cart
  window.dispatchEvent(new Event("cart-open"));
  return false;
}

export function removeFromCart(id: string) {
  let cart = getCart();
  cart = cart.filter((i) => i.id !== id);
  localStorage.setItem("ns-cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
}

export function clearCart() {
  localStorage.removeItem("ns-cart");
  window.dispatchEvent(new Event("cart-updated"));
}

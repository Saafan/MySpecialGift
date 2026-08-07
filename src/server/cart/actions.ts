"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";

/**
 * Cart mutations. The cart stores references (design + product + quantity)
 * only — never prices. V1 froze a hardcoded $24.99 into every cart item at
 * add time regardless of product; V2 prices are always resolved server-side
 * at render and order time.
 */

export type CartActionResult = { ok: true } | { ok: false; error: string };

const MAX_QUANTITY = 99;

export async function addDesignToCart(designId: string): Promise<CartActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to add things to your cart" };

  const design = await db.design.findUnique({
    where: { id: designId },
    include: { product: true },
  });
  if (!design || design.userId !== user.id) {
    return { ok: false, error: "Design not found" };
  }
  if (design.product.status !== "ACTIVE") {
    return { ok: false, error: "This product isn't available right now" };
  }

  const cart = await db.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  // Same design added twice bumps the quantity — V1 created duplicate rows.
  await db.cartItem.upsert({
    where: { cartId_designId: { cartId: cart.id, designId } },
    update: { quantity: { increment: 1 } },
    create: { cartId: cart.id, designId, productId: design.productId, quantity: 1 },
  });

  revalidatePath("/cart");
  return { ok: true };
}

export async function setCartItemQuantity(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first" };

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });
  if (!item || item.cart.userId !== user.id) {
    return { ok: false, error: "Cart item not found" };
  }

  const clamped = Math.floor(quantity);
  if (clamped <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
  } else {
    await db.cartItem.update({
      where: { id: itemId },
      data: { quantity: Math.min(MAX_QUANTITY, clamped) },
    });
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<CartActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first" };

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });
  if (!item || item.cart.userId !== user.id) {
    return { ok: false, error: "Cart item not found" };
  }

  await db.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/cart");
  return { ok: true };
}
